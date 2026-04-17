// classifyMcpTool.js
// Registers document classification as an MCP tool.

const { z } = require('zod');
const axios = require('axios');

const classifyMcpTool = {
  name: 'classify',

  description:
    'Classifies a document into a category: employment_contract, nda, ' +
    'freelance_agreement, internship_agreement, amendment, ' +
    'termination_letter, or other.',

  schema: {
    text: z.string().describe('Extracted text from the document'),
    contractId: z.string().describe('MongoDB _id of the contract record'),
  },

  handler: async ({ text, contractId }) => {
    const agentUrl =
      process.env.CLASSIFICATION_AGENT_URL || 'http://localhost:8002';

    const response = await axios.post(
      `${agentUrl}/process`,
      { text, contract_id: contractId },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Classification failed: ${JSON.stringify(response.data)}`);
    }

    return {
      document_type: response.data.document_type,
      confidence: response.data.confidence,
      reasoning: response.data.reasoning,
    };
  },
};

module.exports = { classifyMcpTool };