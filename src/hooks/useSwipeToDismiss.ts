import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent } from 'react';

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

export const useSwipeToDismiss = ({
  onDismiss,
  threshold = 120,
  velocityThreshold = 0.7,
}: UseSwipeToDismissOptions) => {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return;
    startYRef.current = event.touches[0].clientY;
    startTimeRef.current = performance.now();
    setIsDragging(true);
  };

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (!isDragging || event.touches.length !== 1) return;

    const currentY = event.touches[0].clientY;
    const delta = currentY - startYRef.current;

    if (delta <= 0) {
      setOffsetY(0);
      return;
    }

    setOffsetY(delta);
  };

  const onTouchEnd = () => {
    if (!isDragging) return;

    const elapsed = Math.max(16, performance.now() - startTimeRef.current);
    const velocity = offsetY / elapsed;

    setIsDragging(false);

    if (offsetY > threshold || velocity > velocityThreshold) {
      onDismiss();
      setOffsetY(0);
      return;
    }

    setOffsetY(0);
  };

  const style = useMemo<CSSProperties>(() => {
    const scale = 1 - Math.min(offsetY / 1800, 0.02);
    const opacity = 1 - Math.min(offsetY / 450, 0.2);

    return {
      transform: `translateY(${offsetY}px) scale(${scale})`,
      opacity,
      transition: isDragging
        ? 'none'
        : 'transform 280ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 280ms ease',
      willChange: 'transform, opacity',
    };
  }, [offsetY, isDragging]);

  return {
    isDragging,
    style,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
};
