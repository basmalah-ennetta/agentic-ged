// employmentChain.js
// Phase 2: Chain now receives tools as a parameter instead of
// importing them directly. This makes it work with both:
//   - Direct LangChain tools (old way, still works)
//   - MCP client tools (new way, Phase 2+)
//
// The chain itself does not change — only how it gets its tools.

const { RunnableSequence } = require('@langchain/core/runnables');

/**
 * createEmploymentChain(tools)
 * Factory function — creates the employment chain using the
 * provided tools object.
 *
 * @param {object} tools - Object with named tool references:
 *   { extract, summarize, storage }
 */
function createEmploymentChain(tools) {
  const { extract, summarize, storage } = tools;

  async function stepExtractEmployment(state) {
    console.log('[EmploymentChain] Extracting employment contract fields...');

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const resultStr = await extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: 'employment_contract',
    });

    // MCP tools return JSON strings — parse them
    const result = typeof resultStr === 'string'
      ? JSON.parse(resultStr)
      : resultStr;

    // Handle MCP response wrapper if present
    const extractedInfo = result.extracted_info || result;

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'extracted',
        extractedInfo: {
          employeeName: extractedInfo.employeeName || '',
          salary: extractedInfo.salary || '',
          startDate: extractedInfo.startDate || '',
          endDate: extractedInfo.endDate || '',
          jobTitle: extractedInfo.jobTitle || '',
          companyName: extractedInfo.companyName || '',
        },
      }),
    });

    console.log('[EmploymentChain] Extraction complete');

    return { ...state, extractedInfo };
  }

  async function stepSummarizeEmployment(state) {
    console.log('[EmploymentChain] Generating summary...');

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    const resultStr = await summarize.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: 'employment_contract',
      extractedInfo: JSON.stringify(state.extractedInfo),
    });

    const result = typeof resultStr === 'string'
      ? JSON.parse(resultStr)
      : resultStr;

    const summary = result.summary || result;

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({
        status: 'completed',
        summary,
      }),
    });

    console.log(`[EmploymentChain] Summary complete (${summary.length} chars)`);

    return { ...state, summary };
  }

  return RunnableSequence.from([
    stepExtractEmployment,
    stepSummarizeEmployment,
  ]);
}

module.exports = { createEmploymentChain };