import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PWAInstallBanner = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall, canInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner recently
    const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (dismissedTime > oneDayAgo) {
        setIsDismissed(true);
        return;
      }
    }

    // Show banner after a short delay if can install
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowBanner(false);
    }
  };

  if (!showBanner || isDismissed || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card/95 backdrop-blur-lg border-t border-border animate-in slide-in-from-bottom duration-300 md:hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Install WinterWatch-Pro</p>
          <p className="text-xs text-muted-foreground truncate">
            Add to home screen for quick access
          </p>
        </div>

        {isInstallable ? (
          <Button size="sm" onClick={handleInstall} className="shrink-0">
            Install
          </Button>
        ) : isIOS ? (
          <Link to="/install">
            <Button size="sm" variant="outline" className="shrink-0 gap-1">
              <Share className="h-3 w-3" />
              How
            </Button>
          </Link>
        ) : (
          <Link to="/install">
            <Button size="sm" variant="outline" className="shrink-0 gap-1">
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
