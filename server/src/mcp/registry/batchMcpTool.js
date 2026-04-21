const { z }   = require('zod');
const Batch   = require('../../models/batchModel');

const batchMcpTool = {
  name: 'batch',

  description:
    'Creates and updates batch processing records. ' +
    'Use to create a batch, update item status, and finalize batch results.',

  schema: {
    action: z.enum(['create', 'update_item', 'finalize'])
      .describe('Action to perform on the batch record'),
    batchId: z.string().optional()
      .describe('Batch _id — required for update_item and finalize'),
    name: z.string().optional()
      .describe('Batch name — used when action is create'),
    total: z.number().optional()
      .describe('Total number of items — used when action is create'),
    itemIndex: z.number().optional()
      .describe('Index of the item to update — used with update_item'),
    itemUpdate: z.string().optional()
      .describe('JSON string of fields to update on the item'),
    finalStats: z.string().optional()
      .describe('JSON string of final batch stats — used with finalize'),
  },

  handler: async ({ action, batchId, name, total, itemIndex, itemUpdate, finalStats }) => {
    if (action === 'create') {
      const batch = await Batch.create({
        name:   name || `batch-${Date.now()}`,
        status: 'processing',
        stats:  { total: total || 0, completed: 0, failed: 0, pending: total || 0 },
        items:  [],
      });
      return { success: true, batchId: batch._id.toString() };
    }

    if (action === 'update_item') {
      const update = JSON.parse(itemUpdate || '{}');
      const batch  = await Batch.findById(batchId);
      if (!batch) throw new Error(`Batch not found: ${batchId}`);

      if (itemIndex !== undefined && batch.items[itemIndex]) {
        Object.assign(batch.items[itemIndex], update);
      } else {
        batch.items.push(update);
      }

      // Recalculate stats
      batch.stats.completed = batch.items.filter(i => i.status === 'completed').length;
      batch.stats.failed    = batch.items.filter(i => i.status === 'failed').length;
      batch.stats.pending   = batch.items.filter(i => i.status === 'pending').length;

      await batch.save();
      return { success: true, batchId, itemIndex };
    }

    if (action === 'finalize') {
      const stats = JSON.parse(finalStats || '{}');
      const finalStatus = stats.failed === 0
        ? 'completed'
        : stats.completed === 0 ? 'failed' : 'completed_with_errors';

      await Batch.findByIdAndUpdate(batchId, {
        $set: {
          status:         finalStatus,
          stats,
          totalDurationMs: stats.totalDurationMs || null,
        },
      });

      return { success: true, batchId, finalStatus };
    }

    throw new Error(`Unknown batch action: ${action}`);
  },
};

module.exports = { batchMcpTool };