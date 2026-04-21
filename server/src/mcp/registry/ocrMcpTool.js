// ocrMcpTool.js
// Registers the OCR capability as an MCP tool.
// When called via MCP protocol, this tool sends the file
// to the Python OCR agent and returns the extracted text.
//
// Note: MCP tools receive plain objects and return plain objects.
// The MCP server handles all protocol encoding/decoding.

const { z } = require('zod');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Tool definition — name, description, input schema, and handler
const ocrMcpTool = {
  name: 'ocr',

  description:
    'Extracts text from a PDF or image file using Tesseract OCR. ' +
    'Returns the full extracted text and character count.',

  // Input schema defines what parameters this tool accepts
  // Any MCP client (LangChain, Python, external) must send these fields
  schema: {
    filePath: z.string().describe('Absolute path to the file on disk'),
    fileName: z.string().describe('Original filename e.g. contract.pdf'),
    mimeType: z.string().describe('MIME type e.g. application/pdf'),
  },

  // handler is the function that runs when this tool is called
  handler: async ({ filePath, fileName, mimeType }) => {
    const agentUrl = process.env.OCR_AGENT_URL || 'http://localhost:8001';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: mimeType,
    });

    let response;
    try {
      response = await axios.post(`${agentUrl}/process`, formData, {
        headers: formData.getHeaders(),
        timeout: 120000,
      });
    } catch (err) {
      if (err.response) {
        // Python agent returned a non-2xx status — surface its detail
        const detail = err.response.data?.detail || JSON.stringify(err.response.data);
        throw new Error(`OCR agent error ${err.response.status}: ${detail}`);
      }
      // Network-level failure (ECONNREFUSED, timeout, etc.)
      // axios 1.x sets err.code but leaves err.message empty on stream+ECONNREFUSED
      const reason = err.message || err.code || 'unknown network error';
      throw new Error(
        `OCR agent unreachable at ${agentUrl} (${reason}). ` +
        `Start it with: cd agents/ocr_agent && python main.py`
      );
    }

    if (!response.data.success) {
      throw new Error(`OCR failed: ${JSON.stringify(response.data)}`);
    }

    return {
      extracted_text: response.data.extracted_text,
      character_count: response.data.character_count,
      filename: response.data.filename,
    };
  },
};

module.exports = { ocrMcpTool };