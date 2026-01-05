import { useEffect } from 'react';

export function useAutoPin(feedItems, pins, addPin, removePin) {
  useEffect(() => {
    // Auto-pin logic: Service pressure
    const activeServiceTasks = feedItems.filter(
      item => item.type === 'task' && 
      item.category === 'service' && 
      item.status !== 'completed'
    ).length;

    const servicePinId = 'auto-pin-service-pressure';
    const hasServicePin = pins.find(p => p.id === servicePinId);

    if (activeServiceTasks > 3) {
      if (!hasServicePin) {
        addPin({
          id: servicePinId,
          type: 'auto-pin',
          label: 'Service pressure',
          status: 'active',
          condition: 'service-tasks > 3'
        });
      }
    } else {
      if (hasServicePin) {
        removePin(servicePinId);
      }
    }

    // Auto-pin logic: Performance starting soon
    const nextPerformance = feedItems.find(
      item => item.type === 'system' && 
      item.title?.toLowerCase().includes('performance') &&
      item.message?.toLowerCase().includes('12')
    );

    const performancePinId = 'auto-pin-starting-soon';
    const hasPerformancePin = pins.find(p => p.id === performancePinId);

    if (nextPerformance) {
      // Check if message mentions < 15 minutes
      const timeMatch = nextPerformance.message?.match(/(\d+)\s*min/i);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        if (minutes < 15) {
          if (!hasPerformancePin) {
            addPin({
              id: performancePinId,
              type: 'auto-pin',
              label: 'Starting soon',
              status: 'active',
              condition: 'performance < 15m'
            });
          }
        } else {
          if (hasPerformancePin) {
            removePin(performancePinId);
          }
        }
      }
    }
  }, [feedItems, pins, addPin, removePin]);
}

