import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getContractById, validateContract } from '../api';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';

const ContractDetailPage = () => {
  const { id } = useParams();     // get contract ID from URL
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [notes, setNotes] = useState('');
  const [_error, setError] = useState('');

  useEffect(() => {
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const result = await getContractById(id);
      if (result.success) {
        setContract(result.data);
      }
    } catch {
      setError('Failed to load contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (status) => {
    try {
      setValidating(true);
      const result = await validateContract(id, status, notes);
      if (result.success) {
        setContract(result.data);
      }
    } catch {
      setError('Validation failed. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <Spinner message="Loading contract details..." />;
  if (!contract) return <p style={{ padding: '40px', textAlign: 'center' }}>Contract not found.</p>;

  // extractedFields is a Map in MongoDB — serialized to a plain object by Mongoose
  const fields = contract.extractedFields || {};

  // Convert camelCase or snake_case keys to readable labels
  const toLabel = (key) =>
    key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (c) => c.toUpperCase());

  // Helper to render an info row
  const InfoRow = ({ label, value }) => {
    if (!value) return null;
    return (
      <div style={{
        display: 'flex', gap: '16px',
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <span style={{
          width: '140px', flexShrink: 0,
          fontSize: '13px', color: '#94a3b8',
          fontWeight: '500', paddingTop: '1px',
        }}>
          {label}
        </span>
        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px 60px' }}>

      {/* Back button */}
      <button
        onClick={() => navigate('/contracts')}
        style={{
          background: 'none', border: 'none',
          color: '#3b82f6', cursor: 'pointer',
          fontSize: '14px', marginBottom: '24px',
          padding: '0', display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        ← Back to Contracts
      </button>

      {/* Header Card */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        border: '1px solid #e2e8f0', padding: '24px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '40px' }}>
              {contract.fileType === 'pdf' ? '📄' : '🖼️'}
            </span>
            <div>
              <h1 style={{
                fontSize: '20px', fontWeight: '700',
                color: '#1e293b', marginBottom: '4px',
              }}>
                {contract.originalFileName}
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                Uploaded {new Date(contract.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <StatusBadge status={contract.status} />
            {contract.status === 'completed' && (
              <StatusBadge status={contract.validationStatus} />
            )}
          </div>
        </div>

        {/* Document type */}
        {contract.documentType && (
          <div style={{
            backgroundColor: '#f8fafc', borderRadius: '8px',
            padding: '10px 16px', display: 'inline-block',
          }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Document type: </span>
            <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '13px' }}>
              {contract.documentType.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {contract.status === 'failed' && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', padding: '16px', marginBottom: '16px',
          color: '#dc2626', fontSize: '14px',
        }}>
          ❌ Pipeline Error: {contract.errorMessage}
        </div>
      )}

      {/* Extracted Info Card */}
      {contract.status === 'completed' && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0', padding: '24px',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '16px', fontWeight: '700',
            color: '#1e293b', marginBottom: '16px',
          }}>
            📊 Extracted Information
          </h2>

          {Object.entries(fields).map(([key, value]) => (
            <InfoRow key={key} label={toLabel(key)} value={value} />
          ))}

          {/* Show a message if no fields were extracted */}
          {Object.keys(fields).length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              No key information could be extracted from this document.
            </p>
          )}
        </div>
      )}

      {/* AI Summary Card */}
      {contract.summary && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0', padding: '24px',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '16px', fontWeight: '700',
            color: '#1e293b', marginBottom: '16px',
          }}>
            ✍️ AI Summary
          </h2>
          <p style={{
            color: '#475569', fontSize: '14px',
            lineHeight: '1.8', whiteSpace: 'pre-wrap',
          }}>
            {contract.summary}
          </p>
        </div>
      )}

      {/* Validation Card */}
      {contract.status === 'completed' && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0', padding: '24px',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '16px', fontWeight: '700',
            color: '#1e293b', marginBottom: '16px',
          }}>
            ✅ HR Validation
          </h2>

          {contract.validationStatus === 'pending' ? (
            <div>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                Review the contract details above and approve or reject below.
              </p>

              {/* Notes textarea */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add validation notes (optional)..."
                rows={3}
                style={{
                  width: '100%', padding: '12px',
                  border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '14px', color: '#1e293b',
                  resize: 'vertical', marginBottom: '16px',
                  fontFamily: 'inherit',
                }}
              />

              {/* Approve / Reject buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleValidation('approved')}
                  disabled={validating}
                  style={{
                    flex: 1, padding: '12px',
                    backgroundColor: validating ? '#94a3b8' : '#22c55e',
                    color: 'white', border: 'none',
                    borderRadius: '8px', fontSize: '14px',
                    fontWeight: '600', cursor: validating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {validating ? '...' : '✅ Approve Contract'}
                </button>
                <button
                  onClick={() => handleValidation('rejected')}
                  disabled={validating}
                  style={{
                    flex: 1, padding: '12px',
                    backgroundColor: validating ? '#94a3b8' : '#ef4444',
                    color: 'white', border: 'none',
                    borderRadius: '8px', fontSize: '14px',
                    fontWeight: '600', cursor: validating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {validating ? '...' : '❌ Reject Contract'}
                </button>
              </div>
            </div>
          ) : (
            // Show result if already validated
            <div style={{
              backgroundColor: contract.validationStatus === 'approved'
                ? '#f0fdf4' : '#fef2f2',
              borderRadius: '8px', padding: '16px',
            }}>
              <p style={{
                fontWeight: '600', fontSize: '15px',
                color: contract.validationStatus === 'approved'
                  ? '#15803d' : '#dc2626',
                marginBottom: '8px',
              }}>
                {contract.validationStatus === 'approved'
                  ? '✅ Contract Approved' : '❌ Contract Rejected'}
              </p>
              {contract.validationNotes && (
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Notes: {contract.validationNotes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Raw extracted text (collapsible) */}
      {contract.extractedText && (
        <details style={{
          backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0', padding: '24px',
        }}>
          <summary style={{
            cursor: 'pointer', fontWeight: '700',
            fontSize: '16px', color: '#1e293b',
          }}>
            🔍 Raw Extracted Text
          </summary>
          <pre style={{
            marginTop: '16px', padding: '16px',
            backgroundColor: '#f8fafc', borderRadius: '8px',
            fontSize: '12px', color: '#475569',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: '300px', overflowY: 'auto',
            fontFamily: 'monospace',
          }}>
            {contract.extractedText}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ContractDetailPage;