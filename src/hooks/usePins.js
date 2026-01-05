import { useState, useEffect } from 'react';

const STORAGE_KEY = 'canyon-pins';

export function usePins() {
  const [pins, setPins] = useState([]);

  // Load pins from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPins(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load pins from localStorage:', e);
    }
  }, []);

  // Save pins to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch (e) {
      console.error('Failed to save pins to localStorage:', e);
    }
  }, [pins]);

  const addPin = (pin) => {
    setPins(prev => {
      // Check if pin already exists
      if (prev.find(p => p.id === pin.id)) {
        return prev;
      }
      return [...prev, pin];
    });
  };

  const removePin = (pinId) => {
    setPins(prev => prev.filter(p => p.id !== pinId));
  };

  return [pins, addPin, removePin];
}

