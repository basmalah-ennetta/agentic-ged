const { createTracer } = require('../langchain/traceHelper');
const { getDocumentType } = require('../config/documentTypes');

class ValidationAgent {
  constructor(tools) {
    this.storage = tools.storage;
    this.trace   = tools.trace;
    this.index   = tools.index;   // ADD
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
        status:            'completed',
        validationWarnings: warnings,
        validationPassed:  passed,
      }),
    });

    // Auto-indexation — runs after validation regardless of pass/fail
    await this._runIndexing(state, tracer);

    return { ...state, validationWarnings: warnings, validationPassed: passed };
  }

  async _runIndexing(state, tracer) {
    if (!this.index) {
      console.log(`[${this.name}] Index tool not available — skipping indexation`);
      return;
    }

    try {
      console.log(`[${this.name}] Running auto-indexation...`);

      await tracer.log('indexing_started', {
        data: { documentType: state.documentType }
      });

      const result = await this.index.invoke({
        documentId:      state.contractId,
        fileName:        state.fileName || 'unknown',
        documentType:    state.documentType || 'other',
        text:            state.extractedText || '',
        extractedFields: JSON.stringify(state.extractedFields || {}),
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      await tracer.log('indexing_complete', {
        data: {
          keywordCount: parsed.keywordCount,
          tagCount:     parsed.tagCount,
          entityCount:  parsed.entityCount,
        }
      });

      console.log(`[${this.name}] Indexation complete — ${parsed.keywordCount} keywords`);

    } catch (err) {
      // Indexation failure must NOT fail the pipeline
      // Document is already completed — indexation is additive
      console.error(`[${this.name}] Indexation failed (non-fatal):`, err.message);
      await tracer.error('indexing_failed', err);
    }
  }

  _checkRequiredFields(documentType, extractedFields) {
    const typeConfig = getDocumentType(documentType);
    return (typeConfig.requiredFields || [])
      .filter(f => !extractedFields[f] || extractedFields[f].trim() === '')
      .map(f => `Required field "${f}" is missing for ${documentType}`);
  }
}

module.exports = { ValidationAgent };