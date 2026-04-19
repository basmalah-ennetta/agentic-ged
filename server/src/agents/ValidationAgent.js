const { createTracer } = require('../langchain/traceHelper');
const { getDocumentType } = require('../config/documentTypes');

class ValidationAgent {
  constructor(tools) {
    this.storage = tools.storage;
    this.trace   = tools.trace;
    this.name    = 'ValidationAgent';
  }

  async run(state) {
    const tracer = createTracer(
      { trace: this.trace },
      state.contractId,
      this.name,
      state.fileName
    );

    await tracer.log('validation_started', {
      data: { documentType: state.documentType }
    });

    const warnings = [];

    const fieldWarnings = this._checkRequiredFields(
      state.documentType,
      state.extractedFields || {}
    );
    warnings.push(...fieldWarnings);

    if (!state.summary || state.summary.trim().length < 20) {
      warnings.push('Summary is missing or too short');
    }
    if (!state.extractedText || state.extractedText.length < 100) {
      warnings.push('Extracted text is very short — OCR quality may be poor');
    }

    const passed = warnings.length === 0;

    await tracer.log(passed ? 'validation_passed' : 'validation_warnings', {
      data: { warnings, warningCount: warnings.length }
    });

    if (passed) {
      console.log(`[${this.name}] Validation passed`);
    } else {
      console.log(`[${this.name}] ${warnings.length} warning(s):`);
      warnings.forEach(w => console.log(`  - ${w}`));
    }

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'completed',
        validationWarnings: warnings,
        validationPassed:   passed,
      }),
    });

    return { ...state, validationWarnings: warnings, validationPassed: passed };
  }

  _checkRequiredFields(documentType, extractedFields) {
    const typeConfig = getDocumentType(documentType);
    return (typeConfig.requiredFields || [])
      .filter(f => !extractedFields[f] || extractedFields[f].trim() === '')
      .map(f => `Required field "${f}" is missing for ${documentType}`);
  }
}

module.exports = { ValidationAgent };