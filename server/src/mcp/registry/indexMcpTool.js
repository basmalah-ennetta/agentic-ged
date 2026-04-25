const { z }           = require('zod');
const axios           = require('axios');
const DocumentIndex   = require('../../models/indexModel');

const indexMcpTool = {
  name: 'index',

  description:
    'Extracts keywords, entities and tags from a document and stores ' +
    'a searchable index record in MongoDB. Called after pipeline completes.',

  schema: {
    documentId:      z.string().describe('MongoDB _id of the document'),
    fileName:        z.string().describe('Original filename'),
    documentType:    z.string().describe('Classified document type'),
    text:            z.string().describe('Extracted text from OCR'),
    extractedFields: z.string().optional()
      .describe('JSON string of extracted key fields'),
  },

  handler: async ({ documentId, fileName, documentType, text, extractedFields }) => {
    const agentUrl = process.env.INDEXING_AGENT_URL || 'http://localhost:8005';

    let parsedFields = {};
    if (extractedFields) {
      try { parsedFields = JSON.parse(extractedFields); } catch {}
    }

    // Call the Python indexing agent
    const response = await axios.post(
      `${agentUrl}/process`,
      {
        text,
        document_id:      documentId,
        document_type:    documentType,
        extracted_fields: parsedFields,
        file_name:        fileName,
      },
      { timeout: 120000 }
    );

    if (!response.data.success) {
      throw new Error(`Indexing failed: ${JSON.stringify(response.data)}`);
    }

    const { keywords, entities, tags } = response.data;

    // Store the index in MongoDB
    await DocumentIndex.findOneAndUpdate(
      { documentId },
      {
        $set: {
          documentId,
          fileName,
          documentType,
          keywords,
          entities,
          tags,
          textSnippet:  text.substring(0, 2000),
          indexedAt:    new Date(),
          indexVersion: 1,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[MCP:index] Indexed ${fileName}: ${keywords.length} keywords, ${tags.length} tags`);

    return {
      success:          true,
      documentId,
      keywordCount:     keywords.length,
      tagCount:         tags.length,
      entityCount:      Object.values(entities).flat().length,
    };
  },
};

module.exports = { indexMcpTool };