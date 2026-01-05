import React, { useState } from 'react';
import Composer from './Composer';

function ThreadComposer({ guestMessage, onReply, feedItems = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [toolMode, setToolMode] = useState(null);

  const handleToolAction = (action, data) => {
    if (action === 'thread-reply' && onReply) {
      onReply(data.message);
    } else {
      // Handle other tool actions (check-in, sell ticket, order drink)
      console.log('Tool action:', action, data);
      alert(`Action: ${action}\nData: ${JSON.stringify(data, null, 2)}`);
      setToolMode(null);
    }
  };

  // Tool mode composers (same as main composer)
  const renderTicketScanComposer = () => (
    <div className="tool-composer">
      <div className="d-flex gap-2">
        <button
          className="btn btn-primary flex-grow-1"
          onClick={() => handleToolAction('scan-ticket', { method: 'scanner' })}
        >
          <i className="bi bi-qr-code-scan"></i> Open Scanner
        </button>
        <button
          className="btn btn-outline-primary flex-grow-1"
          onClick={() => handleToolAction('scan-ticket', { method: 'manual' })}
        >
          <i className="bi bi-keyboard"></i> Manual Entry
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => setToolMode(null)}
        >
          <i className="bi bi-x"></i>
        </button>
      </div>
    </div>
  );

  const renderSellTicketComposer = () => {
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(25);
    
    return (
      <div className="tool-composer">
        <div className="d-flex gap-2 mb-2">
          <div className="flex-grow-1">
            <label className="form-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Quantity</label>
            <input
              type="number"
              className="form-control bg-dark text-white border-secondary"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex-grow-1">
            <label className="form-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Price</label>
            <input
              type="number"
              className="form-control bg-dark text-white border-secondary"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success flex-grow-1"
            onClick={() => handleToolAction('sell-ticket', { quantity, price, method: 'charge' })}
          >
            <i className="bi bi-credit-card"></i> Charge ${(quantity * price).toFixed(2)}
          </button>
          <button
            className="btn btn-outline-warning flex-grow-1"
            onClick={() => handleToolAction('sell-ticket', { quantity, price, method: 'comp' })}
          >
            <i className="bi bi-gift"></i> Comp
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setToolMode(null)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderOrderDrinkComposer = () => {
    const drinks = ['Wine', 'Beer', 'Cocktail', 'Soft Drink'];
    const [selectedDrink, setSelectedDrink] = useState('');
    
    return (
      <div className="tool-composer">
        <div className="mb-2">
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Select Drink</label>
          <select
            className="form-select bg-dark text-white border-secondary"
            value={selectedDrink}
            onChange={(e) => setSelectedDrink(e.target.value)}
          >
            <option value="">Choose...</option>
            {drinks.map(drink => (
              <option key={drink} value={drink}>{drink}</option>
            ))}
          </select>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-primary flex-grow-1"
            disabled={!selectedDrink}
            onClick={() => handleToolAction('order-drink', { drink: selectedDrink })}
          >
            <i className="bi bi-send"></i> Send Order
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setToolMode(null)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderComposer = () => {
    // Tool modes take precedence
    if (toolMode === 'ticket-scan') return renderTicketScanComposer();
    if (toolMode === 'sell-ticket') return renderSellTicketComposer();
    if (toolMode === 'order-drink') return renderOrderDrinkComposer();
    if (toolMode === 'checkin') {
      return (
        <div className="tool-composer">
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary flex-grow-1"
              onClick={() => handleToolAction('checkin', { guestId: guestMessage.id })}
            >
              <i className="bi bi-person-check"></i> Check-in Guest
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setToolMode(null)}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      );
    }
    
    // Default thread reply composer - stable, no contextual actions
    return (
      <div className="thread-reply-composer">
        <div className="input-group">
          <input
            type="text"
            className="form-control bg-dark text-white border-secondary"
            placeholder="Ask or act…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                handleToolAction('thread-reply', { message: inputValue });
                setInputValue('');
              }
            }}
          />
          <button
            className="btn btn-primary"
            disabled={!inputValue.trim()}
            onClick={() => {
              if (inputValue.trim()) {
                handleToolAction('thread-reply', { message: inputValue });
                setInputValue('');
              }
            }}
          >
            <i className="bi bi-send"></i> Send
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="composer-bar border-top border-secondary" style={{
      backgroundColor: '#212529',
      padding: '1rem'
    }}>
      {renderComposer()}
    </div>
  );
}

function ThreadView({ threadItems, guestMessage, onBack, onReply, onCloseConversation, feedItems = [] }) {
  const getAvatarColor = (initials) => {
    // Generate a consistent color based on initials
    const colors = [
      '#0d6efd', '#6f42c1', '#d63384', '#dc3545', 
      '#fd7e14', '#ffc107', '#20c997', '#198754'
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Sort thread items by timestamp
  const sortedThreadItems = [...threadItems].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div 
      className="thread-view"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a1a',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      {/* Header */}
      <div 
        className="thread-header border-bottom border-secondary"
        style={{
          backgroundColor: '#212529',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <button
          className="btn btn-link p-0"
          onClick={onBack}
          style={{ color: '#ffffff', fontSize: '1.25rem' }}
        >
          <i className="bi bi-arrow-left"></i>
        </button>
        <div className="flex-grow-1">
          <h5 className="mb-0" style={{ color: '#ffffff' }}>Thread</h5>
          <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {guestMessage.name}
          </small>
        </div>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => {
            if (window.confirm('Close this conversation?')) {
              onCloseConversation(guestMessage);
            }
          }}
        >
          <i className="bi bi-x-circle"></i> Close Conversation
        </button>
      </div>

      {/* Thread Content */}
      <div 
        className="thread-content flex-grow-1 overflow-auto"
        style={{ padding: '1rem', paddingBottom: '8rem' }}
      >
        {/* Original Guest Message */}
        <div className="thread-message mb-3">
          <div className="d-flex align-items-start gap-2 mb-2">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: getAvatarColor(guestMessage.avatar),
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: '600',
                flexShrink: 0
              }}
            >
              {guestMessage.avatar}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <strong style={{ color: '#ffffff' }}>{guestMessage.name}</strong>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {formatTime(guestMessage.timestamp)}
                </small>
              </div>
              <p className="mb-0" style={{ color: '#ffffff' }}>
                {guestMessage.message}
              </p>
            </div>
          </div>
        </div>

        {/* Thread Replies */}
        <div className="thread-replies">
          {sortedThreadItems.map((item, index) => (
            <div 
              key={item.id}
              className="thread-reply mb-3"
            >
              <div className="d-flex align-items-start gap-2">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#3B31FF',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    flexShrink: 0
                  }}
                >
                  AI
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>Concierge</strong>
                    <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {formatTime(item.timestamp)}
                    </small>
                  </div>
                  <p className="mb-0" style={{ color: '#ffffff' }}>
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer for thread replies */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 100 }}>
        <ThreadComposer
          guestMessage={guestMessage}
          onReply={onReply}
          feedItems={feedItems}
        />
      </div>
    </div>
  );
}

export default ThreadView;

