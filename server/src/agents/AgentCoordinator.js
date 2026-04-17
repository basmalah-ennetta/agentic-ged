// AgentCoordinator.js
// Coordinates the four specialized agents.
// Each agent receives the tools it needs — nothing more.
// Agents run in sequence; each one's output becomes the next one's input.
//
// To add a new agent:
//   1. Create MyNewAgent.js in this folder
//   2. Import it here
//   3. Add it to the run() sequence
//   That's it — no other file needs to change.

const { OcrAgent }         = require('./OcrAgent');
const { StructuringAgent } = require('./StructuringAgent');
const { SummaryAgent }     = require('./SummaryAgent');
const { ValidationAgent }  = require('./ValidationAgent');

class AgentCoordinator {
  constructor(tools) {
    // Each agent receives only the tools it actually needs
    // This enforces clean separation — agents cannot accidentally
    // use tools they are not supposed to touch

    this.ocrAgent = new OcrAgent({
      ocr:     tools.ocr,
      storage: tools.storage,
    });

    this.structuringAgent = new StructuringAgent({
      classify: tools.classify,
      extract:  tools.extract,
      storage:  tools.storage,
    });

    this.summaryAgent = new SummaryAgent({
      summarize: tools.summarize,
      storage:   tools.storage,
    });

    this.validationAgent = new ValidationAgent({
      storage: tools.storage,
    });
  }

  /**
   * run(initialState)
   * Runs all agents in sequence.
   * Each agent receives the accumulated state from all previous agents.
   *
   * Pipeline:
   *   OcrAgent → StructuringAgent → SummaryAgent → ValidationAgent
   *
   * @param {object} initialState
   * @returns {object} Final state with all results
   */
  async run(initialState) {
    let state = initialState;

    // Agent 1 — Read and extract text from file
    state = await this.ocrAgent.run(state);

    // Agent 2 — Classify and extract structured fields
    state = await this.structuringAgent.run(state);

    // Agent 3 — Generate human-readable summary
    state = await this.summaryAgent.run(state);

    // Agent 4 — Validate completeness of results
    state = await this.validationAgent.run(state);

    return state;
  }
}

module.exports = { AgentCoordinator };