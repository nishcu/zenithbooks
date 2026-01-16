/**
 * ITR Document Vault Integration
 * Auto-organizes ITR documents into the Document Vault by financial year
 */

import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VAULT_CATEGORIES } from '@/lib/vault-constants';
import type { ITRDocument, FinancialYear } from './types';

/**
 * Sync ITR document to Document Vault
 * Creates a vault document entry for ITR documents organized by financial year
 */
export async function syncITRDocumentToVault(
  itrDocument: ITRDocument,
  userId: string
): Promise<string> {
  try {
    // Get application to get financial year if not in document
    let financialYear = itrDocument.financialYear;
    if (!financialYear && itrDocument.applicationId) {
      try {
        const { getITRApplication } = await import('./firestore');
        const application = await getITRApplication(itrDocument.applicationId);
        if (application) {
          financialYear = application.financialYear;
        }
      } catch (error) {
        console.warn('Could not fetch application for financial year:', error);
      }
    }
    
    // Generate vault document ID (use consistent ID based on application and type)
    const vaultDocId = `itr-${itrDocument.applicationId}-${itrDocument.type}-${financialYear || 'unknown'}`;
    
    // Map ITR document type to vault document name
    const documentName = getVaultDocumentName(itrDocument.type, financialYear || 'Unknown');
    
    // Check if document already exists
    const vaultDocRef = doc(db, 'vaultDocuments', vaultDocId);
    const existingDoc = await getDoc(vaultDocRef);
    
    const vaultDocumentData = {
      userId,
      fileName: itrDocument.fileName,
      category: VAULT_CATEGORIES.INCOME_TAX,
      currentVersion: 1,
      fileSize: itrDocument.fileSize,
      uploadedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      metadata: {
        description: `${documentName} - FY ${financialYear || 'Unknown'}`,
        documentDate: itrDocument.uploadedAt || new Date(),
        tags: ['ITR', financialYear || 'Unknown', itrDocument.type],
        itrApplicationId: itrDocument.applicationId,
        itrDocumentType: itrDocument.type,
        financialYear: financialYear || 'Unknown',
      },
      versions: {
        1: {
          fileUrl: itrDocument.fileUrl,
          fileSize: itrDocument.fileSize,
          fileType: itrDocument.mimeType || 'application/pdf',
          uploadedAt: serverTimestamp(),
          versionNote: 'Auto-organized from ITR filing application',
        },
      },
    };
    
    if (existingDoc.exists()) {
      // Update existing document (new version)
      const existingData = existingDoc.data();
      const newVersion = (existingData.currentVersion || 1) + 1;
      
      await updateDoc(vaultDocRef, {
        ...vaultDocumentData,
        currentVersion: newVersion,
        versions: {
          ...existingData.versions,
          [newVersion]: vaultDocumentData.versions[1],
        },
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Create new document
      await setDoc(vaultDocRef, vaultDocumentData);
      
      // Update vault storage settings
      try {
        const settingsRef = doc(db, 'vaultSettings', userId);
        const settingsDoc = await getDoc(settingsRef);
        const currentStorageUsed = settingsDoc.exists() 
          ? settingsDoc.data().currentStorageUsed || 0 
          : 0;

        if (settingsDoc.exists()) {
          await updateDoc(settingsRef, {
            currentStorageUsed: currentStorageUsed + itrDocument.fileSize,
            lastUpdated: serverTimestamp(),
          });
        } else {
          await setDoc(settingsRef, {
            currentStorageUsed: itrDocument.fileSize,
            lastUpdated: serverTimestamp(),
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('Error updating vault storage settings:', error);
        // Don't fail the whole operation
      }
    }
    
    return vaultDocId;
  } catch (error) {
    console.error('Error syncing ITR document to vault:', error);
    throw error;
  }
}

/**
 * Get user-friendly document name for vault
 */
function getVaultDocumentName(type: ITRDocument['type'], financialYear: FinancialYear | string): string {
  const typeMap: Record<string, string> = {
    PAN_FRONT: 'PAN Card (Front)',
    PAN_BACK: 'PAN Card (Back)',
    FORM_16: `Form 16 - FY ${financialYear}`,
    BANK_STATEMENT: 'Bank Statement',
    RENT_RECEIPT: 'Rent Receipt',
    LIC_PREMIUM: 'LIC Premium Receipt',
    HOME_LOAN_STATEMENT: 'Home Loan Statement',
    AIS_PDF: `AIS (PDF) - FY ${financialYear}`,
    AIS_JSON: `AIS (JSON) - FY ${financialYear}`,
    FORM_26AS: `Form 26AS - FY ${financialYear}`,
    TIS: `TIS - FY ${financialYear}`,
    PAST_ITR: `Past ITR - FY ${financialYear}`,
    ITR_DRAFT: `ITR Draft - FY ${financialYear}`,
    ITR_V: `ITR-V - FY ${financialYear}`,
    FILING_ACKNOWLEDGEMENT: `Filing Acknowledgement - FY ${financialYear}`,
    OTHER: 'Other Document',
  };
  
  return typeMap[type] || `${type.replace(/_/g, ' ')} - FY ${financialYear}`;
}

/**
 * Sync all ITR documents for an application to vault
 */
export async function syncAllITRDocumentsToVault(
  applicationId: string,
  userId: string,
  financialYear: FinancialYear
): Promise<void> {
  try {
    const { getApplicationDocuments } = await import('./firestore');
    const documents = await getApplicationDocuments(applicationId);
    
    // Sync each document to vault
    for (const doc of documents) {
      try {
        await syncITRDocumentToVault(doc, userId);
      } catch (error) {
        console.error(`Failed to sync document ${doc.id} to vault:`, error);
        // Continue with other documents even if one fails
      }
    }
  } catch (error) {
    console.error('Error syncing ITR documents to vault:', error);
    throw error;
  }
}

/**
 * Get ITR documents from vault for a user, grouped by financial year
 */
export async function getITRDocumentsFromVault(
  userId: string
): Promise<Record<FinancialYear, any[]>> {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(
      collection(db, 'vaultDocuments'),
      where('userId', '==', userId),
      where('category', '==', VAULT_CATEGORIES.INCOME_TAX)
    );
    
    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate(),
      lastUpdated: doc.data().lastUpdated?.toDate(),
    }));
    
    // Filter ITR documents (those with itrApplicationId in metadata)
    const itrDocuments = documents.filter(doc => 
      doc.metadata?.itrApplicationId && doc.metadata?.financialYear
    );
    
    // Group by financial year
    const grouped: Record<FinancialYear, any[]> = {} as any;
    
    itrDocuments.forEach(doc => {
      const fy = doc.metadata.financialYear as FinancialYear;
      if (!grouped[fy]) {
        grouped[fy] = [];
      }
      grouped[fy].push(doc);
    });
    
    return grouped;
  } catch (error) {
    console.error('Error getting ITR documents from vault:', error);
    return {} as Record<FinancialYear, any[]>;
  }
}

