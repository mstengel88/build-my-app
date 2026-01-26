import { useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/winterwatch-pro-logo.png";

interface SplashLoaderProps {
  onComplete?: () => void;
  minDisplayTime?: number;
}

export const SplashLoader = ({ onComplete, minDisplayTime = 800 }: SplashLoaderProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      if (onComplete) {
        setTimeout(onComplete, 200); // Faster transition
      }
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background",
        "transition-opacity duration-200 gpu-accelerate",
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Logo with optimized animation */}
      <div className="relative gpu-accelerate">
        <img
          src={logo}
          alt="WinterWatch-Pro"
          className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
          loading="eager"
          decoding="async"
        />
        
        {/* Simplified spinning ring for better performance */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-primary/60 animate-spin gpu-accelerate" />
        </div>
      </div>

      {/* App name */}
      <h1 className="mt-6 text-xl sm:text-2xl font-bold text-white animate-fade-in">
        WinterWatch-Pro
      </h1>

      {/* Loading dots */}
      <div className="mt-4 flex gap-1.5">
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>

      {/* Tagline */}
      <p className="mt-4 text-sm text-muted-foreground animate-fade-in">
        Professional Snow Removal Tracking
      </p>
    </div>
  );
};

// Memoized and optimized page loader for route transitions
export const PageLoader = memo(() => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 gpu-accelerate">
    <div className="relative">
      <img
        src={logo}
        alt="Loading"
        className="w-14 h-14 object-contain"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-primary/60 animate-spin gpu-accelerate" />
      </div>
    </div>
  </div>
));

PageLoader.displayName = 'PageLoader';
