// summarizeMcpTool.js
// Registers document summarization as an MCP tool.

const { z } = require('zod');
const axios = require('axios');

const summarizeMcpTool = {
  name: 'summarize',

  description:
    'Generates a professional 2-3 paragraph summary of a document. ' +
    'Uses extracted fields as context for a richer summary.',

  schema: {
    text: z.string().describe('Full extracted text'),
    contractId: z.string().describe('MongoDB _id of the contract'),
    documentType: z.string().describe('Document type'),
    extractedInfo: z
      .string()
      .describe('JSON string of extracted key fields'),
  },

  handler: async ({ text, contractId, documentType, extractedInfo }) => {
    const agentUrl =
      process.env.SUMMARIZATION_AGENT_URL || 'http://localhost:8004';

    const response = await axios.post(
      `${agentUrl}/process`,
      {
        text,
        contract_id: contractId,
        document_type: documentType,
        extracted_info: JSON.parse(extractedInfo),
      },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Summarization failed: ${JSON.stringify(response.data)}`);
    }

    return {
      summary: response.data.summary,
    };
  },
};

module.exports = { summarizeMcpTool };