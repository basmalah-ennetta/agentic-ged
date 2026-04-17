// storageMcpTool.js
// Phase 5: Handles both legacy extractedInfo and new extractedFields.

const { z }        = require('zod');
const Document     = require('../../models/documentModel');
const Contract     = require('../../models/contractModel');

const storageMcpTool = {
  name: 'storage',

  description:
    'Updates a document record in MongoDB. ' +
    'Handles both new Document model and legacy Contract model.',

  schema: {
    contractId: z.string().describe('MongoDB _id of the document'),
    updates: z
      .string()
      .describe('JSON string of fields to update'),
  },

  handler: async ({ contractId, updates }) => {
    const updateObject = JSON.parse(updates);

    // Try the new Document model first, fall back to legacy Contract model
    // This ensures backward compatibility with existing records
    let updated = await Document.findByIdAndUpdate(
      contractId,
      updateObject,
      { new: true }
    );

    if (!updated) {
      updated = await Contract.findByIdAndUpdate(
        contractId,
        updateObject,
        { new: true }
      );
    }

    if (!updated) {
      throw new Error(`Document not found: ${contractId}`);
    }

    console.log(
      `[MCP:storage] Updated ${contractId}: [${Object.keys(updateObject).join(', ')}]`
    );

    return {
      success: true,
      contractId,
      updatedFields: Object.keys(updateObject),
    };
  },
};

module.exports = { storageMcpTool };