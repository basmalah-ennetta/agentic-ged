// genericChain.js
// Fallback chain for any document type without a dedicated chain.
// Runs basic extraction and a generic summary.
// This ensures the system never fails on unknown document types —
// it always produces some useful output.

const { RunnableSequence } = require('@langchain/core/runnables');
const { extractTool } = require('../../tools/extractTool');
const { genericSummaryTool } = require('../../tools/genericSummaryTool');
const { mongoUpdateTool } = require('../../tools/mongoTool');

async function stepExtractGeneric(state) {
  console.log(`[GenericChain] Running generic extraction for: ${state.documentType}`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'extracting' }),
  });

  const resultStr = await extractTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: state.documentType,
  });

  const result = JSON.parse(resultStr);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'extracted',
      extractedInfo: {
        employeeName: result.extracted_info.employeeName || '',
        salary: result.extracted_info.salary || '',
        startDate: result.extracted_info.startDate || '',
        endDate: result.extracted_info.endDate || '',
        jobTitle: result.extracted_info.jobTitle || '',
        companyName: result.extracted_info.companyName || '',
      },
    }),
  });

  return {
    ...state,
    extractedInfo: result.extracted_info,
  };
}

async function stepSummarizeGeneric(state) {
  console.log(`[GenericChain] Running generic summary for: ${state.documentType}`);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'summarizing' }),
  });

  const resultStr = await genericSummaryTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: state.documentType,
  });

  const result = JSON.parse(resultStr);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'completed',
      summary: result.summary,
    }),
  });

  return {
    ...state,
    summary: result.summary,
  };
}

const genericChain = RunnableSequence.from([
  stepExtractGeneric,
  stepSummarizeGeneric,
]);

module.exports = { genericChain };