// orchestratorMiddleware.js
//
// This middleware reads the USE_LANGCHAIN environment variable and
// routes the request to either the LangChain controller or the
// original Node.js controller.
//
// Think of it as a light switch:
//   USE_LANGCHAIN=true  → LangChain handles the request
//   USE_LANGCHAIN=false → original Node.js handles the request
//
// This pattern is called a "feature flag" — it lets you switch
// behavior without changing code or redeploying.

const { lcUploadContract } = require('../controllers/langchainController');
const { uploadContractLegacy } = require('../controllers/contractController');

/**
 * orchestrateUpload
 *
 * Reads USE_LANGCHAIN from environment and delegates to the
 * appropriate controller function.
 *
 * This middleware is inserted into the route AFTER Multer has
 * already processed the file upload — so both controllers receive
 * req.file exactly as before.
 */
const orchestrateUpload = async (req, res, next) => {
  const useLangChain = process.env.USE_LANGCHAIN === 'true';

  console.log(
    `[Orchestrator] Routing to: ${useLangChain ? 'LangChain' : 'Node.js (legacy)'}`
  );

  if (useLangChain) {
    return lcUploadContract(req, res, next);
  } else {
    return uploadContractLegacy(req, res, next);
  }
};

module.exports = { orchestrateUpload };