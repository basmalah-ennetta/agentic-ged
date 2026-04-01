// Import axios for making HTTP requests
import axios from 'axios';

// Base URL of our Node.js backend
// All API calls will be prefixed with this
const API_BASE_URL = 'http://localhost:5000/api';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  // No default timeout here because upload + AI processing
  // can take several minutes
  timeout: 300000, // 5 minutes
});

// ── CONTRACT API FUNCTIONS ─────────────────────────────────────────────────

/**
 * Upload a contract file and trigger the full AI pipeline
 * @param {File} file - the PDF or image file to upload
 * @param {function} onProgress - callback for upload progress (0-100)
 */
export const uploadContract = async (file, onProgress) => {
  // FormData is how we send files over HTTP
  const formData = new FormData();
  formData.append('contract', file);

  const response = await api.post('/contracts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // onUploadProgress gives us upload progress percentage
    onUploadProgress: (progressEvent) => {
      const percentage = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      if (onProgress) onProgress(percentage);
    },
  });

  return response.data;
};

/**
 * Get all contracts from the database
 */
export const getAllContracts = async () => {
  const response = await api.get('/contracts');
  return response.data;
};

/**
 * Get a single contract by its MongoDB ID
 * @param {string} id - the MongoDB _id of the contract
 */
export const getContractById = async (id) => {
  const response = await api.get(`/contracts/${id}`);
  return response.data;
};

/**
 * Approve or reject a contract (HR validation step)
 * @param {string} id - MongoDB _id of the contract
 * @param {string} validationStatus - "approved" or "rejected"
 * @param {string} validationNotes - optional notes from HR
 */
export const validateContract = async (id, validationStatus, validationNotes) => {
  const response = await api.put(`/contracts/${id}/validate`, {
    validationStatus,
    validationNotes,
  });
  return response.data;
};