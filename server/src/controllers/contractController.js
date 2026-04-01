const Contract = require('../models/contractModel');
const path = require('path');
const fs = require('fs');           // built-in Node.js file system module
const FormData = require('form-data'); // for sending files via HTTP
const { callAgent } = require('../utils/agentCaller');

// ── UPLOAD CONTRACT ────────────────────────────────────────────────────────
const uploadContract = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image file.',
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileType = extension === '.pdf' ? 'pdf' : 'image';

    // ── STEP 1: Save contract record to MongoDB ──────────────────────
    const newContract = await Contract.create({
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType: fileType,
      status: 'uploaded',
    });

    console.log(`\n[Orchestrator] Contract saved: ${newContract._id}`);

    // ── STEP 2: Send file to OCR Agent ───────────────────────────────
    // Update status to show OCR is in progress
    await Contract.findByIdAndUpdate(newContract._id, {
      status: 'ocr_processing'
    });

    console.log(`[Orchestrator] Sending file to OCR agent...`);

    // We use FormData to send the file as multipart/form-data
    // (the same format a browser uses when submitting a file upload form)
    const formData = new FormData();

    // fs.createReadStream() reads the file from disk as a stream
    // This is memory-efficient for large files
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Call the OCR agent
    const ocrResult = await callAgent(
      `${process.env.OCR_AGENT_URL}/process`,
      formData,
      {
        // FormData sets its own Content-Type header with boundary info
        // We must pass these headers through to axios
        headers: formData.getHeaders()
      }
    );

    console.log(`[Orchestrator] OCR complete. `
      + `Characters extracted: ${ocrResult.character_count}`);

    // ── STEP 3: Update MongoDB with extracted text ───────────────────
    const updatedContract = await Contract.findByIdAndUpdate(
      newContract._id,
      {
        status: 'ocr_done',
        extractedText: ocrResult.extracted_text,
      },
      { new: true }
    );

    // ── STEP 4: Return success response ─────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Contract uploaded and OCR completed successfully',
      data: updatedContract,
      ocr: {
        character_count: ocrResult.character_count,
        preview: ocrResult.extracted_text.substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);

    // If we have a contract ID, mark it as failed in MongoDB
    if (req.contractId) {
      await Contract.findByIdAndUpdate(req.contractId, {
        status: 'failed',
        errorMessage: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error processing contract',
      error: error.message,
    });
  }
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
      return res.status(404).json({ success: false, message: 'Contract not found' });
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
      { validationStatus, validationNotes: validationNotes || '' },
      { new: true }
    );

    if (!updatedContract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
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