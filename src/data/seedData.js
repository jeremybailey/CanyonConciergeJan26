// Generate seed data with ~20 feed items of mixed types

export function generateSeedData() {
  const now = Date.now();
  const items = [];

  // System events
  items.push({
    id: 'sys-1',
    type: 'system',
    title: 'Arrivals spike: +12 in 10m',
    message: 'Unusual increase in arrivals detected',
    timestamp: now - 5 * 60000 // 5 minutes ago
  });

  // Performance starts 12 minutes from now
  const performanceStartTime = now + 12 * 60000;
  items.push({
    id: 'sys-2',
    type: 'system',
    title: 'Performance starting soon',
    message: 'DOKU performance begins in 12 minutes',
    timestamp: now - 3 * 60000, // Message created 3 minutes ago
    performanceStartTime: performanceStartTime // Store the actual start time
  });

  // Ticket-related tasks
  items.push({
    id: 'task-1',
    type: 'task',
    category: 'ticket',
    title: 'Scan ticket for Gallery 4',
    description: 'Guest at entrance needs ticket validation',
    status: 'pending',
    timestamp: now - 3 * 60000, // 3 minutes ago
    assignedTo: { name: 'Sarah Chen', avatar: 'SC', type: 'guest' }
  });

  items.push({
    id: 'task-2',
    type: 'task',
    category: 'ticket',
    title: 'Ticket scan failed - manual entry required',
    description: 'QR code unreadable, need to enter ticket number manually',
    status: 'pending',
    timestamp: now - 8 * 60000, // 8 minutes ago
    assignedTo: { name: 'Marcus Johnson', avatar: 'MJ', type: 'guest' }
  });

  items.push({
    id: 'task-3',
    type: 'task',
    category: 'ticket',
    title: 'Walk-up ticket sale completed',
    description: 'Sold 2 tickets at Gallery 1 entrance',
    status: 'completed',
    timestamp: now - 12 * 60000, // 12 minutes ago
    assignedTo: { name: 'Alex Rivera', avatar: 'AR', type: 'staff' }
  });

  // Service tasks
  items.push({
    id: 'task-4',
    type: 'task',
    category: 'service',
    title: 'Drink order for Gallery 4',
    description: 'Wine order for table 3',
    location: 'gallery-4',
    status: 'pending',
    timestamp: now - 2 * 60000, // 2 minutes ago
    assignedTo: { name: 'Emma Rodriguez', avatar: 'ER', type: 'guest' }
  });

  items.push({
    id: 'task-5',
    type: 'task',
    category: 'service',
    title: 'Restock bar supplies',
    description: 'Low on wine glasses and napkins',
    status: 'pending',
    timestamp: now - 18 * 60000, // 18 minutes ago
    assignedTo: { name: 'Jordan Kim', avatar: 'JK', type: 'staff' }
  });

  items.push({
    id: 'task-6',
    type: 'task',
    category: 'service',
    title: 'Clean up Gallery 2',
    description: 'Spill reported near installation',
    status: 'completed',
    timestamp: now - 25 * 60000, // 25 minutes ago
    assignedTo: { name: 'Taylor Morgan', avatar: 'TM', type: 'staff' }
  });

  // Guest messages
  items.push({
    id: 'guest-1',
    type: 'guest',
    name: 'Sarah Chen',
    avatar: 'SC',
    message: 'Can we get another drink? We\'re at table 5 in Gallery 3.',
    timestamp: now - 1 * 60000, // 1 minute ago
    threadId: 'thread-1'
  });

  items.push({
    id: 'guest-2',
    type: 'guest',
    name: 'Marcus Johnson',
    avatar: 'MJ',
    message: 'Where is the restroom?',
    timestamp: now - 4 * 60000, // 4 minutes ago
    threadId: 'thread-2'
  });

  items.push({
    id: 'guest-3',
    type: 'guest',
    name: 'Emma Rodriguez',
    avatar: 'ER',
    message: 'Is the performance still happening? We want to buy tickets.',
    timestamp: now - 7 * 60000, // 7 minutes ago
    threadId: 'thread-3'
  });

  items.push({
    id: 'guest-4',
    type: 'guest',
    name: 'David Kim',
    avatar: 'DK',
    message: 'The audio in Gallery 1 seems too loud. Can someone check?',
    timestamp: now - 10 * 60000 // 10 minutes ago
  });

  // Concierge responses (threaded to guest messages)
  items.push({
    id: 'concierge-1',
    type: 'concierge',
    message: 'Performance starts in 12 minutes. You can purchase tickets at the Gallery 4 entrance or use the ticket scanner.',
    timestamp: now - 6 * 60000, // 6 minutes ago
    threadId: 'thread-3', // Response to guest-3
    parentId: 'guest-3'
  });

  items.push({
    id: 'concierge-2',
    type: 'concierge',
    message: 'Restrooms are located on the second floor, near the main staircase. There are also facilities on the ground floor near Gallery 2.',
    timestamp: now - 4 * 60000, // 4 minutes ago
    threadId: 'thread-2', // Response to guest-2
    parentId: 'guest-2'
  });

  items.push({
    id: 'concierge-3',
    type: 'concierge',
    message: 'I\'ve notified the service team about your drink order. It should arrive at table 5 within 5-7 minutes.',
    timestamp: now - 1 * 60000, // 1 minute ago
    threadId: 'thread-1', // Response to guest-1
    parentId: 'guest-1'
  });

  // More system events
  items.push({
    id: 'sys-3',
    type: 'system',
    title: 'High service demand',
    message: '3 active drink orders pending',
    timestamp: now - 9 * 60000 // 9 minutes ago
  });

  items.push({
    id: 'sys-4',
    type: 'system',
    title: 'Ticket sales update',
    message: '139 tickets sold out of 150 capacity',
    timestamp: now - 11 * 60000 // 11 minutes ago
  });

  // More tasks
  items.push({
    id: 'task-7',
    type: 'task',
    category: 'service',
    title: 'Assist guest with accessibility needs',
    description: 'Guest requested wheelchair access information',
    status: 'pending',
    timestamp: now - 6 * 60000, // 6 minutes ago
    assignedTo: { name: 'David Kim', avatar: 'DK', type: 'guest' }
  });

  items.push({
    id: 'task-8',
    type: 'task',
    category: 'ticket',
    title: 'Process group booking',
    description: 'Party of 8 needs tickets for tonight\'s performance',
    status: 'pending',
    timestamp: now - 13 * 60000, // 13 minutes ago
    assignedTo: { name: 'Priya Patel', avatar: 'PP', type: 'guest' }
  });

  items.push({
    id: 'task-9',
    type: 'task',
    category: 'service',
    title: 'Check temperature in Gallery 3',
    description: 'Guest reported it feels too warm',
    status: 'completed',
    timestamp: now - 20 * 60000, // 20 minutes ago
    assignedTo: { name: 'Casey Lee', avatar: 'CL', type: 'staff' }
  });

  // More guest messages
  items.push({
    id: 'guest-5',
    type: 'guest',
    name: 'Alex Thompson',
    avatar: 'AT',
    message: 'Can someone help us find the exit? We\'re near Gallery 2.',
    timestamp: now - 14 * 60000 // 14 minutes ago
  });

  items.push({
    id: 'guest-6',
    type: 'guest',
    name: 'Priya Patel',
    avatar: 'PP',
    message: 'The artwork description card is missing in Gallery 1. Can it be replaced?',
    timestamp: now - 16 * 60000 // 16 minutes ago
  });

  // Sort by timestamp (most recent first)
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

