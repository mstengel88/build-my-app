import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium",
        "safe-x fixed-optimized transition-gpu",
        !isOnline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-warning text-warning-foreground"
      )}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Changes will sync when connected.</span>
          </>
        ) : (
          <>
            <Signal className="h-4 w-4" />
            <span>Slow connection ({effectiveType}). Some features may be limited.</span>
          </>
        )}
      </div>
    </div>
  );
};
