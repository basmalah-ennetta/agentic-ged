// genericChain.js
// Phase 2: Receives tools as parameter instead of direct imports.

const { RunnableSequence } = require('@langchain/core/runnables');

function createGenericChain(tools) {
  const { extract, summarize, storage } = tools;

  async function stepExtractGeneric(state) {
    console.log(`[GenericChain] Extracting fields for: ${state.documentType}`);

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const resultStr = await extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: state.documentType,
    });

    const result = typeof resultStr === 'string'
      ? JSON.parse(resultStr)
      : resultStr;

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

    return { ...state, extractedInfo };
  }

  async function stepSummarizeGeneric(state) {
    console.log(`[GenericChain] Summarizing: ${state.documentType}`);

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    const resultStr = await summarize.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: state.documentType,
      extractedInfo: JSON.stringify(state.extractedInfo),
    });

    const result = typeof resultStr === 'string'
      ? JSON.parse(resultStr)
      : resultStr;

    const summary = result.summary || result;

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'completed', summary }),
    });

    return { ...state, summary };
  }

  return RunnableSequence.from([stepExtractGeneric, stepSummarizeGeneric]);
}

module.exports = { createGenericChain };