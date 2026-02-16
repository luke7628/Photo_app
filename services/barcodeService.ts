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

interface BarcodeResult {
  type: 'barcode' | 'qrcode';
  value: string;
  format?: string;
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
  if (results.some(r => r.value === next.value)) return;
  results.push(next);
}

/**
 * 辅助函数：从 base64 加载图片
 */
async function loadImageFromBase64(base64Image: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64Image}`;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  return img;
}

/**
 * 辅助函数：标准化 base64 字符串
 */
function normalizeBase64(base64Image: string): string {
  if (!base64Image) return '';
  if (base64Image.startsWith('data:')) {
    const parts = base64Image.split(',');
    return parts[1] || '';
  }
  return base64Image;
}

/**
 * 图像预处理：增强对比度 + 锐化，用于改善弱光/模糊图像的条码识别
 * @param base64Image - Base64 编码的图像
 * @param intensity - 处理强度（0.5=弱, 1.0=中, 2.0=强）
 * @returns 处理后的 Base64 图像
 */
async function preprocessImageForDetection(base64Image: string, intensity: number = 1.0): Promise<string> {
  if (!base64Image) return base64Image;

  // 查询缓存（同一张照片不需要重复预处理）
  if (preprocessedImageCache?.base64 === base64Image && intensity === 1.0) {
    console.log('📸 [preprocess] 使用缓存的预处理图像');
    return preprocessedImageCache.processed;
  }

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

    // 1. 对比度增强（CLAHE-like简化版）：扩展亮度分布
    const contrastAmount = 1.3 * intensity;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 对比度公式：增强亮部和暗部的差异
      data[i] = Math.min(255, Math.max(0, (r - 128) * contrastAmount + 128));
      data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrastAmount + 128));
      data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrastAmount + 128));
    }

    // 2. 锐化（Unsharp mask）：增强边界，使条码条纹更清晰
    if (intensity >= 0.8) {
      const sharpAmount = 0.8 * intensity;
      const kernel = [-1, -1, -1, -1, 12 + sharpAmount * 4, -1, -1, -1, -1];
      const kernelSum = kernel.reduce((a, b) => a + b, 0) || 1;
      const output = new ImageData(canvas.width, canvas.height);

      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          let r = 0, g = 0, b = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * canvas.width + (x + kx)) * 4;
              const ki = (ky + 1) * 3 + (kx + 1);
              const weight = kernel[ki];

              r += data[idx] * weight;
              g += data[idx + 1] * weight;
              b += data[idx + 2] * weight;
            }
          }

          const outIdx = (y * canvas.width + x) * 4;
          output.data[outIdx] = Math.min(255, Math.max(0, r / kernelSum));
          output.data[outIdx + 1] = Math.min(255, Math.max(0, g / kernelSum));
          output.data[outIdx + 2] = Math.min(255, Math.max(0, b / kernelSum));
          output.data[outIdx + 3] = 255;
        }
      }

      // 复制计算结果回原数据（边界像素保留）
      for (let i = 4 * (canvas.width + 1); i < output.data.length - 4 * (canvas.width + 1); i += 4) {
        data[i] = output.data[i];
        data[i + 1] = output.data[i + 1];
        data[i + 2] = output.data[i + 2];
      }
    }

    // 3. 亮度调整（如果图像太暗，增加亮度）
    const brightness = calculateBrightness(imageData);
    if (brightness < 100) {
      const brightnessBoost = (130 - brightness) / 255 * 20 * intensity;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + brightnessBoost);
        data[i + 1] = Math.min(255, data[i + 1] + brightnessBoost);
        data[i + 2] = Math.min(255, data[i + 2] + brightnessBoost);
      }
      console.log(`🔆 [preprocess] 图像较暗（亮度${brightness}），已增强`);
    }

    // 将处理后的图像数据写回 Canvas
    ctx.putImageData(imageData, 0, 0);
    const processedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

    // 缓存处理结果（仅 intensity=1.0）
    if (intensity === 1.0 && preprocessedImageCache) {
      preprocessedImageCache = { base64: base64Image, processed: processedBase64 };
    }

    console.log(`✨ [preprocess] 图像已处理（强度${intensity}）`);
    return processedBase64;
  } catch (error) {
    console.warn('⚠️ [preprocess] 预处理失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 计算图像平均亮度（用于判断是否需要亮度增强）
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  const sampleSize = Math.min(data.length / 4, 500); // 最多采样500个像素

  for (let i = 0; i < data.length && i / 4 < sampleSize; i += 4) {
    sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  return Math.round(sum / sampleSize);
}

/**
 * 检测图像质量：判断是否太模糊或过度曝光
 */
async function assessImageQuality(base64Image: string): Promise<{ score: number; issues: string[] }> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(img.width, 480); // 降采样以加快计算
    canvas.height = Math.min(img.height, 480);

    const ctx = canvas.getContext('2d');
    if (!ctx) return { score: 0, issues: ['Cannot access canvas context'] };

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const issues: string[] = [];
    let score = 100;

    // 检测：过度曝光（白色像素过多）
    const brightness = calculateBrightness(imageData);
    if (brightness > 220) {
      issues.push('Overexposed');
      score -= 30;
    } else if (brightness < 50) {
      issues.push('Too dark');
      score -= 30;
    }

    // 检测：模糊（边界对比度太弱）
    const sharpness = estimateSharpness(imageData);
    if (sharpness < 10) {
      issues.push('Blurry');
      score -= 25;
    }

    // 检测：对比度太低
    const contrast = calculateContrast(imageData);
    if (contrast < 30) {
      issues.push('Low contrast');
      score -= 20;
    }

    console.log(`📊 [assessQuality] 亮度=${brightness}, 锐度=${sharpness.toFixed(1)}, 对比度=${contrast}, 综合分=${score}`);
    return { score: Math.max(0, score), issues };
  } catch (error) {
    console.warn('⚠️ [assessQuality] 质量评估失败:', error);
    return { score: 50, issues: ['Assessment failed'] }; // 假设中等质量
  }
}

/**
 * 估计图像锐度（基于拉普拉斯算子的Variance）
 */
function estimateSharpness(imageData: ImageData): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let gradientSum = 0;
  let count = 0;

  // 采样边界计算（性能优化）
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const centerIntensity = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      const laplacian =
        Math.abs(centerIntensity - (data[(y - 1) * width + x] * 0.299 + data[(y - 1) * width + x + 1] * 0.587 + data[(y - 1) * width + x + 2] * 0.114)) +
        Math.abs(centerIntensity - (data[(y + 1) * width + x] * 0.299 + data[(y + 1) * width + x + 1] * 0.587 + data[(y + 1) * width + x + 2] * 0.114));

      gradientSum += laplacian;
      count++;
    }
  }

  return count > 0 ? gradientSum / count : 0;
}

/**
 * 计算图像对比度
 */
function calculateContrast(imageData: ImageData): number {
  const data = imageData.data;
  const intensities: number[] = [];

  // 采样计算
  for (let i = 0; i < data.length; i += 4) {
    const intensity = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    intensities.push(intensity);
  }

  intensities.sort((a, b) => a - b);
  const q1 = intensities[Math.floor(intensities.length * 0.25)];
  const q3 = intensities[Math.floor(intensities.length * 0.75)];

  return q3 - q1; // 四分位差作为对比度指标
}

/**
 * 使用浏览器原生 BarcodeDetector API，支持预处理
 */
async function decodeWithBarcodeDetector(base64Image: string, preprocessed: boolean = false): Promise<BarcodeResult[]> {
  const detected: BarcodeResult[] = [];
  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  if (!BarcodeDetectorCtor || !base64Image) return detected;

  try {
    const img = await loadImageFromBase64(base64Image);
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

    const results = await detector.detect(img);
    results.forEach((r: any) => {
      const rawValue = (r.rawValue || '').trim();
      if (!rawValue) return;
      detected.push({
        type: r.format === 'qr_code' ? 'qrcode' : 'barcode',
        value: rawValue,
        format: (r.format || '').toUpperCase()
      });
    });

    if (detected.length > 0) {
      console.log(`✅ BarcodeDetector ${preprocessed ? '(preprocessed)' : '(raw)'} 识别成功:`, detected.map(d => `${d.value} (${d.format})`).join(', '));
    }

    return detected;
  } catch (error) {
    if (!preprocessed) {
      console.log('ℹ️ BarcodeDetector (raw) 失败');
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
    const reader = getReader();

    // 尝试解码
    const result = await reader.decodeFromImageElement(img);
    if (!result) return null;

    const text = result.getText?.()?.trim();
    if (!text) return null;

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

    console.log(`✅ ZXing ${preprocessed ? '(preprocessed)' : '(raw)'} 识别成功: ${text} (${format})`);
    return { text, format };
  } catch (error) {
    if (!preprocessed) {
      console.log('ℹ️ ZXing (raw) 失败');
    }
    return null;
  }
}

/**
 * 主识别函数：多层策略，自动选择最佳方案
 * 
 * 识别流程：
 * 1. 评估图像质量（检测模糊、过曝、对比度）
 * 2. 尝试原图识别（BarcodeDetector → ZXing）
 * 3. 如果失败且质量问题被发现，自动应用预处理并重试
 * 4. 返回识别结果或详细的失败原因
 * 
 * @param base64Image - Base64 编码的图像
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

    console.log('🔍 [readBarcode] 开始识别（多层次策略：评估质量 → 原图 → 预处理）');

    // 第一步：评估图像质量（非阻塞）
    const { score: qualityScore, issues } = await assessImageQuality(normalizedBase64);
    const hasQualityIssues = qualityScore < 70;

    if (hasQualityIssues) {
      console.log(`⚠️ [readBarcode] 图像质量一般（分数${qualityScore}/100）：${issues.join(', ')}`);
    } else {
      console.log(`✅ [readBarcode] 图像质量良好（分数${qualityScore}/100）`);
    }

    // 第二步：尝试原图识别（最快）
    console.log('📍 [readBarcode] 尝试1：原图 → BarcodeDetector');
    let detectorResults = await decodeWithBarcodeDetector(normalizedBase64, false);
    detectorResults.forEach(r => addUniqueResult(results, r));

    if (results.length > 0) {
      return results; // 成功！直接返回
    }

    // 第二步 B：如果 BarcodeDetector 失败，尝试 ZXing 原图
    console.log('📍 [readBarcode] 尝试2：原图 → ZXing');
    let zxingResult = await decodeWithZXing(normalizedBase64, false);
    if (zxingResult) {
      addUniqueResult(results, {
        type: 'barcode',
        value: zxingResult.text,
        format: zxingResult.format
      });
      return results; // 成功！
    }

    // 第三步：如果原图失败，应用预处理后重试
    if (hasQualityIssues || qualityScore < 85) {
      console.log(`📍 [readBarcode] 尝试3：应用预处理（质量${qualityScore}） → BarcodeDetector`);
      const preprocessedBase64 = await preprocessImageForDetection(normalizedBase64, 1.0);
      detectorResults = await decodeWithBarcodeDetector(preprocessedBase64, true);
      detectorResults.forEach(r => addUniqueResult(results, r));

      if (results.length > 0) {
        return results; // 成功！
      }

      // 第三步 B：预处理后尝试 ZXing
      console.log(`📍 [readBarcode] 尝试4：应用预处理（质量${qualityScore}） → ZXing`);
      zxingResult = await decodeWithZXing(preprocessedBase64, true);
      if (zxingResult) {
        addUniqueResult(results, {
          type: 'barcode',
          value: zxingResult.text,
          format: zxingResult.format
        });
        return results; // 成功！
      }
    }

    // 第四步：所有方法都失败，提供诊断信息
    console.warn('❌ [readBarcode] 所有识别方法均失败');
    let suggestion = '❌ Cannot detect barcode. ';

    if (issues.length > 0) {
      suggestion += `Issues detected: ${issues.join(', ')}. `;
    }

    if (qualityScore < 50) {
      suggestion += 'Try: get closer, improve lighting (not too bright), focus on the barcode.';
    } else if (qualityScore < 70) {
      suggestion += 'Try: improve lighting and focus, or take a steadier photo.';
    } else if (issues.includes('Blurry')) {
      suggestion += 'Image is blurry. Please hold steady and refocus.';
    } else {
      suggestion += 'Barcode may not be readable from this angle. Try different angle or get closer.';
    }

    console.warn('💡 [readBarcode] 建议:', suggestion);

    return results;
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
