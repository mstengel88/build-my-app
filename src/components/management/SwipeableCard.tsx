import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function SwipeableCard({ children, onEdit, onDelete, className }: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const ACTION_WIDTH = 70;
  const TOTAL_ACTION_WIDTH = (onEdit ? ACTION_WIDTH : 0) + (onDelete ? ACTION_WIDTH : 0);
  const SWIPE_THRESHOLD = TOTAL_ACTION_WIDTH / 2;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = translateX;
    setIsDragging(true);
  }, [translateX]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const diff = startX.current - e.touches[0].clientX;
    let newTranslate = currentX.current - diff;
    
    // Limit swipe range
    newTranslate = Math.max(-TOTAL_ACTION_WIDTH, Math.min(0, newTranslate));
    
    setTranslateX(newTranslate);
  }, [isDragging, TOTAL_ACTION_WIDTH]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    
    // Snap to open or closed based on threshold
    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      setTranslateX(-TOTAL_ACTION_WIDTH);
    } else {
      setTranslateX(0);
    }
  }, [translateX, SWIPE_THRESHOLD, TOTAL_ACTION_WIDTH]);

  const handleActionClick = (action: () => void) => {
    setTranslateX(0);
    action();
  };

  const resetSwipe = () => {
    setTranslateX(0);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Action buttons behind the card */}
      <div className="absolute inset-y-0 right-0 flex">
        {onEdit && (
          <button
            onClick={() => handleActionClick(onEdit)}
            className="flex items-center justify-center w-[70px] bg-primary text-primary-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-5 w-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => handleActionClick(onDelete)}
            className="flex items-center justify-center w-[70px] bg-destructive text-destructive-foreground"
            aria-label="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Swipeable card content */}
      <Card
        ref={cardRef}
        className={cn(
          "glass relative z-10 transition-transform",
          isDragging ? "duration-0" : "duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={translateX !== 0 ? resetSwipe : undefined}
      >
        <CardContent className="p-3">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
