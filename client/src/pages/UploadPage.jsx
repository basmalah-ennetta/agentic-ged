import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadContract } from '../api';

const UploadPage = () => {
  const navigate = useNavigate();

  // State variables — these control what the UI shows
  const [file, setFile] = useState(null);         // the selected file
  const [uploading, setUploading] = useState(false); // is upload in progress?
  const [progress, setProgress] = useState(0);    // upload progress 0-100
  const [stage, setStage] = useState('');         // current pipeline stage message
  const [error, setError] = useState('');         // error message if something fails

  // ── DROPZONE SETUP ──────────────────────────────────────────────────────
  // onDrop is called when user drops a file or selects one
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Clear any previous errors
    setError('');

    if (rejectedFiles.length > 0) {
      setError('Invalid file type. Please upload a PDF or image file.');
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]); // save the first accepted file
    }
  }, []);

  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxFiles: 1,      // only allow one file at a time
    maxSize: 10485760, // 10MB max
  });

  // ── UPLOAD HANDLER ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    // Show pipeline stage messages to keep user informed
    // The AI pipeline takes several minutes — we update the message
    const stages = [
      { delay: 0,     msg: '📤 Uploading file...' },
      { delay: 3000,  msg: '🔍 OCR agent reading text...' },
      { delay: 15000, msg: '🏷️ Classifying document type...' },
      { delay: 35000, msg: '📊 Extracting key information...' },
      { delay: 60000, msg: '✍️ Generating AI summary...' },
      { delay: 90000, msg: '⏳ Finalizing... almost done!' },
    ];

    // Set up stage message timers
    const timers = stages.map(({ delay, msg }) =>
      setTimeout(() => setStage(msg), delay)
    );

    try {
      // Call the API — this triggers the full pipeline
      const result = await uploadContract(file, (pct) => {
        setProgress(pct);
      });

      // Clear all timers
      timers.forEach(clearTimeout);

      if (result.success) {
        // Navigate to the contract detail page
        navigate(`/contracts/${result.data._id}`);
      } else {
        setError(result.message || 'Upload failed');
      }

    } catch (err) {
      timers.forEach(clearTimeout);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Upload failed. Make sure all services are running.'
      );
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      maxWidth: '640px',
      margin: '48px auto',
      padding: '0 24px',
    }}>
      {/* Page Title */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '8px',
        }}>
          Upload HR Contract
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Upload a PDF or image — our AI agents will extract,
          classify, and summarize it automatically.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
          backgroundColor: isDragActive ? '#eff6ff' : '#ffffff',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          marginBottom: '24px',
        }}
      >
        <input {...getInputProps()} disabled={uploading} />

        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {isDragActive ? '📂' : '📄'}
        </div>

        {file ? (
          // Show selected file info
          <div>
            <p style={{
              fontWeight: '600',
              color: '#1e293b',
              fontSize: '16px',
              marginBottom: '4px'
            }}>
              {file.name}
            </p>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              {(file.size / 1024).toFixed(1)} KB
              · Click or drop to change file
            </p>
          </div>
        ) : (
          // Show drop instructions
          <div>
            <p style={{
              fontWeight: '600',
              color: '#1e293b',
              fontSize: '16px',
              marginBottom: '8px',
            }}>
              {isDragActive
                ? 'Drop your file here'
                : 'Drag & drop your contract here'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>
              or click to browse · PDF, PNG, JPG, TIFF · Max 10MB
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#dc2626',
          fontSize: '14px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div style={{ marginBottom: '16px' }}>
          {/* Stage message */}
          <p style={{
            fontSize: '14px',
            color: '#3b82f6',
            fontWeight: '500',
            marginBottom: '8px',
            minHeight: '20px',
          }}>
            {stage}
          </p>

          {/* Progress bar */}
          <div style={{
            backgroundColor: '#e2e8f0',
            borderRadius: '8px',
            height: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#3b82f6',
              borderRadius: '8px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: '4px',
            textAlign: 'right',
          }}>
            {progress}%
          </p>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: !file || uploading ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: !file || uploading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {uploading ? '⏳ Processing...' : '🚀 Upload & Analyze Contract'}
      </button>

      {/* Info note */}
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: '#94a3b8',
        marginTop: '16px',
      }}>
        Processing takes 2-5 minutes depending on document size
      </p>
    </div>
  );
};

export default UploadPage;