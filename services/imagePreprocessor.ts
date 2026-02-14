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
  // 简化策略：直接返回原始图像
  // 复杂的预处理（对比度、锐化、二值化）在decodeFromCanvas中进行
  console.log('🔍 [preprocessImage] 直接返回原始图像（预处理在Canvas中进行）');
  return base64Image;
}

/**
 * 应用锐化滤镜
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

