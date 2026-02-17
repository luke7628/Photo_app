/**
 * 图像旋转工具 - 根据拍摄时的设备角度自动旋转图像
 * 
 * 支持的旋转角度：
 * - 0: 竖屏（默认）
 * - 90: 左倾（设备右倾，逆时针旋转90°）
 * - -90: 右倾（设备左倾，顺时针旋转90°）
 * - 180: 倒竖屏
 */

/**
 * 旋转图像（通过Canvas）
 * @param base64Image - Base64编码的图像
 * @param rotation - 旋转角度作为EXIF意思（0, 90, -90, 180）
 * @returns 旋转后的Base64图像
 */
export async function rotateImage(base64Image: string, rotation: number = 0): Promise<string> {
  // 如果旋转角度为0或没有提供，直接返回原图
  if (!rotation || rotation === 0) {
    return base64Image;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.warn('⚠️ [rotateImage] Canvas context 获取失败，返回原图');
          resolve(base64Image);
          return;
        }

        // 规范化旋转角度（转换为度数）
        let degrees = rotation;
        if (degrees === -90) degrees = 270; // 右倾 -> 270°

        // 设置canvas尺寸
        if (degrees === 90 || degrees === 270) {
          // 横屏：宽高互换
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          // 竖屏或倒竖屏：保持原尺寸
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // 应用旋转变换
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 导出为Base64
        const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        const pureBase64 = rotatedBase64.split(',')[1] || rotatedBase64;
        
        console.log(`🔄 [rotateImage] 图像已旋转: ${rotation}° (${img.width}x${img.height} → ${canvas.width}x${canvas.height})`);
        resolve(pureBase64);
      };

      img.onerror = () => {
        console.error('❌ [rotateImage] 图像加载失败，返回原图');
        resolve(base64Image);
      };

      // 加载图像
      img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
      console.error('❌ [rotateImage] 异常:', error);
      resolve(base64Image);
    }
  });
}

/**
 * 获取CSS旋转样式（用于UI显示）
 * @param rotation - 旋转角度
 * @param scale - 缩放因子（用于适应横屏时的UI缩小）
 * @returns CSS transform样式对象
 */
export function getRotationStyle(rotation: number = 0, scale: number = 1): React.CSSProperties {
  if (!rotation || rotation === 0) {
    return {
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      transition: 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
    };
  }

  return {
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'center',
    transition: 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)'
  };
}

/**
 * 根据旋转角度获取推荐的布局方向
 * @param rotation - 旋转角度
 * @returns 'portrait' | 'landscape'
 */
export function getLayoutOrientation(rotation: number = 0): 'portrait' | 'landscape' {
  return rotation === 0 ? 'portrait' : 'landscape';
}

/**
 * 获取旋转后的图像尺寸
 * @param width - 原始宽度
 * @param height - 原始高度
 * @param rotation - 旋转角度
 * @returns { width, height } 旋转后的尺寸
 */
export function getRotatedDimensions(
  width: number,
  height: number,
  rotation: number = 0
): { width: number; height: number } {
  // 90° 或 -90° (270°) 旋转会交换宽高
  if (rotation === 90 || rotation === -90) {
    return { width: height, height: width };
  }

  // 0° 或 180° 旋转不改变宽高
  return { width, height };
}

/**
 * 判断是否需要旋转
 * @param rotation - 旋转角度
 * @returns boolean
 */
export function shouldRotate(rotation: number | undefined): boolean {
  return !!rotation && rotation !== 0;
}
