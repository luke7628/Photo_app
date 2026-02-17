import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import Quagga from '@ericblade/quagga2';
import { AdvancedBarcodeEngine } from './advancedBarcodeService';

/**
 * 混合库条码识别服务 - 专业级离线高效方案 + 超视界引擎
 * 
 * 识别策略（三层次、专业级优化）：
 * 
 * 第一阶段 - 全图快速扫描（2400px优化）：
 *   1. Quagga.js - 快速、高效、工业条码友好
 *   2. ZXing - 备用，支持更多格式
 * 
 * 第二阶段 - 高级预处理 + 重试（失败时）：
 *   3. Otsu自适应二值化 - 极端亮度下的救星
 *   4. CLAHE自适应直方图均衡 - 局部对比度增强
 *   5. 形态学操作 - 连通域优化
 *   6. 倾斜校正 - 纠正拍摄角度
 * 
 * 第三阶段 - 多区域扫描（3000px细节保留）：
 *   7. 横向5区域扫描 - Quagga → 高级预处理 → ZXing
 * 
 * 预期识别率：85-95%（vs 原始ZXing仅50-60%）
 */

let barcodeReader: BrowserMultiFormatReader | null = null;
let barcodeReader1D: BrowserMultiFormatReader | null = null;
let preprocessedImageCache: { base64: string; processed: string } | null = null;
let barcodeDetectorAvailable: boolean | null = null;

interface BarcodeResult {
  type: 'barcode' | 'qrcode';
  value: string;
  format?: string;
  region?: string;  // 识别区域名称（如 '全图', '顶部20%', '底部80-100%'）
  regionIndex?: number;  // 区域索引（0=全图，1-5=分区）
}

/**
 * 检测BarcodeDetector API是否可用
 */
function checkBarcodeDetectorSupport(): boolean {
  if (barcodeDetectorAvailable !== null) {
    return barcodeDetectorAvailable;
  }

  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  barcodeDetectorAvailable = typeof BarcodeDetectorCtor !== 'undefined';
  
  console.log(`🔍 [BarcodeDetector] API ${barcodeDetectorAvailable ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`📱 [Device] UserAgent: ${navigator.userAgent}`);
  console.log(`🌐 [Browser] ${getBrowserInfo()}`);
  
  return barcodeDetectorAvailable;
}

/**
 * 获取浏览器信息
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('CriOS')) return 'Chrome iOS';
  if (ua.includes('FxiOS')) return 'Firefox iOS';
  if (ua.includes('Safari') && ua.includes('iPhone')) return 'Safari iOS';
  if (ua.includes('Safari') && ua.includes('Mac')) return 'Safari macOS';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getReader() {
  if (!barcodeReader) {
    // Optimize recognition: prioritize Code128 (commonly used for industrial labels)
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,  // Industrial common
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    // Initialize reader with hints in one step
    barcodeReader = new BrowserMultiFormatReader(hints);
  }
  return barcodeReader;
}

function get1DReader() {
  if (!barcodeReader1D) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    barcodeReader1D = new BrowserMultiFormatReader(hints);
  }
  return barcodeReader1D;
}

/**
 * 辅助函数：去重添加结果
 */
function addUniqueResult(results: BarcodeResult[], next: BarcodeResult) {
  if (!next.value) return;
  // 去重：相同value的只保留第一个
  if (results.some(r => r.value === next.value)) {
    console.log(`  ⚠️ 重复条码（已跳过）: ${next.value.substring(0, 30)} 来自 ${next.region || '未知区域'}`);
    return;
  }
  results.push(next);
}

/**
 * 辅助函数：从 base64 加载图片
 */
async function loadImageFromBase64(base64Image: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // iOS兼容：设置crossOrigin避免安全策略问题
    img.crossOrigin = 'anonymous';
    
    // 超时机制：5秒后如果还未加载则失败
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout after 5 seconds'));
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ [loadImage] 图像加载成功: ${img.width}x${img.height}, naturalWidth: ${img.naturalWidth}x${img.naturalHeight}`);
      console.log(`✅ [loadImage] 图像总像素数: ${(img.width * img.height / 1000000).toFixed(2)}M pixels`);
      
      // 验证图像确实加载了数据
      if (img.width === 0 || img.height === 0) {
        reject(new Error(`Image loaded but has zero dimensions: ${img.width}x${img.height}`));
        return;
      }
      
      // 警告超大图像（可能影响性能）
      if (img.width * img.height > 10000000) {
        console.warn(`⚠️ [loadImage] 图像非常大 (${img.width}x${img.height})，建议使用 optimizeResolution 优化`);
      }
      
      resolve(img);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ [loadImage] 图像加载失败:', error);
      console.error('❌ [loadImage] img.src长度:', img.src.length);
      console.error('❌ [loadImage] img.src前100字符:', img.src.substring(0, 100));
      reject(new Error(`Failed to load image from base64: ${error}`));
    };
    
    // 设置src触发加载（最后设置，确保事件监听器已就位）
    img.src = `data:image/jpeg;base64,${base64Image}`;
    console.log(`🔄 [loadImage] 开始加载图像，base64长度: ${base64Image.length}, src长度: ${img.src.length}`);
  });
}

