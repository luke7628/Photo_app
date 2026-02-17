
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoSetItem } from '../types';

type GestureIntent = 'none' | 'page' | 'pan' | 'pinch' | 'crop';

interface ImagePreviewScreenProps {
  photos: PhotoSetItem[];
  initialIndex: number;
  onBack: () => void;
  onRetake: (index: number) => void;
  onReplace: (index: number, base64: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
};

const ImagePreviewScreen: React.FC<ImagePreviewScreenProps> = ({
  photos,
  initialIndex,
  onBack,
  onRetake,
  onReplace
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [pageOffsetX, setPageOffsetX] = useState(0);
  const [isPageAnimating, setIsPageAnimating] = useState(false);
  const [isTransformAnimating, setIsTransformAnimating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gestureIntentRef = useRef<GestureIntent>('none');
  const axisLockRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);

  const currentPhoto: PhotoSetItem = photos[currentIndex] || { url: '', label: 'Unknown', filename: '', isSynced: false };

  const resetViewTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setPageOffsetX(0);
    setIsPageAnimating(false);
    setIsTransformAnimating(false);
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearSettleTimer();
  }, [clearSettleTimer]);

  useEffect(() => {
    resetViewTransform();
    setCropBox({ x: 0, y: 0, w: 100, h: 100 });
    setActiveHandle(null);
    gestureIntentRef.current = 'none';
    axisLockRef.current = 'undecided';
  }, [currentIndex, resetViewTransform]);

  const getImageDisplayRect = () => {
    if (!imageRef.current || !containerRef.current) return null;
    const img = imageRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();

    const containerRatio = containerRect.width / containerRect.height;
    const imageRatio = img.naturalWidth / img.naturalHeight;

    let width: number;
    let height: number;

    if (imageRatio > containerRatio) {
      width = containerRect.width;
      height = containerRect.width / imageRatio;
    } else {
      height = containerRect.height;
      width = containerRect.height * imageRatio;
    }

    const x = (containerRect.width - width) / 2;
    const y = (containerRect.height - height) / 2;

    return {
      x,
      y,
      w: width,
      h: height,
      left: containerRect.left + x,
      top: containerRect.top + y,
    };
  };

  const getPanBounds = useCallback(
    (nextScale: number) => {
      const displayRect = getImageDisplayRect();
      if (!displayRect || nextScale <= 1) return { maxX: 0, maxY: 0 };

      const scaledW = displayRect.w * nextScale;
      const scaledH = displayRect.h * nextScale;
      return {
        maxX: Math.max(0, (scaledW - displayRect.w) / 2),
        maxY: Math.max(0, (scaledH - displayRect.h) / 2),
      };
    },
    []
  );

  const applyRubberBand = (value: number, min: number, max: number) => {
    if (value < min) return min + (value - min) * 0.28;
    if (value > max) return max + (value - max) * 0.28;
    return value;
  };

