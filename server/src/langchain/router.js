// router.js
// Phase 2: Router now creates chains using tool factories.
// Tools are passed in from the orchestrator — the router
// does not import any tools itself.

const { createEmploymentChain } = require('./chains/employmentChain');
const { createNdaChain } = require('./chains/ndaChain');
const { createGenericChain } = require('./chains/genericChain');

// Maps document types to chain factory functions
const CHAIN_FACTORIES = {
  employment_contract: createEmploymentChain,
  nda: createNdaChain,
  internship_agreement: createEmploymentChain,
  freelance_agreement: createEmploymentChain,
  amendment: createGenericChain,
  termination_letter: createGenericChain,
  other: createGenericChain,
};

/**
 * routeToChain(documentType, tools)
 * Creates and returns the appropriate chain for a document type.
 *
 * @param {string} documentType - From classification agent
 * @param {object} tools        - Tools object from orchestrator
 * @returns {RunnableSequence}  The chain to execute
 */
function routeToChain(documentType, tools) {
  const normalized = (documentType || 'other').toLowerCase().trim();
  const factory = CHAIN_FACTORIES[normalized] || createGenericChain;

  const chainName = getChainName(normalized);
  console.log(`[Router] "${normalized}" → ${chainName}`);

  return factory(tools);
}

function getChainName(documentType) {
  const map = {
    employment_contract: 'EmploymentChain',
    internship_agreement: 'EmploymentChain (reused)',
    freelance_agreement: 'EmploymentChain (reused)',
    nda: 'NDAChain',
    amendment: 'GenericChain',
    termination_letter: 'GenericChain',
    other: 'GenericChain',
  };
  return map[documentType] || 'GenericChain (fallback)';
}

function getSupportedTypes() {
  return Object.keys(CHAIN_FACTORIES);
}

module.exports = { routeToChain, getChainName, getSupportedTypes };