// SummaryAgent.js
// Responsibility: Generate a human-readable summary of the document.
// Uses all previously gathered data (text + type + fields) as context
// to produce a richer, more accurate summary.
//
// This agent does NOT know:
//   - Anything about OCR, classification, or extraction
//   - How the extracted fields were obtained
//   - Any business rules about document validation

class SummaryAgent {
  constructor(tools) {
    this.summarize = tools.summarize;
    this.storage = tools.storage;
    this.name = 'SummaryAgent';
  }

  /**
   * run(state)
   * Generates and persists a document summary.
   *
   * @param {object} state - Must contain:
   *   contractId, extractedText, documentType, extractedInfo
   * @returns {object} Updated state with summary added
   */
  async run(state) {
    console.log(`\n[${this.name}] Generating summary`);
    console.log(`[${this.name}] Document type: ${state.documentType}`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    const raw = await this.summarize.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: state.documentType,
      extractedInfo: JSON.stringify(state.extractedInfo || {}),
    });

    const result = this._parse(raw);
    const summary = result.summary || result;

    console.log(`[${this.name}] Summary generated (${summary.length} chars)`);

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ summary }),
    });

    return {
      ...state,
      summary,
    };
  }

  _parse(raw) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
}

module.exports = { SummaryAgent };