const { createTracer } = require('../langchain/traceHelper');

class OcrAgent {
  constructor(tools) {
    this.ocr     = tools.ocr;
    this.storage = tools.storage;
    this.trace   = tools.trace;
    this.name    = 'OcrAgent';
  }

  async run(state) {
    const tracer = createTracer(
      { trace: this.trace },
      state.contractId,
      this.name,
      state.fileName
    );

    const start = Date.now();
    console.log(`\n[${this.name}] Starting OCR`);

    await tracer.log('ocr_started', {
      data: { fileName: state.fileName, mimeType: state.mimeType }
    });

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'ocr_processing' }),
    });

    try {
      const raw    = await this.ocr.invoke({
        filePath: state.filePath,
        fileName: state.fileName,
        mimeType: state.mimeType,
      });
      const result = this._parse(raw);
      this._validateOutput(result);

      const durationMs = Date.now() - start;
      console.log(`[${this.name}] OCR complete — ${result.character_count} characters`);

      await tracer.log('ocr_complete', {
        tool: 'ocr',
        data: { characterCount: result.character_count },
        durationMs,
      });

      await this.storage.invoke({
        contractId: state.contractId,
        updates: JSON.stringify({
          status: 'ocr_done',
          extractedText: result.extracted_text,
        }),
      });

      return {
        ...state,
        extractedText:  result.extracted_text,
        characterCount: result.character_count,
      };

    } catch (err) {
      await tracer.error('ocr_failed', err, { tool: 'ocr' });
      throw err;
    }
  }

  _parse(raw) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  _validateOutput(result) {
    if (!result.extracted_text || result.extracted_text.trim().length < 10) {
      throw new Error(
        `OCR produced insufficient text (${result.character_count || 0} chars)`
      );
    }
  }
}

module.exports = { OcrAgent };