// extractMcpTool.js
// Registers key field extraction as an MCP tool.

const { z } = require('zod');
const axios = require('axios');

const extractMcpTool = {
  name: 'extract',

  description:
    'Extracts structured key fields from document text. ' +
    'Fields depend on document type: name, salary, dates, title, company, etc.',

  schema: {
    text: z.string().describe('Extracted text from the document'),
    contractId: z.string().describe('MongoDB _id of the contract'),
    documentType: z.string().describe('Document type from classification'),
  },

  handler: async ({ text, contractId, documentType }) => {
    const agentUrl =
      process.env.EXTRACTION_AGENT_URL || 'http://localhost:8003';

    const response = await axios.post(
      `${agentUrl}/process`,
      { text, contract_id: contractId, document_type: documentType },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Extraction failed: ${JSON.stringify(response.data)}`);
    }

    return {
      extracted_info: response.data.extracted_info,
    };
  },
};

module.exports = { extractMcpTool };