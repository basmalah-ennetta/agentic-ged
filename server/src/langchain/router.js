// router.js
// The document type router — decides which chain to run
// after classification is complete.
//
// This is a deterministic router (no LLM needed).
// It reads the documentType from the pipeline state and
// returns the appropriate chain to execute.
//
// To add support for a new document type:
//   1. Create a new chain in langchain/chains/
//   2. Add one line to the CHAIN_MAP below
//   That's it — nothing else needs to change.

const { employmentChain } = require('./chains/employmentChain');
const { ndaChain } = require('./chains/ndaChain');
const { genericChain } = require('./chains/genericChain');

// ── CHAIN MAP ──────────────────────────────────────────────────────────────
// Maps document type strings (from classification agent) to their chains.
// Add new document types here as the system grows.

const CHAIN_MAP = {
  employment_contract: employmentChain,
  nda: ndaChain,
  internship_agreement: employmentChain, // reuse employment chain — similar fields
  freelance_agreement: employmentChain,  // reuse employment chain — similar fields
  amendment: genericChain,
  termination_letter: genericChain,
  other: genericChain,
};

/**
 * routeToChain(documentType)
 *
 * Returns the appropriate processing chain for a given document type.
 * Falls back to genericChain if the type is not in the map.
 *
 * @param {string} documentType - The type returned by the classification agent
 * @returns {RunnableSequence} The chain to execute
 */
function routeToChain(documentType) {
  const normalizedType = (documentType || 'other').toLowerCase().trim();
  const chain = CHAIN_MAP[normalizedType];

  if (chain) {
    console.log(`[Router] Document type "${normalizedType}" → dedicated chain`);
  } else {
    console.log(`[Router] Document type "${normalizedType}" → generic chain (fallback)`);
  }

  // Return the matched chain, or generic as fallback
  return chain || genericChain;
}

/**
 * getSupportedTypes()
 * Returns list of document types that have dedicated chains.
 * Useful for logging and debugging.
 */
function getSupportedTypes() {
  return Object.keys(CHAIN_MAP);
}

module.exports = { routeToChain, getSupportedTypes };