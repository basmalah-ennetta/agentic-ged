// StructuringAgent.js
// Phase 5: Uses documentTypes config and flexible field storage.

const { getDocumentType, getLabel } = require('../config/documentTypes');

class StructuringAgent {
  constructor(tools) {
    this.classify = tools.classify;
    this.extract  = tools.extract;
    this.storage  = tools.storage;
    this.name     = 'StructuringAgent';
  }

  async run(state) {
    console.log(`\n[${this.name}] Starting structuring`);
    const documentType  = await this._classify(state);
    const extractedFields = await this._extract(state, documentType);
    return { ...state, documentType, extractedFields };
  }

  async _classify(state) {
    console.log(`[${this.name}] Classifying...`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'classifying' }),
    });

    const raw    = await this.classify.invoke({
      text: state.extractedText,
      contractId: state.contractId,
    });
    const result = this._parse(raw);
    const documentType = result.document_type || 'other';

    console.log(`[${this.name}] Type: ${documentType} (${result.confidence})`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'classified',
        documentType,
        documentTypeLabel: getLabel(documentType),
      }),
    });

    return documentType;
  }

  async _extract(state, documentType) {
    const typeConfig = getDocumentType(documentType);
    console.log(`[${this.name}] Extracting fields for: ${documentType}`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const raw    = await this.extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType,
    });
    const result       = this._parse(raw);
    const rawFields    = result.extracted_info || result;

    // Flatten to string values only
    const extractedFields = {};
    Object.entries(rawFields).forEach(([k, v]) => {
      if (typeof v === 'string') extractedFields[k] = v;
    });

    console.log(
      `[${this.name}] Extracted ${Object.keys(extractedFields).length} fields`
    );

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'extracted',
        extractedFields,
        documentTypeLabel: getLabel(documentType),
        // Backward-compatible legacy field for existing frontend
        extractedInfo: {
          employeeName: extractedFields.employeeName || '',
          companyName:  extractedFields.companyName  || '',
          jobTitle:     extractedFields.jobTitle      || '',
          salary:       extractedFields.salary        || '',
          startDate:    extractedFields.startDate     || '',
          endDate:      extractedFields.endDate       || '',
        },
      }),
    });

    return extractedFields;
  }

  _parse(raw) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
}

module.exports = { StructuringAgent };