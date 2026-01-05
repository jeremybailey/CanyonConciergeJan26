import React, { useState, useRef, useEffect } from 'react';

function FeedItem({ item, allItems, isEmphasized, isSelected, onClick, onOpenThread, isStarred = false, onToggleStar, onUpdateTaskLocation, onCompleteTask, itemRef }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);
  const [countdown, setCountdown] = useState(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  // Watch for bottom sheet open/close to hide more actions icon
  useEffect(() => {
    const checkBottomSheet = () => {
      setIsBottomSheetOpen(document.body.hasAttribute('data-bottom-sheet-open'));
    };
    
    // Check initially
    checkBottomSheet();
    
    // Watch for attribute changes
    const observer = new MutationObserver(checkBottomSheet);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-bottom-sheet-open']
    });
    
    return () => observer.disconnect();
  }, []);
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

  const getItemIcon = () => {
    // No icons - all items use avatars now
    return '';
  };

  const renderTaskItem = () => {
    const assignedTo = item.assignedTo;
    const avatarColor = assignedTo ? getAvatarColor(assignedTo.avatar) : null;
    const label = assignedTo?.type === 'staff' ? 'Staff' : assignedTo?.type === 'ai' ? 'AI' : 'Guest';
    const forGuest = item.forGuest;
    const hasPosPayload = item.posPayload && item.posPayload.cart && item.posPayload.cart.length > 0;
    const total = hasPosPayload ? item.posPayload.cart.reduce((sum, cartItem) => sum + (cartItem.quantity * cartItem.price), 0) : 0;

    return (
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          {assignedTo && (
            <div className="d-flex align-items-center gap-2 mb-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: assignedTo.type === 'ai' ? '#3B31FF' : avatarColor,
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}
              >
                {assignedTo.avatar}
              </div>
              <div>
                <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0', lineHeight: '1.2' }}>
                  {assignedTo.name}
                </strong>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', marginTop: '0', lineHeight: '1.2' }}>
                  {label}
                </small>
              </div>
            </div>
          )}
          
          {/* Title - system-generated for POS tasks, derived from message for regular tasks */}
          <div className="d-flex align-items-center gap-2 mb-1" style={{ marginLeft: assignedTo ? '52px' : '0' }}>
            <strong style={{ color: '#ffffff' }}>
              {hasPosPayload ? 'Complete purchase' : item.title}
            </strong>
          </div>
          
          {/* Subtitle: "for {GuestName}" if guest exists */}
          {forGuest && (
            <div className="d-flex align-items-center gap-2 mb-2" style={{ marginLeft: assignedTo ? '52px' : '0' }}>
              <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                for {forGuest.name}
              </small>
            </div>
          )}
          
          {/* Location: optional, editable field on task card */}
          <div className="d-flex align-items-center gap-2 mb-2" style={{ marginLeft: assignedTo ? '52px' : '0' }}>
            <div className="position-relative" ref={locationDropdownRef}>
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLocationDropdown(!showLocationDropdown);
                }}
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem',
                  padding: '0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>
                  Location: {(() => {
                    const loc = item.location;
                    if (loc === 'lobby') return 'Lobby';
                    if (loc === 'bar') return 'Bar';
                    if (loc === 'bathroom') return 'Bathroom';
                    if (loc === 'gallery-1') return 'Gallery 1';
                    if (loc === 'gallery-2') return 'Gallery 2';
                    if (loc === 'gallery-3') return 'Gallery 3';
                    if (loc === 'gallery-4') return 'Gallery 4';
                    if (loc === 'gift-shop') return 'Gift Shop';
                    return 'Not specified';
                  })()}
                </span>
                <i className="bi bi-chevron-down" style={{ fontSize: '0.625rem' }}></i>
              </button>
              {showLocationDropdown && (
                <div
                  className="dropdown-menu show"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '0.25rem',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.375rem',
                    minWidth: '150px',
                    zIndex: 1001,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                    padding: '0.25rem'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {['', 'lobby', 'bar', 'bathroom', 'gallery-1', 'gallery-2', 'gallery-3', 'gallery-4', 'gift-shop'].map(loc => {
                    const label = loc === '' ? 'Not specified' :
                                 loc === 'lobby' ? 'Lobby' :
                                 loc === 'bar' ? 'Bar' :
                                 loc === 'bathroom' ? 'Bathroom' :
                                 loc === 'gallery-1' ? 'Gallery 1' :
                                 loc === 'gallery-2' ? 'Gallery 2' :
                                 loc === 'gallery-3' ? 'Gallery 3' :
                                 loc === 'gallery-4' ? 'Gallery 4' :
                                 loc === 'gift-shop' ? 'Gift Shop' : loc;
                    const isSelected = (item.location || '') === loc;
                    
                    return (
                      <button
                        key={loc}
                        className="dropdown-item"
                        style={{
                          color: isSelected ? '#0d6efd' : 'rgba(255, 255, 255, 0.8)',
                          backgroundColor: isSelected ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                          fontSize: '0.75rem',
                          padding: '0.375rem 0.75rem',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (onUpdateTaskLocation) {
                            onUpdateTaskLocation(item.id, loc || null);
                          }
                          setShowLocationDropdown(false);
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* POS payload: structured content if Task wraps POS */}
          {hasPosPayload && (
            <div style={{ marginLeft: assignedTo ? '52px' : '0', marginBottom: '0.5rem' }}>
              {/* Body: "Complete purchase:" then list cart items */}
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>
                Complete purchase: {item.posPayload.cart.map(cartItem => `${cartItem.quantity}× ${cartItem.name}`).join(', ')}
              </div>
              {/* Payment line */}
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.25rem' }}>
                Payment: {item.posPayload.paymentMethod === 'cash' ? 'Cash' : item.posPayload.paymentMethod === 'card' ? 'Card' : 'Card on File'}
              </div>
              {/* Optional total line */}
              {total > 0 && (
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '600' }}>
                  Total: ${total.toFixed(2)}
                </div>
              )}
            </div>
          )}
          
          {/* Note: typed message text appears ONLY ONCE as a labeled note (if present and different from title) */}
          {item.description && item.description.trim() && 
           (!hasPosPayload || (hasPosPayload && item.description !== 'Complete purchase')) && (
            <div style={{ marginLeft: assignedTo ? '52px' : '0', marginTop: hasPosPayload ? '0.5rem' : '0' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '500' }}>Note: </span>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {item.description}
              </span>
            </div>
          )}
          
          {/* CTA area for POS tasks */}
          {hasPosPayload && (
            <div style={{ marginLeft: assignedTo ? '52px' : '0', marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Stub handler for "Complete in Square"
                  alert('Complete in Square (stub)');
                }}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              >
                Complete in Square
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Stub handler for "Mark done"
                  onClick(); // This will trigger the complete action
                }}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              >
                Mark done
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getAvatarColor = (initials) => {
    // Generate a consistent color based on initials
    const colors = [
      '#0d6efd', '#6f42c1', '#d63384', '#dc3545', 
      '#fd7e14', '#ffc107', '#20c997', '#198754'
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    if (showActions || showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActions, showLocationDropdown]);

  // Calculate countdown for system messages with performanceStartTime
  useEffect(() => {
    // Only calculate countdown for system messages with performanceStartTime
    if (item.type !== 'system' || !item.performanceStartTime) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = item.performanceStartTime - now;
      
      if (timeLeft <= 0) {
        setCountdown('0:00');
        return;
      }
      
      const totalSeconds = Math.floor(timeLeft / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [item.type, item.performanceStartTime]);

  // Common actions popover for all card types - positioned in top right
  const renderActionsPopover = () => {
    const isCompleted = item.status === 'completed' || item.completed;
    
    const handleAction = (actionName) => {
      setShowActions(false);
      if (actionName === 'complete' && onCompleteTask) {
        // Mark task as completed
        onCompleteTask(item.id);
      } else {
        onClick(); // Select the item, which will show actions in composer
      }
    };

    return (
      <div 
        className="position-absolute" 
        style={{ 
          top: '0.5rem', 
          right: '0.5rem', 
          zIndex: showActions ? 1003 : 1001, // Higher z-index when popover is open to appear above buttons from other cards
          display: isBottomSheetOpen ? 'none' : 'block' // Hide when bottom sheet is open
        }} 
        ref={actionsRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-link p-0"
          style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '1.25rem',
            zIndex: showActions ? 1 : 'auto', // Lower z-index when popover is open so popover appears above
            position: 'relative', // Ensure z-index applies
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            padding: '0',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          title="Actions"
        >
          <i className="bi bi-three-dots-vertical"></i>
        </button>
        
        {showActions && (
          <div
            className="actions-popover"
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '0.25rem',
              backgroundColor: '#212529',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              minWidth: '150px',
              zIndex: 1003, // Very high z-index to appear above button (1) and buttons from other cards
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-link text-start w-100 p-2"
              style={{ 
                color: isCompleted ? 'rgba(255, 255, 255, 0.4)' : '#ffffff', 
                fontSize: '0.875rem', 
                textDecoration: 'none',
                cursor: isCompleted ? 'not-allowed' : 'pointer'
              }}
              disabled={isCompleted}
              onClick={() => !isCompleted && handleAction('complete')}
            >
              <i className="bi bi-check-circle me-2"></i> Complete
            </button>
            <button
              className="btn btn-link text-start w-100 p-2"
              style={{ color: '#ffffff', fontSize: '0.875rem', textDecoration: 'none' }}
              onClick={() => handleAction('reply')}
            >
              <i className="bi bi-chat me-2"></i> Reply
            </button>
            <button
              className="btn btn-link text-start w-100 p-2"
              style={{ color: '#ffffff', fontSize: '0.875rem', textDecoration: 'none' }}
              onClick={() => handleAction('checkin')}
            >
              <i className="bi bi-person-check me-2"></i> Check-in
            </button>
            <button
              className="btn btn-link text-start w-100 p-2"
              style={{ color: '#ffffff', fontSize: '0.875rem', textDecoration: 'none' }}
              onClick={() => handleAction('order')}
            >
              <i className="bi bi-cup-straw me-2"></i> Order drink
            </button>
            <button
              className="btn btn-link text-start w-100 p-2"
              style={{ color: '#ffffff', fontSize: '0.875rem', textDecoration: 'none' }}
              onClick={() => handleAction('reassign')}
            >
              <i className="bi bi-arrow-repeat me-2"></i> Reassign
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGuestItem = () => {
    const name = item.name || 'Guest';
    const avatar = item.avatar || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarColor = getAvatarColor(avatar);
    
    // Get thread replies and find the last one
    const threadReplies = item.threadId 
      ? allItems
          .filter(i => i.threadId === item.threadId && i.type === 'concierge')
          .sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
      : [];
    const replyCount = threadReplies.length;
    const lastReply = replyCount > 0 ? threadReplies[0] : null;
    
    return (
      <div>
        {/* Original guest message */}
        <div className="d-flex align-items-start gap-3 mb-2">
          {/* Large avatar on the left */}
          <div 
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: avatarColor,
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            {avatar}
          </div>
          
          {/* Message content */}
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>{name}</strong>
              <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>Guest</small>
            </div>
            <p className="mb-0" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              {item.message}
            </p>
          </div>
        </div>
        
        {/* Last reply inline with threading visual */}
        {lastReply && (
          <div 
            className="d-flex align-items-start"
            style={{ marginLeft: '64px', marginTop: '0.5rem', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenThread(item);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderRadius = '0.25rem';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Reply avatar */}
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3B31FF',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginRight: '0.75rem'
              }}
            >
              AI
            </div>
            
            {/* Reply content */}
            <div className="flex-grow-1" style={{ minWidth: 0, padding: '0.25rem 0' }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>Canyon Concierge</strong>
                {replyCount > 1 && (
                  <span 
                    style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '0.75rem'
                    }}
                  >
                    +{replyCount - 1} more
                  </span>
                )}
              </div>
              <p className="mb-0" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {lastReply.message}
              </p>
            </div>
          </div>
        )}
        
        {/* Thread indicator if no replies yet but thread exists */}
        {!lastReply && item.threadId && (
          <div 
            className="thread-indicator d-flex align-items-center gap-2"
            style={{ 
              marginLeft: '60px',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              transition: 'background-color 0.2s'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenThread(item);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#3B31FF',
                color: '#ffffff',
                fontSize: '0.625rem',
                fontWeight: '600'
              }}
            >
              AI
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
              View thread
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderConciergeItem = () => {
    // Show recipients if available
    const recipients = item.recipients || [];
    
    // Check if this is a user message (has sender field)
    const isUserMessage = item.sender && item.sender.type === 'staff';
    const sender = isUserMessage ? item.sender : {
      name: 'Canyon Concierge',
      avatar: 'AI',
      type: 'ai'
    };
    const avatarColor = isUserMessage ? getAvatarColor(sender.avatar) : '#3B31FF';
    const label = isUserMessage ? 'Staff' : 'Concierge';
    
    return (
      <div className="d-flex align-items-start gap-2">
        {/* Large avatar on the left */}
        <div 
          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: avatarColor,
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          {sender.avatar}
        </div>
        
        {/* Message content */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          {/* Sender name */}
          <div className="mb-1">
            <strong style={{ color: '#ffffff', fontSize: '0.875rem' }}>
              {sender.name}
            </strong>
          </div>
          
          {/* Recipients - arrow icon format */}
          {recipients.length > 0 && (
            <div className="mb-1 d-flex align-items-center gap-1 flex-wrap">
              <i className="bi bi-arrow-right" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}></i>
              {recipients.map((recipient, idx) => {
                const recipientAvatarColor = recipient.isSpecial
                  ? (recipient.type === 'ai' ? '#3B31FF' : getAvatarColor(recipient.name))
                  : getAvatarColor(recipient.name);
                const recipientInitials = recipient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                
                return (
                  <div key={recipient.id} className="d-flex align-items-center gap-1">
                    {/* Small recipient avatar */}
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: recipientAvatarColor,
                        color: '#ffffff',
                        fontSize: '0.5rem',
                        fontWeight: '600',
                        flexShrink: 0
                      }}
                    >
                      {recipient.isSpecial ? (recipient.type === 'ai' ? 'AI' : 'S') : recipientInitials}
                    </div>
                    {/* Recipient name */}
                    <small style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '0.75rem'
                    }}>
                      {recipient.name}
                    </small>
                    {idx < recipients.length - 1 && (
                      <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>,</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Message content */}
          <p className="mb-0" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            {item.message}
          </p>
          
          {/* POS receipt: show structured summary if this is a completed POS transaction */}
          {item.posReceipt && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '0.25rem', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem', fontWeight: '500' }}>
                Receipt
              </div>
              {item.posReceipt.cart.map(cartItem => (
                <div key={cartItem.id} style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{cartItem.quantity}× {cartItem.name}</span>
                  <span>${(cartItem.quantity * cartItem.price).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: '600' }}>
                <span>Total</span>
                <span>${item.posReceipt.total.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                {item.posReceipt.paymentMethod === 'cash' ? 'Cash' : item.posReceipt.paymentMethod === 'card' ? 'Card' : 'Card on File'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSystemItem = () => (
    <div>
      <div className="d-flex align-items-center gap-2 mb-2">
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
        <div>
          <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0', lineHeight: '1.2' }}>
            Canyon Concierge
          </strong>
          <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem', marginTop: '0', lineHeight: '1.2' }}>
            System
          </small>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2 mb-1" style={{ marginLeft: '52px' }}>
        <strong style={{ color: '#ffffff' }}>{item.title}</strong>
        {/* Show countdown badge if available */}
        {countdown && (
          <span
            className="badge bg-danger rounded-pill"
            style={{
              fontSize: '0.65rem',
              padding: '0.2rem 0.5rem',
              fontWeight: '600'
            }}
          >
            {countdown}
          </span>
        )}
      </div>
      {/* Show note for system events (internal ops annotation) */}
      {item.type === 'system' && item.note && (
        <p className="mb-0" style={{ 
          fontSize: '0.875rem', 
          color: 'rgba(255, 255, 255, 0.6)', 
          fontStyle: 'italic',
          marginLeft: '52px',
          marginTop: '0.25rem'
        }}>
          Note: {item.note}
        </p>
      )}
      {/* Show message for non-system items */}
      {item.type !== 'system' && item.message && (
        <p className="mb-0" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginLeft: '52px' }}>
          {item.message}
        </p>
      )}
    </div>
  );

  const renderContent = () => {
    switch (item.type) {
      case 'task':
        return renderTaskItem();
      case 'guest':
        return renderGuestItem();
      case 'concierge':
        return renderConciergeItem();
      case 'system':
        return renderSystemItem();
      default:
        return <div>{item.message || item.title}</div>;
    }
  };

  const collapsedContent = () => {
    switch (item.type) {
      case 'task':
        return item.title;
      case 'guest':
        const guestName = item.name || 'Guest';
        return `${guestName}: ${item.message?.substring(0, 40)}...`;
      case 'concierge':
        return `Concierge: ${item.message?.substring(0, 50)}...`;
      case 'system':
        return item.title;
      default:
        return 'Item';
    }
  };

  // Determine status bar color for task and system items
  const getStatusBarColor = () => {
    if (item.type === 'task') {
      const isCompleted = item.status === 'completed' || item.completed;
      if (isCompleted) {
        return '#198754'; // Green for completed
      } else if (item.assignedTo) {
        return '#dc3545'; // Red for assigned but not complete
      }
    } else if (item.type === 'system') {
      return '#3B31FF'; // Blue for system items (Canyon Concierge color)
    }
    return null; // No bar for other items
  };

  const statusBarColor = getStatusBarColor();
  
  // For guest items (conversation threads) and sent messages (concierge with sender), use transparent background
  const isGuestItem = item.type === 'guest';
  const isSentMessage = item.type === 'concierge' && item.sender && item.sender.type === 'staff';
  const isTransparentItem = isGuestItem || isSentMessage;
  const cardBackgroundColor = isTransparentItem 
    ? (isSelected ? 'rgba(13, 110, 253, 0.15)' : 'transparent')
    : (isSelected ? 'rgba(13, 110, 253, 0.15)' : '#2d2d2d');

  return (
    <div
      id={`feed-item-${item.id}`}
      ref={itemRef}
      className="feed-item card mb-3 position-relative"
      style={{
        backgroundColor: cardBackgroundColor,
        border: 'none',
        borderLeft: statusBarColor ? `4px solid ${statusBarColor}` : 'none',
        opacity: isEmphasized ? 1 : 0.4,
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: isEmphasized ? '1rem' : '0.5rem 1rem',
        borderRadius: '0.5rem'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isEmphasized) {
          e.currentTarget.style.backgroundColor = isSelected 
            ? 'rgba(13, 110, 253, 0.2)' 
            : 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (isTransparentItem) {
          e.currentTarget.style.backgroundColor = isSelected 
            ? 'rgba(13, 110, 253, 0.15)' 
            : 'transparent';
        } else {
          e.currentTarget.style.backgroundColor = isSelected 
            ? 'rgba(13, 110, 253, 0.15)' 
            : '#2d2d2d';
        }
      }}
    >
      <div className="d-flex align-items-start gap-2">
        {getItemIcon() && (
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{getItemIcon()}</span>
        )}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          {isEmphasized ? (
            renderContent()
          ) : (
            <div className="d-flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                {collapsedContent()}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Star button and Actions icon in top right - only show when emphasized (not collapsed) */}
      {isEmphasized && (
        <>
          {/* Star button */}
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleStar) {
                onToggleStar();
              }
            }}
            aria-pressed={isStarred}
            aria-label={isStarred ? 'Unstar item' : 'Star item'}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '2.75rem', // Position to the left of actions button (actions button is ~24px wide + 0.5rem gap)
              zIndex: 9, // Lower than actions popover (z-index: 1000) to ensure popover appears on top
              color: isStarred ? '#ffc107' : 'rgba(255, 255, 255, 0.4)',
              fontSize: '1.1rem',
              padding: '0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isStarred ? '#ffd700' : 'rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isStarred ? '#ffc107' : 'rgba(255, 255, 255, 0.4)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isStarred ? (
              <i className="bi bi-star-fill" style={{ fontSize: '1.1rem' }}></i>
            ) : (
              <i className="bi bi-star" style={{ fontSize: '1.1rem' }}></i>
            )}
          </button>
          {renderActionsPopover()}
        </>
      )}
      {/* Timestamp in bottom right */}
      <div 
        className="position-absolute" 
        style={{ 
          bottom: '0.5rem', 
          right: '0.5rem', 
          fontSize: '0.75rem', 
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        {formatTime(item.timestamp)}
      </div>
    </div>
  );
}

export default FeedItem;

