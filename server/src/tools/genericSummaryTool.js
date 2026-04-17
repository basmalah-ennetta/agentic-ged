// genericSummaryTool.js
// A fallback summarization tool for document types that do not
// have a dedicated processing chain.
// Uses the same summarization agent but with a generic prompt context.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const axios = require('axios');

const genericSummaryToolSchema = z.object({
  text: z.string().describe('The extracted text from the document'),
  contractId: z.string().describe('The MongoDB _id of the contract'),
  documentType: z.string().describe('The classified document type'),
});

const genericSummaryTool = tool(
  async ({ text, contractId, documentType }) => {
    const agentUrl = process.env.SUMMARIZATION_AGENT_URL || 'http://localhost:8004';

    const response = await axios.post(
      `${agentUrl}/process`,
      {
        text,
        contract_id: contractId,
        document_type: documentType,
        // Pass empty extracted_info for generic documents
        // The summarization agent handles this gracefully
        extracted_info: {},
      },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Generic summary failed: ${JSON.stringify(response.data)}`);
    }

    return JSON.stringify({
      summary: response.data.summary,
    });
  },
  {
    name: 'generic_summary_tool',
    description:
      'Generates a general summary for any document type that does not have ' +
      'a dedicated processing chain. Used as a fallback for unknown document types.',
    schema: genericSummaryToolSchema,
  }
);

module.exports = { genericSummaryTool };