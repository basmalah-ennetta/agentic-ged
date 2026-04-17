// storageMcpTool.js
// Registers MongoDB contract updates as an MCP tool.
// This is the only tool that touches the database directly.
// All agents that need to persist data call this tool —
// they never touch MongoDB themselves.

const { z } = require('zod');
const Contract = require('../../models/contractModel');

const storageMcpTool = {
  name: 'storage',

  description:
    'Updates a contract record in MongoDB. ' +
    'Call this after each processing step to persist results ' +
    'and advance the pipeline status.',

  schema: {
    contractId: z.string().describe('MongoDB _id of the contract'),
    updates: z
      .string()
      .describe('JSON string of fields to update e.g. {"status":"ocr_done"}'),
  },

  handler: async ({ contractId, updates }) => {
    const updateObject = JSON.parse(updates);

    const updated = await Contract.findByIdAndUpdate(
      contractId,
      updateObject,
      { new: true }
    );

    if (!updated) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    console.log(`[MCP:storage] Updated ${contractId}:`, Object.keys(updateObject));

    return {
      success: true,
      contractId,
      updatedFields: Object.keys(updateObject),
    };
  },
};

module.exports = { storageMcpTool };