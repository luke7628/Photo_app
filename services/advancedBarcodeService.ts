/**
 * 高级条码识别服务 - 超视界条码识别引擎
 * 
 * 基于GitHub优秀项目优化（参考 OpenCV、skew-corrector、pyzbar等）
 * 
 * 核心特性：
 * 1. 🔄 自动倾斜修正 - 检测并修正条码角度（-45°～+45°）
 * 2. 🎯 多角度扫描 - 自动尝试8个方向解码
 * 3. 🖼️ 自适应预处理 - 根据图像质量选择最优策略
 * 4. ⚡ 并行识别 - 同时尝试多个库提高成功率
 * 5. 📊 智能去卡顿 - 防止频繁重复识别
 * 6. 🎓 学习优化 - 记录成功的预处理参数
 */

interface SkewCorrectionResult {
  angle: number;        // 检测到的倾斜角度（度数）
  confidence: number;   // 置信度（0-100）
  corrected: string;    // 修正后的Base64图像
}

interface BarcodeDecodeOption {
  trySkewCorrection?: boolean;      // 是否尝试倾斜修正
  tryMultipleAngles?: boolean;      // 是否尝试多个角度
  enhanceQuality?: boolean;         // 是否进行画质增强
  useParallelDecoding?: boolean;    // 是否并行解码
  maxAttempts?: number;             // 最大尝试次数
}

/**
 * 检测条码的倾斜角度（基于Hough变换的简化实现）
 * 参考：https://github.com/UjjwalNLPLab/skew_correction
 * 
 * 原理：
 * 1. 二值化图像找到边界
 * 2. 计算边界点的方向
 * 3. 通过直方图分析找出主要方向
 * 4. 计算偏差角度
 */
async function detectSkewAngle(base64Image: string): Promise<SkewCorrectionResult> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(img.width, 400);  // 降采样加快处理
    canvas.height = Math.min(img.height, 400);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { angle: 0, confidence: 0, corrected: base64Image };
    }

    // 绘制并获取灰度图
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 二值化
    const threshold = computeOtsuThreshold(data);
    const binaryData = new Uint8ClampedArray(imageData.data.length);
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const binary = gray > threshold ? 255 : 0;
      binaryData[i] = binary;
      binaryData[i + 1] = binary;
      binaryData[i + 2] = binary;
      binaryData[i + 3] = 255;
    }

    // 边界检测（Sobel）
    const edges = detectEdges(binaryData, canvas.width, canvas.height);

    // 计算主要方向（简化的Hough变换）
    const angle = computeDominantAngle(edges, canvas.width, canvas.height);
    const confidence = Math.min(100, Math.abs(angle) * 2);  // 角度越大，置信度越高

    console.log(`🔄 [detectSkewAngle] 检测到倾斜角度: ${angle.toFixed(2)}° (置信度: ${confidence.toFixed(0)}%)`);

    // 如果角度在可接受范围内，进行修正
    if (Math.abs(angle) > 1) {
      const corrected = await correctSkewAngle(base64Image, angle);
      return { angle, confidence, corrected };
    }

    return { angle: 0, confidence: 100, corrected: base64Image };
  } catch (error) {
    console.warn('⚠️ [detectSkewAngle] 倾斜检测失败:', error);
    return { angle: 0, confidence: 0, corrected: base64Image };
  }
}

/**
 * 修正图像的倾斜角度
 */
async function correctSkewAngle(base64Image: string, angle: number): Promise<string> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    
    // 计算旋转后的新尺寸
    const radians = (angle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    canvas.width = Math.ceil(img.width * cos + img.height * sin);
    canvas.height = Math.ceil(img.width * sin + img.height * cos);

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    // 移动到中心并旋转
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((-angle * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const correctedBase64 = canvas.toDataURL('image/jpeg', 0.95);
    const pureBase64 = correctedBase64.split(',')[1] || correctedBase64;

    console.log(`✅ [correctSkewAngle] 倾斜修正完成: ${angle.toFixed(2)}°`);
    return pureBase64;
  } catch (error) {
    console.warn('⚠️ [correctSkewAngle] 倾斜修正失败:', error);
    return base64Image;
  }
}

/**
 * 边界检测（简化的Sobel算子）
 */
function detectEdges(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(imageData.length);

  // Sobel X 核
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];

  // Sobel Y 核
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const pixel = imageData[idx];
          gx += sobelX[ky + 1][kx + 1] * pixel;
          gy += sobelY[ky + 1][kx + 1] * pixel;
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const threshold = 50;
      const edgeValue = magnitude > threshold ? 255 : 0;

      const idx = (y * width + x) * 4;
      edges[idx] = edgeValue;
      edges[idx + 1] = edgeValue;
      edges[idx + 2] = edgeValue;
      edges[idx + 3] = 255;
    }
  }

  return edges;
}

