const path = require('path');
const Document = require('../models/documentModel');
const Contract = require('../models/contractModel'); // keep for legacy records
const { runContractPipeline } = require('../langchain/orchestrator');

/**
 * lcUploadContract
 * Handles file upload and runs the full LangChain pipeline.
 * Mirrors the behavior of uploadContract in contractController.js
 * but delegates all orchestration to LangChain.
 */
const lcUploadContract = async (req, res) => {
  let contractId = null;

  try {
    // ── Step 1: Validate the uploaded file ─────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image file.',
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileType = extension === '.pdf' ? 'pdf' : 'image';

    // ── Step 2: Save the initial contract record to MongoDB ─────────────
    // This is still done in Node.js — LangChain doesn't handle HTTP or Multer
    const newDocument = await Document.create({
      originalFileName: req.file.originalname,
      filePath:         req.file.path,
      fileType:         fileType,
      status:           'uploaded',
    });

    contractId = newDocument._id.toString();


    console.log(`[LC Controller] Contract created: ${contractId}`);
    console.log(`[LC Controller] Handing off to LangChain pipeline...`);

    // ── Step 3: Hand off to LangChain pipeline ──────────────────────────
    const finalState = await runContractPipeline({
      contractId,
      filePath: req.file.path,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    // ── Step 4: Fetch the final saved record from MongoDB ───────────────
    const completedDocument =
      await Document.findById(contractId) ||
      await Contract.findById(contractId);

    // ── Step 5: Return the result ───────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Contract processed successfully via LangChain pipeline',
      orchestrator: 'langchain', // compare with original
      data: completedDocument,
      pipeline_summary: {
        character_count: finalState.characterCount,
        document_type: finalState.documentType,
        confidence: finalState.confidence,
        fields_extracted: Object.keys(finalState.extractedFields || {}).length,
        summary_length: (finalState.summary || '').length,
      },
    });

  } catch (error) {
    console.error('[LC Controller] Pipeline error:', error.message);


    try {
      const Trace = require('../models/traceModel');
      await Trace.findOneAndUpdate(
        { documentId: contractId },
        { $set: { outcome: 'failed' } }
      );
    } catch {}

    // Mark the document as failed in MongoDB if we have an ID
    if (contractId) {
      await Document.findByIdAndUpdate(contractId, {
        $set: { status: 'failed', errorMessage: error.message },
      }).catch(() => {}); // ignore secondary errors
    }

    return res.status(500).json({
      success: false,
      orchestrator: 'langchain',
      message: 'LangChain pipeline failed',
      error: error.message,
    });
  }
};

/**
 * lcGetStatus
 * Returns current pipeline status for a contract.
 */
const lcGetStatus = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).select(
      'status documentType extractedInfo summary validationStatus errorMessage createdAt updatedAt'
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { lcUploadContract, lcGetStatus };