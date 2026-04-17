// mongoTool.js
// A LangChain Tool that updates contract status in MongoDB.
// This replaces the scattered "Contract.findByIdAndUpdate" calls
// that currently live inside contractController.js.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const Contract = require('../models/contractModel');

const mongoUpdateSchema = z.object({
  contractId: z.string().describe('The MongoDB _id of the contract to update'),
  updates: z.string().describe(
    'JSON string of fields to update on the contract record. ' +
    'Example: {"status": "ocr_done", "extractedText": "..."}'
  ),
});

const mongoUpdateTool = tool(
  async ({ contractId, updates }) => {
    // Parse the updates JSON string back into an object
    const updateObject = JSON.parse(updates);

    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      updateObject,
      { new: true } // return the updated document
    );

    if (!updatedContract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    console.log(`[MongoTool] Updated contract ${contractId}:`, updateObject);

    return JSON.stringify({
      success: true,
      contractId,
      updatedFields: Object.keys(updateObject),
    });
  },
  {
    name: 'mongo_update_tool',
    description:
      'Updates a contract record in MongoDB. ' +
      'Use this after each processing step to persist results and advance the status field. ' +
      'Input: contract ID and a JSON string of fields to update. ' +
      'Output: confirmation JSON.',
    schema: mongoUpdateSchema,
  }
);

module.exports = { mongoUpdateTool };