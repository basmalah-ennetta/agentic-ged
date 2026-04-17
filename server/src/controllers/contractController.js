// contractController.js
// Phase 4: This file is now a thin HTTP layer only.
// All pipeline orchestration has been moved to LangChain.
//
// Responsibilities of this file:
//   - Receive HTTP requests
//   - Validate inputs
//   - Delegate to LangChain controller or query MongoDB directly
//   - Return HTTP responses
//
// What is NO longer here:
//   - Manual agent calls (callAgent)
//   - Sequential await chains
//   - Scattered MongoDB status updates
//   - Pipeline error handling (LangChain handles this now)

const path = require('path');
const Contract = require('../models/contractModel');
const { lcUploadContract } = require('./langchainController');

// ── UPLOAD CONTRACT ────────────────────────────────────────────────────────
// Delegates directly to the LangChain controller.
// No pipeline logic here — just pass the request through.
const uploadContract = async (req, res, next) => {
  return lcUploadContract(req, res, next);
};

// ── GET ALL CONTRACTS ──────────────────────────────────────────────────────
const getAllContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts,
    });
  } catch (error) {
    console.error('Error in getAllContracts:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching contracts',
      error: error.message,
    });
  }
};

// ── GET SINGLE CONTRACT ────────────────────────────────────────────────────
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
    }
    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    console.error('Error in getContractById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching contract',
      error: error.message,
    });
  }
};

// ── VALIDATE CONTRACT ──────────────────────────────────────────────────────
// HR person approves or rejects a contract after reviewing it.
// This is pure business logic — no pipeline involvement.
const validateContract = async (req, res) => {
  try {
    const { validationStatus, validationNotes } = req.body;

    if (!['approved', 'rejected'].includes(validationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'validationStatus must be "approved" or "rejected"',
      });
    }

    const updatedContract = await Contract.findByIdAndUpdate(
      req.params.id,
      {
        validationStatus,
        validationNotes: validationNotes || '',
      },
      { new: true }
    );

    if (!updatedContract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Contract ${validationStatus} successfully`,
      data: updatedContract,
    });
  } catch (error) {
    console.error('Error in validateContract:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while validating contract',
      error: error.message,
    });
  }
};

module.exports = {
  uploadContract,
  getAllContracts,
  getContractById,
  validateContract,
};