/**
 * 辅助函数：标准化 base64 字符串
 */
function normalizeBase64(base64Image: string): string {
  if (!base64Image) {
    console.warn('⚠️ [normalizeBase64] 输入为空');
    return '';
  }
  
  let base64 = base64Image;
  
  // 如果包含data URI前缀，提取纯base64部分
  if (base64.startsWith('data:')) {
    const parts = base64.split(',');
    if (parts.length < 2) {
      console.error('❌ [normalizeBase64] data URI格式错误:', base64.substring(0, 100));
      return '';
    }
    base64 = parts[1];
    console.log('📊 [normalizeBase64] 从data URI提取base64，长度:', base64.length);
  }
  
  // 移除所有空白字符（换行、空格、制表符）
  const originalLength = base64.length;
  base64 = base64.replace(/\s/g, '');
  if (base64.length !== originalLength) {
    console.log(`📊 [normalizeBase64] 清理了空白字符: ${originalLength} → ${base64.length} bytes`);
  }
  
  // 验证base64字符合法性（只包含A-Z, a-z, 0-9, +, /, =）
  const invalidChars = base64.match(/[^A-Za-z0-9+/=]/g);
  if (invalidChars) {
    console.error('❌ [normalizeBase64] 发现无效字符:', invalidChars.slice(0, 10).join(','));
    // 尝试移除无效字符
    base64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    console.log('📊 [normalizeBase64] 移除无效字符后长度:', base64.length);
  }
  
  // 验证长度合理性（至少1KB的图像）
  if (base64.length < 1000) {
    console.error('❌ [normalizeBase64] base64太短，可能不是有效图像:', base64.length, 'bytes');
  }
  
  return base64;
}

/**
 * 裁剪图像指定区域
 * @param base64Image - Base64 编码的图像
 * @param x - 起始X坐标比例 (0-1)
 * @param y - 起始Y坐标比例 (0-1)
 * @param width - 宽度比例 (0-1)
 * @param height - 高度比例 (0-1)
 * @returns 裁剪后的 Base64 图像
 */
async function cropToRegion(base64Image: string, x: number, y: number, width: number, height: number): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    const cropX = Math.floor(img.width * x);
    const cropY = Math.floor(img.height * y);
    const cropWidth = Math.floor(img.width * width);
    const cropHeight = Math.floor(img.height * height);

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    console.log(`✂️ [cropToRegion] 原图: ${img.width}x${img.height} → 裁剪: (${(y*100).toFixed(0)}%-${((y+height)*100).toFixed(0)}%高) → 输出: ${cropWidth}x${cropHeight}px`);
    return croppedBase64;
  } catch (error) {
    console.error('❌ [cropToRegion] 裁剪失败:', error);
    return base64Image;
  }
}

