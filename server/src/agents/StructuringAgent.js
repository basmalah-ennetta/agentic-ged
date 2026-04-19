const { createTracer } = require('../langchain/traceHelper');
const { getDocumentType, getLabel } = require('../config/documentTypes');

class StructuringAgent {
  constructor(tools) {
    this.classify = tools.classify;
    this.extract  = tools.extract;
    this.storage  = tools.storage;
    this.trace    = tools.trace;
    this.name     = 'StructuringAgent';
  }

  async run(state) {
    const tracer = createTracer(
      { trace: this.trace },
      state.contractId,
      this.name,
      state.fileName
    );

    await tracer.log('structuring_started', {
      data: { textLength: state.extractedText?.length }
    });

    const documentType    = await this._classify(state, tracer);
    const extractedFields = await this._extract(state, documentType, tracer);

    await tracer.log('structuring_complete', {
      data: {
        documentType,
        fieldCount: Object.keys(extractedFields).length,
      }
    });

    return { ...state, documentType, extractedFields };
  }

  async _classify(state, tracer) {
    const start = Date.now();
    console.log(`[${this.name}] Classifying...`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'classifying' }),
    });

    const raw          = await this.classify.invoke({
      text: state.extractedText,
      contractId: state.contractId,
    });
    const result       = this._parse(raw);
    const documentType = result.document_type || 'other';

    await tracer.log('classified', {
      tool: 'classify',
      data: { documentType, confidence: result.confidence },
      durationMs: Date.now() - start,
    });

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

  async _extract(state, documentType, tracer) {
    const start = Date.now();
    console.log(`[${this.name}] Extracting fields for: ${documentType}`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const raw        = await this.extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType,
    });
    const result     = this._parse(raw);
    const rawFields  = result.extracted_info || result;

    const extractedFields = {};
    Object.entries(rawFields).forEach(([k, v]) => {
      if (typeof v === 'string') extractedFields[k] = v;
    });

    await tracer.log('extracted', {
      tool: 'extract',
      data: {
        fieldCount: Object.keys(extractedFields).length,
        fields:     Object.keys(extractedFields),
      },
      durationMs: Date.now() - start,
    });

    console.log(`[${this.name}] Extracted ${Object.keys(extractedFields).length} fields`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'extracted',
        extractedFields,
        documentTypeLabel: getLabel(documentType),
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