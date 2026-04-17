// router.js
// Phase 5: Config-driven routing.
// All document types use the universal chain.
// The router's only job is to create the chain with the right tools.

const { createUniversalChain } = require('./chains/universalChain');
const { getSupportedTypes, getLabel } = require('../config/documentTypes');

/**
 * routeToChain(documentType, tools)
 * Returns the universal chain initialized with tools.
 * All document types use the same chain —
 * type-specific behavior comes from documentTypes.js config.
 */
function routeToChain(documentType, tools) {
  const normalized = (documentType || 'other').toLowerCase().trim();
  console.log(`[Router] "${normalized}" → UniversalChain (${getLabel(normalized)})`);
  return createUniversalChain(tools);
}

function getChainName(documentType) {
  return `UniversalChain (${getLabel(documentType)})`;
}

module.exports = { routeToChain, getChainName, getSupportedTypes };