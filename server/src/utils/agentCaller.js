const axios = require('axios');

/**
 * callAgent - sends data to an agent and returns the result
 *
 * @param {string} agentUrl  - the full URL of the agent
 * @param {object} payload   - the data to send to the agent (as JSON)
 * @returns {object}         - the response data from the agent
 */
const callAgent = async (agentUrl, payload) => {
  try {
    // POST request
    const response = await axios.post(agentUrl, payload, {
      timeout: 120000, // wait 2 minutes 
    });

    // response
    return response.data;

  } catch (error) {
    if (error.response) {
      // Error response
      throw new Error(
        `Agent at ${agentUrl} returned error ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
    } else if (error.code === 'ECONNREFUSED') {
      // The agent isn't running at all
      throw new Error(
        `Agent at ${agentUrl} is not running. Make sure the Python service is started.`
      );
    } else {
      throw new Error(`Failed to call agent at ${agentUrl}: ${error.message}`);
    }
  }
};

module.exports = { callAgent };