const Contract = require('../models/contractModel');

const path = require('path');

// ── UPLOAD CONTRACT ────────────────────────────────────────────────────────
const uploadContract = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image file.',
      });
    }

    // Get the file extension
    const extension = path.extname(req.file.originalname).toLowerCase();

    // PDF or image
    const fileType = extension === '.pdf' ? 'pdf' : 'image';

    // Create a new Contract record in MongoDB
    const newContract = await Contract.create({
      originalFileName: req.file.originalname,  // e.g., "john_smith_contract.pdf"
      filePath: req.file.path,                   // e.g., "uploads/john_smith_contract-1712000000000.pdf"
      fileType: fileType,                         // "pdf" or "image"
      status: 'uploaded',                         // initial status
    });

    // Success Response
    return res.status(201).json({
      success: true,
      message: 'Contract uploaded successfully',
      data: newContract,
    });

  } catch (error) {
    // Error Response
    console.error('Error in uploadContract:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading contract',
      error: error.message,
    });
  }
};

// ── GET ALL CONTRACTS ──────────────────────────────────────────────────────
const getAllContracts = async (req, res) => {
  try {
    const contracts = await Contract.find({}).sort({ createdAt: -1 }); //newest first

    return res.status(200).json({
      success: true,
      count: contracts.length, // how many contracts are in the DB
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
    // e.g., GET /api/contracts/abc123
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      // Contract not found
      return res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: contract,
    });

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
const validateContract = async (req, res) => {
  try {
    // Get the validation status and notes
    const { validationStatus, validationNotes } = req.body;

    // Check status
    if (!['approved', 'rejected'].includes(validationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'validationStatus must be either "approved" or "rejected"',
      });
    }

    // Update the contract
    const updatedContract = await Contract.findByIdAndUpdate(
      req.params.id,
      {
        validationStatus: validationStatus,
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