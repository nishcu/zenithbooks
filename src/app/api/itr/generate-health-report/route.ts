/**
 * AI Health Report Generator
 * Generates comprehensive tax health reports with insights and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { doc, collection, setDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getITRApplication, getAllITRApplications } from '@/lib/itr/firestore';
import type { ITRHealthReport, FinancialYear } from '@/lib/itr/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, financialYear, applicationId } = body;

    if (!userId || !financialYear) {
      return NextResponse.json(
        { error: 'userId and financialYear are required' },
        { status: 400 }
      );
    }

    // Get all ITR applications for the user (multi-year analysis)
    const { collection: firestoreCollection } = await import('firebase/firestore');
    const applicationsRef = firestoreCollection(db, 'itrApplications');
    const userAppsQuery = query(
      applicationsRef,
      where('userId', '==', userId),
      orderBy('financialYear', 'desc')
    );
    const appsSnapshot = await getDocs(userAppsQuery);
    const allApplications = appsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // Get current application
    const currentApp = applicationId 
      ? await getITRApplication(applicationId)
      : allApplications.find(app => app.financialYear === financialYear);

    if (!currentApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Analyze income trends (last 3 years)
    const recentApps = allApplications.slice(0, 3);
    const incomeTrends = recentApps.map((app, index) => {
      const totalIncome = app.draft?.income?.totalIncome || 0;
      const prevIncome = index < recentApps.length - 1 
        ? (recentApps[index + 1]?.draft?.income?.totalIncome || 0)
        : 0;
      
      const growth = prevIncome > 0 
        ? ((totalIncome - prevIncome) / prevIncome) * 100 
        : 0;

      return {
        year: app.financialYear,
        totalIncome,
        growth: Math.round(growth * 100) / 100,
      };
    });

    // Analyze AIS patterns
    const aisPatterns = {
      consistentIncome: analyzeConsistentIncome(allApplications),
      multipleEmployers: analyzeMultipleEmployers(allApplications),
      irregularDeposits: analyzeIrregularDeposits(allApplications),
    };

    // Compliance flags
    const complianceFlags = [];
    
    // Check for missing documents
    if (!currentApp.documents || currentApp.documents.length < 3) {
      complianceFlags.push({
        type: 'MISSING_DOCUMENT' as const,
        severity: 'MEDIUM' as const,
        description: 'Some supporting documents may be missing. Ensure all Form 16, AIS, and 26AS documents are uploaded.',
      });
    }

    // Check for TDS mismatches
    if (currentApp.draft?.mismatches && currentApp.draft.mismatches.length > 0) {
      complianceFlags.push({
        type: 'TDS_MISMATCH' as const,
        severity: 'HIGH' as const,
        description: `Found ${currentApp.draft.mismatches.length} TDS/AIS mismatches. Please verify and reconcile.`,
      });
    }

    // Check for late filing
    const filingDate = currentApp.completedAt 
      ? (currentApp.completedAt instanceof Date ? currentApp.completedAt : new Date(currentApp.completedAt))
      : null;
    
    if (filingDate) {
      const dueDate = new Date(`${financialYear.split('-')[1]}-07-31`); // July 31
      if (filingDate > dueDate) {
        complianceFlags.push({
          type: 'LATE_FILING' as const,
          severity: 'MEDIUM' as const,
          description: `ITR was filed after the due date (${dueDate.toLocaleDateString('en-IN')}). Late filing may result in penalties.`,
        });
      }
    }

    // Check scrutiny risk
    const scrutinyRisk = currentApp.metadata?.scrutinyRisk || currentApp.draft?.scrutinyRisk || 'LOW';
    if (scrutinyRisk === 'HIGH') {
      complianceFlags.push({
        type: 'HIGH_SCRUTINY_RISK' as const,
        severity: 'HIGH' as const,
        description: 'Your ITR has a high scrutiny risk. Ensure all deductions are properly documented.',
      });
    }

    // Generate investment recommendations
    const recommendations = generateInvestmentRecommendations(currentApp);

    // Create health report
    const reportId = `health-report-${userId}-${financialYear}-${Date.now()}`;
    const report: ITRHealthReport = {
      id: reportId,
      userId,
      financialYear: financialYear as FinancialYear,
      incomeTrends,
      aisPatterns,
      complianceFlags,
      recommendations,
      generatedAt: new Date(),
    };

    // Save to Firestore
    const reportRef = doc(collection(db, 'itrHealthReports'), reportId);
    await setDoc(reportRef, {
      ...report,
      generatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating health report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate health report' },
      { status: 500 }
    );
  }
}

// Helper functions for analysis

function analyzeConsistentIncome(applications: any[]): boolean {
  if (applications.length < 2) return true;
  
  const incomes = applications.map(app => app.draft?.income?.totalIncome || 0);
  const avgIncome = incomes.reduce((sum, inc) => sum + inc, 0) / incomes.length;
  const variance = incomes.reduce((sum, inc) => sum + Math.pow(inc - avgIncome, 2), 0) / incomes.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgIncome > 0 ? (stdDev / avgIncome) * 100 : 0;
  
  // If coefficient of variation is less than 20%, income is consistent
  return coefficientOfVariation < 20;
}

function analyzeMultipleEmployers(applications: any[]): boolean {
  // Check if user has multiple Form 16 documents or employers
  // This would require checking document types or AIS data
  // For now, return false as a placeholder
  return false;
}

function analyzeIrregularDeposits(applications: any[]): boolean {
  // Check for irregular or large deposits in AIS data
  // This would require analyzing AIS transaction data
  // For now, return false as a placeholder
  return false;
}

function generateInvestmentRecommendations(application: any): Array<{
  category: 'TAX_SAVING' | 'RETIREMENT' | 'HEALTH' | 'EDUCATION';
  title: string;
  description: string;
  estimatedSavings: number;
}> {
  const recommendations: Array<{
    category: 'TAX_SAVING' | 'RETIREMENT' | 'HEALTH' | 'EDUCATION';
    title: string;
    description: string;
    estimatedSavings: number;
  }> = [];

  const totalIncome = application.draft?.income?.totalIncome || 0;
  const currentDeductions = application.draft?.deductions?.totalDeductions || 0;
  const taxLiability = application.draft?.totalTax || 0;

  // Tax-saving investments (Section 80C)
  const max80C = 150000;
  if (currentDeductions < max80C && totalIncome > 500000) {
    const potentialDeduction = Math.min(max80C - currentDeductions, totalIncome * 0.3);
    const taxSlab = totalIncome <= 500000 ? 0.05 : totalIncome <= 1000000 ? 0.2 : 0.3;
    const savings = potentialDeduction * taxSlab;

    if (savings > 0) {
      recommendations.push({
        category: 'TAX_SAVING',
        title: 'Increase Section 80C Investments',
        description: `Invest up to ₹${potentialDeduction.toLocaleString('en-IN')} in ELSS, PPF, NSC, or Life Insurance to maximize tax savings under Section 80C.`,
        estimatedSavings: Math.round(savings),
      });
    }
  }

  // Health Insurance (Section 80D)
  if (totalIncome > 500000) {
    recommendations.push({
      category: 'HEALTH',
      title: 'Health Insurance Premium',
      description: 'Consider purchasing health insurance for yourself and family. Premium up to ₹25,000 (₹50,000 for senior citizens) is deductible under Section 80D.',
      estimatedSavings: Math.round(25000 * 0.3), // Assuming 30% tax bracket
    });
  }

  // Retirement Planning (Section 80C + NPS)
  if (totalIncome > 1000000) {
    recommendations.push({
      category: 'RETIREMENT',
      title: 'NPS Investment (Section 80CCD)',
      description: 'Invest in National Pension System (NPS). Additional deduction of ₹50,000 available under Section 80CCD(1B) beyond Section 80C limit.',
      estimatedSavings: Math.round(50000 * 0.3),
    });
  }

  // Education (Section 80E for Education Loan)
  if (totalIncome > 500000) {
    recommendations.push({
      category: 'EDUCATION',
      title: 'Education Loan Interest',
      description: 'If you have an education loan, interest paid is fully deductible under Section 80E without any upper limit.',
      estimatedSavings: 0, // Varies based on loan amount
    });
  }

  return recommendations;
}

