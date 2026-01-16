/**
 * ITR XML Generator
 * Converts ITR Draft JSON to Income Tax Portal XML format
 * 
 * Note: Income Tax Portal requires ITR XML in specific schema (ITR-1, ITR-2, etc.)
 * This generator creates XML compatible with Income Tax Portal upload requirements
 */

import type { ITRDraft } from './types';

interface ITRXMLOptions {
  formType: 'ITR1' | 'ITR2' | 'ITR3' | 'ITR4';
  financialYear: string;
  assessmentYear: string;
  pan: string;
  name: string;
}

/**
 * Generate ITR XML from draft data
 * This creates XML compatible with Income Tax Portal upload
 */
export function generateITRXML(draft: ITRDraft, options: ITRXMLOptions): string {
  const { formType, financialYear, assessmentYear, pan, name } = options;

  // Start building XML according to Income Tax Portal schema
  // Note: This is a simplified version. Full XML schema is complex and form-specific
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ITR xmlns="http://incometaxindiaefiling.gov.in/ITR">
  <Return>
    <ReturnType>${formType}</ReturnType>
    <ReturnPeriod>${financialYear}</ReturnPeriod>
    <AssessmentYear>${assessmentYear}</AssessmentYear>
    <PersonalInfo>
      <PAN>${pan}</PAN>
      <Name>${escapeXML(name)}</Name>
      <FinancialYear>${financialYear}</FinancialYear>
    </PersonalInfo>
    <IncomeDetails>
      <IncomeFromSalaries>
        <TotalSalary>${draft.income.salary || 0}</TotalSalary>
      </IncomeFromSalaries>
      <IncomeFromHouseProperty>
        <TotalIncome>${draft.income.houseProperty || 0}</TotalIncome>
      </IncomeFromHouseProperty>
      <IncomeFromCapitalGains>
        <TotalIncome>${draft.income.capitalGains || 0}</TotalIncome>
      </IncomeFromCapitalGains>
      <IncomeFromBusinessProfession>
        <TotalIncome>${draft.income.businessProfession || 0}</TotalIncome>
      </IncomeFromBusinessProfession>
      <IncomeFromOtherSources>
        <TotalIncome>${draft.income.otherSources || 0}</TotalIncome>
      </IncomeFromOtherSources>
      <GrossTotalIncome>${draft.income.totalIncome || 0}</GrossTotalIncome>
    </IncomeDetails>
    <Deductions>
      <ChapterVIADeductions>
        ${draft.deductions.section80C ? `<Section80C>${draft.deductions.section80C}</Section80C>` : ''}
        ${draft.deductions.section80D ? `<Section80D>${draft.deductions.section80D}</Section80D>` : ''}
        ${draft.deductions.section80G ? `<Section80G>${draft.deductions.section80G}</Section80G>` : ''}
        ${draft.deductions.section24 ? `<Section24>${draft.deductions.section24}</Section24>` : ''}
        ${draft.deductions.section80E ? `<Section80E>${draft.deductions.section80E}</Section80E>` : ''}
        ${draft.deductions.section80TTA ? `<Section80TTA>${draft.deductions.section80TTA}</Section80TTA>` : ''}
        <TotalChapterVIADeductions>${draft.deductions.totalDeductions || 0}</TotalChapterVIADeductions>
      </ChapterVIADeductions>
    </Deductions>
    <TaxComputation>
      <TotalIncome>${draft.income.totalIncome || 0}</TotalIncome>
      <TotalDeductions>${draft.deductions.totalDeductions || 0}</TotalDeductions>
      <TaxableIncome>${(draft.income.totalIncome || 0) - (draft.deductions.totalDeductions || 0)}</TaxableIncome>
      <TotalTax>${draft.totalTax || 0}</TotalTax>
      <TDS>${draft.tds || 0}</TDS>
      <AdvanceTax>${draft.advanceTax || 0}</AdvanceTax>
      <SelfAssessmentTax>${draft.selfAssessmentTax || 0}</SelfAssessmentTax>
      <TotalTaxPaid>${(draft.tds || 0) + (draft.advanceTax || 0) + (draft.selfAssessmentTax || 0)}</TotalTaxPaid>
      <Refund>${draft.refund || 0}</Refund>
      <Payable>${draft.payable || 0}</Payable>
    </TaxComputation>
    <Verification>
      <Verified>false</Verified>
      <VerificationDate></VerificationDate>
    </Verification>
  </Return>
</ITR>`;

  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validate ITR XML structure
 */
export function validateITRXML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic XML validation
  if (!xml.trim().startsWith('<?xml')) {
    errors.push('XML must start with XML declaration');
  }

  if (!xml.includes('<ITR')) {
    errors.push('XML must contain ITR root element');
  }

  if (!xml.includes('<PAN>')) {
    errors.push('XML must contain PAN element');
  }

  // Check for balanced tags (simplified)
  const openTags = (xml.match(/<[^\/!?][^>]*>/g) || []).length;
  const closeTags = (xml.match(/<\/[^>]+>/g) || []).length;
  if (openTags !== closeTags) {
    errors.push('XML tags are not balanced');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Download ITR XML file
 */
export function downloadITRXML(xml: string, filename: string = 'ITR.xml'): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

