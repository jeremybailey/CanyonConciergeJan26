# CANYON AI Companion - Single Canonical Feed Prototype

A React + Bootstrap 5 prototype demonstrating a "single canonical feed" UX pattern with momentary filters, persistent pins, and context-aware composer modes.

## Features

### Single Canonical Feed
All events, tasks, messages, and system notifications flow through one chronological timeline, maintaining temporal context and reducing cognitive overhead.

### Momentary Filters
- **Visual emphasis, not hard-hide**: Matching items are emphasized (normal opacity + border), non-matching items are de-emphasized (reduced opacity + collapsed)
- **Auto-clear**: Filters automatically clear after 60 seconds with countdown indicator
- **Ephemeral**: Filters do NOT persist across page refresh
- **Filter types**: 🎟 Tickets, 🍸 Service, 👥 Guests, 🤖 System, plus All

### Persistent Pins
- **Attention anchors**: Hold important items outside the feed flow
- **Persistent storage**: Saved to localStorage until dismissed
- **Auto-pin logic**:
  - Auto-pins "Service pressure" when active service tasks > 3
  - Auto-pins "Starting soon" when next performance < 15 minutes
- **Click to navigate**: Clicking a pin scrolls to the corresponding item in the feed

### Context-Aware Composer
The composer bar mutates based on selected context and tool mode:

- **Default**: Suggested prompts + text input + Tools button
- **Task selected**: Task actions (Complete/Reassign + Ask Concierge)
- **Guest selected**: Guest-scoped tools (Check-in, Sell ticket, Order drink, Message)
- **Tool modes**:
  - **Ticket Scan**: Open scanner / Manual entry
  - **Sell Ticket**: Quantity + price picker + Charge/Comp buttons
  - **Order Drink**: Drink picker + Send order
  - **Message Guest**: Message input + Send

## Project Structure

```
CANYONConciergeDecember/
├── src/
│   ├── App.jsx                 # Main app component with state management
│   ├── components/
│   │   ├── TodayBar.jsx        # Top bar with 3 metrics (Arrivals, Service, Next)
│   │   ├── PinsBar.jsx         # Persistent pins bar
│   │   ├── Feed.jsx            # Main feed with filter chips
│   │   ├── FeedItem.jsx        # Individual feed item (TASK, GUEST, CONCIERGE, SYSTEM)
│   │   └── Composer.jsx        # Context-aware composer bar
│   ├── hooks/
│   │   ├── usePins.js          # Pin management with localStorage
│   │   └── useAutoPin.js       # Auto-pin logic for critical conditions
│   ├── data/
│   │   └── seedData.js         # ~20 seed feed items with timestamps
│   ├── index.js                # React entry point
│   └── index.css               # Global styles
├── index-react.html            # HTML entry point for React app
├── package.json                # Dependencies (React 18, Vite)
└── vite.config.js              # Vite configuration
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

## Key Concepts

### Single Feed
Unlike traditional multi-view interfaces, everything appears in one unified chronological stream. This maintains temporal context - you can see what happened when, and how different events relate to each other in time.

### Filters vs Pins
- **Filters** are temporary lenses that change what you focus on without losing context. They're ephemeral and auto-clear.
- **Pins** are persistent attention anchors that hold important items outside the normal flow. They persist until dismissed.

### Composer Modes
The "tools in chat" pattern means the input bar adapts to context. Instead of navigating to separate screens, the composer transforms into the right tool for the current task, reducing cognitive load and maintaining flow.

## Seed Data

The prototype includes ~20 feed items with timestamps:
- **TASK items**: Ticket scans, service tasks (drink delivery, cleanup)
- **GUEST messages**: Various guest requests and questions
- **CONCIERGE responses**: AI-generated responses to guest queries
- **SYSTEM events**: Arrivals spikes, performance reminders, service alerts

## Tech Stack

- **React 18**: UI framework
- **Bootstrap 5**: Component library and utilities
- **Vite**: Build tool and dev server
- **localStorage**: Pin persistence

## Browser Support

Desktop-first layout, responsive for mobile. Tested on modern browsers (Chrome, Firefox, Safari, Edge).

