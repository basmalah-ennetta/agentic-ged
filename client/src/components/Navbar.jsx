import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  // useLocation tells us the current URL path
  const location = useLocation();

  const linkStyle = (path) => ({
    textDecoration: 'none',
    color: location.pathname === path ? '#3b82f6' : '#cbd5e1',
    fontWeight: location.pathname === path ? '600' : '400',
    fontSize: '14px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: location.pathname === path
      ? 'rgba(59,130,246,0.1)' : 'transparent',
    transition: 'all 0.2s',
  });

  return (
    <nav style={{
      backgroundColor: '#1e293b',
      padding: '0 32px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo / Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>📄</span>
        <span style={{
          color: '#f1f5f9',
          fontWeight: '700',
          fontSize: '16px',
          letterSpacing: '0.3px',
        }}>
          Agentic HR Contract Processing
        </span>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link to="/" style={linkStyle('/')}>
          📤 Upload
        </Link>
        <Link to="/contracts" style={linkStyle('/contracts')}>
          📋 Contracts
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;