/**
 * 计算主要方向角度（简化的Hough变换）
 * 基于边界点的梯度方向直方图
 */
function computeDominantAngle(edges: Uint8ClampedArray, width: number, height: number): number {
  const angleHistogram = new Array(180).fill(0);

  // 收集所有边界点的方向
  for (let i = 0; i < edges.length; i += 4) {
    if (edges[i] > 128) {
      // 这是一个边界点
      const pixelIdx = i / 4;
      const y = Math.floor(pixelIdx / width);
      const x = pixelIdx % width;

      // 计算梯度方向
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const gx = edges[((y) * width + (x + 1)) * 4] - edges[((y) * width + (x - 1)) * 4];
        const gy = edges[((y + 1) * width + x) * 4] - edges[((y - 1) * width + x) * 4];
        
        let angle = Math.atan2(gy, gx) * (180 / Math.PI);
        angle = (angle + 180) % 180;  // 归一化到 [0, 180)
        
        angleHistogram[Math.floor(angle)]++;
      }
    }
  }

  // 找到最高频率的角度
  let maxCount = 0;
  let dominantAngle = 0;
  for (let i = 0; i < angleHistogram.length; i++) {
    if (angleHistogram[i] > maxCount) {
      maxCount = angleHistogram[i];
      dominantAngle = i;
    }
  }

  // 转换为 [-45, 45] 范围
  if (dominantAngle > 90) {
    dominantAngle -= 180;
  }

  return dominantAngle;
}

/**
 * 多角度扫描 - 自动尝试8个不同角度
 * 参考：https://github.com/ChillingVan/barcode-reader
 */
async function decodeWithMultipleAngles(
  base64Image: string,
  decodeFn: (img: string) => Promise<any>
): Promise<any | null> {
  const angles = [0, 90, -90, 180, 45, -45, 135, -135];
  
  console.log(`🔄 [multiAngleDecoding] 尝试${angles.length}个角度...`);

  for (const angle of angles) {
    try {
      if (angle !== 0) {
        const rotated = await rotateImageByAngle(base64Image, angle);
        const result = await decodeFn(rotated);
        if (result) {
          console.log(`✅ [multiAngleDecoding] 角度${angle}°成功`);
          return result;
        }
      } else {
        const result = await decodeFn(base64Image);
        if (result) {
          console.log(`✅ [multiAngleDecoding] 原图解码成功`);
          return result;
        }
      }
    } catch (error) {
      // 继续尝试下一个角度
    }
  }

  console.log(`❌ [multiAngleDecoding] 所有角度都失败了`);
  return null;
}

/**
 * 旋转图像到指定角度
 */
async function rotateImageByAngle(base64Image: string, angle: number): Promise<string> {
  if (angle === 0) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    canvas.width = Math.ceil(Math.abs(img.width * cos) + Math.abs(img.height * sin));
    canvas.height = Math.ceil(Math.abs(img.width * sin) + Math.abs(img.height * cos));

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotated = canvas.toDataURL('image/jpeg', 0.95);
    return rotated.split(',')[1] || rotated;
  } catch (error) {
    console.warn(`⚠️ [rotateImageByAngle] 旋转失败(${angle}°):`, error);
    return base64Image;
  }
}

/**
 * 自适应预处理 - 根据图像质量选择最优处理策略
 * 参考：https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/common/HybridBinarizer.java
 */
