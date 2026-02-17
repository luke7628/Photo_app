/**
 * 样式工具服务
 * 
 * 解决的问题：
 * - 统一处理设备旋转相关的样式计算
 * - 消除 ReviewScreen/GalleryScreen/CameraScreen 中重复的 rotationStyle 计算
 * - 提供一致的过渡效果和性能优化
 */

import type { CSSProperties } from 'react';

export interface RotationStyle extends CSSProperties {}

/**
 * 生成旋转和缩放样式
 * 
 * 在横屏模式下缩放到 0.8 以避免内容被 notch/Dynamic Island 遮挡
 * 
 * @param rotation 旋转角度（度），通常是 -90, 0 或 90
 * @param scale 缩放因子，默认 1
 * @param duration 过渡时间（毫秒），默认 500ms
 * @returns CSS 样式对象
 * 
 * @example
 * // 基础使用
 * const style = getRotationStyle(90, 1)
 * 
 * // 在横屏时缩放
 * const style = getRotationStyle(uiRotation, isLandscape ? 0.8 : 1)
 * 
 * // 自定义过渡时间
 * const style = getRotationStyle(90, 1, 300)
 */
export function getRotationStyle(
  rotation: number,
  scale: number = 1,
  duration: number = 500
): RotationStyle {
  return {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transition: `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
  };
}

/**
 * 生成仅包含旋转的样式（不缩放）
 * 用于容器元素
 * 
 * @param rotation 旋转角度
 * @param duration 过渡时间，默认 300ms
 * @returns CSS 样式对象
 * 
 * @example
 * const containerStyle = getRotationOnlyStyle(uiRotation)
 */
export function getRotationOnlyStyle(
  rotation: number,
  duration: number = 300
): RotationStyle {
  return {
    transform: `rotate(${rotation}deg)`,
    transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };
}

/**
 * 基于方向返回 Tailwind CSS 类名
 * 
 * @param isLandscape 是否横屏
 * @returns 条件类名
 * 
 * @example
 * const classes = getOrientationClasses(isLandscape)
 * // isLandscape=true 时: 'landscape-mode transition-all duration-500'
 * // isLandscape=false 时: 'portrait-mode transition-all duration-500'
 */
export function getOrientationClasses(isLandscape: boolean): string {
  const baseClasses = 'transition-all duration-500';
  return isLandscape ? `${baseClasses} landscape-mode` : `${baseClasses} portrait-mode`;
}

/**
 * 根据方向获取响应式尺寸
 * 
 * @param isLandscape 是否横屏
 * @param portraitSize 竖屏时的值
 * @param landscapeSize 横屏时的值
 * @returns 对应方向的值
 * 
 * @example
 * const padding = getResponsiveSize(isLandscape, 'p-4', 'p-2')
 * const flex = getResponsiveSize(isLandscape, 'flex-1', 'flex-[2]')
 */
export function getResponsiveSize(
  isLandscape: boolean,
  portraitSize: string,
  landscapeSize: string
): string {
  return isLandscape ? landscapeSize : portraitSize;
}

/**
 * 根据方向获取响应式数值
 * 
 * @param isLandscape 是否横屏
 * @param portraitValue 竖屏值
 * @param landscapeValue 横屏值
 * @returns 对应方向的数值
 * 
 * @example
 * const height = getResponsiveValue(isLandscape, 14, 12)
 */
export function getResponsiveValue<T>(
  isLandscape: boolean,
  portraitValue: T,
  landscapeValue: T
): T {
  return isLandscape ? landscapeValue : portraitValue;
}

/**
 * 生成渐变背景样式
 * 
 * @param colors 颜色数组 [开始色, 结束色]
 * @param angle 渐变角度，默认 135°
 * @returns CSS 样式对象
 * 
 * @example
 * const style = getGradientStyle(['#FF6B6B', '#4ECDC4'], 135)
 */
export function getGradientStyle(
  colors: [string, string],
  angle: number = 135
): RotationStyle {
  return {
    background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`,
  };
}

/**
 * 计算安全区域内边距（用于 notch/Dynamic Island）
 * 
 * 从 HTML 根元素读取 env 变量
 * 
 * @returns { top: string, right: string, bottom: string, left: string }
 * 
 * @note
 * 确保 <html> 标签有以下 CSS 变量：
 * --sat: env(safe-area-inset-top)
 * --sar: env(safe-area-inset-right)
 * --sab: env(safe-area-inset-bottom)
 * --sal: env(safe-area-inset-left)
 */
export function getSafeAreaPadding(): {
  top: string;
  right: string;
  bottom: string;
  left: string;
} {
  if (typeof window === 'undefined') {
    return { top: '0', right: '0', bottom: '0', left: '0' };
  }

  const root = document.documentElement;
  const top = getComputedStyle(root).getPropertyValue('--sat').trim() || '0';
  const right = getComputedStyle(root).getPropertyValue('--sar').trim() || '0';
  const bottom = getComputedStyle(root).getPropertyValue('--sab').trim() || '0';
  const left = getComputedStyle(root).getPropertyValue('--sal').trim() || '0';

  return { top, right, bottom, left };
}

/**
 * 获取安全区域内边距作为 CSS 样式
 * 
 * @returns CSS 样式对象
 * 
 * @example
 * <div style={getSafeAreaPaddingStyle()}>内容会避开 notch</div>
 */
export function getSafeAreaPaddingStyle(): RotationStyle {
  const padding = getSafeAreaPadding();
  return {
    paddingTop: `calc(${padding.top} + 0.75rem)`,
    paddingRight: `calc(${padding.right} + 0.75rem)`,
    paddingBottom: `calc(${padding.bottom} + 0.75rem)`,
    paddingLeft: `calc(${padding.left} + 0.75rem)`,
  };
}
