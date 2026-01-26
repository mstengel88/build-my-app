import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  isSlowConnection: boolean;
  lastOnline: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: getEffectiveType(),
    isSlowConnection: false,
    lastOnline: null,
  }));

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    const effectiveType = connection?.effectiveType || 'unknown';
    const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
    
    setStatus(prev => ({
      isOnline: navigator.onLine,
      effectiveType,
      isSlowConnection,
      lastOnline: navigator.onLine ? new Date() : prev.lastOnline,
    }));
  }, []);

  useEffect(() => {
    // Initial check
    updateNetworkStatus();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}

function getEffectiveType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  return connection?.effectiveType || 'unknown';
}

// Hook to detect if app should use reduced data mode
export function useReducedDataMode(): boolean {
  const { isSlowConnection } = useNetworkStatus();
  const [prefersReducedData, setPrefersReducedData] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced data (Save-Data header hint)
    const connection = (navigator as any).connection;
    if (connection?.saveData) {
      setPrefersReducedData(true);
    }
  }, []);

  return isSlowConnection || prefersReducedData;
}
