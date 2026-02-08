/**
 * 图像预处理工具 - 优化 OCR 识别效果
 * 
 * 主要功能：
 * - 灰度化
 * - 对比度增强
 * - 锐化
 * - 降噪
 */

/**
 * 对图像进行预处理以提高 OCR 准确率
 * @param base64Image - base64 编码的图像
 * @returns 处理后的 base64 图像
 */
export async function preprocessImage(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // 创建 canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
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
        
        // 1. 灰度化 + 对比度增强
        for (let i = 0; i < data.length; i += 4) {
          // 灰度化
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // 对比度增强（简单的线性变换）
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
          
          data[i] = enhanced;     // R
          data[i + 1] = enhanced; // G
          data[i + 2] = enhanced; // B
          // data[i + 3] 保持不变（alpha）
        }
        
        // 2. 锐化（简单的锐化滤镜）
        const sharpened = applySharpen(imageData);
        ctx.putImageData(sharpened, 0, 0);
        
        // 转换为 base64
        const processedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        resolve(processedBase64.split(',')[1]);
      } catch (error) {
        console.error('图像预处理失败:', error);
        resolve(base64Image); // 失败时返回原图
      }
    };
    
    img.onerror = () => {
      console.error('图像加载失败');
      resolve(base64Image); // 失败时返回原图
    };
    
    img.src = `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * 应用锐化滤镜
 */
function applySharpen(imageData: ImageData): ImageData {
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
