import React from 'react';

function PinsBar({ pins, onRemove, onClick }) {
  if (pins.length === 0) {
    return null;
  }

  const getStatusBadge = (pin) => {
    if (pin.status === 'completed') {
      return <span className="badge bg-success ms-2">Done</span>;
    }
    if (pin.status === 'pending') {
      return <span className="badge bg-warning ms-2">Pending</span>;
    }
    return null;
  };

  return (
    <div className="pins-bar border-bottom border-secondary" style={{
      backgroundColor: '#212529',
      padding: '0.5rem 1rem',
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
      alignItems: 'center',
      overflowX: 'auto'
    }}>
      {pins.map(pin => (
        <div
          key={pin.id}
          className="pin-chip d-flex align-items-center gap-2"
          style={{
            backgroundColor: 'rgba(13, 110, 253, 0.2)',
            border: '1px solid rgba(13, 110, 253, 0.4)',
            borderRadius: '1rem',
            padding: '0.25rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
          onClick={() => onClick(pin)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(13, 110, 253, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(13, 110, 253, 0.4)';
          }}
        >
          <i className="bi bi-pin-fill" style={{ fontSize: '0.75rem', color: '#ffffff' }}></i>
          <span style={{ color: '#ffffff' }}>{pin.label}</span>
          {getStatusBadge(pin)}
          <button
            className="btn btn-link p-0 ms-1"
            style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', lineHeight: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(pin.id);
            }}
            title="Remove pin"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      ))}
    </div>
  );
}

export default PinsBar;