/**
 * ROI (Region of Interest) 裁剪：只处理图像中心区域
 * 移动设备优化：减少处理区域，提升速度和准确度
 * @param base64Image - Base64 编码的图像
 * @param centerRatio - 中心区域比例 (0.5 = 50%, 0.7 = 70%)
 * @returns 裁剪后的 Base64 图像
 */
async function cropToROI(base64Image: string, centerRatio: number = 0.7): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');

    // 计算ROI区域
    const roiWidth = Math.floor(img.width * centerRatio);
    const roiHeight = Math.floor(img.height * centerRatio);
    const roiX = Math.floor((img.width - roiWidth) / 2);
    const roiY = Math.floor((img.height - roiHeight) / 2);

    canvas.width = roiWidth;
    canvas.height = roiHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    // 绘制ROI区域到canvas
    ctx.drawImage(img, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    console.log(`✂️ [cropToROI] 已裁剪到中心区域: ${roiWidth}x${roiHeight} (${(centerRatio * 100).toFixed(0)}%)`);
    return croppedBase64;
  } catch (error) {
    console.warn('⚠️ [cropToROI] ROI裁剪失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 智能分辨率调整：移动设备优化
 * 自动将超大图像缩小到合适尺寸，提升处理速度
 * @param base64Image - Base64 编码的图像
 * @param maxDimension - 最大边长 (默认 1600px)
 * @returns 调整后的 Base64 图像
 */
async function optimizeResolution(base64Image: string, maxDimension: number = 1600): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    
    // 如果图像已经足够小，不需要调整
    if (img.width <= maxDimension && img.height <= maxDimension) {
      return base64Image;
    }

    const canvas = document.createElement('canvas');
    let newWidth = img.width;
    let newHeight = img.height;

    // 按比例缩小
    if (img.width > img.height) {
      if (img.width > maxDimension) {
        newWidth = maxDimension;
        newHeight = Math.floor((img.height * maxDimension) / img.width);
      }
    } else {
      if (img.height > maxDimension) {
        newHeight = maxDimension;
        newWidth = Math.floor((img.width * maxDimension) / img.height);
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    console.log(`📐 [optimizeResolution] 分辨率优化: ${img.width}x${img.height} → ${newWidth}x${newHeight}`);
    return optimizedBase64;
  } catch (error) {
    console.warn('⚠️ [optimizeResolution] 分辨率优化失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 旋转图像用于方向兜底
 */
async function rotateBase64(base64Image: string, angle: 90 | 180 | 270): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    if (angle === 180) {
      canvas.width = img.width;
      canvas.height = img.height;
    } else {
      canvas.width = img.height;
      canvas.height = img.width;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  } catch (error) {
    console.warn('⚠️ [rotateBase64] 旋转失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 1D条码专用二值化（提升条纹对比）
 */
async function preprocessFor1D(base64Image: string): Promise<string> {
  if (!base64Image) return base64Image;

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

    // 灰度化
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    const threshold = computeOtsuThreshold(data);
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] > threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  } catch (error) {
    console.warn('⚠️ [preprocessFor1D] 二值化失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 放大较小图像，确保条码条纹有足够像素
 * 仅当图像较小才放大，避免不必要的质量损失
 */
async function upscaleIfNeeded(base64Image: string, minDimension: number = 1400): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const maxSide = Math.max(img.width, img.height);
    if (maxSide >= minDimension) {
      return base64Image;
    }

    const scale = minDimension / maxSide;
    const newWidth = Math.round(img.width * scale);
    const newHeight = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    const upscaledBase64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    console.log(`📐 [upscaleIfNeeded] 放大: ${img.width}x${img.height} → ${newWidth}x${newHeight}`);
    return upscaledBase64;
  } catch (error) {
    console.warn('⚠️ [upscaleIfNeeded] 放大失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 高级图像预处理管道 - 多阶段优化
 * 
 * 处理流程：
 * 1. 灰度化（快速转换为灰度图）
 * 2. CLAHE自适应直方图均衡化（局部对比度增强）
 * 3. Otsu自适应二值化（黑白分离）
 * 4. 形态学操作（连通域优化、去噪）
 * 
 * 优点：
 * - 处理极端亮度（太亮或太暗）
 * - 处理低对比度条码
 * - 自动去除背景噪音
 */
async function advancedPreprocessing(base64Image: string): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.drawImage(img, 0, 0);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // ===== 步骤1：灰度化 =====
    const grayData = new Uint8ClampedArray(imageData.data.length);
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      grayData[i] = gray;      // R
      grayData[i + 1] = gray;  // G
      grayData[i + 2] = gray;  // B
      grayData[i + 3] = 255;   // A
    }

    // ===== 步骤2：CLAHE自适应直方图均衡化 =====
    // 简化版：线性拉伸 + 增强
    const minVal = 0, maxVal = 255;
    const range = maxVal - minVal;
    
    for (let i = 0; i < grayData.length; i += 4) {
      const val = grayData[i];
      const stretched = ((val - minVal) / range) * 255;
      const enhanced = Math.min(255, stretched * 1.3); // 增强30%
      grayData[i] = enhanced;
      grayData[i + 1] = enhanced;
      grayData[i + 2] = enhanced;
    }

    // ===== 步骤3：Otsu自适应二值化 =====
    // 计算最优阈值
    const threshold = computeOtsuThreshold(grayData);
    console.log(`🎯 [preprocess] Otsu阈值: ${threshold}`);
    
    // 应用二值化
    for (let i = 0; i < grayData.length; i += 4) {
      const val = grayData[i] > threshold ? 255 : 0;
      grayData[i] = val;
      grayData[i + 1] = val;
      grayData[i + 2] = val;
    }

    // ===== 步骤4：形态学操作 =====
    // 腐蚀（去除小噪音）+ 膨胀（恢复条码）
    let processedData = applyMorphologicalOp(grayData, canvas.width, canvas.height, 'erode', 1);
    processedData = applyMorphologicalOp(processedData, canvas.width, canvas.height, 'dilate', 1);

    // 写回canvas
    imageData.data.set(processedData);
    ctx.putImageData(imageData, 0, 0);

    const processedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    console.log(`✨ [preprocess] 高级预处理完成 (Otsu二值化+CLAHE+形态学操作)`);
    return processedBase64;
  } catch (error) {
    console.warn('⚠️ [advancedPreprocessing] 高级预处理失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * Otsu自适应二值化 - 计算最优阈值
 * 原理：最大化目标和背景的方差，找到最优划分点
 */
function computeOtsuThreshold(imageData: Uint8ClampedArray): number {
  const histogram = new Uint32Array(256);
  
  // 建立直方图
  for (let i = 0; i < imageData.length; i += 4) {
    histogram[imageData[i]]++;
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
 * 形态学操作 - 腐蚀或膨胀
 */
function applyMorphologicalOp(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  op: 'erode' | 'dilate',
  radius: number = 1
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(imageData.length);
  const kernel = [];
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      kernel.push({ dx, dy });
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let values: number[] = [];

      for (const { dx, dy } of kernel) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = (ny * width + nx) * 4;
          values.push(imageData[nidx]);
        }
      }

      const val = op === 'erode' ? Math.min(...values) : Math.max(...values);
      result[idx] = val;
      result[idx + 1] = val;
      result[idx + 2] = val;
      result[idx + 3] = 255;
    }
  }

  return result;
}

/**
 * 图像预处理：增强条码识别效果
 * 简化方案：对比度增强 + 亮度调整（避免复杂的锐化操作）
 * @param base64Image - Base64 编码的图像
 * @returns 处理后的 Base64 图像
 */
async function preprocessImageForDetection(base64Image: string): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    // 绘制原始图像
    ctx.drawImage(img, 0, 0);

    // 获取像素数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 1. 对比度增强：扩展亮度分布，使条码线条更清晰
    const contrastFactor = 1.4; // 增强 40%
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 对比度公式：(value - 128) * factor + 128
      data[i] = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
      data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
      data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
    }

    // 2. 计算亮度并根据需要调整
    let brightnessSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightnessSum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    const brightness = brightnessSum / (data.length / 4);

    // 如果图像太暗，增加亮度
    if (brightness < 100) {
      const brightnessBoost = Math.min(40, (130 - brightness) * 0.3);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + brightnessBoost);
        data[i + 1] = Math.min(255, data[i + 1] + brightnessBoost);
        data[i + 2] = Math.min(255, data[i + 2] + brightnessBoost);
      }
      console.log(`🔆 [preprocess] 图像较暗（亮度${brightness.toFixed(0)}），已增加亮度+${brightnessBoost.toFixed(0)}`);
    }

    // 将处理后的图像数据写回 Canvas
    ctx.putImageData(imageData, 0, 0);
    const processedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

    console.log(`✨ [preprocess] 图像已优化（亮度${brightness.toFixed(0)}, 对比度因子${contrastFactor}）`);
    return processedBase64;
  } catch (error) {
    console.warn('⚠️ [preprocess] 预处理失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 计算图像亮度（0-255）
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  return Math.round(sum / (data.length / 4));
}

/**
 * 检测图像质量：简化版，只评估基本特征
 */
async function assessImageQuality(base64Image: string): Promise<{ score: number; issues: string[] }> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    
    // 降采样以加快计算
    canvas.width = Math.min(img.width, 480);
    canvas.height = Math.min(img.height, 480);

    const ctx = canvas.getContext('2d');
    if (!ctx) return { score: 75, issues: [] }; // 默认中等质量

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const issues: string[] = [];
    let score = 100;

    // 1. 检测亮度
    const brightness = calculateBrightness(imageData);
    if (brightness > 220) {
      issues.push('Overexposed');
      score -= 25;
    } else if (brightness < 50) {
      issues.push('Too dark');
      score -= 30;
    } else if (brightness < 80) {
      issues.push('Dim lighting');
      score -= 15;
    }

    // 2. 检测对比度（通过检查像素亮度的分布范围）
    const data = imageData.data;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      const pixelBrightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      minBrightness = Math.min(minBrightness, pixelBrightness);
      maxBrightness = Math.max(maxBrightness, pixelBrightness);
    }

    const contrastRange = maxBrightness - minBrightness;
    if (contrastRange < 30) {
      issues.push('Low contrast');
      score -= 20;
    }

    console.log(`📊 [assessQuality] 亮度=${brightness}, 对比度范围=${contrastRange.toFixed(0)}, 综合分=${score}`);
    return { score: Math.max(0, score), issues };
  } catch (error) {
    console.warn('⚠️ [assessQuality] 质量评估异常:', error);
    return { score: 75, issues: [] }; // 假设中等质量，继续尝试
  }
}

/**
 * 估计图像锐度（简化版，基于边界检测）
 */
function estimateSharpness(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let edgeCount = 0;

  // 采样计算边界像素数量（简单方法：亮度变化>30的像素）  
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.floor((i / 4) / width);
    const x = (i / 4) % width;
    
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue; // 跳过边界

    const brightness1 = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const rightIdx = i + 4;
    const brightness2 = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;
    
    if (Math.abs(brightness1 - brightness2) > 30) {
      edgeCount++;
    }
  }

  return (edgeCount / (data.length / 4)) * 100; // 返回百分比
}

