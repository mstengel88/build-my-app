import { useState, useEffect, useCallback } from 'react';
import type { GPSPosition } from '@/lib/supabase-types';

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface UseGeolocationReturn {
  position: GPSPosition | null;
  error: string | null;
  loading: boolean;
  getPosition: () => Promise<GPSPosition | null>;
  startWatching: () => void;
  stopWatching: () => void;
  isWatching: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): UseGeolocationReturn => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watchPosition = false,
  } = options;

  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const geoOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Unable to get location';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case err.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    setError(errorMessage);
    setLoading(false);
  }, []);

  const getPosition = useCallback(async (): Promise<GPSPosition | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return null;
    }

    setLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsPosition: GPSPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(gpsPosition);
          setError(null);
          setLoading(false);
          resolve(gpsPosition);
        },
        (err) => {
          handleError(err);
          resolve(null);
        },
        geoOptions
      );
    });
  }, [handleError, enableHighAccuracy, timeout, maximumAge]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (watchId !== null) return;

    setLoading(true);
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );
    setWatchId(id);
    setIsWatching(true);
  }, [watchId, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  }, [watchId]);

  // Auto-start watching if option is set
  useEffect(() => {
    if (watchPosition) {
      startWatching();
    }

    return () => {
      stopWatching();
    };
  }, [watchPosition, startWatching, stopWatching]);

  return {
    position,
    error,
    loading,
    getPosition,
    startWatching,
    stopWatching,
    isWatching,
  };
};

// Calculate distance between two GPS coordinates using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Format distance for display
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