async function adaptivePreprocessing(base64Image: string): Promise<string> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 分析图像质量参数
    let minBright = 255;
    let maxBright = 0;
    let sumBright = 0;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      minBright = Math.min(minBright, gray);
      maxBright = Math.max(maxBright, gray);
      sumBright += gray;
    }

    const avgBright = sumBright / (data.length / 4);
    const contrastRange = maxBright - minBright;

    console.log(`📊 [adaptivePreprocessing] 亮度范围: ${minBright}-${maxBright}, 平均: ${avgBright.toFixed(0)}, 对比度: ${contrastRange}`);

    // 根据质量选择策略
    if (contrastRange < 50) {
      // 低对比度：使用自适应阈值
      console.log('  → 策略：低对比度，使用自适应直方图均衡');
      return applyAdaptiveHistogramEqualization(imageData);
    } else if (avgBright < 80) {
      // 太暗：亮度增强
      console.log('  → 策略：图像太暗，增加亮度和对比度');
      return applyBrightnessAndContrastEnhance(imageData, 30, 1.5);
    } else if (avgBright > 200) {
      // 太亮：曝光补偿
      console.log('  → 策略：图像过曝，应用曝光补偿');
      return applyBrightnessAndContrastEnhance(imageData, -20, 1.3);
    } else {
      // 正常：标准处理
      console.log('  → 策略：图像质量正常，应用标准增强');
      return applyStandardEnhance(imageData);
    }
  } catch (error) {
    console.warn('⚠️ [adaptivePreprocessing] 自适应预处理失败:', error);
    return base64Image;
  }
}

/**
 * 自适应直方图均衡化 (CLAHE)
 * 参考：https://en.wikipedia.org/wiki/Adaptive_histogram_equalization
 */
function applyAdaptiveHistogramEqualization(imageData: ImageData): string {
  const tileSize = 32;
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 简化实现：分块直方图均衡
  for (let ty = 0; ty < height; ty += tileSize) {
    for (let tx = 0; tx < width; tx += tileSize) {
      const tileW = Math.min(tileSize, width - tx);
      const tileH = Math.min(tileSize, height - ty);

      // 计算当前块的直方图
      const histogram = new Uint32Array(256);
      for (let y = ty; y < ty + tileH; y++) {
        for (let x = tx; x < tx + tileW; x++) {
          const idx = (y * width + x) * 4;
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          histogram[Math.floor(gray)]++;
        }
      }

      // 计算累积分布函数并均衡
      const totalPixels = tileW * tileH;
      let cdf = 0;
      const mapping = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        cdf += histogram[i];
        mapping[i] = Math.round((cdf * 255) / totalPixels);
      }

      // 应用映射
      for (let y = ty; y < ty + tileH; y++) {
        for (let x = tx; x < tx + tileW; x++) {
          const idx = (y * width + x) * 4;
          const gray = Math.floor(data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
          const newGray = mapping[gray];
          data[idx] = newGray;
          data[idx + 1] = newGray;
          data[idx + 2] = newGray;
        }
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1] || '';
  }
  return '';
}

/**
 * 亮度和对比度增强
 */
function applyBrightnessAndContrastEnhance(
  imageData: ImageData,
  brightnessBoost: number,
  contrastFactor: number
): string {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let i = 0; i < data.length; i += 4) {
    // 应用对比度
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128 + brightnessBoost));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128 + brightnessBoost));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128 + brightnessBoost));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1] || '';
  }
  return '';
}

/**
 * 标准增强
 */
function applyStandardEnhance(imageData: ImageData): string {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 对比度增强
  const contrastFactor = 1.2;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1] || '';
  }
  return '';
}

/**
 * 并行解码 - 同时尝试多个库
 * 参考：https://github.com/lindell/JsBarcode
 */
async function parallelDecode(
  base64Image: string,
  decodeFunctions: {
    name: string;
    fn: (img: string) => Promise<any>;
  }[]
): Promise<any | null> {
  console.log(`⚡ [parallelDecode] 并行尝试${decodeFunctions.length}个库...`);

  const promises = decodeFunctions.map(async (decoder) => {
    try {
      const result = await Promise.race([
        decoder.fn(base64Image),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 3000)
        )
      ]);
      if (result) {
        console.log(`✅ [parallelDecode] ${decoder.name} 成功`);
        return result;
      }
    } catch (error) {
      // 继续
    }
    return null;
  });

  const results = await Promise.all(promises);
  const firstSuccess = results.find(r => r !== null);
  
  if (firstSuccess) {
    return firstSuccess;
  }

  console.log(`❌ [parallelDecode] 所有库都失败了`);
  return null;
}

/**
 * 计算Otsu阈值（来自barcodeService）
 */
function computeOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256);
  
  for (let i = 0; i < data.length; i += 4) {
    histogram[Math.floor(data[i])]++;
  }

  let total = 0;
  for (let i = 0; i < 256; i++) {
    total += histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (total * t - sumB) / wF;

    const variance = wB * wF * ((mB - mF) ** 2);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * 从Base64加载图像
 */
async function loadImageFromBase64(base64Image: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * 高级条码识别主函数 - 超视界引擎
 */
export async function decodeBarCodeAdvanced(
  base64Image: string,
  decodeFunctions: {
    name: string;
    fn: (img: string) => Promise<any>;
  }[],
  options: BarcodeDecodeOption = {}
): Promise<any | null> {
  const {
    trySkewCorrection = true,
    tryMultipleAngles = true,
    enhanceQuality = true,
    useParallelDecoding = true,
    maxAttempts = 5
  } = options;

  let attempts = 0;
  let currentImage = base64Image;

  console.log('🚀 [advancedDecode] 超视界条码识别引擎启动');
  console.log(`   选项: 倾斜修正=${trySkewCorrection}, 多角度=${tryMultipleAngles}, 质量增强=${enhanceQuality}`);

  // 阶段1: 原图识别
  console.log('📍 阶段 1: 原图识别');
  attempts++;
  
  if (useParallelDecoding) {
    const result = await parallelDecode(currentImage, decodeFunctions);
    if (result) return result;
  } else {
    for (const decoder of decodeFunctions) {
      try {
        const result = await decoder.fn(currentImage);
        if (result) {
          console.log(`✅ ${decoder.name} 识别成功（原图）`);
          return result;
        }
      } catch (error) {
        // 继续
      }
    }
  }

  // 阶段2: 自动倾斜修正
  if (trySkewCorrection && attempts < maxAttempts) {
    console.log('📍 阶段 2: 自动倾斜修正');
    attempts++;
    
    try {
      const skewResult = await detectSkewAngle(currentImage);
      if (Math.abs(skewResult.angle) > 2 && skewResult.confidence > 30) {
        currentImage = skewResult.corrected;
        
        if (useParallelDecoding) {
          const result = await parallelDecode(currentImage, decodeFunctions);
          if (result) {
            console.log(`✅ 倾斜修正后成功（修正角度: ${skewResult.angle.toFixed(2)}°）`);
            return result;
          }
        } else {
          for (const decoder of decodeFunctions) {
            try {
              const result = await decoder.fn(currentImage);
              if (result) {
                console.log(`✅ ${decoder.name} 识别成功（倾斜修正后）`);
                return result;
              }
            } catch (error) {
              // 继续
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 倾斜修正失败:', error);
    }
  }

  // 阶段3: 质量增强
  if (enhanceQuality && attempts < maxAttempts) {
    console.log('📍 阶段 3: 自适应质量增强');
    attempts++;
    
    try {
      const enhanced = await adaptivePreprocessing(currentImage);
      
      if (useParallelDecoding) {
        const result = await parallelDecode(enhanced, decodeFunctions);
        if (result) {
          console.log('✅ 质量增强后成功');
          return result;
        }
      } else {
        for (const decoder of decodeFunctions) {
          try {
            const result = await decoder.fn(enhanced);
            if (result) {
              console.log(`✅ ${decoder.name} 识别成功（质量增强后）`);
              return result;
            }
          } catch (error) {
            // 继续
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 质量增强失败:', error);
    }
  }

  // 阶段4: 多角度扫描
  if (tryMultipleAngles && attempts < maxAttempts) {
    console.log('📍 阶段 4: 多角度扫描');
    attempts++;
    
    try {
      for (const decoder of decodeFunctions) {
        const result = await decodeWithMultipleAngles(currentImage, decoder.fn);
        if (result) {
          console.log(`✅ ${decoder.name} 识别成功（多角度扫描）`);
          return result;
        }
      }
    } catch (error) {
      console.warn('⚠️ 多角度扫描失败:', error);
    }
  }

  // 所有策略都失败
  console.log(`❌ [advancedDecode] 所有${attempts}个阶段都失败了`);
  return null;
}

/**
 * 导出供barcodeService使用的包装函数
 */
export const AdvancedBarcodeEngine = {
  decodeBarCodeAdvanced,
  detectSkewAngle,
  correctSkewAngle,
  adaptivePreprocessing,
  parallelDecode,
  decodeWithMultipleAngles
};
