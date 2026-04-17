// employmentChain.js
// Dedicated processing chain for employment contracts.
// This chain runs the full extraction + summarization pipeline
// optimized for employment contract fields:
// employee name, salary, dates, job title, company, notice period.

const { RunnableSequence } = require('@langchain/core/runnables');
const { extractTool } = require('../../tools/extractTool');
const { summarizeTool } = require('../../tools/summarizeTool');
const { mongoUpdateTool } = require('../../tools/mongoTool');

// ── STEP: Extract employment-specific fields ───────────────────────────────
async function stepExtractEmployment(state) {
  console.log('[EmploymentChain] Extracting employment contract fields...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'extracting' }),
  });

  const resultStr = await extractTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: 'employment_contract',
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

  console.log('[EmploymentChain] Extraction complete:', result.extracted_info);

  return {
    ...state,
    extractedInfo: result.extracted_info,
  };
}

// ── STEP: Generate employment contract summary ─────────────────────────────
async function stepSummarizeEmployment(state) {
  console.log('[EmploymentChain] Generating employment contract summary...');

  await mongoUpdateTool.invoke({
    contractId: state.contractId,
    updates: JSON.stringify({ status: 'summarizing' }),
  });

  const resultStr = await summarizeTool.invoke({
    text: state.extractedText,
    contractId: state.contractId,
    documentType: 'employment_contract',
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

  console.log(`[EmploymentChain] Summary complete (${result.summary.length} chars)`);

  return {
    ...state,
    summary: result.summary,
  };
}

// Build and export the employment contract chain
const employmentChain = RunnableSequence.from([
  stepExtractEmployment,
  stepSummarizeEmployment,
]);

module.exports = { employmentChain };