  const settleTransform = useCallback(
    (targetScale: number = scale, targetPosition: { x: number; y: number } = position) => {
      const boundedScale = clamp(targetScale, 1, 5);
      const { maxX, maxY } = getPanBounds(boundedScale);
      const nextPosition = {
        x: clamp(targetPosition.x, -maxX, maxX),
        y: clamp(targetPosition.y, -maxY, maxY),
      };

      const needScaleAdjust = Math.abs(boundedScale - scale) > 0.001;
      const needPositionAdjust =
        Math.abs(nextPosition.x - targetPosition.x) > 0.5 ||
        Math.abs(nextPosition.y - targetPosition.y) > 0.5;

      if (!needScaleAdjust && !needPositionAdjust) {
        return;
      }

      clearSettleTimer();
      setIsTransformAnimating(true);
      setScale(boundedScale);
      setPosition(nextPosition);
      settleTimerRef.current = window.setTimeout(() => {
        setIsTransformAnimating(false);
        settleTimerRef.current = null;
      }, 280);
    },
    [clearSettleTimer, getPanBounds, position, scale]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const rotateCurrent = async () => {
    if (!currentPhoto.url || isProcessing) return;
    setIsProcessing(true);
    try {
      const img = await loadImage(currentPhoto.url);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context unavailable');

      canvas.width = img.height;
      canvas.height = img.width;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(Math.PI / 2);
      context.drawImage(img, -img.width / 2, -img.height / 2);

      onReplace(currentIndex, canvas.toDataURL('image/jpeg', 0.92));
      resetViewTransform();
    } catch (error) {
      console.error('Rotate failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const performCrop = async () => {
    if (!currentPhoto.url || isProcessing) return;
    setIsProcessing(true);
    try {
      const img = await loadImage(currentPhoto.url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      const sourceX = (cropBox.x / 100) * img.naturalWidth;
      const sourceY = (cropBox.y / 100) * img.naturalHeight;
      const sourceW = (cropBox.w / 100) * img.naturalWidth;
      const sourceH = (cropBox.h / 100) * img.naturalHeight;

      canvas.width = Math.max(1, Math.floor(sourceW));
      canvas.height = Math.max(1, Math.floor(sourceH));

      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
      onReplace(currentIndex, canvas.toDataURL('image/jpeg', 0.92));
      setIsCropping(false);
      resetViewTransform();
    } catch (error) {
      console.error('Crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const onTouchStart = (event: React.TouchEvent) => {
    if (isProcessing) return;
    clearSettleTimer();
    setIsTransformAnimating(false);

    const touch = event.touches[0];
    const displayRect = getImageDisplayRect();
    setIsPageAnimating(false);

    if (isCropping && displayRect && event.touches.length === 1) {
      const touchX = ((touch.clientX - displayRect.left) / displayRect.w) * 100;
      const touchY = ((touch.clientY - displayRect.top) / displayRect.h) * 100;
      const threshold = 10;

      if (Math.abs(touchX - cropBox.x) < threshold && Math.abs(touchY - cropBox.y) < threshold) {
        setActiveHandle('tl');
        gestureIntentRef.current = 'crop';
      } else if (Math.abs(touchX - (cropBox.x + cropBox.w)) < threshold && Math.abs(touchY - cropBox.y) < threshold) {
        setActiveHandle('tr');
        gestureIntentRef.current = 'crop';
      } else if (Math.abs(touchX - cropBox.x) < threshold && Math.abs(touchY - (cropBox.y + cropBox.h)) < threshold) {
        setActiveHandle('bl');
        gestureIntentRef.current = 'crop';
      } else if (Math.abs(touchX - (cropBox.x + cropBox.w)) < threshold && Math.abs(touchY - (cropBox.y + cropBox.h)) < threshold) {
        setActiveHandle('br');
        gestureIntentRef.current = 'crop';
      } else if (touchX > cropBox.x && touchX < cropBox.x + cropBox.w && touchY > cropBox.y && touchY < cropBox.y + cropBox.h) {
        setActiveHandle('move');
        gestureIntentRef.current = 'crop';
      } else {
        setActiveHandle(null);
        gestureIntentRef.current = 'none';
      }

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      return;
    }

    if (event.touches.length === 2) {
      gestureIntentRef.current = 'pinch';
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      pinchDistanceRef.current = distance;
      return;
    }

    if (event.touches.length === 1) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      axisLockRef.current = 'undecided';
      gestureIntentRef.current = scale > 1 ? 'pan' : 'page';
    }
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (isProcessing) return;

    const displayRect = getImageDisplayRect();

    if (gestureIntentRef.current === 'crop' && isCropping && activeHandle && displayRect && event.touches.length === 1) {
      const touch = event.touches[0];
      const touchX = ((touch.clientX - displayRect.left) / displayRect.w) * 100;
      const touchY = ((touch.clientY - displayRect.top) / displayRect.h) * 100;
      const minSize = 10;

      setCropBox(prev => {
        let { x, y, w, h } = prev;

        if (activeHandle === 'tl') {
          const newX = clamp(touchX, 0, x + w - minSize);
          const newY = clamp(touchY, 0, y + h - minSize);
          return { x: newX, y: newY, w: x + w - newX, h: y + h - newY };
        }
        if (activeHandle === 'tr') {
          const newW = clamp(touchX - x, minSize, 100 - x);
          const newY = clamp(touchY, 0, y + h - minSize);
          return { x, y: newY, w: newW, h: y + h - newY };
        }
        if (activeHandle === 'bl') {
          const newX = clamp(touchX, 0, x + w - minSize);
          const newH = clamp(touchY - y, minSize, 100 - y);
          return { x: newX, y, w: x + w - newX, h: newH };
        }
        if (activeHandle === 'br') {
          const newW = clamp(touchX - x, minSize, 100 - x);
          const newH = clamp(touchY - y, minSize, 100 - y);
          return { x, y, w: newW, h: newH };
        }
        if (activeHandle === 'move' && lastTouchRef.current) {
          const dx = ((touch.clientX - lastTouchRef.current.x) / displayRect.w) * 100;
          const dy = ((touch.clientY - lastTouchRef.current.y) / displayRect.h) * 100;
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          return {
            ...prev,
            x: clamp(x + dx, 0, 100 - w),
            y: clamp(y + dy, 0, 100 - h),
          };
        }
        return prev;
      });
      event.preventDefault();
      return;
    }

    if (gestureIntentRef.current === 'pinch' && event.touches.length === 2 && pinchDistanceRef.current) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const delta = distance - pinchDistanceRef.current;
      setScale(prev => {
        const nextScale = clamp(prev + delta * 0.008, 1, 5);
        if (nextScale <= 1.01) {
          setPosition({ x: 0, y: 0 });
          return 1;
        }

        const { maxX, maxY } = getPanBounds(nextScale);
        setPosition(prevPosition => ({
          x: applyRubberBand(prevPosition.x, -maxX, maxX),
          y: applyRubberBand(prevPosition.y, -maxY, maxY),
        }));
        return nextScale;
      });
      pinchDistanceRef.current = distance;
      event.preventDefault();
      return;
    }

    if (event.touches.length !== 1 || !touchStartRef.current || !lastTouchRef.current) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (axisLockRef.current === 'undecided') {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX > 8 || absY > 8) {
        axisLockRef.current = absX >= absY ? 'horizontal' : 'vertical';
      }
    }

    if (gestureIntentRef.current === 'page' && axisLockRef.current === 'horizontal') {
      const atFirst = currentIndex === 0;
      const atLast = currentIndex === photos.length - 1;
      const overPull = (atFirst && deltaX > 0) || (atLast && deltaX < 0);
      const damping = overPull ? 0.35 : 1;
      setPageOffsetX(deltaX * damping);
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
      return;
    }

    if (gestureIntentRef.current === 'pan' && scale > 1) {
      const moveX = touch.clientX - lastTouchRef.current.x;
      const moveY = touch.clientY - lastTouchRef.current.y;
      setPosition(prev => {
        const next = { x: prev.x + moveX, y: prev.y + moveY };
        const { maxX, maxY } = getPanBounds(scale);
        return {
          x: applyRubberBand(next.x, -maxX, maxX),
          y: applyRubberBand(next.y, -maxY, maxY),
        };
      });
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (gestureIntentRef.current === 'page' && touchStartRef.current && lastTouchRef.current) {
      const deltaX = lastTouchRef.current.x - touchStartRef.current.x;
      const elapsed = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(deltaX) / Math.max(elapsed, 1);
      const shouldChange = axisLockRef.current !== 'vertical' && (Math.abs(deltaX) > 60 || velocity > 0.55) && elapsed < 520;

      setIsPageAnimating(true);
      if (shouldChange) {
        if (deltaX > 0) handlePrev();
        else handleNext();
      }
      setPageOffsetX(0);
    }

    if (gestureIntentRef.current === 'pan' || gestureIntentRef.current === 'pinch') {
      if (scale <= 1.02) {
        settleTransform(1, { x: 0, y: 0 });
      } else {
        settleTransform(scale, position);
      }
    }

    setActiveHandle(null);
    gestureIntentRef.current = 'none';
    axisLockRef.current = 'undecided';
    touchStartRef.current = null;
    lastTouchRef.current = null;
    pinchDistanceRef.current = null;
  };

  return (
    <div className="screen-container dark absolute inset-0 z-[100] touch-none">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            onReplace(currentIndex, reader.result as string);
            resetViewTransform();
          };
          reader.readAsDataURL(file);
        }}
      />

      <header className="pad-top-safe absolute top-0 inset-x-0 px-4 pb-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 flex items-center justify-between pointer-events-none backdrop-blur-sm transition-all duration-300">
        <button
          onClick={isCropping ? () => setIsCropping(false) : onBack}
          className="size-12 flex items-center justify-center rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-lg border border-white/20 active:scale-90 active:bg-white/20 pointer-events-auto transition-all duration-200 shadow-lg"
        >
          <span className="material-symbols-outlined font-bold">{isCropping ? 'close' : 'arrow_back'}</span>
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            {isCropping ? 'Crop Mode' : `${currentIndex + 1} / ${photos.length}`}
          </p>
          <h2 className="text-white text-sm font-black tracking-tight uppercase drop-shadow-lg">{currentPhoto.label}</h2>
        </div>

        <button
          onClick={isCropping ? performCrop : rotateCurrent}
          disabled={isProcessing}
          className="size-12 flex items-center justify-center rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-lg border border-white/20 pointer-events-auto transition-all duration-200 shadow-lg disabled:opacity-50"
        >
          <span className="material-symbols-outlined font-bold">{isCropping ? 'check' : 'rotate_right'}</span>
        </button>
      </header>

      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {!isCropping && scale <= 1.02 && (
          <>
            {currentIndex > 0 && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translateX(calc(-100% + ${pageOffsetX}px))`,
                  opacity: clamp(0.2 + Math.min(Math.abs(pageOffsetX) / 220, 0.65), 0.2, 0.85),
                  transition: isPageAnimating ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease' : undefined,
                }}
              >
                <img
                  src={photos[currentIndex - 1].url}
                  className="max-w-full max-h-full object-contain select-none"
                  alt={photos[currentIndex - 1].label}
                  draggable={false}
                  style={photos[currentIndex - 1].rotation ? { transform: `rotate(${photos[currentIndex - 1].rotation}deg)` } : undefined}
                />
              </div>
            )}

            {currentIndex < photos.length - 1 && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translateX(calc(100% + ${pageOffsetX}px))`,
                  opacity: clamp(0.2 + Math.min(Math.abs(pageOffsetX) / 220, 0.65), 0.2, 0.85),
                  transition: isPageAnimating ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease' : undefined,
                }}
              >
                <img
                  src={photos[currentIndex + 1].url}
                  className="max-w-full max-h-full object-contain select-none"
                  alt={photos[currentIndex + 1].label}
                  draggable={false}
                  style={photos[currentIndex + 1].rotation ? { transform: `rotate(${photos[currentIndex + 1].rotation}deg)` } : undefined}
                />
              </div>
            )}
          </>
        )}

        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x + pageOffsetX}px, ${position.y}px) scale(${scale})`,
            transition: isPageAnimating
              ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1)'
              : isTransformAnimating
                ? 'transform 280ms cubic-bezier(0.2, 0.9, 0.2, 1)'
                : undefined,
          }}
        >
          <img
            ref={imageRef}
            src={currentPhoto.url}
            className="max-w-full max-h-full object-contain select-none"
            alt={currentPhoto.label}
            draggable={false}
            style={currentPhoto.rotation ? { transform: `rotate(${currentPhoto.rotation}deg)` } : undefined}
          />
        </div>

        {isCropping && (() => {
          const displayRect = getImageDisplayRect();
          if (!displayRect) return null;
          return (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute inset-0 bg-black/60 overflow-hidden">
                <div
                  className="absolute border-2 border-primary shadow-[0_0_0_2000px_rgba(0,0,0,0.7)] pointer-events-auto"
                  style={{
                    left: `${displayRect.x + (cropBox.x / 100) * displayRect.w}px`,
                    top: `${displayRect.y + (cropBox.y / 100) * displayRect.h}px`,
                    width: `${(cropBox.w / 100) * displayRect.w}px`,
                    height: `${(cropBox.h / 100) * displayRect.h}px`
                  }}
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-r border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                  </div>

                  <div className="absolute -top-1 -left-1 size-8 border-t-4 border-l-4 border-primary"></div>
                  <div className="absolute -top-1 -right-1 size-8 border-t-4 border-r-4 border-primary"></div>
                  <div className="absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-primary"></div>
                  <div className="absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-primary"></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <footer className="pad-bottom-safe absolute bottom-0 inset-x-0 pt-8 px-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 backdrop-blur-sm transition-all duration-300">
        {!isCropping && (
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-full border border-white/10">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 ${idx === currentIndex ? 'bg-white w-2.5 h-2 rounded-full' : 'bg-white/40 hover:bg-white/60 w-2 h-2 rounded-full'}`}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          {isCropping ? (
            <>
              <button
                onClick={() => setIsCropping(false)}
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-200 shadow-lg"
              >
                Cancel
              </button>
              <button
                onClick={performCrop}
                disabled={isProcessing}
                className="flex-[2] h-12 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                Apply Crop <span className="material-symbols-outlined font-black">check_circle</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onRetake(currentIndex)}
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-200 shadow-lg"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span> Retake
              </button>
              <button
                onClick={() => {
                  setCropBox({ x: 0, y: 0, w: 100, h: 100 });
                  setIsCropping(true);
                }}
                className="flex-1 h-12 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 active:scale-95 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">crop_free</span> Crop
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/30 active:scale-95 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span> Replace
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ImagePreviewScreen;
