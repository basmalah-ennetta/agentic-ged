// classifyTool.js
// Wraps your Classification Python agent as a LangChain Tool.
// Takes extracted text, returns the document type.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const axios = require('axios');

const classifyToolSchema = z.object({
  text: z.string().describe('The raw text extracted from the document by the OCR tool'),
  contractId: z.string().describe('The MongoDB _id of the contract record'),
});

const classifyTool = tool(
  async ({ text, contractId }) => {
    const agentUrl = process.env.CLASSIFICATION_AGENT_URL || 'http://localhost:8002';

    const response = await axios.post(
      `${agentUrl}/process`,
      { text, contract_id: contractId },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Classification agent failed: ${JSON.stringify(response.data)}`);
    }

    return JSON.stringify({
      document_type: response.data.document_type,
      confidence: response.data.confidence,
      reasoning: response.data.reasoning,
    });
  },
  {
    name: 'classify_tool',
    description:
      'Classifies a document into a category such as employment_contract, nda, ' +
      'freelance_agreement, etc. using an AI model. ' +
      'Input: extracted text and contract ID. ' +
      'Output: JSON string with document_type and confidence.',
    schema: classifyToolSchema,
  }
);

module.exports = { classifyTool };