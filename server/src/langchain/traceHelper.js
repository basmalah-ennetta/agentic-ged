// traceHelper.js
// Convenience wrapper so agents can emit trace events in one line.
// Never throws — tracing must never crash the pipeline.

function createTracer(tools, documentId, agentName, fileName) {
  const traceTool = tools.trace;

  if (!traceTool) {
    // Graceful fallback if trace tool not available
    return {
      log:   async (action, opts = {}) => console.log(`[TRACE:${agentName}] ${action}`, opts.data || ''),
      error: async (action, err)       => console.error(`[TRACE:${agentName}] ERR ${action}:`, err.message),
    };
  }

  async function log(action, { tool, data, durationMs } = {}) {
    try {
      await traceTool.invoke({
        documentId,
        fileName,
        agent:      agentName,
        action,
        tool:       tool       || undefined,
        data:       data       ? JSON.stringify(data) : undefined,
        durationMs: durationMs || undefined,
        success:    true,
      });
    } catch (e) {
      console.error(`[Tracer] Failed to log "${action}":`, e.message);
    }
  }

  async function error(action, err, { tool, data } = {}) {
    try {
      await traceTool.invoke({
        documentId,
        fileName,
        agent:   agentName,
        action,
        tool:    tool || undefined,
        data:    data ? JSON.stringify(data) : undefined,
        success: false,
        error:   err.message || String(err),
      });
    } catch (e) {
      console.error(`[Tracer] Failed to log error "${action}":`, e.message);
    }
  }

  return { log, error };
}

module.exports = { createTracer };