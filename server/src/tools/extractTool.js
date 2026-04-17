// extractTool.js
// Wraps your Extraction Python agent as a LangChain Tool.
// Takes text + document type, returns structured key fields.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const axios = require('axios');

const extractToolSchema = z.object({
  text: z.string().describe('The raw text extracted from the document'),
  contractId: z.string().describe('The MongoDB _id of the contract record'),
  documentType: z.string().describe('The document type returned by the classification tool'),
});

const extractTool = tool(
  async ({ text, contractId, documentType }) => {
    const agentUrl = process.env.EXTRACTION_AGENT_URL || 'http://localhost:8003';

    const response = await axios.post(
      `${agentUrl}/process`,
      {
        text,
        contract_id: contractId,
        document_type: documentType,
      },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Extraction agent failed: ${JSON.stringify(response.data)}`);
    }

    return JSON.stringify({
      extracted_info: response.data.extracted_info,
    });
  },
  {
    name: 'extract_tool',
    description:
      'Extracts key fields from a contract: employee name, salary, start date, ' +
      'end date, job title, company name, notice period, etc. ' +
      'Input: text, contract ID, and document type. ' +
      'Output: JSON string with extracted_info object.',
    schema: extractToolSchema,
  }
);

module.exports = { extractTool };