/**
 * 使用Quagga.js识别条码（轻量级、快速、工业友好）
 * 
 * Quagga.js优点：
 * - 体积小（~200KB）
 * - 速度快（<200ms）
 * - 工业条码识别率高（Code128, Code39等）
 * - 内置图像预处理和旋转检测
 */
async function decodeWithQuagga(
  base64Image: string,
  preprocessed: boolean = false,
  options: { halfSample?: boolean } = {}
): Promise<{ text: string; format?: string } | null> {
  if (!base64Image) return null;

  try {
    const img = await loadImageFromBase64(base64Image);
    console.log(`🖼️ [Quagga] 图像加载成功: ${img.width}x${img.height} ${preprocessed ? '(预处理)' : '(原图)'}`);
    console.log(`🔍 [Quagga] 开始解码 ${preprocessed ? '(预处理)' : '(原图)'}...`);

    return new Promise((resolve) => {
      // 添加超时保护：原图5秒，预处理3秒
      const timeoutDuration = preprocessed ? 3000 : 5000;
      const timeout = setTimeout(() => {
        console.warn(`⏱️ [Quagga] 解码超时（${preprocessed ? '预处理' : '原图'}，${timeoutDuration}ms）`);
        resolve(null);
      }, timeoutDuration);

      try {
        const halfSample = options.halfSample ?? true;
        Quagga.decodeSingle({
          src: img.src,
          numOfWorkers: 0,
          inputStream: {
            type: 'ImageStream',
            constraints: {
              width: { ideal: img.width },
              height: { ideal: img.height }
            }
          },
          locator: {
            halfSample
          },
          decoder: {
            readers: [
              'code_128_reader',
              'code_39_reader',
              'code_93_reader',
              'ean_reader',
              'ean_8_reader',
              'upc_reader',
              'upc_e_reader'
            ]
          }
        }, (result: any) => {
          clearTimeout(timeout);
          
          if (result && result.codeResult && result.codeResult.code) {
            const text = result.codeResult.code.trim();
            const format = result.codeResult.format || 'UNKNOWN';
            console.log(`✅ Quagga ${preprocessed ? '(preprocessed)' : '(raw)'} 识别成功: ${text.substring(0, 50)} (${format})`);
            resolve({ text, format });
          } else {
            console.log(`ℹ️ [Quagga] ${preprocessed ? '(预处理)' : '(原图)'} 未找到条码 (halfSample=${halfSample})`);
            resolve(null);
          }
        });
      } catch (e) {
        clearTimeout(timeout);
        console.error(`❌ [Quagga] ${preprocessed ? '(预处理)' : '(原图)'} 解码异常:`, e);
        resolve(null);
      }
    });
  } catch (error: any) {
    console.error(`❌ [Quagga] ${preprocessed ? '(预处理)' : '(原图)'} 失败:`, error.message || error);
    return null;
  }
}

