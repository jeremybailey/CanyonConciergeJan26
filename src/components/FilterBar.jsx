import React from 'react';

const FILTERS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'tickets', label: 'Tickets', icon: '🎟' },
  { key: 'service', label: 'Service', icon: '🍸' },
  { key: 'guests', label: 'Guests', icon: '👥' },
  { key: 'system', label: 'System', icon: '🤖' }
];

function FilterBar({ activeFilter, filterCountdown, onFilterChange }) {
  return (
    <div 
      className="filter-bar border-top border-secondary" 
      style={{
        backgroundColor: '#212529',
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}
    >
      {FILTERS.map(filter => (
        <button
          key={filter.key}
          className={`btn ${activeFilter === filter.key ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => onFilterChange(filter.key)}
          style={{
            fontSize: '0.875rem',
            borderRadius: '1.5rem',
            padding: '0.375rem 1rem',
            flexShrink: 0
          }}
        >
          <span style={{ marginRight: '0.25rem' }}>{filter.icon}</span>
          {filter.label}
        </button>
      ))}
      {activeFilter !== 'all' && filterCountdown !== null && (
        <span className="badge bg-secondary align-self-center ms-2" style={{ fontSize: '0.75rem', color: '#ffffff' }}>
          Auto-clear in {filterCountdown}s
        </span>
      )}
    </div>
  );
}

export default FilterBar;

