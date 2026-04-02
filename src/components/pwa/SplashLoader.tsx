import { useEffect, useState } from "react";
import logo from "@/assets/winterwatch-pro-logo.png";

interface SplashLoaderProps {
  onComplete?: () => void;
  minDisplayTime?: number;
}

export const SplashLoader = ({ onComplete, minDisplayTime = 1500 }: SplashLoaderProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      if (onComplete) {
        setTimeout(onComplete, 300);
      }
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Logo with pulse animation */}
      <div className="relative animate-scale-in">
        <img
          src={logo}
          alt="WinterWatch-Pro"
          className="w-32 h-32 sm:w-40 sm:h-40 object-contain animate-pulse"
        />
        
        {/* Spinning ring around logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-transparent border-t-primary/60 border-r-primary/30 animate-spin" />
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

// Simplified page loader for route transitions
export const PageLoader = () => (
  <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center gap-4">
    <img
      src={logo}
      alt="Loading"
      className="w-16 h-16 object-contain animate-pulse"
    />
    <div className="flex gap-1.5">
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
  </div>
);
