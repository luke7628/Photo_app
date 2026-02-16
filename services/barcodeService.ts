import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * 条形码和QR码识别服务 - 完全离线、优化移动端
 * 
 * 识别策略（多层次、支持预处理）：
 * 1. BarcodeDetector API - 原图无预处理（快速，移动端优先）
 * 2. BarcodeDetector API - 经对比度增强预处理（提高检测率）
 * 3. ZXing - 原图无预处理（兜底，支持更多格式）
 * 4. ZXing - 经对比度+锐化预处理（提高检测率）
 * 
 * 预处理包括：对比度增强、锐化、亮度调整，可显著提高弱光/模糊条码识别率
 */

let barcodeReader: BrowserMultiFormatReader | null = null;
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
    hints.set(DecodeHintType.ALSO_INVERTED, true);
    // Initialize reader with hints in one step
    barcodeReader = new BrowserMultiFormatReader(hints);
  }
  return barcodeReader;
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
async function decodeWithZXing(base64Image: string, preprocessed: boolean = false): Promise<{ text: string; format?: string } | null> {
  if (!base64Image) return null;

  try {
    const img = await loadImageFromBase64(base64Image);
    console.log(`🖼️ [ZXing] 图像加载成功: ${img.width}x${img.height} ${preprocessed ? '(预处理)' : '(原图)'}`);
    
    const reader = getReader();
    console.log(`🔍 [ZXing] 开始解码 ${preprocessed ? '(预处理)' : '(原图)'}...`);

    // iOS兼容：使用canvas而不是直接从img元素解码
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.error('❌ [ZXing] Canvas context获取失败');
      return null;
    }
    
    // 清空canvas并绘制图像
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    console.log(`🖼️ [ZXing] 已绘制到canvas: ${canvas.width}x${canvas.height}`);
    
    // 验证图像数据
    try {
      const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
      console.log(`✅ [ZXing] ImageData采样成功: ${imageData.data.length} bytes, 前10个像素:`, Array.from(imageData.data.slice(0, 40)));
      
      // 检查是否全是透明或全黑
      const allZero = imageData.data.every(v => v === 0);
      const allMax = imageData.data.every((v, i) => i % 4 === 3 || v === 255);
      if (allZero) {
        console.error('❌ [ZXing] Canvas数据全为0，图像可能未正确绘制');
      } else if (allMax) {
        console.warn('⚠️ [ZXing] Canvas数据全为255，图像可能过曝');
      }
    } catch (e) {
      console.error('❌ [ZXing] 无法读取ImageData:', e);
    }

    // 尝试从canvas解码
    let result;
    try {
      console.log('🔍 [ZXing] 尝试 decodeFromCanvas...');
      result = await reader.decodeFromCanvas(canvas);
      console.log('✅ [ZXing] decodeFromCanvas成功');
    } catch (canvasError) {
      console.warn(`⚠️ [ZXing] decodeFromCanvas失败:`, canvasError);
      // 备用方案：尝试从VideoFrame或ImageElement
      try {
        console.log('🔍 [ZXing] 尝试 decodeFromImageElement...');
        result = await reader.decodeFromImageElement(img);
        console.log('✅ [ZXing] decodeFromImageElement成功');
      } catch (imgError) {
        console.error(`❌ [ZXing] decodeFromImageElement也失败:`, imgError);
        throw canvasError; // 抛出原始错误
      }
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

    console.log('🔍 [readBarcode] 开始多区域扫描');
    console.log(`📊 [readBarcode] 原始图像大小: ${normalizedBase64.length} bytes`);
    console.log(`📱 [readBarcode] 设备: ${navigator.userAgent.substring(0, 80)}...`);
    console.log(`🖼️ [readBarcode] 屏幕: ${window.screen.width}x${window.screen.height}`);
    
    // 智能压缩：平衡细节保留和性能
    // 全图扫描使用 2400px：足够识别条码，性能可接受
    const optimizedBase64 = await optimizeResolution(normalizedBase64, 2400);
    console.log(`📐 [readBarcode] 图像优化: 原始 ${normalizedBase64.length} bytes → 优化 ${optimizedBase64.length} bytes`);
    
    // 检测浏览器能力
    const barcodeDetectorSupported = checkBarcodeDetectorSupport();
    console.log(`🔧 [readBarcode] BarcodeDetector API: ${barcodeDetectorSupported ? '✅ 支持' : '❌ 不支持（将仅使用ZXing）'}`);
    console.log(`🔧 [readBarcode] ZXing库: ✅ 已加载`);

    // ========== 第一阶段：全图扫描（使用压缩后图像） ==========
    console.log('📍 [readBarcode] 第一阶段：全图扫描（2400px优化）');
    
    // 1a. BarcodeDetector (全图)
    if (barcodeDetectorSupported) {
      console.log('  ├─ BarcodeDetector (全图)...');
      try {
        const detectorResults = await decodeWithBarcodeDetector(optimizedBase64, false);
        detectorResults.forEach(r => addUniqueResult(results, { ...r, region: '全图', regionIndex: 0 }));
        console.log(`  │  └─ 找到 ${detectorResults.length} 个条码`);
      } catch (e) {
        console.error('  │  └─ ❌ 异常:', e);
      }
    }

    // 1b. ZXing (全图)
    console.log('  ├─ ZXing (全图)...');
    try {
      const zxingResult = await decodeWithZXing(optimizedBase64, false);
      if (zxingResult) {
        addUniqueResult(results, {
          type: 'barcode',
          value: zxingResult.text,
          format: zxingResult.format,
          region: '全图',
          regionIndex: 0
        });
        console.log(`  │  └─ ✅ 识别: ${zxingResult.text.substring(0, 30)}`);
      } else {
        console.log(`  │  └─ 未检测到`);
      }
    } catch (e) {
      console.error('  │  └─ ❌ 异常:', e);
    }

    // 1c. ZXing (全图预处理)
    console.log('  └─ ZXing (全图+预处理)...');
    try {
      const preprocessed = await preprocessImageForDetection(optimizedBase64);
      const zxingResultPreprocessed = await decodeWithZXing(preprocessed, true);
      if (zxingResultPreprocessed) {
        addUniqueResult(results, {
          type: 'barcode',
          value: zxingResultPreprocessed.text,
          format: zxingResultPreprocessed.format,
          region: '全图',
          regionIndex: 0
        });
        console.log(`     └─ ✅ 识别: ${zxingResultPreprocessed.text.substring(0, 30)}`);
      } else {
        console.log(`     └─ 未检测到`);
      }
    } catch (e) {
      console.error('     └─ ❌ 异常:', e);
    }

    console.log(`✅ [readBarcode] 第一阶段完成，已找到 ${results.length} 个条码`);
    
    // ========== 第二阶段：多区域扫描（使用稍高分辨率） ==========
    // 区域扫描使用 3000px：裁剪后区域较小，可用更高分辨率
    const highResBase64 = await optimizeResolution(normalizedBase64, 3000);
    console.log(`📐 [readBarcode] 区域扫描图像: 优化到 3000px，大小 ${highResBase64.length} bytes`);
    
    // 定义扫描区域（Y轴百分比：起始%, 高度%）
    const scanRegions = [
      { name: '顶部20%', y: 0, h: 0.2 },
      { name: '上部20-40%', y: 0.2, h: 0.2 },
      { name: '中上40-60%', y: 0.4, h: 0.2 },
      { name: '中下60-80%', y: 0.6, h: 0.2 },
      { name: '底部80-100%', y: 0.8, h: 0.2 },
    ];
    
    console.log(`📍 [readBarcode] 第二阶段：横向多区域扫描 (${scanRegions.length}个区域)`);
    
    for (let i = 0; i < scanRegions.length; i++) {
      const region = scanRegions[i];
      const regionIndex = i + 1; // 1-5对应5个区域
      console.log(`  ▶ 扫描区域: ${region.name}`);
      
      try {
        // 裁剪区域
        const regionBase64 = await cropToRegion(highResBase64, 0, region.y, 1, region.h);
        
        // 2a. ZXing (原图)
        const zxingRegionResult = await decodeWithZXing(regionBase64, false);
        if (zxingRegionResult) {
          addUniqueResult(results, {
            type: 'barcode',
            value: zxingRegionResult.text,
            format: zxingRegionResult.format,
            region: region.name,
            regionIndex
          });
          console.log(`    ├─ ✅ 原图识别: ${zxingRegionResult.text.substring(0, 30)}`);
        } else {
          // 2b. ZXing (预处理) - 仅在原图失败时使用
          const preprocessedRegion = await preprocessImageForDetection(regionBase64);
          const zxingPreprocessedResult = await decodeWithZXing(preprocessedRegion, true);
          if (zxingPreprocessedResult) {
            addUniqueResult(results, {
              type: 'barcode',
              value: zxingPreprocessedResult.text,
              format: zxingPreprocessedResult.format,
              region: region.name,
              regionIndex
            });
            console.log(`    └─ ✅ 预处理识别: ${zxingPreprocessedResult.text.substring(0, 30)}`);
          } else {
            console.log(`    └─ 未检测到`);
          }
        }
      } catch (e) {
        console.error(`    └─ ❌ ${region.name} 扫描异常:`, e);
      }
    }

    console.log(`✅ [readBarcode] 第二阶段完成，共找到 ${results.length} 个条码`);
    
    // ========== 结果汇总 ==========
    if (results.length > 0) {
      console.log(`🎉 [readBarcode] 识别成功！共找到 ${results.length} 个条码:`);
      results.forEach((r, idx) => {
        console.log(`   ${idx + 1}. [${r.format}] ${r.value.substring(0, 50)} (区域: ${r.region || '未知'})`);
      });
      return results;
    }

    // 所有扫描都失败，分析原因并提供建议
    console.warn('❌ [readBarcode] 所有识别方法均失败，正在分析原因...');

    try {
      const { score, issues } = await assessImageQuality(optimizedBase64);
      console.warn(`📊 [readBarcode] 图像质量分数: ${score}/100, 问题: ${issues.length > 0 ? issues.join(', ') : '无明显问题'}`);

      let suggestion = '💡 Cannot detect barcode. ';
      
      if (issues.length > 0) {
        suggestion += `Photo issue: ${issues.join(', ')}. `;
      }

      if (score < 40) {
        suggestion += 'Please: (1) Get closer to the barcode, (2) Improve lighting - avoid shadows and glare, (3) Hold steady, (4) Ensure barcode is in focus.';
      } else if (score < 70) {
        suggestion += 'Please: (1) Improve lighting, (2) Get a bit closer, (3) Try different angle, (4) Focus on barcode.';
      } else if (issues.includes('Low contrast')) {
        suggestion += 'Barcode has low contrast. Try different lighting or angle.';
      } else {
        suggestion += 'Barcode may be at an angle, damaged, or too small. Try: different angle, better focus, or get closer.';
      }

      console.warn('💭 [readBarcode] 建议:', suggestion);
    } catch (assessError) {
      console.warn('⚠️ [readBarcode] 质量分析失败，但继续提示用户');
    }

    return results; // 返回空数组
  } catch (error) {
    console.error('❌ [readBarcode] 识别异常:', error);
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
