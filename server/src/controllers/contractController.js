const Contract = require('../models/contractModel');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const { callAgent } = require('../utils/agentCaller');

// ── FULL PIPELINE ORCHESTRATOR ─────────────────────────────────────────────
const uploadContractLegacy = async (req, res) => {
  let contractId = null;

  try {
    // ── STEP 1: Validate uploaded file ──────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image file.',
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileType = extension === '.pdf' ? 'pdf' : 'image';

    // ── STEP 2: Save initial record to MongoDB ───────────────────────
    const newContract = await Contract.create({
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      fileType: fileType,
      status: 'uploaded',
    });

    // Save contract ID so error handler can update it if needed
    contractId = newContract._id;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[Orchestrator] New contract: ${contractId}`);
    console.log(`[Orchestrator] File: ${req.file.originalname}`);
    console.log(`${'='.repeat(50)}`);

    // ── STEP 3: OCR Agent ────────────────────────────────────────────
    console.log(`\n[Orchestrator] STEP 1/4: Sending to OCR agent...`);
    await Contract.findByIdAndUpdate(contractId, { status: 'ocr_processing' });

    // Build FormData to send the file to the OCR agent
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const ocrResult = await callAgent(
      `${process.env.OCR_AGENT_URL}/process`,
      formData,
      { headers: formData.getHeaders() }
    );

    if (!ocrResult.success) {
      throw new Error('OCR agent returned failure');
    }

    const extractedText = ocrResult.extracted_text;
    console.log(`[Orchestrator] OCR done. Characters: ${extractedText.length}`);

    await Contract.findByIdAndUpdate(contractId, {
      status: 'ocr_done',
      extractedText: extractedText,
    });

    // ── STEP 4: Classification Agent ─────────────────────────────────
    console.log(`\n[Orchestrator] STEP 2/4: Sending to classification agent...`);
    await Contract.findByIdAndUpdate(contractId, { status: 'classifying' });

    const classificationResult = await callAgent(
      `${process.env.CLASSIFICATION_AGENT_URL}/process`,
      {
        text: extractedText,
        contract_id: contractId.toString(),
      }
    );

    const documentType = classificationResult.document_type;
    console.log(`[Orchestrator] Classification done: ${documentType}`);

    await Contract.findByIdAndUpdate(contractId, {
      status: 'classified',
      documentType: documentType,
    });

    // ── STEP 5: Extraction Agent ──────────────────────────────────────
    console.log(`\n[Orchestrator] STEP 3/4: Sending to extraction agent...`);
    await Contract.findByIdAndUpdate(contractId, { status: 'extracting' });

    const extractionResult = await callAgent(
      `${process.env.EXTRACTION_AGENT_URL}/process`,
      {
        text: extractedText,
        contract_id: contractId.toString(),
        document_type: documentType,
      }
    );

    const extractedInfo = extractionResult.extracted_info;
    console.log(`[Orchestrator] Extraction done:`, extractedInfo);

    await Contract.findByIdAndUpdate(contractId, {
      status: 'extracted',
      extractedInfo: {
        employeeName: extractedInfo.employeeName || '',
        salary: extractedInfo.salary || '',
        startDate: extractedInfo.startDate || '',
        endDate: extractedInfo.endDate || '',
        jobTitle: extractedInfo.jobTitle || '',
        companyName: extractedInfo.companyName || '',
      },
    });

    // ── STEP 6: Summarization Agent ───────────────────────────────────
    console.log(`\n[Orchestrator] STEP 4/4: Sending to summarization agent...`);
    await Contract.findByIdAndUpdate(contractId, { status: 'summarizing' });

    const summarizationResult = await callAgent(
      `${process.env.SUMMARIZATION_AGENT_URL}/process`,
      {
        text: extractedText,
        contract_id: contractId.toString(),
        document_type: documentType,
        extracted_info: extractedInfo,
      }
    );

    const summary = summarizationResult.summary;
    console.log(`[Orchestrator] Summarization done. (${summary.length} chars)`);

    // ── STEP 7: Mark as completed ─────────────────────────────────────
    const completedContract = await Contract.findByIdAndUpdate(
      contractId,
      {
        status: 'completed',
        summary: summary,
      },
      { new: true }
    );

    console.log(`\n${'='.repeat(50)}`);
    console.log(`[Orchestrator] Pipeline COMPLETE for ${contractId}`);
    console.log(`${'='.repeat(50)}\n`);

    // ── STEP 8: Return full result ────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Contract processed successfully through all agents',
      data: completedContract,
    });

  } catch (error) {
    console.error(`\n[Orchestrator] PIPELINE ERROR: ${error.message}`);

    // Mark the contract as failed in MongoDB
    if (contractId) {
      await Contract.findByIdAndUpdate(contractId, {
        status: 'failed',
        errorMessage: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Pipeline failed during processing',
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
  uploadContractLegacy,   // renamed — now used only as fallback
  uploadContract: uploadContractLegacy, // alias so nothing else breaks
  getAllContracts,
  getContractById,
  validateContract,
};