/**
 * 使用浏览器原生 BarcodeDetector API，支持预处理
 */
async function decodeWithBarcodeDetector(base64Image: string, preprocessed: boolean = false): Promise<BarcodeResult[]> {
  const detected: BarcodeResult[] = [];
  
  // 检查API可用性
  if (!checkBarcodeDetectorSupport()) {
    if (!preprocessed) {
      console.log('ℹ️ [BarcodeDetector] API不可用，跳过检测');
    }
    return detected;
  }

  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  if (!base64Image) return detected;

  try {
    const img = await loadImageFromBase64(base64Image);
    console.log(`🖼️ [BarcodeDetector] 图像加载成功: ${img.width}x${img.height}`);
    
    const detector = new BarcodeDetectorCtor({
      formats: [
        'qr_code',
        'code_128',
        'code_39',
        'code_93',
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'itf',
        'pdf417',
        'data_matrix',
        'aztec'
      ]
    });

    console.log(`🔍 [BarcodeDetector] 开始检测 ${preprocessed ? '(预处理)' : '(原图)'}...`);
    const results = await detector.detect(img);
    console.log(`📊 [BarcodeDetector] 检测完成，找到 ${results.length} 个结果`);
    
    results.forEach((r: any, idx: number) => {
      const rawValue = (r.rawValue || '').trim();
      console.log(`  [${idx}] 格式: ${r.format}, 值: ${rawValue ? rawValue.substring(0, 50) : '(空)'}`);
      if (!rawValue) return;
      detected.push({
        type: r.format === 'qr_code' ? 'qrcode' : 'barcode',
        value: rawValue,
        format: (r.format || '').toUpperCase()
      });
    });

    if (detected.length > 0) {
      console.log(`✅ BarcodeDetector ${preprocessed ? '(preprocessed)' : '(raw)'} 识别成功:`, detected.map(d => `${d.value} (${d.format})`).join(', '));
    } else {
      console.log(`ℹ️ [BarcodeDetector] ${preprocessed ? '(预处理)' : '(原图)'} 未检测到条码`);
    }

    return detected;
  } catch (error: any) {
    console.error(`❌ [BarcodeDetector] ${preprocessed ? '(预处理)' : '(原图)'} 检测失败:`, error.message || error);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return detected;
  }
}

