import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllContracts } from '../api';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';

const ContractsPage = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load contracts when the page first renders
  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const result = await getAllContracts();
      if (result.success) {
        setContracts(result.data);
      }
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Failed to load contracts. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  // Format date to a readable string
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return <Spinner message="Loading contracts..." />;

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{
            fontSize: '26px', fontWeight: '700',
            color: '#1e293b', marginBottom: '4px',
          }}>
            Contracts
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''} total
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          + Upload New
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', padding: '12px 16px',
          color: '#dc2626', fontSize: '14px', marginBottom: '16px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          backgroundColor: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            No contracts yet. Upload your first one!
          </p>
        </div>
      )}

      {/* Contracts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {contracts.map((contract) => (
          <div
            key={contract._id}
            onClick={() => navigate(`/contracts/${contract._id}`)}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px 24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Left side — file info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>
                {contract.fileType === 'pdf' ? '📄' : '🖼️'}
              </span>
              <div>
                <p style={{
                  fontWeight: '600', color: '#1e293b',
                  fontSize: '15px', marginBottom: '4px',
                }}>
                  {contract.originalFileName}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {formatDate(contract.createdAt)}
                  {contract.documentType && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: '#475569',
                    }}>
                      {contract.documentType.replace(/_/g, ' ')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Right side — status badges */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <StatusBadge status={contract.status} />
              {contract.status === 'completed' && (
                <StatusBadge status={contract.validationStatus} />
              )}
              <span style={{ color: '#cbd5e1', fontSize: '18px' }}>›</span>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      {contracts.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={fetchContracts}
            style={{
              padding: '8px 20px', backgroundColor: 'transparent',
              border: '1px solid #cbd5e1', borderRadius: '6px',
              color: '#64748b', fontSize: '13px', cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;