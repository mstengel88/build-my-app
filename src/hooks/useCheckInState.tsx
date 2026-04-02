import { useState, useEffect, useCallback } from 'react';
import type { CheckInState, WorkLogServiceType, ShovelWorkLogServiceType } from '@/lib/supabase-types';

const PLOW_STORAGE_KEY = 'plowCheckInState';
const SHOVEL_STORAGE_KEY = 'shovelCheckInState';

const defaultState: CheckInState = {
  isCheckedIn: false,
  accountId: null,
  accountName: null,
  checkInTime: null,
  serviceType: null,
};

export const useCheckInState = (type: 'plow' | 'shovel' = 'plow') => {
  const storageKey = type === 'plow' ? PLOW_STORAGE_KEY : SHOVEL_STORAGE_KEY;
  
  const [state, setState] = useState<CheckInState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultState;
    } catch {
      return defaultState;
    }
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save check-in state:', error);
    }
  }, [state, storageKey]);

  const checkIn = useCallback((
    accountId: string,
    accountName: string,
    serviceType?: WorkLogServiceType | ShovelWorkLogServiceType
  ) => {
    setState({
      isCheckedIn: true,
      accountId,
      accountName,
      checkInTime: new Date().toISOString(),
      serviceType: serviceType || null,
    });
  }, []);

  const checkOut = useCallback(() => {
    setState(defaultState);
  }, []);

  const updateServiceType = useCallback((serviceType: WorkLogServiceType | ShovelWorkLogServiceType) => {
    setState(prev => ({ ...prev, serviceType }));
  }, []);

  const getElapsedTime = useCallback((): number => {
    if (!state.checkInTime) return 0;
    return Date.now() - new Date(state.checkInTime).getTime();
  }, [state.checkInTime]);

  const formatElapsedTime = useCallback((): string => {
    const elapsed = getElapsedTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const displayHours = hours;
    const displayMinutes = minutes % 60;
    const displaySeconds = seconds % 60;
    
    return `${displayHours}:${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
  }, [getElapsedTime]);

  return {
    ...state,
    checkIn,
    checkOut,
    updateServiceType,
    getElapsedTime,
    formatElapsedTime,
  };
};