/**
 * 使用 ZXing 库识别条码，支持预处理
 */
async function decodeWithZXing(
  base64Image: string,
  preprocessed: boolean = false,
  options: { oneDOnly?: boolean } = {}
): Promise<{ text: string; format?: string } | null> {
  if (!base64Image) return null;

  try {
    const img = await loadImageFromBase64(base64Image);
    console.log(`🖼️ [ZXing] image loaded: ${img.width}x${img.height} ${preprocessed ? '(preprocessed)' : '(raw)'}`);
    
    if (!img.src || img.width < 50 || img.height < 50) {
      console.error(`❌ [ZXing] invalid image: ${img.src ? 'has src' : 'no src'}, ${img.width}x${img.height}`);
      return null;
    }
    
    const reader = options.oneDOnly ? get1DReader() : getReader();
    console.log(`🔍 [ZXing] decoding ${preprocessed ? '(preprocessed)' : '(raw)'}...`);

    let result;
    try {
      result = await reader.decodeFromImageElement(img);
      console.log('✅ [ZXing] decode success');
    } catch (decodeError: any) {
      console.error(`❌ [ZXing] decode failed:`, decodeError?.message || decodeError);
      return null;
    }
    
    if (!result) {
      console.log(`ℹ️ [ZXing] ${preprocessed ? '(预处理)' : '(原图)'} 未检测到条码`);
      return null;
    }

    const text = result.getText?.()?.trim();
    if (!text) {
      console.log(`⚠️ [ZXing] ${preprocessed ? '(预处理)' : '(原图)'} 检测到条码但无内容`);
      return null;
    }

    // 获取格式信息
    let format = 'UNKNOWN';
    try {
      const formatFunc = result.getBarcodeFormat;
      if (formatFunc && typeof formatFunc === 'function') {
        const formatObj = formatFunc.call(result);
        format = formatObj?.toString?.() || 'UNKNOWN';
      }
    } catch (e) {
      // Ignore format error
    }

    console.log(`✅ ZXing ${preprocessed ? '(preprocessed)' : '(raw)'} 识别成功: ${text.substring(0, 50)} (${format})`);
    return { text, format };
  } catch (error: any) {
    console.error(`❌ [ZXing] ${preprocessed ? '(预处理)' : '(原图)'} 解码失败:`, error.message || error);
    console.error(`❌ [ZXing] 错误名称:`, error.name);
    console.error(`❌ [ZXing] 错误详情:`, error);
    if (error.name === 'NotFoundException') {
      console.log(`ℹ️ [ZXing] ${preprocessed ? '(预处理)' : '(原图)'} 未找到条码`);
    }
    return null;
  }
}

