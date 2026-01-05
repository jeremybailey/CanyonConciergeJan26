import React, { useState, useRef, useEffect } from 'react';

const SUGGESTED_PROMPTS = [
  'Check arrivals status',
  'View active tasks',
  'Performance schedule',
  'Guest requests'
];

const RECIPIENT_TYPES = [
  { id: 'user', label: 'User', icon: '👤' },
  { id: 'staff', label: 'Staff', icon: '👔' },
  { id: 'ai', label: 'AI', icon: '🤖' }
];

function Composer({ 
  selectedContext, 
  toolMode, 
  onToolModeChange, 
  onToolAction,
  onCompleteTask,
  onReassignTask,
  isThreadMode = false,
  feedItems = [],
  onSendMessage,
  onInputFocus
}) {
  // Composer state: composable actions + optional delegation
  // Entity pills: selected people (staff, guests, AI)
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  // Primary action: exactly ONE of 'pos', 'check-in', or null (implicit 'message')
  const [primaryAction, setPrimaryAction] = useState(null); // 'pos' | 'check-in' | null
  // Wrapper pill: Assign (optional, wraps primary action or message)
  const [hasAssignPill, setHasAssignPill] = useState(false);
  // POS variables: cart items and payment method (only valid when primaryAction === 'pos')
  const [posCart, setPosCart] = useState([]); // Array of { id, name, quantity, price }
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash', 'card', 'card-on-file', or null
  // Toast message for action switching
  const [toastMessage, setToastMessage] = useState(null);
  // Text input
  const [inputValue, setInputValue] = useState('');
  // UI state
  const [showRecipientMenu, setShowRecipientMenu] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showStaffSubmenu, setShowStaffSubmenu] = useState(false);
  const [showPosPicker, setShowPosPicker] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showPeopleSheet, setShowPeopleSheet] = useState(false);
  const [showCheckInSheet, setShowCheckInSheet] = useState(false);
  const [showPosSheet, setShowPosSheet] = useState(false);
  const recipientMenuRef = useRef(null);
  const recipientSearchRef = useRef(null);
  const posPickerRef = useRef(null);
  const checkInPickerRef = useRef(null);
  const inputRef = useRef(null);
  const pillsRef = useRef(null);
  const promptBoxRef = useRef(null);

  // Get avatar color based on initials
  const getAvatarColor = (initials) => {
    // Generate a consistent color based on initials
    if (!initials || typeof initials !== 'string' || initials.length === 0) {
      return '#0d6efd'; // Default color if initials is invalid
    }
    const colors = [
      '#0d6efd', '#6f42c1', '#d63384', '#dc3545', 
      '#fd7e14', '#ffc107', '#20c997', '#198754'
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get list of people from feed items
  const getPeopleList = () => {
    const people = new Map();
    
    // Add AI and Staff at the top
    people.set('ai', {
      id: 'ai',
      name: 'AI Concierge',
      avatar: '🤖',
      type: 'ai',
      isSpecial: true
    });
    
    people.set('staff', {
      id: 'staff',
      name: 'Staff',
      avatar: '👔',
      type: 'staff',
      isSpecial: true
    });
    
    // Extract guests from feed items
    feedItems.forEach(item => {
      if (item.type === 'guest' && item.name) {
        const key = `guest-${item.id}`;
        if (!people.has(key)) {
          people.set(key, {
            id: item.id,
            name: item.name,
            avatar: item.avatar || item.name.charAt(0),
            type: 'guest',
            isSpecial: false
          });
        }
      }
      // Extract assigned staff from tasks
      if (item.type === 'task' && item.assignedTo && item.assignedTo.type === 'staff') {
        const key = `staff-${item.assignedTo.name}`;
        if (!people.has(key)) {
          people.set(key, {
            id: key,
            name: item.assignedTo.name,
            avatar: item.assignedTo.avatar || item.assignedTo.name.charAt(0),
            type: 'staff',
            isSpecial: false
          });
        }
      }
    });
    
    return Array.from(people.values());
  };

  // Get list of individual staff members (non-special staff)
  const getStaffList = () => {
    const staff = new Map();
    
    // Extract staff from feed items (tasks with assignedTo, sent messages with sender)
    feedItems.forEach(item => {
      if (item.type === 'task' && item.assignedTo && item.assignedTo.type === 'staff') {
        const key = `staff-${item.assignedTo.name}`;
        if (!staff.has(key)) {
          staff.set(key, {
            id: key,
            name: item.assignedTo.name,
            avatar: item.assignedTo.avatar || item.assignedTo.name.charAt(0),
            type: 'staff',
            isSpecial: false
          });
        }
      }
      // Extract staff from sent messages
      if (item.type === 'concierge' && item.sender && item.sender.type === 'staff') {
        const key = `staff-${item.sender.name}`;
        if (!staff.has(key)) {
          staff.set(key, {
            id: key,
            name: item.sender.name,
            avatar: item.sender.avatar || item.sender.name.charAt(0),
            type: 'staff',
            isSpecial: false
          });
        }
      }
    });
    
    return Array.from(staff.values());
  };

  // Filter people based on search
  const getFilteredPeople = () => {
    const allPeople = getPeopleList();
    if (!recipientSearch.trim()) {
      return allPeople;
    }
    const searchLower = recipientSearch.toLowerCase();
    return allPeople.filter(person => 
      person.name.toLowerCase().includes(searchLower)
    );
  };

  // Focus search input when menu opens
  useEffect(() => {
    if (showRecipientMenu && recipientSearchRef.current) {
      setTimeout(() => {
        recipientSearchRef.current?.focus();
      }, 100);
    }
  }, [showRecipientMenu]);

  // Close recipient menu, POS picker, and Check-in picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (recipientMenuRef.current && !recipientMenuRef.current.contains(event.target)) {
        setShowRecipientMenu(false);
        setRecipientSearch('');
        setShowStaffSubmenu(false);
      }
      if (posPickerRef.current && !posPickerRef.current.contains(event.target)) {
        setShowPosPicker(false);
      }
      if (checkInPickerRef.current && !checkInPickerRef.current.contains(event.target)) {
        setShowCheckInPicker(false);
      }
    };

    if (showRecipientMenu || showPosPicker || showCheckInPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecipientMenu, showPosPicker, showCheckInPicker]);

  // Auto-clear POS variables when POS action is removed
  useEffect(() => {
    if (primaryAction !== 'pos') {
      setPosCart([]);
      setPaymentMethod(null);
      setShowPosPicker(false);
    }
  }, [primaryAction]);

  // Auto-close Check-in picker when Check-in action is removed
  useEffect(() => {
    if (primaryAction !== 'check-in') {
      setShowCheckInPicker(false);
    }
  }, [primaryAction]);

  // Auto-dismiss toast after 2 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set data attribute on body when bottom sheets are open (to hide more actions icons)
  useEffect(() => {
    const hasBottomSheet = isMobile && (showBottomSheet || showPeopleSheet || showCheckInSheet || showPosSheet);
    if (hasBottomSheet) {
      document.body.setAttribute('data-bottom-sheet-open', 'true');
    } else {
      document.body.removeAttribute('data-bottom-sheet-open');
    }
    return () => {
      document.body.removeAttribute('data-bottom-sheet-open');
    };
  }, [isMobile, showBottomSheet, showPeopleSheet, showCheckInSheet, showPosSheet]);

  // Adjust prompt box padding-top based on pills height
  useEffect(() => {
    if (!isMobile || !promptBoxRef.current || !pillsRef.current) return;
    
    const hasPills = selectedRecipients.length > 0 || primaryAction !== null || hasAssignPill || posCart.length > 0;
    if (!hasPills) {
      if (promptBoxRef.current) {
        promptBoxRef.current.style.paddingTop = '0.5rem';
      }
      return;
    }

    const updatePadding = () => {
      if (pillsRef.current && promptBoxRef.current) {
        const pillsHeight = pillsRef.current.scrollHeight;
        // 0.75rem = 12px (matching left padding, assuming 16px base font size)
        const topPadding = 12;
        const bottomPadding = 8;
        promptBoxRef.current.style.paddingTop = `${topPadding + pillsHeight + bottomPadding}px`;
      }
    };

    // Update immediately
    updatePadding();

    // Use ResizeObserver to watch for pills height changes
    const resizeObserver = new ResizeObserver(updatePadding);
    resizeObserver.observe(pillsRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMobile, selectedRecipients, primaryAction, hasAssignPill, posCart]);

  // Remove recipient from selected list
  const removeRecipient = (recipientId) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== recipientId));
  };

  // Add recipient to selected list (if not already selected)
  const addRecipient = (person) => {
    if (!person || !person.id) {
      console.error('addRecipient: Invalid person object', person);
      return;
    }
    
    // Update selected recipients
    setSelectedRecipients(prev => {
      // Check if already selected (works for all modes, including check-in with multiple guests)
      if (prev.some(r => r.id === person.id)) {
        return prev; // Already selected
      }
      // Add new recipient (allows multiple guests in check-in mode)
      return [...prev, person];
    });
    
    // Close menus immediately
    setShowRecipientMenu(false);
    setShowStaffSubmenu(false);
    setRecipientSearch('');
    
    // Focus back on input after a brief delay
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Toggle recipient selection without closing menu (for checkmark clicks)
  const toggleRecipientSelection = (person) => {
    setSelectedRecipients(prev => {
      if (prev.some(r => r.id === person.id)) {
        return prev.filter(r => r.id !== person.id); // Remove if selected
      }
      return [...prev, person]; // Add if not selected
    });
    // Don't close menu or clear search
  };

  // Render entity pill (people: staff, guests, AI)
  const renderEntityPill = (recipient) => {
    // Determine background color based on recipient type
    let backgroundColor;
    let borderColor;
    
    if (recipient.type === 'ai') {
      backgroundColor = 'rgba(13, 110, 253, 0.3)'; // Blue for AI
      borderColor = 'rgba(13, 110, 253, 0.5)';
    } else if (recipient.type === 'staff') {
      backgroundColor = 'rgba(13, 110, 253, 0.3)'; // Blue for staff
      borderColor = 'rgba(13, 110, 253, 0.5)';
    } else if (recipient.type === 'guest') {
      backgroundColor = 'rgba(216, 51, 132, 0.3)'; // Pink for guests
      borderColor = 'rgba(216, 51, 132, 0.5)';
    } else {
      backgroundColor = 'rgba(13, 110, 253, 0.3)'; // Default blue
      borderColor = 'rgba(255, 255, 255, 0.3)';
    }
    
    return (
      <span
        key={recipient.id}
        className="badge"
        style={{
          backgroundColor: backgroundColor,
          color: '#ffffff',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          borderRadius: '0.375rem',
          border: `1px solid ${borderColor}`,
          whiteSpace: 'nowrap',
          height: '24px',
          lineHeight: '1',
          flexShrink: 0
        }}
      >
      <span style={{ fontSize: '0.875rem' }}>{recipient.avatar}</span>
      <span style={{ fontWeight: '500' }}>{recipient.name}</span>
      {recipient.isSpecial && (
        <span 
          className="badge bg-secondary"
          style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', marginLeft: '0.125rem' }}
        >
          {recipient.type === 'ai' ? 'AI' : 'Staff'}
        </span>
      )}
      <button
        type="button"
        className="btn-close btn-close-white"
        style={{
          fontSize: '0.625rem',
          marginLeft: '0.125rem',
          padding: '0',
          width: '0.875rem',
          height: '0.875rem',
          opacity: 0.8,
          flexShrink: 0
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          removeRecipient(recipient.id);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        aria-label="Remove"
      />
    </span>
    );
  };

  // Render wrapper pill: [Assign] - wrapper style (muted/outlined, less dominant than primary actions)
  const renderAssignPill = () => {
    if (!hasAssignPill) return null;
    return (
      <span
        className="badge"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: 'rgba(255, 255, 255, 0.7)',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          whiteSpace: 'nowrap',
          height: '24px',
          lineHeight: '1',
          flexShrink: 0
        }}
      >
        <i className="bi bi-check-square" style={{ fontSize: '0.75rem' }}></i>
        <span style={{ fontWeight: '500' }}>Assign</span>
        <button
          type="button"
          className="btn-close btn-close-white"
          style={{
            fontSize: '0.625rem',
            marginLeft: '0.125rem',
            padding: '0',
            width: '0.875rem',
            height: '0.875rem',
            opacity: 0.8,
            flexShrink: 0
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setHasAssignPill(false);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="Remove Task"
        />
      </span>
    );
  };

  // Render primary action pill: [POS] - solid style (primary action)
  const renderPosPill = () => {
    if (primaryAction !== 'pos') return null;
    return (
      <span
        className="badge"
        style={{
          backgroundColor: 'rgba(255, 193, 7, 0.3)',
          color: '#ffffff',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 193, 7, 0.6)',
          whiteSpace: 'nowrap',
          height: '24px',
          lineHeight: '1',
          flexShrink: 0
        }}
      >
        <i className="bi bi-cart" style={{ fontSize: '0.75rem' }}></i>
        <span style={{ fontWeight: '500' }}>POS</span>
        <button
          type="button"
          className="btn-close btn-close-white"
          style={{
            fontSize: '0.625rem',
            marginLeft: '0.125rem',
            padding: '0',
            width: '0.875rem',
            height: '0.875rem',
            opacity: 0.8,
            flexShrink: 0
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setPrimaryAction(null);
            setPosCart([]);
            setPaymentMethod(null);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="Remove POS"
        />
      </span>
    );
  };

  // Render primary action pill: [Check-in] - solid style (primary action)
  const renderCheckInPill = () => {
    if (primaryAction !== 'check-in') return null;
    return (
      <span
        className="badge"
        style={{
          backgroundColor: 'rgba(25, 135, 84, 0.3)',
          color: '#ffffff',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          borderRadius: '0.375rem',
          border: '1px solid rgba(25, 135, 84, 0.6)',
          whiteSpace: 'nowrap',
          height: '24px',
          lineHeight: '1',
          flexShrink: 0
        }}
      >
        <i className="bi bi-person-check" style={{ fontSize: '0.75rem' }}></i>
        <span style={{ fontWeight: '500' }}>Check-in</span>
        <button
          type="button"
          className="btn-close btn-close-white"
          style={{
            fontSize: '0.625rem',
            marginLeft: '0.125rem',
            padding: '0',
            width: '0.875rem',
            height: '0.875rem',
            opacity: 0.8,
            flexShrink: 0
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setPrimaryAction(null);
            setShowCheckInPicker(false);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="Remove Check-in"
        />
      </span>
    );
  };

  // Render POS variable pills (cart items, payment method, and total)
  // These pills are the source of truth - popover selects, pills reflect state
  // Only valid when primaryAction === 'pos'
  const renderPosVariablePills = () => {
    if (primaryAction !== 'pos') return null;
    
    // Calculate total
    const total = posCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    return (
      <>
        {/* Line item pills: [Ticket ×1], [Wine ×1], etc. */}
        {posCart.map(item => (
          <span
            key={item.id}
            className="badge"
            style={{
              backgroundColor: 'rgba(255, 193, 7, 0.2)',
              color: '#ffffff',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 193, 7, 0.4)',
              whiteSpace: 'nowrap',
              height: '24px',
              lineHeight: '1',
              flexShrink: 0
            }}
          >
            <span style={{ fontWeight: '500' }}>{item.name} ×{item.quantity}</span>
            <button
              type="button"
              className="btn-close btn-close-white"
              style={{
                fontSize: '0.625rem',
                marginLeft: '0.125rem',
                padding: '0',
                width: '0.875rem',
                height: '0.875rem',
                opacity: 0.8,
                flexShrink: 0
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Removing a line-item pill updates the cart
                setPosCart(prev => prev.filter(i => i.id !== item.id));
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              aria-label="Remove item"
            />
          </span>
        ))}
        {/* Payment method pill: [Cash] / [Card] / [Card on file] */}
        {paymentMethod && (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(255, 193, 7, 0.2)',
              color: '#ffffff',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 193, 7, 0.4)',
              whiteSpace: 'nowrap',
              height: '24px',
              lineHeight: '1',
              flexShrink: 0
            }}
          >
            <span style={{ fontWeight: '500' }}>
              {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'Card on File'}
            </span>
            <button
              type="button"
              className="btn-close btn-close-white"
              style={{
                fontSize: '0.625rem',
                marginLeft: '0.125rem',
                padding: '0',
                width: '0.875rem',
                height: '0.875rem',
                opacity: 0.8,
                flexShrink: 0
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Removing payment pill clears payment selection
                setPaymentMethod(null);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              aria-label="Remove payment method"
            />
          </span>
        )}
        {/* Total pill: [$45.00] (auto-calculated from cart) */}
        {total > 0 && (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(255, 193, 7, 0.3)',
              color: '#ffffff',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(255, 193, 7, 0.5)',
              whiteSpace: 'nowrap',
              height: '24px',
              lineHeight: '1',
              flexShrink: 0,
              fontWeight: '600'
            }}
          >
            ${total.toFixed(2)}
          </span>
        )}
      </>
    );
  };

  // Render input with tags inside
  const renderInputWithTags = (placeholder, onKeyPress, onSend, showActionButtons = false) => {
    // Check-in requires at least one guest (can be multiple)
    const guestCount = selectedRecipients.filter(r => r.type === 'guest').length;
    const checkInReady = primaryAction === 'check-in' && guestCount >= 1;
    const checkInInvalid = primaryAction === 'check-in' && guestCount === 0;
    const canSubmit = inputValue.trim() || selectedRecipients.length > 0 || primaryAction === 'pos' || hasAssignPill || checkInReady;
    
    const handleSubmit = () => {
      if (!canSubmit) {
        console.log('handleSubmit: Cannot submit, canSubmit is false');
        return;
      }
      
      console.log('handleSubmit: canSubmit is true, checking handlers...', { 
        hasOnSend: !!onSend, 
        hasOnSendMessage: !!onSendMessage, 
        hasOnKeyPress: !!onKeyPress,
        inputValue,
        selectedRecipients: selectedRecipients.length
      });
      
      // Priority: onSend callback, then onSendMessage prop, then onKeyPress
      if (onSend) {
        console.log('handleSubmit: Calling onSend callback');
        onSend();
      } else if (onSendMessage) {
        console.log('handleSubmit: Calling onSendMessage directly with:', { inputValue, selectedRecipients });
        onSendMessage(inputValue, selectedRecipients);
        setInputValue('');
        setSelectedRecipients([]);
      } else if (onKeyPress) {
        console.log('handleSubmit: Simulating Enter key press');
        // Simulate Enter key press
        const event = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
        onKeyPress(event);
      } else {
        console.log('handleSubmit: No handler available');
      }
    };
    
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem'
        }}
      >
        {/* + button outside and to the left (mobile only) */}
        {isMobile && showActionButtons && (
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowBottomSheet(true);
            }}
            data-plus-button
            style={{
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Add action"
          >
            <i className="bi bi-plus-lg" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}></i>
          </button>
        )}
        <div
          ref={promptBoxRef}
          style={{
            flex: 1,
            backgroundColor: '#2d2d2d',
            border: 'none',
            borderRadius: isMobile ? '10px' : '1rem',
            borderTopLeftRadius: isMobile ? '10px' : undefined,
            borderTopRightRadius: isMobile ? '10px' : undefined,
            borderBottomLeftRadius: isMobile ? '10px' : undefined,
            borderBottomRightRadius: isMobile ? '10px' : undefined,
            padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 0.75rem',
            paddingRight: isMobile ? '2.75rem' : '0.75rem', // Make room for send button on mobile
            paddingTop: isMobile && (selectedRecipients.length > 0 || primaryAction !== null || hasAssignPill || posCart.length > 0) ? 'calc(0.75rem + 24px + 0.5rem)' : '0.5rem', // Space for tools (will be adjusted dynamically)
            paddingBottom: '0.5rem', // Ensure bottom padding for textarea
            minHeight: isMobile ? '45px' : '48px',
            height: isMobile && selectedRecipients.length === 0 && primaryAction === null && !hasAssignPill && posCart.length === 0 && !inputValue.trim() ? '45px' : undefined, // Only fixed height when completely empty
            display: 'flex',
            flexDirection: 'row',
            alignItems: isMobile && (selectedRecipients.length > 0 || primaryAction !== null || hasAssignPill || posCart.length > 0 || inputValue.trim()) ? 'flex-end' : 'center', // Align to bottom when tools or text are present, center when empty
            cursor: 'text',
            position: 'relative',
            overflow: 'visible' // Allow content to expand upward
          }}
          onClick={() => {
            inputRef.current?.focus();
            // Rule 2: Show chrome when user taps composer area
            if (onInputFocus) {
              onInputFocus();
            }
          }}
        >
        {/* Pills section: Positioned at top, pushes content down when present */}
        {(selectedRecipients.length > 0 || primaryAction !== null || hasAssignPill || posCart.length > 0) && (
        <div
          ref={pillsRef}
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            right: isMobile ? '2.75rem' : '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: '0.375rem',
            minHeight: '24px',
            zIndex: 1
          }}
        >
          {/* Enforced pill ordering: [People (assignees + guests)] [Check-in (if any)] [POS (if any)] [POS variable pills...] [Assign (if any)] */}
          {/* Entity pills: People (Assignees + Guests) */}
          {selectedRecipients.filter(r => r.type === 'staff' || r.type === 'ai').map(recipient => renderEntityPill(recipient))}
          {selectedRecipients.filter(r => r.type === 'guest').map(recipient => renderEntityPill(recipient))}
          {/* Primary action pill: Check-in */}
          {renderCheckInPill()}
          {/* Primary action pill: POS */}
          {renderPosPill()}
          {/* POS variable pills: Item pills (payload color group) - only when POS is primary action */}
          {primaryAction === 'pos' && posCart.map(item => (
            <span
              key={item.id}
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 193, 7, 0.25)',
                color: '#ffffff',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(255, 193, 7, 0.5)',
                whiteSpace: 'nowrap',
                height: '24px',
                lineHeight: '1',
                flexShrink: 0
              }}
            >
              {item.emoji && <span style={{ fontSize: '0.75rem' }}>{item.emoji}</span>}
              <span style={{ fontWeight: '500' }}>{item.name} ×{item.quantity}</span>
              <button
                type="button"
                className="btn-close btn-close-white"
                style={{
                  fontSize: '0.625rem',
                  marginLeft: '0.125rem',
                  padding: '0',
                  width: '0.875rem',
                  height: '0.875rem',
                  opacity: 0.8,
                  flexShrink: 0
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setPosCart(prev => prev.filter(i => i.id !== item.id));
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                aria-label="Remove item"
              />
            </span>
          ))}
          {/* POS variable pills: Total (payload color group, slightly brighter) */}
          {primaryAction === 'pos' && posCart.length > 0 && (() => {
            const total = posCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            return total > 0 ? (
              <span
                className="badge"
                style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.35)',
                  color: '#ffffff',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  borderRadius: '0.375rem',
                  border: '1px solid rgba(255, 193, 7, 0.6)',
                  whiteSpace: 'nowrap',
                  height: '24px',
                  lineHeight: '1',
                  flexShrink: 0,
                  fontWeight: '600'
                }}
              >
                ${total.toFixed(2)}
              </span>
            ) : null;
          })()}
          {/* POS variable pills: Payment (payload color group) - comes after Total */}
          {primaryAction === 'pos' && paymentMethod && (
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(255, 193, 7, 0.25)',
                color: '#ffffff',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(255, 193, 7, 0.5)',
                whiteSpace: 'nowrap',
                height: '24px',
                lineHeight: '1',
                flexShrink: 0
              }}
            >
              <span style={{ fontWeight: '500' }}>
                {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'Card on File'}
              </span>
              <button
                type="button"
                className="btn-close btn-close-white"
                style={{
                  fontSize: '0.625rem',
                  marginLeft: '0.125rem',
                  padding: '0',
                  width: '0.875rem',
                  height: '0.875rem',
                  opacity: 0.8,
                  flexShrink: 0
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setPaymentMethod(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                aria-label="Remove payment method"
              />
            </span>
          )}
          {/* Wrapper pill: Assign (muted/outlined style) - comes after POS variable pills */}
          {renderAssignPill()}
        </div>
        )}
        
        {/* Input text field section: Simplified when no tools */}
        {isMobile && selectedRecipients.length === 0 && primaryAction === null && !hasAssignPill && posCart.length === 0 ? (
          <textarea
            ref={inputRef}
            className="form-control bg-transparent text-white border-0 p-0"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Auto-resize textarea when typing
              if (e.target) {
                e.target.style.height = 'auto';
                const newHeight = Math.min(e.target.scrollHeight, 200);
                e.target.style.height = `${newHeight}px`;
              }
            }}
            onFocus={() => {
              if (onInputFocus) {
                onInputFocus();
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                e.preventDefault();
                handleSubmit();
              } else if (onKeyPress) {
                onKeyPress(e);
              }
            }}
            rows={1}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '16px',
              background: 'transparent',
              padding: '0',
              lineHeight: inputValue.trim() ? '1.5' : '45px', // Normal line-height when text is present
              resize: 'none',
              overflow: 'hidden',
              maxHeight: '200px',
              fontFamily: 'inherit',
              margin: 0,
              height: inputValue.trim() ? 'auto' : '45px', // Auto height when text is present
              minHeight: inputValue.trim() ? undefined : '45px',
              display: 'block',
              boxSizing: 'border-box',
              verticalAlign: inputValue.trim() ? 'top' : 'middle'
            }}
          />
        ) : (
          <textarea
            ref={inputRef}
            className="form-control bg-transparent text-white border-0 p-0"
            placeholder={selectedRecipients.length === 0 ? placeholder : ''}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (e.target) {
                // Reset height to auto to recalculate
                e.target.style.height = 'auto';
                // Set height based on scrollHeight, up to maxHeight
                const newHeight = Math.min(e.target.scrollHeight, 200);
                e.target.style.height = `${newHeight}px`;
              }
            }}
            onFocus={() => {
              if (onInputFocus) {
                onInputFocus();
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                e.preventDefault();
                handleSubmit();
              } else if (onKeyPress) {
                onKeyPress(e);
              }
            }}
            rows={1}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '16px',
              background: 'transparent',
              padding: '0',
              lineHeight: inputValue.trim() ? '1.5' : '45px', // Normal line-height when text is present
              resize: 'none',
              overflow: 'hidden', // Hide overflow, textarea will expand via height
              maxHeight: '200px', // Max height for expansion
              fontFamily: 'inherit',
              margin: 0,
              height: inputValue.trim() ? 'auto' : '45px', // Auto height when text is present
              minHeight: inputValue.trim() ? undefined : '45px',
              display: 'block',
              boxSizing: 'border-box',
              verticalAlign: inputValue.trim() ? 'top' : 'middle',
              alignSelf: 'flex-end' // Align to bottom to keep same position
            }}
          />
        )}
        
        {/* Mobile: Submit button fixed position (like ChatGPT) */}
        {isMobile && (
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSubmit();
            }}
            disabled={!canSubmit}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: isMobile && selectedRecipients.length === 0 && primaryAction === null && !hasAssignPill && posCart.length === 0 ? '50%' : 'auto',
              bottom: isMobile && selectedRecipients.length === 0 && primaryAction === null && !hasAssignPill && posCart.length === 0 ? 'auto' : '0.5rem',
              transform: isMobile && selectedRecipients.length === 0 && primaryAction === null && !hasAssignPill && posCart.length === 0 ? 'translateY(-50%)' : 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: canSubmit ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canSubmit ? '#000000' : 'rgba(255, 255, 255, 0.5)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0,
              zIndex: 10
            }}
            title="Send"
          >
            <i className="bi bi-arrow-up" style={{ fontSize: '0.875rem', fontWeight: 'bold' }}></i>
          </button>
        )}
        {/* Bottom section: Icons and submit button (desktop only) */}
        {!isMobile && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {showActionButtons && (
              <>
                {renderPeopleIcon()}
                {renderCheckInIcon()}
                {renderPosIcon()}
                {renderTaskIcon()}
              </>
            )}
          </div>
          {/* Check-in requires exactly one guest */}
          {checkInInvalid && (
            <small style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '0.75rem',
              marginRight: '0.5rem'
            }}>
              Select a guest or scan a QR
            </small>
          )}
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSubmit();
            }}
            disabled={!canSubmit}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: canSubmit ? 'rgba(13, 110, 253, 0.8)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.8)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            title="Send"
          >
            <i className="bi bi-arrow-up" style={{ fontSize: '0.875rem', fontWeight: 'bold' }}></i>
          </button>
        </div>
        )}
        </div>
      </div>
    );
  };

  // Render people icon (combines @ mention and QR scan)
  const renderPeopleIcon = () => {
    // Always show (no mode restrictions) - pills are composable
    if (isThreadMode) return null;
    const filteredPeople = getFilteredPeople();
    const specialPeople = filteredPeople.filter(p => p.isSpecial);
    const regularPeople = filteredPeople.filter(p => !p.isSpecial && p.type === 'guest'); // Only guests for checkmarks
    
    return (
      <div className="position-relative" ref={recipientMenuRef} style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn-link text-white text-decoration-none p-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowRecipientMenu(!showRecipientMenu);
          }}
          title="People & QR Scan"
          style={{
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: selectedRecipients.length > 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
            transition: 'all 0.2s',
            width: '28px',
            height: '28px',
            borderRadius: '50%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = selectedRecipients.length > 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <i className="bi bi-people" style={{ fontSize: '1rem' }}></i>
        </button>
        {showRecipientMenu && (
          <div
            className="dropdown-menu show"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '0.25rem',
              backgroundColor: '#2d2d2d',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.375rem',
              minWidth: '280px',
              maxWidth: '320px',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1002,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <input
                ref={recipientSearchRef}
                type="text"
                className="form-control bg-dark text-white border-secondary"
                placeholder="Search people..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                style={{ fontSize: '0.875rem' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Special people (AI, Staff) at top - no checkmarks */}
            {specialPeople.length > 0 && (
              <div style={{ padding: '0.25rem 0' }}>
                {specialPeople.map(person => {
                  const isStaff = person.id === 'staff';
                  const staffList = isStaff ? getStaffList() : [];
                  
                  return (
                    <div key={person.id} style={{ position: 'relative' }}>
                      <button
                        className="dropdown-item"
                        style={{
                          color: selectedRecipients.some(r => r.id === person.id) ? '#0d6efd' : 'rgba(255, 255, 255, 0.8)',
                          backgroundColor: selectedRecipients.some(r => r.id === person.id) ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedRecipients.some(r => r.id === person.id)) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedRecipients.some(r => r.id === person.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          try {
                            if (isStaff && staffList.length > 0) {
                              // Toggle staff submenu
                              setShowStaffSubmenu(!showStaffSubmenu);
                            } else {
                              // For AI, add directly
                              addRecipient(person);
                            }
                          } catch (error) {
                            console.error('Error in person click handler:', error);
                          }
                        }}
                      >
                        <div 
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: person.type === 'ai' ? '#3B31FF' : getAvatarColor(person.avatar || person.name),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#ffffff',
                            flexShrink: 0
                          }}
                        >
                          {person.avatar}
                        </div>
                        <span style={{ flex: 1 }}>{person.name}</span>
                        {isStaff && staffList.length > 0 && (
                          <i 
                            className={`bi bi-chevron-${showStaffSubmenu ? 'up' : 'down'}`}
                            style={{ 
                              fontSize: '0.75rem', 
                              color: 'rgba(255, 255, 255, 0.6)',
                              marginLeft: '0.25rem'
                            }}
                          ></i>
                        )}
                        {!isStaff && selectedRecipients.some(r => r.id === person.id) && (
                          <span style={{ color: '#0d6efd' }}>✓</span>
                        )}
                      </button>
                      
                      {/* Staff submenu */}
                      {isStaff && showStaffSubmenu && staffList.length > 0 && (
                        <div
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
                            padding: '0.25rem 0'
                          }}
                        >
                          {staffList.map(staffMember => (
                            <button
                              key={staffMember.id}
                              className="dropdown-item"
                              style={{
                                color: selectedRecipients.some(r => r.id === staffMember.id) ? '#0d6efd' : 'rgba(255, 255, 255, 0.8)',
                                backgroundColor: selectedRecipients.some(r => r.id === staffMember.id) ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.5rem 1rem',
                                paddingLeft: '2.5rem', // Indent for submenu
                                border: 'none',
                                width: '100%',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => {
                                if (!selectedRecipients.some(r => r.id === staffMember.id)) {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!selectedRecipients.some(r => r.id === staffMember.id)) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                addRecipient(staffMember);
                              }}
                            >
                              <div 
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: getAvatarColor(staffMember.avatar || staffMember.name),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: '#ffffff',
                                  flexShrink: 0
                                }}
                              >
                                {staffMember.avatar}
                              </div>
                              <span style={{ flex: 1 }}>{staffMember.name}</span>
                              {selectedRecipients.some(r => r.id === staffMember.id) && (
                                <span style={{ color: '#0d6efd' }}>✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Regular people (guests only) - with tappable checkmarks */}
            {regularPeople.length > 0 && (
              <div style={{ padding: '0.25rem 0', borderTop: specialPeople.length > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
                {regularPeople.map(person => {
                  const isSelected = selectedRecipients.some(r => r.id === person.id);
                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                        transition: 'background-color 0.2s'
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
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // Clicking the row adds to prompt and closes menu
                        // Use setTimeout to ensure this runs after any pending state updates
                        setTimeout(() => {
                          try {
                            addRecipient(person);
                          } catch (error) {
                            console.error('Error adding recipient:', error, person);
                            // Don't let the error crash the app
                          }
                        }, 0);
                      }}
                    >
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: getAvatarColor(person.avatar || person.name),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#ffffff',
                          flexShrink: 0
                        }}
                      >
                        {person.avatar || (person.name ? person.name.charAt(0) : '?')}
                      </div>
                      <span style={{ flex: 1, color: isSelected ? '#0d6efd' : 'rgba(255, 255, 255, 0.8)' }}>{person.name}</span>
                      {/* Tappable checkmark - separate click handler that doesn't close menu */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle selection without closing menu or adding to prompt
                          toggleRecipientSelection(person);
                        }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? '#0d6efd' : 'rgba(255, 255, 255, 0.3)'}`,
                          backgroundColor: isSelected ? '#0d6efd' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && (
                          <i className="bi bi-check" style={{ color: '#ffffff', fontSize: '0.75rem' }}></i>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {filteredPeople.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                No people found
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Default composer with composable pill grammar
  const renderDefaultComposer = () => {
    // Infer assignee from selected recipients (staff/AI) or default to current user
    // Used when Task pill is present
    const selectedStaff = selectedRecipients.find(r => r.type === 'staff' || r.type === 'ai');
    const assignee = selectedStaff ? {
      name: selectedStaff.name,
      avatar: selectedStaff.avatar,
      type: selectedStaff.type
    } : {
      name: 'Jeremy Bailey',
      avatar: 'JB',
      type: 'staff'
    };
    
    // Infer guest from selected recipients
    const selectedGuest = selectedRecipients.find(r => r.type === 'guest');
    const forGuest = selectedGuest ? {
      id: selectedGuest.id,
      name: selectedGuest.name,
      avatar: selectedGuest.avatar
    } : null;
    
    // Intent summary: show intent based on pill combination
    const getIntentSummary = () => {
      // Check-in
      if (primaryAction === 'check-in') {
        const selectedGuest = selectedRecipients.find(r => r.type === 'guest');
        if (hasAssignPill) {
          return `Assign → ${assignee.name} · Check-in ${selectedGuest ? selectedGuest.name : 'guest'}`;
        }
        return selectedGuest ? `Check-in ${selectedGuest.name}` : 'Check-in: Select a guest';
      }
      // POS
      if (primaryAction === 'pos') {
        if (hasAssignPill) {
          return `Assign → ${assignee.name} · POS for ${forGuest ? forGuest.name : 'no guest'}`;
        }
        return `POS for ${forGuest ? forGuest.name : 'no guest'}`;
      }
      // Message (no primary action)
      if (hasAssignPill) {
        return `Assign → ${assignee.name} · ${forGuest ? `for ${forGuest.name}` : 'task'}`;
      }
      return null;
    };
    
    const handleSend = () => {
      // Check-in requires at least one guest (can be multiple)
      const guestCount = selectedRecipients.filter(r => r.type === 'guest').length;
      const checkInReady = primaryAction === 'check-in' && guestCount >= 1;
      const canSubmit = inputValue.trim() || selectedRecipients.length > 0 || primaryAction === 'pos' || hasAssignPill || checkInReady;
      if (!canSubmit) return;
      
      // Send behavior routing based on pill combination
      // Check-in: requires at least one guest (can check-in multiple guests)
      if (primaryAction === 'check-in' && checkInReady) {
        if (onToolAction) {
          const selectedGuests = selectedRecipients.filter(r => r.type === 'guest');
          // If Assign is present, create assigned task for each guest; otherwise execute check-in now for all guests
          if (hasAssignPill) {
            // Create assigned task for each guest
            const note = inputValue.trim() || null; // Internal ops annotation
            selectedGuests.forEach(guest => {
              // Include note in task description if present
              const taskDescription = note 
                ? `Check-in ${guest.name}${note ? ` - ${note}` : ''}`
                : `Check-in ${guest.name}`;
              onToolAction('create-task', {
                description: taskDescription,
                assignee: assignee,
                forGuest: {
                  id: guest.id,
                  name: guest.name,
                  avatar: guest.avatar
                },
                location: null
              });
            });
          } else {
            // Execute check-in for all selected guests
            const note = inputValue.trim() || null; // Internal ops annotation only
            selectedGuests.forEach(guest => {
              onToolAction('check-in', {
                guest: {
                  id: guest.id,
                  name: guest.name,
                  avatar: guest.avatar
                },
                note: note // Attach typed text as internal note
              });
            });
          }
        }
        // Reset after sending
        setInputValue('');
        setSelectedRecipients([]);
        setPrimaryAction(null);
        setHasAssignPill(false);
        return;
      }
      // POS: if Assign absent => execute POS now; if Assign present => create assigned task
      if (primaryAction === 'pos') {
        if (hasAssignPill) {
          // Create assigned task with POS payload
          if (onToolAction) {
            onToolAction('create-task', {
              description: inputValue.trim() || 'Complete purchase',
              assignee: assignee,
              forGuest: forGuest,
              location: null,
              posPayload: {
                cart: posCart,
                paymentMethod: paymentMethod
              }
            });
          }
          // Reset after sending
          setInputValue('');
          setSelectedRecipients([]);
          setPrimaryAction(null);
          setHasAssignPill(false);
          setPosCart([]);
          setPaymentMethod(null);
        } else {
          // Execute POS immediately
          if (onToolAction) {
            const note = inputValue.trim() || null; // Internal ops annotation only
            onToolAction('execute-pos', {
              cart: posCart,
              paymentMethod: paymentMethod,
              forGuest: forGuest,
              note: note // Attach typed text as internal note
            });
          }
          // Reset after sending
          setInputValue('');
          setSelectedRecipients([]);
          setPrimaryAction(null);
          setPosCart([]);
          setPaymentMethod(null);
        }
        return;
      }
      // Message with Assign: create assigned text task
      if (hasAssignPill) {
        if (onToolAction) {
          onToolAction('create-task', {
            description: inputValue.trim(),
            assignee: assignee,
            forGuest: forGuest,
            location: null
          });
        }
        // Reset after sending
        setInputValue('');
        setSelectedRecipients([]);
        setHasAssignPill(false);
        return;
      }
      // Normal message (no primary action, no Assign)
      if (onSendMessage && (inputValue.trim() || selectedRecipients.length > 0)) {
        onSendMessage(inputValue, selectedRecipients);
        setInputValue('');
        setSelectedRecipients([]);
      }
    };

    const intentSummary = getIntentSummary();

    // Get intent summary for display above prompt area
    const getIntentSummaryText = () => {
      // Check-in
      if (primaryAction === 'check-in') {
        const selectedGuest = selectedRecipients.find(r => r.type === 'guest');
        const selectedStaff = selectedRecipients.find(r => r.type === 'staff' || r.type === 'ai');
        const assignee = selectedStaff ? selectedStaff : { name: 'Jeremy Bailey', avatar: 'JB', type: 'staff' };
        if (hasAssignPill) {
          return `Assign → ${assignee.name} · Check-in ${selectedGuest ? selectedGuest.name : 'guest'}`;
        }
        return selectedGuest ? `Check-in ${selectedGuest.name}` : null;
      }
      // POS
      if (primaryAction === 'pos') {
        const selectedGuest = selectedRecipients.find(r => r.type === 'guest');
        const selectedStaff = selectedRecipients.find(r => r.type === 'staff' || r.type === 'ai');
        const assignee = selectedStaff ? selectedStaff : { name: 'Jeremy Bailey', avatar: 'JB', type: 'staff' };
        const forGuest = selectedGuest ? selectedGuest : null;
        if (hasAssignPill) {
          return `Assign → ${assignee.name} · POS for ${forGuest ? forGuest.name : 'no guest'}`;
        }
        return `POS for ${forGuest ? forGuest.name : 'no guest'}`;
      }
      // Message (no primary action)
      if (hasAssignPill) {
        const selectedGuest = selectedRecipients.find(r => r.type === 'guest');
        const selectedStaff = selectedRecipients.find(r => r.type === 'staff' || r.type === 'ai');
        const assignee = selectedStaff ? selectedStaff : { name: 'Jeremy Bailey', avatar: 'JB', type: 'staff' };
        const forGuest = selectedGuest ? selectedGuest : null;
        return `Assign → ${assignee.name} · ${forGuest ? `for ${forGuest.name}` : 'task'}`;
      }
      return null;
    };

    const intentSummaryText = getIntentSummaryText();

    return (
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Toast message for action switching */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              top: '-2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#ffffff',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              zIndex: 1001,
              whiteSpace: 'nowrap'
            }}
          >
            {toastMessage}
          </div>
        )}
        {/* Intent summary: informational only, shows intent based on pill combination - goes above prompt area, aligned with prompt box */}
        {intentSummaryText && (
          <div 
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '0.25rem 0',
              paddingLeft: isMobile ? 'calc(45px + 0.5rem + 0.75rem)' : '0.75rem', // Account for + button and gap on mobile
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {intentSummaryText}
          </div>
        )}
        {renderInputWithTags(
          hasAssignPill ? 'Task description…' : primaryAction === 'pos' ? 'Add note (optional)…' : 'Ask or act…',
          (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          },
          handleSend,
          true // Show action buttons
        )}
      </div>
    );
  };

  // Task and Guest context composers removed - clicking feed items no longer changes composer

  // Tool mode composers
  const renderTicketScanComposer = () => (
    <div className="tool-composer">
      <div className="d-flex gap-2">
        <button
          className="btn btn-primary flex-grow-1"
          onClick={() => onToolAction('scan-ticket', { method: 'scanner' })}
        >
          <i className="bi bi-qr-code-scan"></i> Open Scanner
        </button>
        <button
          className="btn btn-outline-primary flex-grow-1"
          onClick={() => onToolAction('scan-ticket', { method: 'manual' })}
        >
          <i className="bi bi-keyboard"></i> Manual Entry
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => onToolModeChange(null)}
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
            onClick={() => onToolAction('sell-ticket', { quantity, price, method: 'charge' })}
          >
            <i className="bi bi-credit-card"></i> Charge ${(quantity * price).toFixed(2)}
          </button>
          <button
            className="btn btn-outline-warning flex-grow-1"
            onClick={() => onToolAction('sell-ticket', { quantity, price, method: 'comp' })}
          >
            <i className="bi bi-gift"></i> Comp
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => onToolModeChange(null)}
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
            onClick={() => onToolAction('order-drink', { drink: selectedDrink })}
          >
            <i className="bi bi-send"></i> Send Order
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => onToolModeChange(null)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderMessageGuestComposer = () => (
    <div className="tool-composer">
        <div className="d-flex gap-2 align-items-center">
          <div style={{ flex: 1 }}>
            {renderInputWithTags(
              'Type message to guest…',
              (e) => {
                if (e.key === 'Enter' && (inputValue.trim() || selectedRecipients.length > 0)) {
                  onToolAction('message-guest', { message: inputValue, recipients: selectedRecipients });
                  setInputValue('');
                  setSelectedRecipients([]);
                }
              }
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={!inputValue.trim() && selectedRecipients.length === 0}
            onClick={() => {
              onToolAction('message-guest', { message: inputValue, recipients: selectedRecipients });
              setInputValue('');
              setSelectedRecipients([]);
            }}
          >
            <i className="bi bi-send"></i> Send
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => onToolModeChange(null)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
    </div>
  );

  const renderToolsPalette = () => (
    <div className="tools-palette">
      <div className="d-flex gap-2 mb-2 flex-wrap">
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onToolModeChange('ticket-scan')}
        >
          <i className="bi bi-qr-code-scan"></i> Ticket Scan
        </button>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onToolModeChange('sell-ticket')}
        >
          <i className="bi bi-ticket"></i> Sell Ticket
        </button>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onToolModeChange('order-drink')}
        >
          <i className="bi bi-cup-straw"></i> Order Drink
        </button>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => onToolModeChange('message-guest')}
        >
          <i className="bi bi-chat"></i> Message Guest
        </button>
      </div>
      <button
        className="btn btn-outline-secondary btn-sm w-100"
        onClick={() => onToolModeChange(null)}
      >
        Close Tools
      </button>
    </div>
  );

  // Thread reply composer - removed contextual actions, now stable
  // Note: ThreadView uses its own ThreadComposer, so this may not be used
  const renderThreadReplyComposer = () => {
    if (!isThreadMode) return null;
    
    // Stable composer - no contextual actions, no selectedContext dependency
    return renderDefaultComposer();
  };

  // FOB & Retail purchase composer
  const renderFobRetailComposer = () => {
    const [purchaseType, setPurchaseType] = useState('fob'); // 'fob' or 'retail'
    const [amount, setAmount] = useState('');
    
    return (
      <div className="tool-composer">
        <div className="mb-2">
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Purchase Type</label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${purchaseType === 'fob' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPurchaseType('fob')}
            >
              FOB
            </button>
            <button
              type="button"
              className={`btn ${purchaseType === 'retail' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPurchaseType('retail')}
            >
              Retail
            </button>
          </div>
        </div>
        <div className="mb-2">
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>Amount</label>
          <input
            type="number"
            className="form-control bg-dark text-white border-secondary"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success flex-grow-1"
            disabled={!amount || parseFloat(amount) <= 0}
            onClick={() => {
              onToolAction('fob-retail', { type: purchaseType, amount: parseFloat(amount) });
              setAmount('');
              onToolModeChange(null);
            }}
          >
            <i className="bi bi-credit-card"></i> Process Payment
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => onToolModeChange(null)}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      </div>
    );
  };

  // Determine which composer to render
  const renderComposer = () => {
    // Tool modes take precedence (even in thread mode)
    if (toolMode === 'ticket-scan') return renderTicketScanComposer();
    if (toolMode === 'sell-ticket') return renderSellTicketComposer();
    if (toolMode === 'fob-retail') return renderFobRetailComposer();
    if (toolMode === 'order-drink') return renderOrderDrinkComposer();
    if (toolMode === 'message-guest') return renderMessageGuestComposer();
    if (toolMode === 'checkin') {
      // Handle check-in action
      return (
        <div className="tool-composer">
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary flex-grow-1"
              onClick={() => onToolAction('checkin', { guestId: selectedContext?.id })}
            >
              <i className="bi bi-person-check"></i> Check-in Guest
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => onToolModeChange(null)}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      );
    }
    if (toolMode === 'tools') return renderToolsPalette();
    
    // Thread mode (after tool modes)
    if (isThreadMode) return renderThreadReplyComposer();
    
    // Default composer - always stable, not affected by feed item selection
    return renderDefaultComposer();
  };



  // Render POS icon - toggles [POS] primary action pill and opens picker
  // Enforces mutual exclusivity: if Check-in is active, switch to POS
  const renderPosIcon = () => {
    // Always show (no mode restrictions) - pills are composable
    if (isThreadMode) return null;

    const isPosActive = primaryAction === 'pos';

    return (
      <div className="position-relative" ref={posPickerRef} style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn-link text-white text-decoration-none p-0"
          onClick={(e) => {
            e.stopPropagation();
            if (!isPosActive) {
              // If Check-in is active, switch to POS (mutual exclusivity)
              if (primaryAction === 'check-in') {
                setPrimaryAction('pos');
                setToastMessage('Switched to POS');
                setTimeout(() => setToastMessage(null), 2000);
              } else {
                setPrimaryAction('pos');
              }
              setShowPosPicker(true);
            } else {
              setShowPosPicker(!showPosPicker);
            }
          }}
          title="POS"
          style={{
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: isPosActive ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 255, 255, 0.6)',
            backgroundColor: isPosActive ? 'rgba(255, 193, 7, 0.2)' : 'transparent',
            transition: 'all 0.2s',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = isPosActive ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isPosActive ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.backgroundColor = isPosActive ? 'rgba(255, 193, 7, 0.2)' : 'transparent';
          }}
        >
          <i className="bi bi-cart" style={{ fontSize: '1rem' }}></i>
        </button>
        
        {/* POS picker popover - lightweight selector, popover selects, pills reflect state */}
        {showPosPicker && isPosActive && (
          <div
            className="dropdown-menu show"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '0.25rem',
              backgroundColor: '#2d2d2d',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.375rem',
              minWidth: '260px',
              maxWidth: '280px',
              zIndex: 1002,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              padding: '0.5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick add list - tapping an item adds it or increments quantity in the pill */}
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.375rem', fontWeight: '500' }}>
                Add Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {[
                  { id: 'ticket', name: 'Ticket', price: 25, emoji: '🎫' },
                  { id: 'wine', name: 'Wine', price: 12, emoji: '🍷' },
                  { id: 'beer', name: 'Beer', price: 8, emoji: '🍺' },
                  { id: 'cocktail', name: 'Cocktail', price: 15, emoji: '🍸' },
                  { id: 'soft-drink', name: 'Soft Drink', price: 5, emoji: '🥤' },
                  { id: 'gift-shop', name: 'Gift Shop Item', price: 20, emoji: '🛍️' }
                ].map(item => {
                  const existingItem = posCart.find(i => i.id === item.id);
                  const currentQuantity = existingItem ? existingItem.quantity : 0;
                  
                  return (
                    <button
                      key={item.id}
                      className="btn btn-outline-secondary btn-sm w-100"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Tapping an item adds it or increments quantity - pill shows the updated number
                        setPosCart(prev => {
                          const existing = prev.find(i => i.id === item.id);
                          if (existing) {
                            // Item exists, increment quantity
                            return prev.map(i => 
                              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                            );
                          }
                          // Item doesn't exist, add it with quantity 1
                          return [...prev, { ...item, quantity: 1 }];
                        });
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {item.emoji && <span style={{ fontSize: '0.875rem' }}>{item.emoji}</span>}
                        <span>{item.name}</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {currentQuantity > 0 && (
                          <span style={{ 
                            color: 'rgba(255, 193, 7, 0.9)', 
                            fontSize: '0.7rem',
                            fontWeight: '600'
                          }}>
                            ×{currentQuantity}
                          </span>
                        )}
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>${item.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Payment method selector */}
            <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.375rem', fontWeight: '500' }}>
                Payment
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {['cash', 'card', 'card-on-file'].map(method => (
                  <button
                    key={method}
                    className={`btn btn-sm flex-grow-1 ${paymentMethod === method ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Selecting payment method updates the composer pills immediately
                      setPaymentMethod(method);
                    }}
                  >
                    {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Card on File'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Assign icon - toggles [Assign] wrapper pill
  // Enforces mutual exclusivity: if Check-in is active, cancel it when Assign is activated
  const renderTaskIcon = () => {
    // Always show (no mode restrictions) - pills are composable
    if (isThreadMode) return null;

    return (
      <button
        type="button"
        className="btn btn-link text-white text-decoration-none p-0"
        onClick={(e) => {
          e.stopPropagation();
          // Toggle Assign pill - mutually exclusive with Check-in
          if (!hasAssignPill) {
            // Activating Assign: if Check-in is active, cancel it
            if (primaryAction === 'check-in') {
              setPrimaryAction(null);
              setHasAssignPill(true);
              setToastMessage('Switched to Assign');
              setTimeout(() => setToastMessage(null), 2000);
            } else {
              setHasAssignPill(true);
            }
          } else {
            // Toggle off: remove Assign pill
            setHasAssignPill(false);
          }
        }}
        title={hasAssignPill ? 'Remove Assign' : 'Add Assign'}
        style={{
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          color: hasAssignPill ? 'rgba(13, 110, 253, 0.9)' : 'rgba(255, 255, 255, 0.6)',
          backgroundColor: hasAssignPill ? 'rgba(13, 110, 253, 0.2)' : 'transparent',
          transition: 'all 0.2s',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.backgroundColor = hasAssignPill ? 'rgba(13, 110, 253, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = hasAssignPill ? 'rgba(13, 110, 253, 0.9)' : 'rgba(255, 255, 255, 0.6)';
          e.currentTarget.style.backgroundColor = hasAssignPill ? 'rgba(13, 110, 253, 0.2)' : 'transparent';
        }}
      >
        <i className="bi bi-check-square" style={{ fontSize: '1rem' }}></i>
      </button>
    );
  };

  // Render Check-in icon - toggles [Check-in] primary action pill and opens picker
  // Enforces mutual exclusivity: if POS or Assign is active, switch to Check-in and clear them
  const renderCheckInIcon = () => {
    // Always show (no mode restrictions) - pills are composable
    if (isThreadMode) return null;

    const isCheckInActive = primaryAction === 'check-in';

    return (
      <div className="position-relative" ref={checkInPickerRef} style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn-link text-white text-decoration-none p-0"
          onClick={(e) => {
            e.stopPropagation();
            // Toggle Check-in pill - mutually exclusive with Assign and POS
            if (!isCheckInActive) {
              // Activating Check-in: cancel Assign and/or POS if active
              if (hasAssignPill || primaryAction === 'pos') {
                setHasAssignPill(false);
                if (primaryAction === 'pos') {
                  // Clear POS variables
                  setPosCart([]);
                  setPaymentMethod(null);
                  setShowPosPicker(false);
                }
                setPrimaryAction('check-in');
                setToastMessage('Switched to Check-in');
                setTimeout(() => setToastMessage(null), 2000);
              } else {
                // Simply activate Check-in pill
                setPrimaryAction('check-in');
              }
              setShowCheckInPicker(true);
            } else {
              // Toggle picker if already active
              setShowCheckInPicker(!showCheckInPicker);
            }
          }}
          title={isCheckInActive ? 'Check-in options' : 'Add Check-in'}
          style={{
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: isCheckInActive ? 'rgba(25, 135, 84, 0.9)' : 'rgba(255, 255, 255, 0.6)',
            backgroundColor: isCheckInActive ? 'rgba(25, 135, 84, 0.2)' : 'transparent',
            transition: 'all 0.2s',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.backgroundColor = isCheckInActive ? 'rgba(25, 135, 84, 0.3)' : 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isCheckInActive ? 'rgba(25, 135, 84, 0.9)' : 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.backgroundColor = isCheckInActive ? 'rgba(25, 135, 84, 0.2)' : 'transparent';
          }}
        >
          <i className="bi bi-person-check" style={{ fontSize: '1rem' }}></i>
        </button>
        
        {/* Check-in picker popover - Scan QR / Manual */}
        {showCheckInPicker && isCheckInActive && (
          <div
            className="dropdown-menu show"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '0.25rem',
              backgroundColor: '#2d2d2d',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.375rem',
              minWidth: '200px',
              zIndex: 1002,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              padding: '0.5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scan QR option */}
            <button
              type="button"
              className="btn btn-outline-primary w-100 mb-2"
              onClick={(e) => {
                e.stopPropagation();
                // Simulate QR scan result - in real implementation, this would come from camera/scan
                const mockScannedGuest = {
                  id: `scanned-${Date.now()}`,
                  name: 'Scanned Guest',
                  avatar: 'SG',
                  type: 'guest',
                  isSpecial: false
                };
                // Add scanned guest (allows multiple guests in check-in mode)
                setSelectedRecipients(prev => {
                  // Check if already selected
                  if (prev.some(r => r.id === mockScannedGuest.id)) {
                    return prev; // Already selected
                  }
                  // Add new scanned guest
                  return [...prev, mockScannedGuest];
                });
                setShowCheckInPicker(false);
              }}
              style={{
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem'
              }}
            >
              <i className="bi bi-qr-code-scan"></i>
              Scan QR
            </button>
            
            {/* Manual entry option */}
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={(e) => {
                e.stopPropagation();
                // Manual Check-in: Just ensure Check-in pill is active, don't open other tools
                // User can then use People icon to select guest, or existing guest selection is preserved
                if (primaryAction !== 'check-in') {
                  setPrimaryAction('check-in');
                }
                // Dismiss the popover
                setShowCheckInPicker(false);
                // Do NOT open People menu automatically - respect user agency
              }}
              style={{
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem'
              }}
            >
              <i className="bi bi-keyboard"></i>
              Manual
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render POS bottom sheet for mobile
  const renderPosSheet = () => {
    if (!isMobile || !showPosSheet) return null;

    const posItems = [
      { id: 'ticket', name: 'Ticket', price: 25, emoji: '🎫' },
      { id: 'wine', name: 'Wine', price: 12, emoji: '🍷' },
      { id: 'beer', name: 'Beer', price: 8, emoji: '🍺' },
      { id: 'cocktail', name: 'Cocktail', price: 15, emoji: '🍸' },
      { id: 'soft-drink', name: 'Soft Drink', price: 5, emoji: '🥤' },
      { id: 'gift-shop', name: 'Gift Shop Item', price: 20, emoji: '🛍️' }
    ];

    // Calculate total item count for CTA
    const totalItemCount = posCart.reduce((sum, item) => sum + item.quantity, 0);
    const ctaText = totalItemCount > 0 ? `Add ${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}` : null;

    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'auto'
          }}
          onClick={() => {
            setShowPosSheet(false);
            setShowBottomSheet(false);
          }}
        />
        {/* POS bottom sheet */}
        <div
          data-bottom-sheet
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#2d2d2d',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            padding: '1rem',
            paddingBottom: ctaText ? 'calc(5.5rem + env(safe-area-inset-bottom, 0))' : 'calc(1rem + env(safe-area-inset-bottom, 0))', // Extra padding when CTA is visible
            zIndex: 100000,
            pointerEvents: 'auto',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#ffffff', fontWeight: '600' }}>Add Items</h6>
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => {
                setShowPosSheet(false);
                setShowBottomSheet(true); // Show tools sheet when closing POS sheet
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.25rem',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Items list - scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: (ctaText || (primaryAction === 'pos' && posCart.length > 0)) ? '1rem' : '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {posItems.map(item => {
              const existingItem = posCart.find(i => i.id === item.id);
              const currentQuantity = existingItem ? existingItem.quantity : 0;
              
              return (
                <button
                  key={item.id}
                  className="btn w-100"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: currentQuantity > 0 ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: currentQuantity > 0 ? '1px solid rgba(255, 193, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: '#ffffff',
                    textAlign: 'left'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Activate POS pill if not already active
                    if (primaryAction !== 'pos') {
                      if (primaryAction === 'check-in' || hasAssignPill) {
                        if (primaryAction === 'check-in') {
                          setShowCheckInPicker(false);
                        }
                        setHasAssignPill(false);
                        setPrimaryAction('pos');
                        setToastMessage('Switched to POS');
                      } else {
                        setPrimaryAction('pos');
                      }
                    }
                    // Add or increment item
                    setPosCart(prev => {
                      const existing = prev.find(i => i.id === item.id);
                      if (existing) {
                        return prev.map(i => 
                          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                        );
                      }
                      return [...prev, { ...item, quantity: 1 }];
                    });
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {item.emoji && <span style={{ fontSize: '1.25rem' }}>{item.emoji}</span>}
                    <span style={{ fontWeight: '500' }}>{item.name}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {currentQuantity > 0 && (
                      <span style={{ 
                        color: 'rgba(255, 193, 7, 0.9)', 
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        ×{currentQuantity}
                      </span>
                    )}
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>${item.price}</span>
                  </div>
                </button>
              );
            })}
            </div>
          </div>

          {/* Payment method selector - outside scrollable area, above CTA */}
          {primaryAction === 'pos' && posCart.length > 0 && (
            <div style={{ 
              paddingTop: '1rem', 
              marginTop: 'auto',
              marginBottom: ctaText ? '1rem' : '0',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.75rem', fontWeight: '500' }}>
                Payment
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['cash', 'card', 'card-on-file'].map(method => (
                  <button
                    key={method}
                    className={`btn flex-grow-1 ${paymentMethod === method ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentMethod(method);
                    }}
                  >
                    {method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'Card on File'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button - only show when items are in cart, fixed at bottom */}
          {ctaText && (
            <div style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '1rem',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#2d2d2d',
              zIndex: 10
            }}>
              <button
                className="btn btn-primary w-100"
                style={{
                  padding: '0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Activate POS pill if not already active
                  if (primaryAction !== 'pos') {
                    if (primaryAction === 'check-in' || hasAssignPill) {
                      if (primaryAction === 'check-in') {
                        setShowCheckInPicker(false);
                      }
                      setHasAssignPill(false);
                      setPrimaryAction('pos');
                      setToastMessage('Switched to POS');
                    } else {
                      setPrimaryAction('pos');
                    }
                  }
                  // Close the sheet
                  setShowPosSheet(false);
                  setShowBottomSheet(false);
                }}
              >
                {ctaText}
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render Check-in bottom sheet for mobile
  const renderCheckInSheet = () => {
    if (!isMobile || !showCheckInSheet) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'auto'
          }}
          onClick={() => {
            setShowCheckInSheet(false);
            setShowBottomSheet(false);
          }}
        />
        {/* Check-in bottom sheet */}
        <div
          data-bottom-sheet
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#2d2d2d',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            padding: '1rem',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))',
            zIndex: 100000,
            pointerEvents: 'auto',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#ffffff', fontWeight: '600' }}>Check-in Guest</h6>
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => {
                setShowCheckInSheet(false);
                setShowBottomSheet(true); // Show tools sheet when closing Check-in sheet
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.25rem',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Scan QR option */}
            <button
              type="button"
              className="btn btn-primary w-100"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Activate Check-in pill if not already active
                if (primaryAction !== 'check-in') {
                  if (hasAssignPill || primaryAction === 'pos') {
                    setHasAssignPill(false);
                    if (primaryAction === 'pos') {
                      setPosCart([]);
                      setPaymentMethod(null);
                      setShowPosPicker(false);
                    }
                    setPrimaryAction('check-in');
                    setToastMessage('Switched to Check-in');
                  } else {
                    setPrimaryAction('check-in');
                  }
                }
                // Simulate QR scan result
                const mockScannedGuest = {
                  id: `scanned-${Date.now()}`,
                  name: 'Scanned Guest',
                  avatar: 'SG',
                  type: 'guest',
                  isSpecial: false
                };
                setSelectedRecipients(prev => {
                  if (prev.some(r => r.id === mockScannedGuest.id)) {
                    return prev;
                  }
                  return [...prev, mockScannedGuest];
                });
                setShowCheckInSheet(false);
                setShowBottomSheet(false);
              }}
            >
              <i className="bi bi-qr-code-scan" style={{ fontSize: '1.25rem' }}></i>
              <span>Scan QR</span>
            </button>
            
            {/* Manual entry option */}
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Activate Check-in pill
                if (primaryAction !== 'check-in') {
                  if (hasAssignPill || primaryAction === 'pos') {
                    setHasAssignPill(false);
                    if (primaryAction === 'pos') {
                      setPosCart([]);
                      setPaymentMethod(null);
                      setShowPosPicker(false);
                    }
                    setPrimaryAction('check-in');
                    setToastMessage('Switched to Check-in');
                  } else {
                    setPrimaryAction('check-in');
                  }
                }
                setShowCheckInSheet(false);
                setShowBottomSheet(false);
              }}
            >
              <i className="bi bi-keyboard" style={{ fontSize: '1.25rem' }}></i>
              <span>Manual</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  // Render People bottom sheet for mobile
  const renderPeopleSheet = () => {
    if (!isMobile || !showPeopleSheet) return null;

    const filteredPeople = getFilteredPeople();
    const specialPeople = filteredPeople.filter(p => p.isSpecial);
    const regularPeople = filteredPeople.filter(p => !p.isSpecial && p.type === 'guest');
    
    // Count selected people by type for CTA
    const selectedInMenu = selectedRecipients.filter(r => {
      const person = filteredPeople.find(p => p.id === r.id);
      return person !== undefined;
    });
    const guestCount = selectedInMenu.filter(r => r.type === 'guest').length;
    const staffCount = selectedInMenu.filter(r => r.type === 'staff').length;
    const aiCount = selectedInMenu.filter(r => r.type === 'ai').length;
    
    // Build CTA text
    const getCTAText = () => {
      const parts = [];
      if (guestCount > 0) {
        parts.push(`${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`);
      }
      if (staffCount > 0) {
        parts.push(`${staffCount} ${staffCount === 1 ? 'staff' : 'staff'}`);
      }
      if (aiCount > 0) {
        parts.push(`${aiCount} ${aiCount === 1 ? 'AI' : 'AI'}`);
      }
      if (parts.length === 0) return null;
      if (parts.length === 1) return `Add ${parts[0]}`;
      if (parts.length === 2) return `Add ${parts[0]} and ${parts[1]}`;
      return `Add ${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
    };
    
    const ctaText = getCTAText();

    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'auto'
          }}
          onClick={() => {
            setShowPeopleSheet(false);
            setShowBottomSheet(false);
          }}
        />
        {/* People bottom sheet */}
        <div
          data-bottom-sheet
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#2d2d2d',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            padding: '1rem',
            paddingBottom: ctaText ? 'calc(5.5rem + env(safe-area-inset-bottom, 0))' : 'calc(1rem + env(safe-area-inset-bottom, 0))', // Extra padding when CTA is visible
            zIndex: 100000,
            pointerEvents: 'auto',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h6 style={{ margin: 0, color: '#ffffff', fontWeight: '600' }}>Select People</h6>
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => {
                setShowPeopleSheet(false);
                setShowBottomSheet(true); // Show tools sheet when closing People sheet
              }}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.25rem',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Search input */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              ref={recipientSearchRef}
              type="text"
              className="form-control bg-dark text-white border-secondary"
              placeholder="Search people..."
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              style={{ fontSize: '0.875rem' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* People list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: ctaText ? '1rem' : '0' }}>
            {/* Special people (AI, Staff) */}
            {specialPeople.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {specialPeople.map(person => {
                  const isStaff = person.id === 'staff';
                  const staffList = isStaff ? getStaffList() : [];
                  const isSelected = selectedRecipients.some(r => r.id === person.id);
                  
                  return (
                    <div key={person.id} style={{ marginBottom: '0.5rem' }}>
                      <button
                        className="btn w-100"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: isSelected ? 'rgba(13, 110, 253, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '1px solid rgba(13, 110, 253, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '0.5rem',
                          color: '#ffffff',
                          textAlign: 'left',
                          width: '100%'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isStaff && staffList.length > 0) {
                            setShowStaffSubmenu(!showStaffSubmenu);
                          } else {
                            toggleRecipientSelection(person);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                      >
                        <div 
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: person.type === 'ai' ? '#3B31FF' : getAvatarColor(person.avatar || person.name),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#ffffff',
                            flexShrink: 0
                          }}
                        >
                          {person.avatar}
                        </div>
                        <span style={{ flex: 1, fontWeight: '500', fontSize: '0.875rem' }}>{person.name}</span>
                        {isStaff && staffList.length > 0 && (
                          <i 
                            className={`bi bi-chevron-${showStaffSubmenu ? 'up' : 'down'}`}
                            style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)', flexShrink: 0 }}
                          ></i>
                        )}
                        {!isStaff && isSelected && (
                          <i className="bi bi-check-circle-fill" style={{ color: '#0d6efd', fontSize: '1.25rem', flexShrink: 0 }}></i>
                        )}
                      </button>
                      
                      {/* Staff submenu */}
                      {isStaff && showStaffSubmenu && staffList.length > 0 && (
                        <div style={{ marginTop: '0.5rem', marginLeft: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {staffList.map(staffMember => {
                            const isStaffSelected = selectedRecipients.some(r => r.id === staffMember.id);
                            return (
                              <button
                                key={staffMember.id}
                                className="btn w-100"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.625rem',
                                  backgroundColor: isStaffSelected ? 'rgba(13, 110, 253, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                  border: isStaffSelected ? '1px solid rgba(13, 110, 253, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '0.5rem',
                                  color: '#ffffff',
                                  textAlign: 'left',
                                  width: '100%',
                                  marginBottom: '0.5rem'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRecipientSelection(staffMember);
                                }}
                                onMouseEnter={(e) => {
                                  if (!isStaffSelected) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isStaffSelected) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                  }
                                }}
                              >
                                <div 
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: getAvatarColor(staffMember.avatar || staffMember.name),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: '#ffffff',
                                    flexShrink: 0
                                  }}
                                >
                                  {staffMember.avatar}
                                </div>
                                <span style={{ flex: 1, fontSize: '0.875rem' }}>{staffMember.name}</span>
                                {isStaffSelected && (
                                  <i className="bi bi-check-circle-fill" style={{ color: '#0d6efd', fontSize: '1.25rem', flexShrink: 0 }}></i>
                                )}
                                {!isStaffSelected && (
                                  <div style={{ width: '1.25rem', flexShrink: 0 }}></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regular people (guests) */}
            {regularPeople.length > 0 && (
              <div>
                {regularPeople.map(person => {
                  const isSelected = selectedRecipients.some(r => r.id === person.id);
                  return (
                    <button
                      key={person.id}
                      className="btn w-100"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: isSelected ? 'rgba(13, 110, 253, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected ? '1px solid rgba(13, 110, 253, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.5rem',
                        color: '#ffffff',
                        textAlign: 'left',
                        width: '100%',
                        marginBottom: '0.5rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRecipientSelection(person);
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                    >
                      <div 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: getAvatarColor(person.avatar || person.name),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#ffffff',
                          flexShrink: 0
                        }}
                      >
                        {person.avatar || (person.name ? person.name.charAt(0) : '?')}
                      </div>
                      <span style={{ flex: 1, fontWeight: '500', fontSize: '0.875rem' }}>{person.name}</span>
                      {isSelected && (
                        <i className="bi bi-check-circle-fill" style={{ color: '#0d6efd', fontSize: '1.25rem', flexShrink: 0 }}></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredPeople.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                No people found
              </div>
            )}
          </div>
          
          {/* CTA Button - only show when people are selected, fixed at bottom */}
          {ctaText && (
            <div style={{ 
              position: 'absolute',
              bottom: 'env(safe-area-inset-bottom, 0)',
              left: '1rem',
              right: '1rem',
              paddingTop: '1rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#2d2d2d',
              paddingBottom: '1rem'
            }}>
              <button
                className="btn btn-primary w-100"
                style={{
                  padding: '0.875rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderRadius: '0.5rem'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Selected people are already in selectedRecipients, just close the sheet
                  setShowPeopleSheet(false);
                  setShowBottomSheet(false);
                }}
              >
                {ctaText}
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render bottom sheet menu for mobile
  const renderBottomSheet = () => {
    if (!isMobile || !showBottomSheet) return null;

    const tools = [
      {
        id: 'people',
        label: 'People',
        icon: 'bi-people',
        onClick: () => {
          // Open People bottom sheet
          setShowBottomSheet(false);
          setShowPeopleSheet(true);
        }
      },
      {
        id: 'check-in',
        label: 'Check-in',
        icon: 'bi-person-check',
        onClick: () => {
          // Open Check-in bottom sheet
          setShowBottomSheet(false);
          setShowCheckInSheet(true);
        }
      },
      {
        id: 'pos',
        label: 'POS',
        icon: 'bi-cash-stack',
        onClick: () => {
          // Open POS bottom sheet
          setShowBottomSheet(false);
          setShowPosSheet(true);
        }
      },
      {
        id: 'assign',
        label: 'Assign',
        icon: 'bi-check-square',
        onClick: () => {
          // Toggle Assign pill - mutually exclusive with Check-in and POS
          if (!hasAssignPill) {
            if (primaryAction === 'check-in' || primaryAction === 'pos') {
              setPrimaryAction(null);
              if (primaryAction === 'pos') {
                setPosCart([]);
                setPaymentMethod(null);
                setShowPosPicker(false);
              }
              if (primaryAction === 'check-in') {
                setShowCheckInPicker(false);
              }
              setHasAssignPill(true);
              setToastMessage('Switched to Assign');
            } else {
              setHasAssignPill(true);
            }
          } else {
            setHasAssignPill(false);
          }
          setShowBottomSheet(false);
        }
      }
    ];

    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease-out',
            pointerEvents: 'auto'
          }}
          onClick={() => {
            setShowBottomSheet(false);
            setShowPeopleSheet(false);
            setShowCheckInSheet(false);
          }}
        />
        {/* Bottom sheet */}
        <div
          data-bottom-sheet
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#2d2d2d',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            padding: '1.5rem 1rem',
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0))',
            zIndex: 100000,
            pointerEvents: 'auto',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              margin: '0 auto 1.5rem',
              cursor: 'grab'
            }}
          />
          
          {/* Tools list */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            {tools.map(tool => (
              <button
                key={tool.id}
                type="button"
                className="btn"
                onClick={tool.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.2s',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <i className={`bi ${tool.icon}`} style={{ fontSize: '1.25rem', flexShrink: 0 }}></i>
                <span style={{ flex: 1 }}>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className="composer-bar" style={{
        position: 'relative',
        padding: '0.75rem 1rem',
        zIndex: 100
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to top, rgba(26, 26, 26, 1) 0%, rgba(26, 26, 26, 0.8) 40%, rgba(26, 26, 26, 0) 100%)',
          pointerEvents: 'none',
          zIndex: -1
        }}></div>
        <div style={{
          position: 'absolute',
          top: '-2rem',
          left: 0,
          right: 0,
          height: '2rem',
          background: 'linear-gradient(to top, rgba(26, 26, 26, 0.8) 0%, rgba(26, 26, 26, 0) 100%)',
          pointerEvents: 'none',
          zIndex: -1
        }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {renderComposer()}
        </div>
      </div>
      {renderBottomSheet()}
      {renderPeopleSheet()}
      {renderCheckInSheet()}
      {renderPosSheet()}
    </>
  );
}

export default Composer;

