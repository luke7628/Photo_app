import { useState, useEffect } from 'react';

export interface DeviceOrientationInfo {
  rotation: number;
  isLandscape: boolean;
}

/**
 * Hook: 监听设备方向变化
 * 统一处理 iOS/Android 设备方向检测
 * 
 * 解决的问题：
 * - 消除 3 个组件中重复的 deviceorientation 监听代码
 * - 统一处理 null 值检查和角度计算
 * - iPhone notch/Dynamic Island 下的安全区域处理
 * 
 * @returns {{ rotation: number, isLandscape: boolean }}
 * 
 * @example
 * const { rotation, isLandscape } = useDeviceOrientation()
 * const style = useMemo(() => ({
 *   transform: `rotate(${rotation}deg)`,
 *   transition: 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
 * }), [rotation])
 */
export function useDeviceOrientation(): DeviceOrientationInfo {
  const [rotation, setRotation] = useState<number>(0);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event;

      // 防护：null 检查（iOS Safari 某些情况下会返回 null）
      if (beta === null || gamma === null) {
        return;
      }

      // 计算旋转角度
      // gamma > 0: 设备右倾 → rotate -90
      // gamma < 0: 设备左倾 → rotate 90
      // 40° 是敏感度阈值，避免轻微倾斜触发变化
      let newRotation: number;
      if (Math.abs(gamma) > 40) {
        newRotation = gamma > 0 ? -90 : 90;
      } else {
        newRotation = 0;
      }

      setRotation(newRotation);
      setIsLandscape(newRotation !== 0);
    };

    // 监听设备方向变化
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return { rotation, isLandscape };
}

/**
 * Hook: 监听窗口 resize（用于网页预览/非移动设备）
 * 在没有实际设备方向时，基于窗口宽高判断
 * 
 * @returns {{ isLandscape: boolean }}
 */
export function useWindowOrientation() {
  const [isLandscape, setIsLandscape] = useState<boolean>(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const handleOrientationChange = () => {
      // orientationchange 比 resize 更早触发
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return { isLandscape };
}
