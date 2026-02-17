
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoSetItem } from '../types';

interface ImagePreviewScreenProps {
  photos: PhotoSetItem[];
  initialIndex: number;
  onBack: () => void;
  onRetake: (index: number) => void;
  onReplace: (index: number, base64: string) => void;
}

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
  
  // Crop Box State (Percentage of the displayed image: 0-100)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
  const lastDistRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate the actual rect of the image as it appears on screen (object-contain)
  const getImageDisplayRect = () => {
    if (!imageRef.current || !containerRef.current) return null;
    const img = imageRef.current;
    const container = containerRef.current.getBoundingClientRect();
    
    const containerRatio = container.width / container.height;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    
    let w, h;
    if (imageRatio > containerRatio) {
      w = container.width;
      h = container.width / imageRatio;
    } else {
      h = container.height;
      w = container.height * imageRatio;
    }
    
    const x = (container.width - w) / 2;
    const y = (container.height - h) / 2;
    
    return { x, y, w, h, left: container.left + x, top: container.top + y };
  };

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCropBox({ x: 5, y: 5, w: 90, h: 90 });
  }, [currentIndex, isCropping]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
  }, [currentIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const displayRect = getImageDisplayRect();
    
    if (isCropping && displayRect) {
      const touchX = ((touch.clientX - displayRect.left) / displayRect.w) * 100;
      const touchY = ((touch.clientY - displayRect.top) / displayRect.h) * 100;

      const threshold = 10; // Hit area in percent
      if (Math.abs(touchX - cropBox.x) < threshold && Math.abs(touchY - cropBox.y) < threshold) {
        setActiveHandle('tl'); return;
      }
      if (Math.abs(touchX - (cropBox.x + cropBox.w)) < threshold && Math.abs(touchY - cropBox.y) < threshold) {
        setActiveHandle('tr'); return;
      }
      if (Math.abs(touchX - cropBox.x) < threshold && Math.abs(touchY - (cropBox.y + cropBox.h)) < threshold) {
        setActiveHandle('bl'); return;
      }
      if (Math.abs(touchX - (cropBox.x + cropBox.w)) < threshold && Math.abs(touchY - (cropBox.y + cropBox.h)) < threshold) {
        setActiveHandle('br'); return;
      }
      if (touchX > cropBox.x && touchX < cropBox.x + cropBox.w && touchY > cropBox.y && touchY < cropBox.y + cropBox.h) {
        setActiveHandle('move'); 
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }
    }

    if (e.touches.length === 1) {
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
      lastDistRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const displayRect = getImageDisplayRect();

    if (isCropping && activeHandle && displayRect) {
      const touchX = ((touch.clientX - displayRect.left) / displayRect.w) * 100;
      const touchY = ((touch.clientY - displayRect.top) / displayRect.h) * 100;

      setCropBox(prev => {
        let { x, y, w, h } = prev;
        const minSize = 10;
        
        // Clamp helpers
        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

        if (activeHandle === 'tl') {
          const newX = clamp(touchX, 0, x + w - minSize);
          const newY = clamp(touchY, 0, y + h - minSize);
          return { x: newX, y: newY, w: (x + w) - newX, h: (y + h) - newY };
        }
        if (activeHandle === 'tr') {
          const newW = clamp(touchX - x, minSize, 100 - x);
          const newY = clamp(touchY, 0, y + h - minSize);
          return { x, y: newY, w: newW, h: (y + h) - newY };
        }
        if (activeHandle === 'bl') {
          const newX = clamp(touchX, 0, x + w - minSize);
          const newH = clamp(touchY - y, minSize, 100 - y);
          return { x: newX, y, w: (x + w) - newX, h: newH };
        }
        if (activeHandle === 'br') {
          return { x, y, w: clamp(touchX - x, minSize, 100 - x), h: clamp(touchY - y, minSize, 100 - y) };
        }
        if (activeHandle === 'move' && lastTouchRef.current) {
          const dx = ((touch.clientX - lastTouchRef.current.x) / displayRect.w) * 100;
          const dy = ((touch.clientY - lastTouchRef.current.y) / displayRect.h) * 100;
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          return { ...prev, x: clamp(x + dx, 0, 100 - w), y: clamp(y + dy, 0, 100 - h) };
        }
        return prev;
      });
      return;
    }

    if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaY = touch.clientY - lastTouchRef.current.y;
      if (scale > 1) setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastDistRef.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setScale(prev => Math.max(1, Math.min(5, prev + (dist - lastDistRef.current!) * 0.01)));
      lastDistRef.current = dist;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    setActiveHandle(null);
    if (e.touches.length === 0 && touchStartRef.current && lastTouchRef.current) {
      const deltaX = lastTouchRef.current.x - touchStartRef.current.x;
      const duration = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(deltaX) / duration; // 滑动速度（像素/毫秒）

      // 判断是否应该翻页：距离 > 50px 或速度 > 0.5px/ms（惯性滑动）
      if (scale === 1 && !isCropping && (Math.abs(deltaX) > 50 || velocity > 0.5) && duration < 500) {
        if (deltaX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    }
    isDraggingRef.current = false;
  };

  const performCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use higher internal res for quality
    canvas.width = 1600;
    canvas.height = 1200;

    // Map percentage of image directly to pixels
    const sourceX = (cropBox.x / 100) * img.naturalWidth;
    const sourceY = (cropBox.y / 100) * img.naturalHeight;
    const sourceW = (cropBox.w / 100) * img.naturalWidth;
    const sourceH = (cropBox.h / 100) * img.naturalHeight;

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
    onReplace(currentIndex, canvas.toDataURL('image/jpeg', 0.9));
    setIsCropping(false);
    onBack();
  };

  const currentPhoto = photos[currentIndex] || { url: '', label: 'Unknown', isSynced: false };
  const displayRect = getImageDisplayRect();

  return (
    <div className="screen-container dark absolute inset-0 z-[100] touch-none"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { onReplace(currentIndex, reader.result as string); onBack(); };
          reader.readAsDataURL(file);
        }
      }} />

      <header 
        className="pad-top-safe absolute top-0 inset-x-0 px-4 pb-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 flex items-center justify-between pointer-events-none backdrop-blur-sm transition-all duration-300"
      >
        <button onClick={isCropping ? () => setIsCropping(false) : onBack}
          className="size-12 flex items-center justify-center rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-lg border border-white/20 active:scale-90 active:bg-white/20 pointer-events-auto transition-all duration-200 shadow-lg">
          <span className="material-symbols-outlined font-bold">{isCropping ? 'close' : 'arrow_back'}</span>
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
            {isCropping ? 'Precision Adjust' : `${currentIndex + 1} / ${photos.length}`}
          </p>
          <h2 className="text-white text-sm font-black tracking-tight uppercase drop-shadow-lg">{currentPhoto.label}</h2>
        </div>
        {!isCropping ? (
          <button onClick={() => setIsCropping(true)}
            className="size-12 flex items-center justify-center rounded-2xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-lg border border-white/20 active:bg-primary active:text-background-dark active:border-primary pointer-events-auto transition-all duration-200 shadow-lg">
            <span className="material-symbols-outlined font-bold">crop_free</span>
          </button>
        ) : <div className="size-12" />}
      </header>

      <div ref={containerRef} className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group">
        <div className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>
          <img ref={imageRef} src={currentPhoto.url} className="max-w-full max-h-full object-contain select-none" alt={currentPhoto.label} draggable={false} style={currentPhoto.rotation ? { transform: `rotate(${currentPhoto.rotation}deg)` } : undefined} />
        </div>

        {/* 页面指示器 - 仿iOS风格 */}
        {!isCropping && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 ${
                  idx === currentIndex
                    ? 'bg-white w-2.5 h-2 rounded-full'
                    : 'bg-white/40 hover:bg-white/60 w-2 h-2 rounded-full'
                }`}
              />
            ))}
          </div>
        )}

        {/* 滑动提示 - 首次显示 */}
        {!isCropping && photos.length > 1 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between px-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex flex-col items-center gap-1 text-white/30">
              <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Swipe</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-white/30">
              <span className="material-symbols-outlined text-2xl">arrow_forward_ios</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Swipe</span>
            </div>
          </div>
        )}

        {isCropping && displayRect && (
          <div className="absolute inset-0 z-10 pointer-events-none">
             {/* Dimmed Background covering exactly the image area */}
             <div className="absolute inset-0 bg-black/60 overflow-hidden">
                <div className="absolute border-2 border-primary shadow-[0_0_0_2000px_rgba(0,0,0,0.7)]"
                  style={{ 
                    left: `${displayRect.x + (cropBox.x / 100) * displayRect.w}px`,
                    top: `${displayRect.y + (cropBox.y / 100) * displayRect.h}px`,
                    width: `${(cropBox.w / 100) * displayRect.w}px`,
                    height: `${(cropBox.h / 100) * displayRect.h}px`
                  }}>
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className="border-r border-white/40 border-b border-white/40"></div>
                    <div className="border-r border-white/40 border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-white/40 border-b border-white/40"></div>
                    <div className="border-r border-white/40 border-b border-white/40"></div>
                    <div className="border-b border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                    <div className="border-r border-white/40"></div>
                  </div>

                  {/* Handles */}
                  <div className="absolute -top-1 -left-1 size-8 border-t-4 border-l-4 border-primary pointer-events-auto"></div>
                  <div className="absolute -top-1 -right-1 size-8 border-t-4 border-r-4 border-primary pointer-events-auto"></div>
                  <div className="absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-primary pointer-events-auto"></div>
                  <div className="absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-primary pointer-events-auto"></div>
                </div>
             </div>
          </div>
        )}
      </div>

      <footer 
        className="pad-bottom-safe absolute bottom-0 inset-x-0 pt-8 px-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 backdrop-blur-sm transition-all duration-300"
      >
        <div className="flex gap-3">
          {isCropping ? (
            <>
              <button 
                onClick={() => setIsCropping(false)} 
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
              <button 
                onClick={performCrop} 
                className="flex-[2] h-12 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 transition-all duration-200 active:shadow-blue-500/20"
              >
                Apply Crop <span className="material-symbols-outlined font-black">check_circle</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => onRetake(currentIndex)} 
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span> Retake
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 h-12 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/30 hover:shadow-green-500/50 active:scale-95 transition-all duration-200 active:shadow-green-500/20"
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