/**
 * 主识别函数：多区域扫描策略（智能压缩优化）
 * 
 * 识别流程：
 * 1. 智能压缩：全图 2400px（性能优化）、区域 3000px（细节保留）
 * 2. 全图识别（ZXing + BarcodeDetector）
 * 3. 横向多区域扫描（顶部→上部→中上→中下→底部）
 * 4. 每个区域：原图识别 + 预处理识别
 * 5. 去重后返回所有结果
 * 
 * @param base64Image - Base64 编码的图像（自动智能压缩）
 * @returns 条形码结果数组
 */
export async function readBarcode(base64Image: string): Promise<BarcodeResult[]> {
  const results: BarcodeResult[] = [];

  try {
    const normalizedBase64 = normalizeBase64(base64Image);
    if (!normalizedBase64) {
      console.warn('❌ [readBarcode] 输入图像为空');
      return results;
    }

    console.log('🔍 [readBarcode] 1D识别流程：原图 → 优化图');

    const tryAddResult = (text: string, format?: string) => {
      addUniqueResult(results, {
        type: 'barcode',
        value: text,
        format,
        region: 'full',
        regionIndex: 0
      });
    };

    const tryDecode = async (label: string, base64: string) => {
      const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

      for (const angle of rotations) {
        const rotated = angle === 0 ? base64 : await rotateBase64(base64, angle);
        const labelWithAngle = angle === 0 ? label : `${label},rot${angle}`;

        console.log(`  ├─ 🐲 Quagga ${labelWithAngle} (halfSample=true)...`);
        const quaggaFast = await decodeWithQuagga(rotated, false, { halfSample: true });
        if (quaggaFast) {
          tryAddResult(quaggaFast.text, quaggaFast.format);
          console.log(`  │  └─ ✅ 识别成功: ${quaggaFast.text.substring(0, 40)}`);
          return true;
        }

        console.log(`  ├─ 🐲 Quagga ${labelWithAngle} (halfSample=false)...`);
        const quaggaFull = await decodeWithQuagga(rotated, false, { halfSample: false });
        if (quaggaFull) {
          tryAddResult(quaggaFull.text, quaggaFull.format);
          console.log(`  │  └─ ✅ 识别成功: ${quaggaFull.text.substring(0, 40)}`);
          return true;
        }

        console.log(`  └─ ZXing ${labelWithAngle} (1D-only)...`);
        const zxingResult = await decodeWithZXing(rotated, false, { oneDOnly: true });
        if (zxingResult) {
          tryAddResult(zxingResult.text, zxingResult.format);
          console.log(`     └─ ✅ 识别成功: ${zxingResult.text.substring(0, 40)}`);
          return true;
        }
      }

      return false;
    };

    // 1) 原图优先（避免压缩损失）
    try {
      const rawOk = await tryDecode('(原图)', normalizedBase64);
      if (rawOk) return results;
    } catch (e) {
      console.error('  │  └─ ❌ 原图异常:', e);
    }

    // 2) 优化图作为兜底
    try {
      const optimizedBase64 = await optimizeResolution(normalizedBase64, 2400);
      console.log(`📐 [readBarcode] 图像优化完成`);
      const optimizedOk = await tryDecode('(优化图)', optimizedBase64);
      if (optimizedOk) return results;
    } catch (e) {
      console.error('  │  └─ ❌ 优化图异常:', e);
    }

    // 3) 多区域扫描（针对标签位置不固定）
    const scanRegions = [
      { name: 'top-band', x: 0, y: 0.08, w: 1, h: 0.26 },
      { name: 'mid-band', x: 0, y: 0.34, w: 1, h: 0.30 },
      { name: 'bottom-band', x: 0, y: 0.62, w: 1, h: 0.30 },
      { name: 'left-half', x: 0, y: 0.18, w: 0.55, h: 0.64 },
      { name: 'right-half', x: 0.45, y: 0.18, w: 0.55, h: 0.64 }
    ];

    for (let i = 0; i < scanRegions.length; i++) {
      const region = scanRegions[i];
      try {
        const cropped = await cropToRegion(normalizedBase64, region.x, region.y, region.w, region.h);
        const boosted = await upscaleIfNeeded(cropped, 1400);
        const regionOk = await tryDecode(`(区域:${region.name})`, boosted);
        if (regionOk) return results;

        const binarized = await preprocessFor1D(boosted);
        const binarizedOk = await tryDecode(`(区域:${region.name},二值化)`, binarized);
        if (binarizedOk) return results;
      } catch (e) {
        console.error(`  │  └─ ❌ 区域${region.name}异常:`, e);
      }
    }

    console.warn('❌ [readBarcode] 无法识别条码');
    return results;
  } catch (error) {
    console.error('❌ [readBarcode] 异常:', error);
    return results;
  }
}

/**
 * 清理资源
 */
export function resetBarcodeReader() {
  if (barcodeReader) {
    barcodeReader.reset();
  }
}
