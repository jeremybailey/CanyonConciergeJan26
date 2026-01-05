/**
 * CANYON AI Companion - Single Canonical Feed Prototype
 * 
 * SINGLE FEED CONCEPT:
 * This prototype demonstrates a "single canonical feed" UX where all events, tasks, 
 * messages, and system notifications flow through one chronological timeline. Unlike 
 * traditional multi-view interfaces, everything appears in one unified stream, 
 * maintaining temporal context and reducing cognitive overhead from switching contexts.
 * 
 * FILTERS:
 * - FILTERS are momentary lenses that change visual emphasis (not hard-hide). When active,
 *   matching items are emphasized (normal opacity + border), while non-matching items are
 *   de-emphasized (reduced opacity + collapsed to one-line). Filters are ephemeral and
 *   auto-clear after 60s. They do NOT persist across page refresh.
 * 
 * COMPOSER MODES:
 * The composer bar mutates based on selected context and tool mode:
 * - Default: Shows suggested prompts + text input + Tools button
 * - Task selected: Shows task actions (Complete/Reassign + Ask Concierge)
 * - Guest selected: Shows guest-scoped tools (Check-in, Sell ticket, Order drink, Message)
 * - Tool mode active: Transforms into specialized UI (Ticket Scan, Sell Ticket, Order Drink, Message Guest)
 * 
 * This creates a "tools in chat" experience where the input bar adapts to the current
 * context, reducing the need for separate screens or complex navigation.
 */

import React, { useState, useEffect, useRef } from 'react';
import TodayBar from './components/TodayBar';
import Feed from './components/Feed';
import Composer from './components/Composer';
import ThreadView from './components/ThreadView';
import { generateSeedData } from './data/seedData';

