// Single source of truth for all document type definitions.
//
// To add a new document type to the system: Add an entry here
//
// Each entry defines:
//   label        — human-readable name shown in the UI
//   requiredFields — fields the ValidationAgent checks for
//   extractionHint — passed to the extraction agent to guide its prompt
//   summaryHint    — passed to the summarization agent for context

const DOCUMENT_TYPES = {
  employment_contract: {
    label: 'Employment Contract',
    requiredFields: ['employeeName', 'salary', 'startDate', 'jobTitle'],
    extractionHint:
      'Focus on: employee name, company name, job title, salary, ' +
      'start date, end date, notice period, work location.',
    summaryHint:
      'Summarize as an employment agreement between an employer and employee. ' +
      'Highlight compensation, role, and key terms.',
  },

  nda: {
    label: 'Non-Disclosure Agreement',
    requiredFields: ['companyName', 'startDate'],
    extractionHint:
      'Focus on: parties involved, confidentiality scope, ' +
      'agreement duration, governing jurisdiction.',
    summaryHint:
      'Summarize as a confidentiality agreement. ' +
      'Highlight what information is protected and for how long.',
  },

  internship_agreement: {
    label: 'Internship Agreement',
    requiredFields: ['employeeName', 'startDate', 'companyName'],
    extractionHint:
      'Focus on: intern name, company, department, supervisor, ' +
      'start date, end date, stipend if any.',
    summaryHint:
      'Summarize as an internship agreement. ' +
      'Highlight duration, department, and learning objectives.',
  },

  freelance_agreement: {
    label: 'Freelance Agreement',
    requiredFields: ['employeeName', 'salary', 'companyName'],
    extractionHint:
      'Focus on: freelancer name, client company, project scope, ' +
      'payment terms, deliverables, timeline.',
    summaryHint:
      'Summarize as a freelance services contract. ' +
      'Highlight deliverables, payment, and timeline.',
  },

  invoice: {
    label: 'Invoice',
    requiredFields: ['companyName', 'startDate'],
    extractionHint:
      'Focus on: invoice number, issuer, recipient, items, ' +
      'total amount, due date, payment terms.',
    summaryHint:
      'Summarize as a financial invoice. ' +
      'Highlight total amount, due date, and parties.',
  },

  amendment: {
    label: 'Contract Amendment',
    requiredFields: ['companyName'],
    extractionHint:
      'Focus on: original contract reference, parties, ' +
      'what is being changed, effective date.',
    summaryHint:
      'Summarize as a contract modification. ' +
      'Highlight what changed and when it takes effect.',
  },

  termination_letter: {
    label: 'Termination Letter',
    requiredFields: ['employeeName', 'companyName'],
    extractionHint:
      'Focus on: employee name, company, termination date, ' +
      'reason if stated, severance terms.',
    summaryHint:
      'Summarize as an employment termination notice. ' +
      'Highlight effective date and any terms.',
  },

  other: {
    label: 'Unknown Document',
    requiredFields: [],
    extractionHint:
      'Extract any key entities: names, organizations, dates, ' +
      'amounts, locations, and important terms.',
    summaryHint:
      'Provide a general summary of the document content and purpose.',
  },
};

/**
 * getDocumentType(type)
 * Returns config for a document type, falling back to 'other'.
 */
function getDocumentType(type) {
  const normalized = (type || 'other').toLowerCase().trim();
  return DOCUMENT_TYPES[normalized] || DOCUMENT_TYPES['other'];
}

/**
 * getSupportedTypes()
 * Returns all registered document type keys.
 */
function getSupportedTypes() {
  return Object.keys(DOCUMENT_TYPES);
}

/**
 * getLabel(type)
 * Returns human-readable label for a document type.
 */
function getLabel(type) {
  return getDocumentType(type).label;
}

module.exports = { DOCUMENT_TYPES, getDocumentType, getSupportedTypes, getLabel };