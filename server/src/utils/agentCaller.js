const axios = require('axios');

/**
 * callAgent - sends data to a Python agent and returns the result
 *
 * @param {string} agentUrl    - full URL of the agent endpoint
 * @param {object} payload     - data to send (JSON object OR FormData)
 * @param {object} options     - optional axios config (e.g., custom headers)
 */
const callAgent = async (agentUrl, payload, options = {}) => {
  try {
    const response = await axios.post(agentUrl, payload, {
      timeout: 120000,   // 2 minute timeout for slow OCR tasks
      ...options,        // spread any extra options (like FormData headers)
    });

    return response.data;

  } catch (error) {
    if (error.response) {
      throw new Error(
        `Agent at ${agentUrl} returned error ${error.response.status}: `
        + JSON.stringify(error.response.data)
      );
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(
        `Agent at ${agentUrl} is not running. `
        + `Make sure the Python service is started.`
      );
    } else {
      throw new Error(
        `Failed to call agent at ${agentUrl}: ${error.message}`
      );
    }
  }
};

module.exports = { callAgent };