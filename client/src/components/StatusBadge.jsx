// This component displays a colored badge showing the contract's current status
// It takes a "status" prop and shows different colors for different stages

const statusConfig = {
  // Each status has a label (what to show) and colors
  uploaded:       { label: 'Uploaded',        bg: '#e3f2fd', color: '#1565c0' },
  ocr_processing: { label: 'Reading Text...',  bg: '#fff3e0', color: '#e65100' },
  ocr_done:       { label: 'Text Extracted',   bg: '#fff3e0', color: '#e65100' },
  classifying:    { label: 'Classifying...',   bg: '#f3e5f5', color: '#6a1b9a' },
  classified:     { label: 'Classified',       bg: '#f3e5f5', color: '#6a1b9a' },
  extracting:     { label: 'Extracting...',    bg: '#e8f5e9', color: '#2e7d32' },
  extracted:      { label: 'Info Extracted',   bg: '#e8f5e9', color: '#2e7d32' },
  summarizing:    { label: 'Summarizing...',   bg: '#fce4ec', color: '#880e4f' },
  completed:      { label: 'Completed ✓',      bg: '#e8f5e9', color: '#1b5e20' },
  failed:         { label: 'Failed ✗',         bg: '#ffebee', color: '#b71c1c' },
  pending:        { label: 'Pending Review',   bg: '#fff8e1', color: '#f57f17' },
  approved:       { label: 'Approved ✓',       bg: '#e8f5e9', color: '#1b5e20' },
  rejected:       { label: 'Rejected ✗',       bg: '#ffebee', color: '#b71c1c' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || {
    label: status,
    bg: '#f5f5f5',
    color: '#616161'
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: config.bg,
      color: config.color,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  );
};

export default StatusBadge;