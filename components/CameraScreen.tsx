import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { PHOTO_LABELS } from '../types';
import { useDeviceOrientation } from '../src/hooks/useDeviceOrientation';
import { getRotationStyle } from '../src/services/styleService';
import { useEdgeSwipeBack } from '../src/hooks/useEdgeSwipeBack';
import { hapticService } from '../src/services/hapticService';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const edgeBackGesture = useEdgeSwipeBack({ onBack: onClose, enabled: true });

  // 使用共享 Hook 监听设备方向（消除重复代码）
  const { rotation: uiRotationHook } = useDeviceOrientation();

  // 更新本地状态以保持向后兼容
  useEffect(() => {
    setUiRotation(uiRotationHook as OrientationAngle);
  }, [uiRotationHook]);

  // 同步闪光灯状态到硬件
  useEffect(() => {
    const applyTorch = async () => {
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;

      try {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: flash === 'on' }]
          } as any);
        }
      } catch (err) {
        console.warn("Hardware torch not supported or error:", err);
      }
    };

    applyTorch();
  }, [flash]);

  // 启动摄像头
  useEffect(() => {
    let timeoutId: number;
    let cleanupListeners: Array<() => void> = [];
    let isMounted = true; // Bug Fix: 追踪挂载状态
    
    const startCamera = async () => {
      try {
        setCameraError(null);
        setIsCameraReady(false);

        // 停止之前的流
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        let newStream: MediaStream | null = null;
        
        // 尝试多个constraints配置，优先使用后置摄像头
        const constraintsList: MediaStreamConstraints[] = [
          // 最佳配置：后置摄像头 + 自动对焦 + 优化分辨率
          {
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
              focusMode: { ideal: 'continuous' }, // 持续自动对焦
              exposureMode: { ideal: 'continuous' }, // 自动曝光
              whiteBalanceMode: { ideal: 'continuous' }, // 自动白平衡
            } as any,
            audio: false
          },
          // 备选1：宽松的后置摄像头 + 基础对焦
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              focusMode: { ideal: 'continuous' },
            } as any,
            audio: false
          },
          // 备选2：后置摄像头，标准分辨率
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          },
          // 备选3：后置摄像头，不指定分辨率
          {
            video: {
              facingMode: { ideal: 'environment' }
            },
            audio: false
          },
          // 备选4：任何摄像头，宽松分辨率
          {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          },
          // 最宽松的配置 - 任何摄像头，任何分辨率
          {
            video: true,
            audio: false
          }
        ];

        for (let i = 0; i < constraintsList.length; i++) {
          try {
            console.log(`Trying constraints ${i + 1}:`, constraintsList[i]);
            newStream = await navigator.mediaDevices.getUserMedia(constraintsList[i]);
            console.log(`Successfully got stream with constraints ${i + 1}`);
            break;
          } catch (err) {
            if (err.name === 'OverconstrainedError') {
              console.error(`OverconstrainedError: ${err.constraint} constraint is not supported by the device.`);
            } else {
              console.warn(`Constraints ${i + 1} failed:`, err);
            }
            if (i === constraintsList.length - 1) {
              throw err;
            }
          }
        }

        if (!newStream) {
          throw new Error('Failed to get media stream');
        }

        streamRef.current = newStream;
        setStream(newStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null; // 清除之前的源
          
          // 定义事件监听器
          const onLoadedMetadata = () => {
            console.log('onloadedmetadata:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            // 确保尝试播放
            if (videoRef.current) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(err => {
                  console.warn('Auto play failed in onloadedmetadata:', err);
                });
              }
            }
          };

          const onCanPlay = () => {
            console.log('oncanplay - camera ready');
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setIsCameraReady(true);
            }
          };

          const onPlaying = () => {
            console.log('onplaying - video is playing');
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setIsCameraReady(true);
            }
          };

          const onLoadedData = () => {
            console.log('onloadeddata');
          };

          const onError = (e: any) => {
            console.error('Video element error:', e);
            setCameraError('Failed to load video, please retry');
          };

          // 添加监听器并记录清理函数
          videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          videoRef.current.addEventListener('canplay', onCanPlay);
          videoRef.current.addEventListener('playing', onPlaying);
          videoRef.current.addEventListener('loadeddata', onLoadedData);
          videoRef.current.addEventListener('error', onError);

          cleanupListeners.push(() => {
            if (videoRef.current) {
              videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
              videoRef.current.removeEventListener('canplay', onCanPlay);
              videoRef.current.removeEventListener('playing', onPlaying);
              videoRef.current.removeEventListener('loadeddata', onLoadedData);
              videoRef.current.removeEventListener('error', onError);
            }
          });

          // 设置srcObject
          videoRef.current.srcObject = newStream;

          // 确保视频有正确的属性
          videoRef.current.autoplay = true;
          videoRef.current.muted = true;
          (videoRef.current as any).playsInline = true;

          // 立即尝试播放
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Video play() resolved successfully');
              })
              .catch(err => {
                console.error('Video play() rejected:', err.name, err.message);
                // 尝试使用用户交互方式（通过重试按钮）
                console.warn('Video requires user interaction to play');
              });
          }

          // 备用定时器：1000ms后检查视频尺寸
          timeoutId = window.setTimeout(() => {
            if (videoRef.current && videoRef.current.videoWidth > 0 && !cameraError) {
              console.log('Timeout backup: camera ready');
              setIsCameraReady(true);
            }
          }, 1000);
        }
      } catch (err: any) {
        console.error("Camera Access Error:", err);
        let errorMessage = 'Unable to access camera';
        
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied, please allow camera access in browser settings';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application, please close other apps using the camera';
        } else if (err.name === 'TypeError') {
          errorMessage = 'Camera configuration error, please refresh the page and retry';
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Security error: Please access this app on HTTPS or localhost';
        }
        
        setCameraError(errorMessage);
        console.error('Full error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        // Bug Fix: 确保即使出错也清理之前注册的监听器
        cleanupListeners.forEach(cleanup => cleanup());
      }
    };

    startCamera();

    // 清理函数
    return () => {
      isMounted = false; // Bug Fix: 标记组件卸载
      if (timeoutId) clearTimeout(timeoutId);
      cleanupListeners.forEach(cleanup => cleanup());
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          try {
            track.applyConstraints({ advanced: [{ torch: false }] } as any).catch(() => {});
          } catch (e) {
            console.warn('Error disabling torch on cleanup:', e);
          }
        }
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [retryCount]);

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Camera not initialized');
      return;
    }
    
    if (!isCameraReady) {
      setCameraError('Camera not ready yet');
      return;
    }
    
    if (isCapturing) {
      return;
    }

    hapticService.impactMedium();

    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // 使用视频流的实际分辨率
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new Error('Video stream not loaded correctly');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const fullBase64 = canvas.toDataURL('image/jpeg', 0.95);
      
      console.log('📷 [CameraScreen] 照片已拍摄:', {
        width: canvas.width,
        height: canvas.height,
        base64Length: fullBase64.length,
        base64Sample: fullBase64.substring(0, 100)
      });
      
      // 快门效果
      const shutter = document.getElementById('shutter-overlay');
      if (shutter) {
        shutter.style.opacity = '1';
        setTimeout(() => { shutter.style.opacity = '0'; }, 100);
      }

      // 延迟后回调
      setTimeout(() => {
        // 保存拍摄时的旋转角度到sessionStorage（用于后续的图像方向处理）
        sessionStorage.setItem('lastCaptureRotation', uiRotation.toString());
        onCapture(fullBase64);
        setIsCapturing(false);
      }, 150);
    } catch (err: any) {
      console.error('Take photo error:', err);
      setCameraError(err.message || 'Failed to take photo, please retry');
      setIsCapturing(false);
    }
  };

  const isLandscape = uiRotation !== 0;
  const rotationStyle = useMemo(
    () => getRotationStyle(uiRotation, isLandscape ? 0.85 : 1),
    [uiRotation, isLandscape]
  );

  return (
    <div className="screen-container dark fixed inset-0 z-50 touch-none" {...edgeBackGesture.bind} style={edgeBackGesture.style}>
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        <div className="absolute left-0 top-0 bottom-0 w-6 z-30 pointer-events-none bg-gradient-to-r from-white/10 to-transparent"></div>
        {/* 摄像头错误提示 */}
        {cameraError && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 px-6 py-8 bg-black/95 rounded-3xl border border-red-500/50 max-w-sm">
              <span className="material-symbols-outlined text-5xl text-red-500">error_outline</span>
              <div className="text-center">
                <p className="text-white text-lg font-bold mb-2">{cameraError}</p>
                <p className="text-gray-400 text-sm">Please check camera permissions, device status, and browser settings</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    console.log('Retry button clicked');
                    setCameraError(null);
                    setIsCameraReady(false);
                    setRetryCount(prev => prev + 1);
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 摄像头加载状态 */}
        {!isCameraReady && !cameraError && (
          <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">photo_camera</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Initializing camera...</p>
                <p className="text-gray-400 text-xs mt-2">Please allow browser to access camera</p>
              </div>
            </div>
          </div>
        )}

        {/* 使用 object-contain 确保横版视频流完整显示且不变形 */}
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          className="w-full h-full object-contain bg-black"
          style={{
            WebkitPlaysinline: 'true',
            display: 'block'
          } as any}
        />
        
        {/* 快门闪烁反馈 */}
        <div id="shutter-overlay" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-100 z-50"></div>

        {/* UI 覆盖层 */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
          <header 
            className={`pad-top-safe w-full flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/20 to-transparent transition-all duration-500 ${isLandscape ? 'p-4 px-12' : 'p-6'}`}
          >
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
              onClick={() => setFlash(f => {
                if (f === 'off') return 'auto';
                if (f === 'auto') return 'on';
                return 'off';
              })}
              style={rotationStyle}
              className={`size-10 flex items-center justify-center rounded-2xl border transition-all backdrop-blur-xl ${
                flash === 'on' 
                  ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(0,122,255,0.4)]' 
                  : flash === 'auto'
                  ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                  : 'bg-black/40 border-white/10 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg font-bold">
                {flash === 'on' ? 'flash_on' : flash === 'auto' ? 'flash_auto' : 'flash_off'}
              </span>
            </button>
          </header>

          <div className="flex-1"></div>

          <footer 
            className={`pad-bottom-safe w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col items-center pointer-events-auto transition-all duration-500 ${isLandscape ? 'px-12 pt-1' : 'pt-4'}`}
          >
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
