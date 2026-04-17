// ndaChain.js
// Dedicated processing chain for Non-Disclosure Agreements.
// NDAs have different key fields than employment contracts:
// parties involved, confidentiality scope, duration, jurisdiction.
// The extraction agent already handles these — we just pass the
// correct document_type so it uses the right prompt context.

const { RunnableSequence } = require('@langchain/core/runnables');
const { extractTool } = require('../../tools/extractTool');
const { summarizeTool } = require('../../tools/summarizeTool');
const { mongoUpdateTool } = require('../../tools/mongoTool');

async function stepExtractNDA(state) {
  console.log('[NDAChain] Extracting NDA fields...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'extracting' }),
  });

  const resultStr = await extractTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    // Pass 'nda' as the document type — extraction agent uses this
    // to focus on NDA-specific fields like parties, scope, duration
    documentType: 'nda',
  });

  const result = JSON.parse(resultStr);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'extracted',
      extractedInfo: {
        // NDA may have different fields — we store what was found
        employeeName: result.extracted_info.employeeName || '',
        companyName: result.extracted_info.companyName || '',
        startDate: result.extracted_info.startDate || '',
        endDate: result.extracted_info.endDate || '',
        // NDA-specific fields stored in available slots
        salary: result.extracted_info.salary || '',
        jobTitle: result.extracted_info.jobTitle || '',
      },
    }),
  });

  console.log('[NDAChain] NDA extraction complete');

  return {
    ...state,
    extractedInfo: result.extracted_info,
  };
}

async function stepSummarizeNDA(state) {
  console.log('[NDAChain] Generating NDA summary...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'summarizing' }),
  });

  const resultStr = await summarizeTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: 'nda',
    extractedInfo: JSON.stringify(state.extractedInfo),
  });

  const result = JSON.parse(resultStr);

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({
      status: 'completed',
      summary: result.summary,
    }),
  });

  console.log(`[NDAChain] NDA summary complete (${result.summary.length} chars)`);

  return {
    ...state,
    summary: result.summary,
  };
}

const ndaChain = RunnableSequence.from([
  stepExtractNDA,
  stepSummarizeNDA,
]);

module.exports = { ndaChain };