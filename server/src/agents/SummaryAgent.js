const { createTracer } = require('../langchain/traceHelper');

class SummaryAgent {
  constructor(tools) {
    this.summarize = tools.summarize;
    this.storage   = tools.storage;
    this.trace     = tools.trace;
    this.name      = 'SummaryAgent';
  }

  async run(state) {
    const tracer = createTracer(
      { trace: this.trace },
      state.contractId,
      this.name,
      state.fileName
    );

    const start = Date.now();

    await tracer.log('summary_started', {
      data: { documentType: state.documentType }
    });

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    let raw;
    try {
      raw = await this.summarize.invoke({
        text:          state.extractedText,
        contractId:    state.contractId,
        documentType:  state.documentType,
        extractedInfo: JSON.stringify(state.extractedFields || {}),
      });
    } catch (err) {
      await tracer.error('summary_failed', err, { tool: 'summarize' });
      throw err;
    }

    const result  = this._parse(raw);
    const summary = result.summary || result;

    await tracer.log('summary_complete', {
      tool: 'summarize',
      data: { summaryLength: summary.length },
      durationMs: Date.now() - start,
    });

    await this.storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ summary }),
    });

    console.log(`[${this.name}] Summary complete (${summary.length} chars)`);
    return { ...state, summary };
  }

  _parse(raw) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
}

module.exports = { SummaryAgent };