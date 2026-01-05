import React from 'react';
import FeedItem from './FeedItem';

function Feed({ items, allItems, activeFilter, onItemClick, onOpenThread, selectedContext, starredIds = new Set(), onToggleStar, itemRefs, onUpdateTaskLocation, onCompleteTask }) {
  const getItemFilter = (item) => {
    switch (item.type) {
      case 'task':
        return 'service'; // All tasks map to 'service' filter (which is now labeled 'Tasks')
      case 'guest':
        return 'guests'; // Guests map to 'guests' filter (which is now labeled 'Chats')
      case 'concierge':
        return 'guests'; // Concierge messages are part of chats
      case 'system':
        return 'system';
      default:
        return 'all';
    }
  };

  const isItemEmphasized = (item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'starred') {
      // For starred filter, emphasize only starred items
      return starredIds && starredIds instanceof Set && starredIds.has(item.id);
    }
    return getItemFilter(item) === activeFilter;
  };

  return (
    <div className="feed-container" style={{ padding: '0.75rem 1rem', paddingTop: '0.25rem', paddingBottom: '6rem' }}>
      {/* Feed Items */}
      <div className="feed-items">
        {items.map(item => {
          const isEmphasized = isItemEmphasized(item);
          const isSelected = selectedContext?.id === item.id;
          
          return (
            <FeedItem
              key={item.id}
              item={item}
              allItems={allItems}
              isEmphasized={isEmphasized}
              isSelected={isSelected}
              onClick={() => onItemClick(item)}
              onOpenThread={onOpenThread}
              isStarred={starredIds && starredIds instanceof Set ? starredIds.has(item.id) : false}
              onToggleStar={() => onToggleStar && onToggleStar(item.id)}
              onUpdateTaskLocation={onUpdateTaskLocation}
              onCompleteTask={onCompleteTask}
              itemRef={(el) => {
                // Store ref in map for auto-scroll re-anchoring
                if (el) {
                  itemRefs.current.set(item.id, el);
                } else {
                  itemRefs.current.delete(item.id);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Feed;

