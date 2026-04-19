const { OcrAgent }         = require('./OcrAgent');
const { StructuringAgent } = require('./StructuringAgent');
const { SummaryAgent }     = require('./SummaryAgent');
const { ValidationAgent }  = require('./ValidationAgent');

class AgentCoordinator {
  constructor(tools) {
    this.ocrAgent = new OcrAgent({
      ocr:     tools.ocr,
      storage: tools.storage,
      trace:   tools.trace,
    });

    this.structuringAgent = new StructuringAgent({
      classify: tools.classify,
      extract:  tools.extract,
      storage:  tools.storage,
      trace:    tools.trace,
    });

    this.summaryAgent = new SummaryAgent({
      summarize: tools.summarize,
      storage:   tools.storage,
      trace:     tools.trace,
    });

    this.validationAgent = new ValidationAgent({
      storage: tools.storage,
      trace:   tools.trace,
    });
  }

  async run(initialState) {
    let state = initialState;
    state = await this.ocrAgent.run(state);
    state = await this.structuringAgent.run(state);
    state = await this.summaryAgent.run(state);
    state = await this.validationAgent.run(state);
    return state;
  }
}

module.exports = { AgentCoordinator };