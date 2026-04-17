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

const mongoose = require('mongoose');
const path = require('path');
const Contract = require('../models/contractModel');
const Document = require('../models/documentModel');
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
    // Fetch from both collections and merge, newest first
    const [documents, contracts] = await Promise.all([
      Document.find({}).sort({ createdAt: -1 }),
      Contract.find({}).sort({ createdAt: -1 }),
    ]);

    // Merge and re-sort by createdAt
    const all = [...documents, ...contracts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      count: all.length,
      data: all,
    });
  } catch (error) {
    console.error('Error in getAllContracts:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching documents',
      error: error.message,
    });
  }
};

//Get contract by ID
const getContractById = async (req, res) => {
  try {
    // Check new Document model first, fall back to legacy Contract model
    const document =
      (await Document.findById(req.params.id)) ||
      (await Contract.findById(req.params.id));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error in getContractById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching document',
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

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document ID: "${req.params.id}"`,
      });
    }

    if (!['approved', 'rejected'].includes(validationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'validationStatus must be "approved" or "rejected"',
      });
    }

    // Try Document model first (Phase 5+ records)
    let updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { validationStatus, validationNotes: validationNotes || '' },
      { returnDocument: 'after' }
    );

    // Fall back to Contract model (legacy records)
    if (!updatedDocument) {
      updatedDocument = await Contract.findByIdAndUpdate(
        req.params.id,
        { validationStatus, validationNotes: validationNotes || '' },
        { returnDocument: 'after' }
      );
    }

    if (!updatedDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Document ${validationStatus} successfully`,
      data: updatedDocument,
    });

  } catch (error) {
    console.error('Error in validateContract:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while validating document',
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