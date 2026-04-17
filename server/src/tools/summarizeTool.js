// summarizeTool.js
// Wraps your Summarization Python agent as a LangChain Tool.
// Takes all gathered data, returns a human-readable summary.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const axios = require('axios');

const summarizeToolSchema = z.object({
  text: z.string().describe('The full extracted text from the document'),
  contractId: z.string().describe('The MongoDB _id of the contract record'),
  documentType: z.string().describe('The classified document type'),
  extractedInfo: z.string().describe('JSON string of the extracted key fields'),
});

const summarizeTool = tool(
  async ({ text, contractId, documentType, extractedInfo }) => {
    const agentUrl = process.env.SUMMARIZATION_AGENT_URL || 'http://localhost:8004';

    // Parse extractedInfo back from string to object
    const extractedInfoObj = JSON.parse(extractedInfo);

    const response = await axios.post(
      `${agentUrl}/process`,
      {
        text,
        contract_id: contractId,
        document_type: documentType,
        extracted_info: extractedInfoObj,
      },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Summarization agent failed: ${JSON.stringify(response.data)}`);
    }

    return JSON.stringify({
      summary: response.data.summary,
    });
  },
  {
    name: 'summarize_tool',
    description:
      'Generates a professional 2-3 paragraph summary of the contract. ' +
      'Input: full text, contract ID, document type, and extracted fields. ' +
      'Output: JSON string with the summary paragraph.',
    schema: summarizeToolSchema,
  }
);

module.exports = { summarizeTool };