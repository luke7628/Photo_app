
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PHOTO_LABELS } from '../types';

interface CameraScreenProps {
  sessionIndex: number;
  isSingleRetake?: boolean;
  initialFlash?: 'on' | 'off' | 'auto';
  onClose: () => void;
  onCapture: (base64: string) => void;
}

type OrientationAngle = 0 | 90 | -90 | 180;

const CameraScreen: React.FC<CameraScreenProps> = ({ 
  sessionIndex, 
  isSingleRetake, 
  initialFlash = 'off',
  onClose, 
  onCapture 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(initialFlash);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [uiRotation, setUiRotation] = useState<OrientationAngle>(0);

  // 陀螺仪处理 UI 元素的旋转
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const { beta, gamma } = e;
      if (beta === null || gamma === null) return;
      if (Math.abs(gamma) > 40) {
        setUiRotation(gamma > 0 ? -90 : 90);
      } else {
        setUiRotation(0);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // 同步闪光灯状态到硬件
  useEffect(() => {
    const applyTorch = async () => {
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      try {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: flash === 'on' }]
          } as any);
        }
      } catch (err) {
        console.error("Hardware torch error:", err);
      }
    };

    applyTorch();
  }, [flash, stream]);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.7777777778 } // 强制请求 16:9 横版比例
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera Access Error:", err);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.applyConstraints({ advanced: [{ torch: false }] } as any).catch(() => {});
        }
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing || !isCameraReady) return;
    if ('vibrate' in navigator) navigator.vibrate(50);

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // 使用视频流的原始分辨率进行采集，确保不拉伸
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const fullBase64 = canvas.toDataURL('image/jpeg', 0.90);
      
      const shutter = document.getElementById('shutter-overlay');
      if (shutter) {
        shutter.style.opacity = '1';
        setTimeout(() => shutter.style.opacity = '0', 100);
      }

      setTimeout(() => onCapture(fullBase64), 150);
    }
  };

  const isLandscape = uiRotation !== 0;
  const rotationStyle = {
    transform: `rotate(${uiRotation}deg) scale(${isLandscape ? 0.85 : 1})`,
    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col overflow-hidden touch-none">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {/* 使用 object-contain 确保横版视频流完整显示且不变形 */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full object-contain"
        />
        
        {/* 快门闪烁反馈 */}
        <div id="shutter-overlay" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-100 z-50"></div>

        {/* UI 覆盖层 */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
          <header className={`safe-pt w-full flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/20 to-transparent transition-all duration-500 ${isLandscape ? 'p-4 px-12' : 'p-6'}`}>
            <button 
              onClick={onClose}
              style={rotationStyle}
              className="size-10 flex items-center justify-center rounded-2xl bg-black/40 text-white backdrop-blur-xl border border-white/10 active:scale-90"
            >
              <span className="material-symbols-outlined text-xl font-bold">close</span>
            </button>

            <div className="flex flex-col items-center" style={rotationStyle}>
              <div className="px-4 py-1.5 bg-black/50 rounded-full border border-white/20 backdrop-blur-md flex flex-col items-center shadow-2xl">
                 <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isSingleRetake ? 'text-amber-400' : 'text-primary'}`}>
                  {isSingleRetake ? 'Replacing' : `Step ${sessionIndex + 1}`}
                </span>
                <span className="text-white text-[9px] font-black uppercase tracking-tight">
                  {PHOTO_LABELS[sessionIndex]}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setFlash(f => f === 'off' ? 'on' : 'off')}
              style={rotationStyle}
              className={`size-10 flex items-center justify-center rounded-2xl border transition-all backdrop-blur-xl ${flash === 'on' ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(60,230,25,0.4)]' : 'bg-black/40 border-white/10 text-white'}`}
            >
              <span className="material-symbols-outlined text-lg font-bold">
                {flash === 'on' ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </header>

          <div className="flex-1"></div>

          <footer className={`safe-pb w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center pointer-events-auto transition-all duration-500 ${isLandscape ? 'pb-4 px-12 pt-2' : 'pb-12 pt-6'}`}>
            <div className="w-full flex items-center justify-center">
               <button 
                onClick={handleTakePhoto}
                disabled={isCapturing || !isCameraReady}
                style={rotationStyle}
                className="group relative size-20 active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="absolute -inset-2 rounded-full border-2 border-white/30 group-active:border-primary group-active:scale-110 transition-all"></div>
                <div className="absolute inset-0 rounded-full border-4 border-white shadow-2xl"></div>
                <div className="absolute inset-1.5 rounded-full bg-white group-active:bg-primary transition-colors"></div>
              </button>
            </div>
          </footer>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraScreen;
