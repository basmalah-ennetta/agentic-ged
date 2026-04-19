const { z }   = require('zod');
const Trace   = require('../../models/traceModel');

const traceMcpTool = {
  name: 'trace',

  description:
    'Records a processing step in the document trace log. ' +
    'Called by agents after every significant action.',

  schema: {
    documentId: z.string().describe('MongoDB _id of the document'),
    fileName:   z.string().optional().describe('Original filename'),
    agent:      z.string().describe('Agent name e.g. OcrAgent'),
    action:     z.string().describe('Action taken e.g. ocr_complete'),
    tool:       z.string().optional().describe('MCP tool invoked if any'),
    data:       z.string().optional().describe('JSON string of step data'),
    durationMs: z.number().optional().describe('Step duration in ms'),
    success:    z.boolean().optional().describe('Whether step succeeded'),
    error:      z.string().optional().describe('Error message if failed'),
  },

  handler: async ({
    documentId, fileName, agent, action,
    tool, data, durationMs, success, error
  }) => {
    let parsedData = null;
    if (data) {
      try { parsedData = JSON.parse(data); }
      catch { parsedData = { raw: data }; }
    }

    const step = {
      agent,
      action,
      tool:       tool       || null,
      data:       parsedData,
      durationMs: durationMs || null,
      success:    success !== undefined ? success : true,
      error:      error  || null,
      timestamp:  new Date(),
    };

    // Find or create trace for this document
    let trace = await Trace.findOne({ documentId });

    if (!trace) {
      trace = new Trace({
        documentId,
        fileName: fileName || 'unknown',
        outcome:  'running',
        steps:    [],
        stats:    { totalSteps: 0, toolCalls: 0, warnings: 0, errors: 0 },
      });
    }

    trace.steps.push(step);
    trace.stats.totalSteps += 1;
    if (tool)              trace.stats.toolCalls += 1;
    if (!step.success)     trace.stats.errors    += 1;
    if (action.includes('warning')) trace.stats.warnings += 1;

    await trace.save();

    return {
      success:    true,
      documentId,
      stepIndex:  trace.steps.length - 1,
      totalSteps: trace.stats.totalSteps,
    };
  },
};

module.exports = { traceMcpTool };