function App() {
  const [feedItems, setFeedItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterCountdown, setFilterCountdown] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);
  const [toolMode, setToolMode] = useState(null);
  const [openThread, setOpenThread] = useState(null);
  const feedRef = useRef(null);
  
  // Track bottom sheet state to hide jump button
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
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
  
  // Ref map for feed items - used for auto-scroll re-anchoring when filters activate
  const itemRefs = useRef(new Map());
  
  // Track user scroll activity to avoid auto-scrolling while user is actively scrolling
  const lastUserScrollTime = useRef(0);
  const isUserScrolling = useRef(false);
  
  // New items tracking: atBottom state and newCount for floating jump button
  const [atBottom, setAtBottom] = useState(true); // Start at bottom
  const [newCount, setNewCount] = useState(0);
  const prevFeedItemsLengthForNewCount = useRef(0); // Track previous feed items length to detect new items
  
  // Starred items state - persisted to localStorage
  const [starredIds, setStarredIds] = useState(() => {
    // Hydrate starredIds from localStorage on initial load
    try {
      const stored = localStorage.getItem('canyon-starred-ids');
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load starred ids from localStorage:', e);
    }
    return new Set();
  });
  
  // Persist starredIds to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('canyon-starred-ids', JSON.stringify(Array.from(starredIds)));
    } catch (e) {
      console.error('Failed to save starred ids to localStorage:', e);
    }
  }, [starredIds]);
  

  // Initialize seed data
  useEffect(() => {
    const seedData = generateSeedData();
    setFeedItems(seedData);
  }, []);

  // Auto-clear filter after 60 seconds
  useEffect(() => {
    if (activeFilter !== 'all' && filterCountdown === null) {
      setFilterCountdown(60);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (filterCountdown === null || filterCountdown <= 0) {
      if (filterCountdown === 0) {
        setActiveFilter('all');
      }
      return;
    }

    const timer = setInterval(() => {
      setFilterCountdown(prev => {
        if (prev <= 1) {
          setActiveFilter('all');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [filterCountdown]);

  // Reset countdown when filter changes manually
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilterCountdown(null);
    }
  }, [activeFilter]);

  // Track scroll position for atBottom state (for new items button)
  useEffect(() => {
    const feedElement = feedRef.current;
    if (!feedElement) return;

    const handleScroll = () => {
      const currentScrollTop = feedElement.scrollTop;
      const scrollHeight = feedElement.scrollHeight;
      const clientHeight = feedElement.clientHeight;
      
      // Distance from bottom (negative means scrolled past bottom)
      const distanceFromBottom = scrollHeight - clientHeight - currentScrollTop;
      
      // Track if user is at bottom (within 120px) for new items button
      const isAtBottom = distanceFromBottom < 120;
      if (isAtBottom !== atBottom) {
        setAtBottom(isAtBottom);
        // When user scrolls back to bottom manually, reset newCount
        if (isAtBottom) {
          setNewCount(0);
        }
      }
    };

    feedElement.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      feedElement.removeEventListener('scroll', handleScroll);
    };
  }, [atBottom]);

  const handleFilterChange = (filter) => {
    // Toggle: if clicking the same filter, set to 'all'
    if (activeFilter === filter) {
      setActiveFilter('all');
      setFilterCountdown(null);
    } else {
      setActiveFilter(filter);
      // Don't set countdown for starred filter (it's persistent, not ephemeral)
      setFilterCountdown(filter === 'all' || filter === 'starred' ? null : 60);
    }
  };

  // Toggle star/important status for a feed item
  const handleToggleStar = (itemId) => {
    setStarredIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleItemClick = (item) => {
    // Selection is for highlighting only - does NOT change composer behavior
    setSelectedContext(item);
  };

  const handleCompleteTask = (itemId) => {
    setFeedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // Mark as completed - works for tasks, guests, and any item type
        return { ...item, status: 'completed' };
      }
      return item;
    }));
    setSelectedContext(null);
  };

  const handleReassignTask = (itemId) => {
    // Simulate reassignment
    alert(`Task ${itemId} reassigned`);
    setSelectedContext(null);
  };

  const handleUpdateTaskLocation = (itemId, location) => {
    setFeedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, location: location || null };
        }
        return item;
      });
      return updated;
    });
  };

  const handleToolModeChange = (mode) => {
    setToolMode(mode);
  };

  const handleSendMessage = (message, recipients) => {
    console.log('handleSendMessage called with:', { message, recipients });
    
    // Allow empty message if there are recipients, or message if no recipients
    if (!message?.trim() && (!recipients || recipients.length === 0)) {
      console.log('No message or recipients, skipping');
      return;
    }
    
    const newItem = {
      id: `message-${Date.now()}`,
      type: 'concierge',
      message: message?.trim() || 'No message',
      timestamp: Date.now(),
      sender: {
        name: 'Jeremy Bailey',
        avatar: 'JB',
        type: 'staff'
      },
      recipients: (recipients || []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type
      }))
    };
    
    console.log('Creating new item:', newItem);
    
    // Add to feed items (will be sorted by timestamp in visibleFeedItems)
    setFeedItems(prev => {
      const updated = [...prev, newItem];
      console.log('Updated feed items count:', updated.length);
      console.log('New item in array:', updated.find(item => item.id === newItem.id));
      return updated;
    });
    
    // When user sends a message, immediately scroll to bottom and reset newCount
    // (Messages from composer are meant to be "in the now", not replies to older items)
    setTimeout(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
      setNewCount(0);
      setAtBottom(true);
    }, 100);
  };
  
  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setNewCount(0);
      setAtBottom(true);
    }
  };

  const handleToolAction = (action, data) => {
    // Handle tool actions (scan ticket, sell ticket, order drink, etc.)
    console.log('Tool action:', action, data);
    
    if (action === 'create-task') {
      // Tasks are inferred from selected people + Task pill
      // Assignee: selected staff/AI or current user (default)
      // Guest: selected guest (if any)
      // Description: message body
      // POS payload: if Task wraps POS, includes cart + payment method
      const assignee = data.assignee || {
        name: 'Jeremy Bailey',
        avatar: 'JB',
        type: 'staff'
      };
      
      // Task title rules: system-generated "Complete purchase" if POS payload exists, otherwise use message
      const taskTitle = data.posPayload 
        ? 'Complete purchase' 
        : (data.description || 'New Task');
      
      // Task description: only include message text if it's different from title (for POS tasks, message is a note)
      const taskDescription = data.posPayload 
        ? (data.description && data.description !== 'Complete purchase' ? data.description : null)
        : data.description;
      
      const newTask = {
        id: `task-${Date.now()}`,
        type: 'task',
        category: 'service',
        title: taskTitle,
        description: taskDescription, // Only set if different from title (for POS tasks, this is the note)
        status: 'assigned',
        timestamp: Date.now(),
        assignedTo: assignee,
        forGuest: data.forGuest || null, // Guest if selected, null otherwise
        location: data.location || null, // Location (optional, informational only, applies to all task types)
        posPayload: data.posPayload || null // POS cart + payment if Task wraps POS
      };
      setFeedItems(prev => [...prev, newTask]);
      // Reset after action
      setToolMode(null);
      setSelectedContext(null);
      return;
    }
    
    if (action === 'execute-pos') {
      // POS: create system event message (declarative, past-tense)
      // Format: "POS completed: {items} · ${total} · {payment method}"
      const total = data.cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const itemsText = data.cart.map(i => `${i.quantity}× ${i.name}`).join(', ');
      const paymentText = data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'card' ? 'Card' : 'Card on File';
      const newItem = {
        id: `pos-${Date.now()}`,
        type: 'system',
        title: `POS completed: ${itemsText} · $${total.toFixed(2)} · ${paymentText}`,
        // Store note as internal ops annotation (not sent to guest)
        note: data.note || null,
        timestamp: Date.now(),
        // Store POS receipt data for potential future use
        posReceipt: {
          cart: data.cart,
          paymentMethod: data.paymentMethod,
          total: total,
          forGuest: data.forGuest
        }
      };
      setFeedItems(prev => [...prev, newItem]);
      // Scroll to bottom after sending
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
        setNewCount(0);
        setAtBottom(true);
      }, 100);
      return;
    }
    
    if (action === 'check-in') {
      // Check-in: create system event message (declarative, past-tense)
      // Format: "Checked in: {Guest Name}"
      const newItem = {
        id: `checkin-${Date.now()}`,
        type: 'system',
        title: `Checked in: ${data.guest.name}`,
        // Store note as internal ops annotation (not sent to guest)
        note: data.note || null,
        timestamp: Date.now()
      };
      setFeedItems(prev => [...prev, newItem]);
      // Scroll to bottom after sending
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
        setNewCount(0);
        setAtBottom(true);
      }, 100);
      return;
    }
    
    // In a real app, this would make API calls, update state, etc.
    // For now, just show feedback
    alert(`Action: ${action}\nData: ${JSON.stringify(data, null, 2)}`);
    // Reset after action
    setToolMode(null);
    setSelectedContext(null);
  };

  const handleOpenThread = (guestMessage) => {
    setOpenThread(guestMessage);
  };

  const handleCloseThread = () => {
    setOpenThread(null);
  };

  const handleCloseConversation = (guestMessage) => {
    // In a real app, this would mark the conversation as closed
    console.log('Closing conversation for:', guestMessage.id);
    // For now, just close the thread view
    setOpenThread(null);
    // You could also update the feedItems to mark it as closed
    alert(`Conversation with ${guestMessage.name} has been closed.`);
  };

  // Filter out concierge items that are part of threads from main feed
  // Filter and sort feed items (oldest first for chronological display)
  const visibleFeedItems = React.useMemo(() => {
    const filtered = feedItems.filter(item => {
      if (item.type === 'concierge' && item.threadId) {
        return false; // Hide threaded concierge responses from main feed
      }
      return true;
    });
    const sorted = filtered.sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp, oldest first
    console.log('visibleFeedItems updated:', sorted.length, 'items');
    return sorted;
  }, [feedItems]);

  // Helper function to check if an item matches the current filter
  const itemMatchesFilter = (item, filter) => {
    if (filter === 'all') return true;
    if (filter === 'starred') {
      return starredIds && starredIds instanceof Set && starredIds.has(item.id);
    }
    if (filter === 'service') {
      return item.type === 'task';
    }
    if (filter === 'guests') {
      return item.type === 'guest' || item.type === 'concierge';
    }
    if (filter === 'system') {
      return item.type === 'system';
    }
    return false;
  };

  // Auto-scroll re-anchoring: jump to most recent matching item when filter activates
  const prevActiveFilter = useRef(activeFilter);
  useEffect(() => {
    // Only auto-scroll when filter changes from 'all' to a specific filter (activation)
    // Don't auto-scroll on deactivation (returning to 'all')
    if (prevActiveFilter.current === 'all' && activeFilter !== 'all') {
      // Reset scroll time when filter is activated - user clicking filter is intentional action
      lastUserScrollTime.current = 0;
      
      // Don't auto-scroll if input is focused or tool mode is active
      if (toolMode || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        prevActiveFilter.current = activeFilter;
        return;
      }

      // Find the most recent matching item (highest timestamp)
      const matchingItems = visibleFeedItems.filter(item => itemMatchesFilter(item, activeFilter));
      console.log('Auto-scroll: Filter activated', {
        filter: activeFilter,
        matchingItemsCount: matchingItems.length,
        allItemsCount: visibleFeedItems.length,
        starredIdsSize: starredIds?.size || 0
      });
      
      if (matchingItems.length === 0) {
        console.log('Auto-scroll: No matching items found');
        prevActiveFilter.current = activeFilter;
        return; // No matching items, do nothing
      }

      // Get the most recent matching item (last in sorted array since it's oldest first)
      const targetItem = matchingItems[matchingItems.length - 1];
      console.log('Auto-scroll: Target item', {
        itemId: targetItem.id,
        itemType: targetItem.type,
        timestamp: targetItem.timestamp
      });
      
      const targetElement = itemRefs.current.get(targetItem.id);
      console.log('Auto-scroll: Element lookup', {
        hasElement: !!targetElement,
        refsMapSize: itemRefs.current.size,
        allRefIds: Array.from(itemRefs.current.keys())
      });

      if (targetElement && feedRef.current) {
        // Defer to ensure DOM is ready - use double RAF for better reliability
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Check again if element still exists
            const currentElement = itemRefs.current.get(targetItem.id);
            if (!currentElement || !feedRef.current) {
              console.log('Auto-scroll: Element not found or container missing', { itemId: targetItem.id });
              return;
            }
            
            // Check if user scrolled after filter was activated (but allow some time for the scroll to complete)
            const timeSinceLastScroll = Date.now() - lastUserScrollTime.current;
            if (timeSinceLastScroll < 200 && timeSinceLastScroll > 0) {
              console.log('Auto-scroll: User scrolled after filter activation, aborting');
              return; // User scrolled after filter was activated, abort
            }

            const container = feedRef.current;
            
            // Calculate element position relative to scroll container
            // Use getBoundingClientRect to get absolute position, then calculate relative to container
            const containerRect = container.getBoundingClientRect();
            const elementRect = currentElement.getBoundingClientRect();
            
            // Calculate current scroll position + element's position relative to container
            const currentScrollTop = container.scrollTop;
            const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScrollTop;
            
            // Calculate offset for sticky header (TodayBar height + padding)
            const todayBarHeight = 60; // Approximate height of TodayBar with padding
            const feedContainerPadding = 12; // Top padding of feed-container
            const offset = todayBarHeight + feedContainerPadding + 12; // Add 12px spacing
            
            const targetScrollTop = elementTopRelativeToContainer - offset;

            console.log('Auto-scroll: Scrolling to item', {
              itemId: targetItem.id,
              currentScrollTop,
              elementTopRelativeToContainer,
              targetScrollTop,
              offset
            });

            // Smooth scroll to target position
            container.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            });
          });
        });
      } else {
        console.log('Auto-scroll: Target element or container not found', {
          hasTargetElement: !!targetElement,
          hasFeedRef: !!feedRef.current,
          targetItemId: targetItem?.id
        });
      }
    }
    
    prevActiveFilter.current = activeFilter;
  }, [activeFilter, visibleFeedItems, starredIds, toolMode]);

  // Track user scroll activity to prevent auto-scroll during user interaction
  useEffect(() => {
    const feedElement = feedRef.current;
    if (!feedElement) return;

    const handleUserScroll = () => {
      lastUserScrollTime.current = Date.now();
      isUserScrolling.current = true;
      clearTimeout(isUserScrolling.timeout);
      isUserScrolling.timeout = setTimeout(() => {
        isUserScrolling.current = false;
      }, 300);
    };

    feedElement.addEventListener('scroll', handleUserScroll, { passive: true });
    return () => {
      feedElement.removeEventListener('scroll', handleUserScroll);
      if (isUserScrolling.timeout) {
        clearTimeout(isUserScrolling.timeout);
      }
    };
  }, []);

  // Get thread items for a guest message
  const getThreadItems = (guestMessage) => {
    if (!guestMessage.threadId) return [];
    return feedItems.filter(item => 
      item.threadId === guestMessage.threadId && item.type === 'concierge'
    );
  };

  const handleThreadReply = (message) => {
    // In a real app, this would add a new concierge reply to the thread
    console.log('Thread reply:', message, 'to thread:', openThread.threadId);
    // For now, just show feedback
    alert(`Reply sent: "${message}"`);
  };

  // If thread is open, show thread view
  if (openThread) {
    const threadItems = getThreadItems(openThread);
    return (
      <ThreadView
        threadItems={threadItems}
        guestMessage={openThread}
        onBack={handleCloseThread}
        onReply={handleThreadReply}
        onCloseConversation={handleCloseConversation}
        feedItems={feedItems}
      />
    );
  }


  return (
    <div className="app-container d-flex flex-column" style={{ height: '100dvh', backgroundColor: '#1a1a1a', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Top filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100
        }}
      >
        <TodayBar 
          feedItems={feedItems}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          starredIds={starredIds}
        />
      </div>
      <div 
        className="flex-grow-1 overflow-auto" 
        ref={feedRef}
        style={{
          height: '100%',
          position: 'relative'
        }}
        onClick={(e) => {
          // Clear selection when clicking on feed background
          if (e.target === e.currentTarget || e.target.closest('.feed-container')) {
            if (!e.target.closest('.feed-item')) {
              setSelectedContext(null);
            }
          }
        }}
      >
        <Feed 
          items={visibleFeedItems}
          allItems={feedItems}
          activeFilter={activeFilter}
          onItemClick={handleItemClick}
          onOpenThread={handleOpenThread}
          selectedContext={selectedContext}
          starredIds={starredIds}
          onToggleStar={handleToggleStar}
          itemRefs={itemRefs}
          onUpdateTaskLocation={handleUpdateTaskLocation}
          onCompleteTask={handleCompleteTask}
        />
        
        {/* Floating "new items" jump button - only show when NOT at bottom and bottom sheets are closed */}
        {!atBottom && !isBottomSheetOpen && (
          <button
            onClick={scrollToBottom}
            className="btn btn-sm btn-primary rounded-pill"
            style={{
              position: 'fixed',
              bottom: '140px', // Above composer bar with clearance (composer can expand with pills/text)
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              padding: '0.5rem',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            }}
          >
            <i className="bi bi-arrow-down" style={{ fontSize: '1rem' }}></i>
          </button>
        )}
      </div>
      {/* Bottom composer */}
      <div 
        style={{ 
          position: 'sticky', 
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom, 0)' // Account for iOS safe area
        }}
      >
        <Composer
          selectedContext={selectedContext}
          toolMode={toolMode}
          onToolModeChange={handleToolModeChange}
          onToolAction={handleToolAction}
          onCompleteTask={handleCompleteTask}
          onReassignTask={handleReassignTask}
          feedItems={feedItems}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

export default App;

