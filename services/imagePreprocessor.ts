/**
 * 图像预处理工具 - 优化条形码和QR码识别效果
 * 
 * 主要功能：
 * - 灰度化
 * - 对比度增强
 * - 锐化
 * - 降噪
 */

/**
 * 对图像进行预处理以提高条形码/QR码识别准确率
 * @param base64Image - base64 编码的图像
 * @returns 处理后的 base64 图像（强处理）
 */
export async function preprocessImage(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('🔍 [preprocessImage] 开始强预处理');
        // 创建 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.log('🔍 [preprocessImage] canvas 失败，返回原图');
          resolve(base64Image); // 如果失败，返回原图
          return;
        }
        
        // 设置画布大小（保持原始尺寸）
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        console.log('🔍 [preprocessImage] 开始强对比度处理...');
        
        // 1. 灰度化 + 强对比度增强
        for (let i = 0; i < data.length; i += 4) {
          // 灰度化
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // 强对比度增强（3.0 倍而非 1.5）
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 3.0 + 128));
          
          data[i] = enhanced;     // R
          data[i + 1] = enhanced; // G
          data[i + 2] = enhanced; // B
          // data[i + 3] 保持不变（alpha）
        }
        
        console.log('🔍 [preprocessImage] 应用强锐化滤镜...');
        
        // 2. 锐化（强锐化滤镜）
        const sharpened = applyStrongSharpen(imageData);
        ctx.putImageData(sharpened, 0, 0);
        
        console.log('🔍 [preprocessImage] 应用自适应二值化...');
        
        // 3. 自适应二值化
        const binarized = applyAdaptiveBinarization(ctx.getImageData(0, 0, canvas.width, canvas.height));
        ctx.putImageData(binarized, 0, 0);
        
        // 转换为 base64
        const processedBase64 = canvas.toDataURL('image/jpeg', 0.98);
        const result = processedBase64.split(',')[1];
        console.log('🔍 [preprocessImage] 返回处理后图像，大小:', result.length);
        resolve(result);
      } catch (error) {
        console.error('🔍 [preprocessImage] 预处理失败:', error);
        resolve(base64Image); // 失败时返回原图
      }
    };
    
    img.onerror = () => {
      console.error('🔍 [preprocessImage] 图像加载失败');
      resolve(base64Image); // 失败时返回原图
    };
    
    img.src = `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * 应用强锐化滤镜
 */
function applyStrongSharpen(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  // 强锐化核
  const kernel = [
    -1, -1, -1,
    -1, 10, -1,
    -1, -1, -1
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const ki = (ky + 1) * 3 + (kx + 1);
          const weight = kernel[ki];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      output.data[outIdx] = Math.min(255, Math.max(0, r));
      output.data[outIdx + 1] = Math.min(255, Math.max(0, g));
      output.data[outIdx + 2] = Math.min(255, Math.max(0, b));
      output.data[outIdx + 3] = 255;
    }
  }
  
  return output;
}

/**
 * 应用自适应二值化（局部阈值）
 */
function applyAdaptiveBinarization(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  const windowSize = 35;
  const halfWindow = Math.floor(windowSize / 2);
  const threshold = -15; // 自适应阈值的偏移
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 计算局部平均
      let sum = 0;
      let count = 0;
      
      for (let wy = Math.max(0, y - halfWindow); wy < Math.min(height, y + halfWindow); wy++) {
        for (let wx = Math.max(0, x - halfWindow); wx < Math.min(width, x + halfWindow); wx++) {
          const idx = (wy * width + wx) * 4;
          sum += data[idx]; // R 分量（已经是灰度值）
          count++;
        }
      }
      
      const localMean = sum / count;
      const currentIdx = (y * width + x) * 4;
      const currentGray = data[currentIdx];
      
      // 二值化
      const value = currentGray < (localMean + threshold) ? 0 : 255;
      
      const outIdx = (y * width + x) * 4;
      output.data[outIdx] = value;
      output.data[outIdx + 1] = value;
      output.data[outIdx + 2] = value;
      output.data[outIdx + 3] = 255;
    }
  }
  
  return output;
}

/**
 * 应用锐化滤镜
 */
function applyStrongSharpen(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  // 锐化核
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const ki = (ky + 1) * 3 + (kx + 1);
          const weight = kernel[ki];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      output.data[outIdx] = Math.min(255, Math.max(0, r));
      output.data[outIdx + 1] = Math.min(255, Math.max(0, g));
      output.data[outIdx + 2] = Math.min(255, Math.max(0, b));
      output.data[outIdx + 3] = 255;
    }
  }
  
  return output;
}
