// OcrAgent.js
// Responsibility: Read a file (PDF or image) and return extracted text.
//
// This agent knows:
//   - How to handle PDFs vs images (different MIME types)
//   - How to report progress via the storage tool
//   - How to validate OCR output (is the text long enough to be useful?)
//
// This agent does NOT know:
//   - Anything about document classification
//   - Anything about extraction or summarization
//   - Anything about MongoDB schema (it uses the storage tool as a black box)

class OcrAgent {
  constructor(tools) {
    // Tools are injected — OcrAgent never imports tools directly
    // This makes it fully decoupled from the MCP implementation
    this.ocr = tools.ocr;
    this.storage = tools.storage;
    this.name = 'OcrAgent';
  }

  /**
   * run(state)
   * Main entry point for the OcrAgent.
   * Receives pipeline state, adds extractedText, returns updated state.
   *
   * @param {object} state - Must contain: contractId, filePath, fileName, mimeType
   * @returns {object} Updated state with extractedText and characterCount added
   */
  async run(state) {
    console.log(`\n[${this.name}] Starting OCR`);
    console.log(`[${this.name}] File: ${state.fileName} (${state.mimeType})`);

    // Report progress to MongoDB via storage tool
    await this._updateStatus(state.contractId, 'ocr_processing');

    // Call the OCR tool via MCP
    const raw = await this.ocr.invoke({
      filePath: state.filePath,
      fileName: state.fileName,
      mimeType: state.mimeType,
    });

    const result = this._parse(raw);

    // Validate the OCR output
    this._validateOutput(result);

    const extractedText = result.extracted_text;
    const characterCount = result.character_count;

    console.log(`[${this.name}] OCR complete — ${characterCount} characters extracted`);

    // Persist results via storage tool
    await this._updateStatus(state.contractId, 'ocr_done', {
      extractedText,
    });

    return {
      ...state,
      extractedText,
      characterCount,
    };
  }

  // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

  async _updateStatus(contractId, status, extraFields = {}) {
    await this.storage.invoke({
      contractId,
      updates: JSON.stringify({ status, ...extraFields }),
    });
  }

  _parse(raw) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  _validateOutput(result) {
    if (!result.extracted_text || result.extracted_text.trim().length < 10) {
      throw new Error(
        `[${this.name}] OCR produced insufficient text ` +
        `(${result.character_count || 0} chars). ` +
        `The file may be blank, corrupted, or unreadable.`
      );
    }
  }
}

module.exports = { OcrAgent };