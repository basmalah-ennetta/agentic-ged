// ocrTool.js
// This file wraps your existing OCR Python agent as a LangChain Tool.
// A "Tool" is just a function with a name and description that LangChain
// can call as part of a pipeline.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// "z" is a validation library — it defines what inputs this tool expects.
// Here we say: this tool takes a "filePath" (a string) as input.
const ocrToolSchema = z.object({
  filePath: z.string().describe('The absolute path to the uploaded PDF or image file'),
  fileName: z.string().describe('The original name of the uploaded file'),
  mimeType: z.string().describe('The MIME type of the file, e.g. application/pdf'),
});

// tool() creates a LangChain-compatible tool from a plain function.
// It takes:
//   - a function that does the actual work
//   - a config object with name, description, schema
const ocrTool = tool(
  async ({ filePath, fileName, mimeType }) => {
    // This is the same logic that was in contractController.js
    // We just moved it here so LangChain can call it as a step

    const agentUrl = process.env.OCR_AGENT_URL || 'http://localhost:8001';

    // Build the multipart form to send the file to the Python OCR agent
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: mimeType,
    });

    const response = await axios.post(`${agentUrl}/process`, formData, {
      headers: formData.getHeaders(),
      timeout: 120000, // 2 minutes — OCR can be slow
    });

    if (!response.data.success) {
      throw new Error(`OCR agent failed: ${JSON.stringify(response.data)}`);
    }

    // Return a plain string — LangChain tools always return strings
    // We serialize the result as JSON so the next tool can parse it
    return JSON.stringify({
      extracted_text: response.data.extracted_text,
      character_count: response.data.character_count,
      filename: response.data.filename,
    });
  },
  {
    name: 'ocr_tool',
    description:
      'Extracts text from a PDF or image file using Tesseract OCR. ' +
      'Input: file path, file name, and MIME type. ' +
      'Output: JSON string containing the extracted text.',
    schema: ocrToolSchema,
  }
);

module.exports = { ocrTool };