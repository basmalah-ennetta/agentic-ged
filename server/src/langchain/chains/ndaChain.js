// ndaChain.js
// Phase 2: Receives tools as parameter instead of direct imports.

const { RunnableSequence } = require('@langchain/core/runnables');

function createNdaChain(tools) {
  const { extract, summarize, storage } = tools;

  async function stepExtractNDA(state) {
    console.log('[NDAChain] Extracting NDA fields...');

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'extracting' }),
    });

    const resultStr = await extract.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: 'nda',
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
          companyName: extractedInfo.companyName || '',
          startDate: extractedInfo.startDate || '',
          endDate: extractedInfo.endDate || '',
          salary: extractedInfo.salary || '',
          jobTitle: extractedInfo.jobTitle || '',
        },
      }),
    });

    console.log('[NDAChain] Extraction complete');

    return { ...state, extractedInfo };
  }

  async function stepSummarizeNDA(state) {
    console.log('[NDAChain] Generating NDA summary...');

    await storage.invoke({
      contractId: state.contractId,
      updates: JSON.stringify({ status: 'summarizing' }),
    });

    const resultStr = await summarize.invoke({
      text: state.extractedText,
      contractId: state.contractId,
      documentType: 'nda',
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

    console.log(`[NDAChain] Summary complete (${summary.length} chars)`);

    return { ...state, summary };
  }

  return RunnableSequence.from([stepExtractNDA, stepSummarizeNDA]);
}

module.exports = { createNdaChain };