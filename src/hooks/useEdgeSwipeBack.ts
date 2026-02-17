import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent } from 'react';

interface UseEdgeSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number;
  threshold?: number;
  velocityThreshold?: number;
}

export const useEdgeSwipeBack = ({
  onBack,
  enabled = true,
  edgeWidth = 28,
  threshold = 90,
  velocityThreshold = 0.6,
}: UseEdgeSwipeBackOptions) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const activeRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!enabled || event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (touch.clientX > edgeWidth) return;

    activeRef.current = true;
    setIsDragging(true);
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
  };

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (!activeRef.current || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);

    if (deltaY > 42 && deltaY > Math.abs(deltaX)) {
      activeRef.current = false;
      setIsDragging(false);
      setOffsetX(0);
      return;
    }

    const nextOffset = Math.max(0, Math.min(180, deltaX));
    setOffsetX(nextOffset);

    if (nextOffset > 0) {
      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (!activeRef.current) return;

    const elapsed = Math.max(16, performance.now() - startTimeRef.current);
    const velocity = offsetX / elapsed;

    activeRef.current = false;
    setIsDragging(false);

    if (offsetX > threshold || velocity > velocityThreshold) {
      onBack();
    }

    setOffsetX(0);
  };

  const style = useMemo<CSSProperties>(() => {
    const scale = 1 - Math.min(offsetX / 3500, 0.015);

    return {
      transform: `translateX(${offsetX}px) scale(${scale})`,
      transition: isDragging
        ? 'none'
        : 'transform 280ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      willChange: 'transform',
    };
  }, [offsetX, isDragging]);

  return {
    isDragging,
    offsetX,
    style,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
};
