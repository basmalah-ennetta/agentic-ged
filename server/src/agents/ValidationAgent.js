// ValidationAgent.js
// Phase 5: Reads validation rules from documentTypes config.
// No HR-specific field names hardcoded here.

const { getDocumentType } = require('../config/documentTypes');

class ValidationAgent {
  constructor(tools) {
    this.storage = tools.storage;
    this.name    = 'ValidationAgent';
  }

  async run(state) {
    console.log(`\n[${this.name}] Validating results`);

    const warnings = [];

    // Check 1 — Required fields from config
    const fieldWarnings = this._checkRequiredFields(
      state.documentType,
      state.extractedFields || {}
    );
    warnings.push(...fieldWarnings);

    // Check 2 — Summary exists
    if (!state.summary || state.summary.trim().length < 20) {
      warnings.push('Summary is missing or too short');
    }

    // Check 3 — Extracted text is substantial
    if (!state.extractedText || state.extractedText.length < 100) {
      warnings.push('Extracted text is very short — OCR quality may be poor');
    }

    if (warnings.length === 0) {
      console.log(`[${this.name}] Validation passed`);
    } else {
      console.log(`[${this.name}] ${warnings.length} warning(s):`);
      warnings.forEach((w) => console.log(`  - ${w}`));
    }

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'completed',
        validationWarnings: warnings,
        validationPassed: warnings.length === 0,
      }),
    });

    return {
      ...state,
      validationWarnings: warnings,
      validationPassed: warnings.length === 0,
    };
  }

  _checkRequiredFields(documentType, extractedFields) {
    // Required fields come from config — not hardcoded here
    const typeConfig = getDocumentType(documentType);
    const required   = typeConfig.requiredFields || [];
    const warnings   = [];

    required.forEach((field) => {
      const value = extractedFields[field];
      if (!value || value.trim() === '') {
        warnings.push(
          `Required field "${field}" is missing for ${documentType}`
        );
      }
    });

    return warnings;
  }
}

module.exports = { ValidationAgent };