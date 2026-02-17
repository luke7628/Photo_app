
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PHOTO_LABELS } from '../types';
import { useDeviceOrientation } from '../src/hooks/useDeviceOrientation';
import { getRotationStyle, getResponsiveSize } from '../src/services/styleService';
import { isPrinterDataValid } from '../src/utils/modelUtils';

interface ReviewScreenProps {
  imageUrl: string;
  data: { serialNumber: string; partNumber?: string } | null;
  isAnalyzing: boolean;
  sessionIndex: number;
  isSingleRetake?: boolean;
  photoRotation?: number; // 拍摄时的设备旋转角度
  onRetake: () => void;
  onConfirm: () => void;
  onUpdateData: (data: { serialNumber: string; partNumber?: string }) => void;
  onBack?: () => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({ imageUrl, data, isAnalyzing, sessionIndex, isSingleRetake, photoRotation, onRetake, onConfirm, onUpdateData, onBack }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const containerRef = useRef<HTMLDivElement>(null);
  const activeHandle = useRef<string | null>(null);
  const startPos = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });
  
  // Generate photo filename
  const photoName = data?.serialNumber 
    ? `${data.serialNumber}_${sessionIndex + 1}`
    : `Photo_${sessionIndex + 1}`;
  
  const [uiRotation, setUiRotation] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSerial, setEditSerial] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Validation & Animation
  const [shakeError, setShakeError] = useState(false);
  const [modalError, setModalError] = useState(false);

  // 使用共享 Hook 监听设备方向（消除重复代码）
  const { rotation: uiRotationHook } = useDeviceOrientation();

  // 更新本地状态以保持向后兼容
  useEffect(() => {
    setUiRotation(uiRotationHook);
  }, [uiRotationHook]);

  // 应用拍摄时的旋转角度到图像显示
  useEffect(() => {
    if (photoRotation !== undefined && photoRotation !== 0) {
      setImageRotation(photoRotation);
      console.log(`📸 [ReviewScreen] 应用拍摄时的旋转角度: ${photoRotation}°`);
    } else {
      setImageRotation(0);
    }
  }, [photoRotation]);

  const hasValidData = !isAnalyzing && isPrinterDataValid(data);

  const handleOpenEdit = () => {
    if (isAnalyzing) return;
    setEditSerial(data?.serialNumber || '');
    setEditPartNumber(data?.partNumber || '');
    setModalError(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editSerial || !editSerial.trim()) {
      setModalError(true);
      return;
    }
    // partNumber is now optional - user can leave it empty
    const normalizedPart = editPartNumber.trim().toUpperCase();
    onUpdateData({ serialNumber: editSerial.toUpperCase(), partNumber: normalizedPart || '' });
    setShowEditModal(false);
  };

  const handleConfirm = () => {
    if (!hasValidData) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
      // Optional: Auto open modal if they click main confirm and data is missing
      // handleOpenEdit(); 
      return;
    }
    onConfirm();
  };

  const handleBackAttempt = () => {
    console.log('🔙 [ReviewScreen] 返回按钮被点击, sessionIndex:', sessionIndex, 'isSingleRetake:', isSingleRetake);
    // 如果是第一张照片且不是单次重拍，需要确认
    if (sessionIndex === 0 && !isSingleRetake) {
      console.log('🔙 [ReviewScreen] 第一张照片未保存，显示确认对话框');
      setShowDiscardConfirm(true);
    } else {
      console.log('🔙 [ReviewScreen] 直接返回');
      if (onBack) onBack();
    }
  };

  const handleConfirmDiscard = () => {
    console.log('🔙 [ReviewScreen] 确认丢弃照片');
    setShowDiscardConfirm(false);
    if (onBack) onBack();
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, handle: string) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    activeHandle.current = handle;
    startPos.current = {
      x: clientX,
      y: clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h
    };
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!activeHandle.current || !containerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((clientX - startPos.current.x) / rect.width) * 100;
    const deltaY = ((clientY - startPos.current.y) / rect.height) * 100;

    setCrop(prev => {
      let { cropX: x, cropY: y, cropW: w, cropH: h } = startPos.current;
      const minSize = 10;

      switch (activeHandle.current) {
        case 'tl':
          x = Math.max(0, Math.min(startPos.current.cropX + deltaX, startPos.current.cropX + startPos.current.cropW - minSize));
          y = Math.max(0, Math.min(startPos.current.cropY + deltaY, startPos.current.cropY + startPos.current.cropH - minSize));
          w = startPos.current.cropW - (x - startPos.current.cropX);
          h = startPos.current.cropH - (y - startPos.current.cropY);
          break;
        case 'tr':
          y = Math.max(0, Math.min(startPos.current.cropY + deltaY, startPos.current.cropY + startPos.current.cropH - minSize));
          w = Math.max(minSize, Math.min(startPos.current.cropW + deltaX, 100 - x));
          h = startPos.current.cropH - (y - startPos.current.cropY);
          break;
        case 'bl':
          x = Math.max(0, Math.min(startPos.current.cropX + deltaX, startPos.current.cropX + startPos.current.cropW - minSize));
          w = startPos.current.cropW - (x - startPos.current.cropX);
          h = Math.max(minSize, Math.min(startPos.current.cropH + deltaY, 100 - y));
          break;
        case 'br':
          w = Math.max(minSize, Math.min(startPos.current.cropW + deltaX, 100 - x));
          h = Math.max(minSize, Math.min(startPos.current.cropH + deltaY, 100 - y));
          break;
        case 'move':
          x = Math.max(0, Math.min(startPos.current.cropX + deltaX, 100 - w));
          y = Math.max(0, Math.min(startPos.current.cropY + deltaY, 100 - h));
          break;
      }
      return { x, y, w, h };
    });
  };

  const handleTouchEnd = () => {
    activeHandle.current = null;
  };

  const isLandscape = uiRotation !== 0;
  const rotationStyle = useMemo(
    () => getRotationStyle(uiRotation, isLandscape ? 0.8 : 1),
    [uiRotation, isLandscape]
  );

  return (
    <div className="screen-container bg-[#f6f8f6] select-none touch-none" 
         onMouseMove={handleTouchMove} 
         onMouseUp={handleTouchEnd}
         onTouchMove={handleTouchMove} 
         onTouchEnd={handleTouchEnd}>
      
      <header className={`pt-4 px-4 bg-white rounded-b-3xl shadow-sm shrink-0 transition-all duration-500 ${isLandscape ? 'pb-1.5' : 'pb-2'}`}>
        <div className={`flex items-center gap-2 transition-all ${isLandscape ? 'pt-1.5 mb-1' : 'pt-2 mb-1.5'}`}>
           {/* 返回按钮 */}
           {onBack && (
             <button
               onClick={handleBackAttempt}
               className="size-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition-all"
               style={rotationStyle}
             >
               <span className="material-symbols-outlined text-[16px] text-gray-700">arrow_back</span>
             </button>
           )}
           
           <div style={rotationStyle} className={`size-7 rounded-lg flex items-center justify-center ${isSingleRetake ? 'bg-amber-100' : 'bg-sage/10'}`}>
             <span className={`material-symbols-outlined text-[16px] ${isSingleRetake ? 'text-amber-600' : 'text-sage'}`}>
               {isSingleRetake ? 'published_with_changes' : 'image_search'}
             </span>
           </div>
           <div className="flex items-baseline gap-1.5" style={rotationStyle}>
             <h1 className="text-base font-black text-gray-900 tracking-tight leading-none uppercase">
               {isSingleRetake ? 'Reviewing' : `Step ${sessionIndex + 1}`}
             </h1>
             <p className="text-[8px] font-bold text-gray-400 tracking-tight leading-none">{photoName}</p>
           </div>
        </div>

        {/* 强化后的序列号显示卡片 - 可点击编辑 - 增加 shaking 错误提示 */}
        <div className={`bg-background-dark p-0.5 rounded-xl shadow-lg overflow-hidden relative group transition-all duration-300 ${shakeError ? 'ring-4 ring-red-500/50 translate-x-[-2px]' : ''}`}>
          <button 
            onClick={handleOpenEdit}
            disabled={isAnalyzing}
            className={`w-full rounded-[0.9rem] px-3 py-2 flex flex-col items-center relative text-left transition-all active:bg-[#fff9c4] disabled:cursor-not-allowed ${
              hasValidData ? 'bg-[#fdfbe6]' : 'bg-red-50'
            }`}
          >
            {shakeError && <div className="absolute inset-0 bg-red-500/10 animate-pulse rounded-[0.9rem]"></div>}
            
            <div className="w-full flex justify-between items-center mb-1.5">
               <div className="flex flex-col" style={rotationStyle}>
                  <p className={`text-[9px] font-bold uppercase tracking-[0.15em] leading-none ${hasValidData ? 'text-primary' : 'text-red-500'}`}>
                    {hasValidData ? 'Serial Number' : 'Missing Info'}
                  </p>
               </div>
               <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-lg border border-gray-200" style={rotationStyle}>
                  <span className="material-symbols-outlined text-[10px] text-gray-400 leading-none">edit</span>
                  <span className="text-[10px] font-bold text-gray-900 leading-none uppercase">{data?.partNumber || 'N/A'}</span>
               </div>
            </div>
            
            <div className="w-full py-0.5 overflow-hidden flex flex-col items-center justify-center" style={rotationStyle}>
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-1 py-0.5">
                   <div className="h-7 w-36 bg-gray-200/50 rounded-xl animate-pulse"></div>
                   <p className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-bounce">Analyzing...</p>
                </div>
              ) : (
                <p className={`text-xl sm:text-2xl font-black tracking-tight truncate uppercase leading-none ${hasValidData ? 'text-gray-900' : 'text-red-500/50'}`}>
                  {hasValidData ? data?.serialNumber : 'TAP TO ENTER'}
                </p>
              )}
            </div>
            
            <div className="w-full h-px bg-gray-200/50 my-1.5"></div>
            <div className={`flex items-center justify-center gap-1.5 transition-opacity ${hasValidData ? 'opacity-60 group-hover:opacity-100' : 'opacity-100 animate-pulse'}`}>
               {!isAnalyzing && <span className={`material-symbols-outlined text-[11px] ${hasValidData ? 'text-gray-400' : 'text-red-400'}`}>edit</span>}
               <p className={`text-[7px] font-bold uppercase tracking-widest leading-none ${hasValidData ? 'text-gray-400' : 'text-red-400'}`}>
                 {isAnalyzing ? 'Processing image...' : (hasValidData ? 'Tap to edit manual entry' : 'Input required to proceed')}
               </p>
            </div>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-1 overflow-hidden relative transition-all">
        {/* 旋转按钮 */}
        <div className="w-full max-w-sm flex justify-end mb-1">
          <button
            onClick={() => setImageRotation(prev => (prev - 90) % 360)}
            className="size-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md active:scale-95 transition-all"
            title="Rotate counter-clockwise 90°"
          >
            <span className="material-symbols-outlined text-[18px]">rotate_left</span>
          </button>
        </div>
        
        <div 
          ref={containerRef} 
          className={`relative bg-black overflow-hidden shadow-2xl border-2 border-white transition-all duration-700 ease-out ${isLandscape ? 'h-[90%] aspect-[3/2] max-h-lg' : 'w-full aspect-[4/3] max-w-sm'}`} 
          style={{ transform: `rotate(${uiRotation}deg)` }}
        >
          <img 
            alt="Review" 
            className="w-full h-full object-contain pointer-events-none transition-transform duration-300" 
            src={imageUrl}
            style={{ transform: `rotate(${imageRotation}deg)` }}
          />
          
          {/* Photo label overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/50 backdrop-blur-sm px-3 py-2 pointer-events-none">
            <p className="text-white text-xs font-bold uppercase tracking-wide text-center">
              {PHOTO_LABELS[sessionIndex]}
            </p>
          </div>
          
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" style={{
              maskImage: `linear-gradient(to right, black ${crop.x}%, transparent ${crop.x}%, transparent ${crop.x + crop.w}%, black ${crop.x + crop.w}%)`,
              WebkitMaskImage: `linear-gradient(to right, black ${crop.x}%, transparent ${crop.x}%, transparent ${crop.x + crop.w}%, black ${crop.x + crop.w}%)`,
            }}></div>
            <div className="absolute inset-0 bg-black/40" style={{
              maskImage: `linear-gradient(to bottom, black ${crop.y}%, transparent ${crop.y}%, transparent ${crop.y + crop.h}%, black ${crop.y + crop.h}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black ${crop.y}%, transparent ${crop.y}%, transparent ${crop.y + crop.h}%, black ${crop.y + crop.h}%)`,
            }}></div>
          </div>

          <div 
            style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
            className="absolute z-20 transition-[box-shadow]"
            onMouseDown={(e) => handleTouchStart(e, 'move')}
            onTouchStart={(e) => handleTouchStart(e, 'move')}
          >
            {/* 四角L型边框 - 蓝色 */}
            <div className="absolute -top-1 -left-1 size-12 pointer-events-auto" onMouseDown={(e) => handleTouchStart(e, 'tl')} onTouchStart={(e) => handleTouchStart(e, 'tl')}>
               <div className="w-8 h-1 bg-blue-500 rounded-sm"></div>
               <div className="w-1 h-8 bg-blue-500 rounded-sm"></div>
            </div>
            <div className="absolute -top-1 -right-1 size-12 flex flex-col items-end pointer-events-auto" onMouseDown={(e) => handleTouchStart(e, 'tr')} onTouchStart={(e) => handleTouchStart(e, 'tr')}>
               <div className="w-8 h-1 bg-blue-500 rounded-sm"></div>
               <div className="w-1 h-8 bg-blue-500 rounded-sm ml-auto"></div>
            </div>
            <div className="absolute -bottom-1 -left-1 size-12 flex flex-col justify-end pointer-events-auto" onMouseDown={(e) => handleTouchStart(e, 'bl')} onTouchStart={(e) => handleTouchStart(e, 'bl')}>
               <div className="w-1 h-8 bg-blue-500 rounded-sm"></div>
               <div className="w-8 h-1 bg-blue-500 rounded-sm"></div>
            </div>
            <div className="absolute -bottom-1 -right-1 size-12 flex flex-col items-end justify-end pointer-events-auto" onMouseDown={(e) => handleTouchStart(e, 'br')} onTouchStart={(e) => handleTouchStart(e, 'br')}>
               <div className="w-1 h-8 bg-blue-500 rounded-sm ml-auto"></div>
               <div className="w-8 h-1 bg-blue-500 rounded-sm"></div>
            </div>
          </div>
        </div>
      </main>

      <footer className={`bg-white rounded-t-3xl shadow-[0_-15_50px_rgba(0,0,0,0.06)] shrink-0 z-20 transition-all duration-500 ${isLandscape ? 'pt-1 px-12 pb-2' : 'pt-2 px-5 pb-2'}`}>
        <div className={`flex gap-4 ${isLandscape ? 'justify-center' : ''}`}>
          <button 
            onClick={onRetake}
            style={rotationStyle}
            className={`bg-slate-50 active:scale-95 rounded-2xl flex items-center justify-center gap-2 transition-all border border-slate-100 shadow-sm ${isLandscape ? 'px-8 h-12' : 'flex-1 h-14'}`}
          >
            <span className="material-symbols-outlined text-gray-500 text-lg font-bold">replay</span>
            <span className="font-black text-gray-700 uppercase text-[10px] tracking-widest">Retake</span>
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isAnalyzing}
            style={{
              ...rotationStyle,
              backgroundColor: hasValidData 
                ? (isSingleRetake ? '#f59e0b' : '#10b981')
                : '#e5e7eb'
            }}
            className={`active:scale-95 rounded-lg sm:rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 shadow-xl disabled:opacity-50 hover:shadow-2xl ${isLandscape ? 'px-12 h-12' : 'flex-[2] h-12'} ${
              hasValidData 
              ? 'hover:brightness-110 active:brightness-95' 
              : 'text-gray-400 shadow-none'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 <span className="font-black text-white uppercase text-[10px] tracking-widest">Saving...</span>
              </div>
            ) : (
              <>
                <span className={`font-black uppercase text-[10px] tracking-widest ${hasValidData ? 'text-white' : 'text-gray-500'}`}>
                  {hasValidData ? (isSingleRetake ? 'Update' : (sessionIndex < 11 ? 'Save & Next' : 'Finish')) : 'Identify Asset'}
                </span>
                <span className={`material-symbols-outlined font-black text-lg ${hasValidData ? 'text-white' : 'text-gray-500'}`}>
                  {hasValidData ? (isSingleRetake ? 'done_all' : (sessionIndex < 11 ? 'arrow_forward' : 'check_circle')) : 'edit_square'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Manual Entry Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-[320px] bg-white rounded-[1.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#1a2332] uppercase tracking-tight leading-none">Manual Entry</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-[0.1em]">Correct Identification</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Serial Number</label>
                  <input 
                    autoFocus
                    value={editSerial}
                    onChange={(e) => {
                      setEditSerial(e.target.value.toUpperCase());
                      setModalError(false);
                    }}
                    placeholder="N/A"
                    className={`w-full h-12 px-4 bg-gray-100 rounded-lg border-2 text-base font-black uppercase tracking-widest placeholder:text-gray-400 focus:outline-none transition-all ${
                      modalError && (!editSerial || !editSerial.trim())
                      ? 'border-red-400 bg-red-50 text-red-500 animate-pulse' 
                      : 'border-transparent focus:border-primary/50 text-gray-800'
                    }`}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Part Number <span className="text-gray-300">(optional)</span></label>
                  <input 
                    value={editPartNumber}
                    onChange={(e) => {
                      setEditPartNumber(e.target.value.toUpperCase());
                      setModalError(false);
                    }}
                    placeholder="e.g. ZT41142-T010000Z"
                    className="w-full h-12 px-4 bg-gray-100 rounded-lg border-2 border-transparent text-base font-black uppercase tracking-widest placeholder:text-gray-400 focus:outline-none focus:border-primary/50 text-gray-800 transition-all"
                  />
                </div>
              </div>

              {modalError && (!editSerial || !editSerial.trim()) && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-600 text-center">Please enter Serial Number</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 h-12 rounded-lg text-gray-400 font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className={`flex-[1.5] h-12 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all ${
                    editPartNumber && editPartNumber.trim()
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95 hover:brightness-105' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirm
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-[320px] bg-white rounded-[1.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-gray-900 mb-2">Discard Photo?</h3>
                <p className="text-sm text-gray-600">This photo has not been saved. Are you sure you want to go back and discard it?</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowDiscardConfirm(false)} 
                className="w-full h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDiscard}
                className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors active:scale-95"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewScreen;
