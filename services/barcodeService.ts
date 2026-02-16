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
 * 主识别函数：多层策略，自动重试和预处理
 * 
 * 识别流程：
 * 1. 尝试原图识别（BarcodeDetector + ZXing）
 * 2. 如果失败，自动应用预处理并再次尝试（BarcodeDetector + ZXing）
 * 3. 返回识别结果或详细的失败建议
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

    console.log('🔍 [readBarcode] 开始识别（相机拍摄 → 预处理 → 多引擎识别）');

    // 第一阶段：尝试识别原图
    console.log('📍 [readBarcode] 第一阶段：识别原始图像');

    // 1a. 尝试 BarcodeDetector
    console.log('  ├─ 尝试 BarcodeDetector API...');
    let detectorResults = await decodeWithBarcodeDetector(normalizedBase64, false);
    detectorResults.forEach(r => addUniqueResult(results, r));

    if (results.length > 0) {
      console.log('✅ [readBarcode] BarcodeDetector 成功识别！');
      return results;
    }

    // 1b. 尝试 ZXing（更多格式支持）
    console.log('  ├─ 尝试 ZXing...');
    let zxingResult = await decodeWithZXing(normalizedBase64, false);
    if (zxingResult) {
      addUniqueResult(results, {
        type: 'barcode',
        value: zxingResult.text,
        format: zxingResult.format
      });
      console.log('✅ [readBarcode] ZXing 成功识别！');
      return results;
    }

    console.log('⏳ [readBarcode] 原图识别失败，尝试预处理...');

    // 第二阶段：应用预处理并重试
    console.log('📍 [readBarcode] 第二阶段：预处理并识别');
    const preprocessedBase64 = await preprocessImageForDetection(normalizedBase64);

    // 2a. 预处理后尝试 BarcodeDetector
    console.log('  ├─ 尝试预处理图像 + BarcodeDetector API...');
    detectorResults = await decodeWithBarcodeDetector(preprocessedBase64, true);
    detectorResults.forEach(r => addUniqueResult(results, r));

    if (results.length > 0) {
      console.log('✅ [readBarcode] 预处理+BarcodeDetector 成功！');
      return results;
    }

    // 2b. 预处理后尝试 ZXing
    console.log('  └─ 尝试预处理图像 + ZXing...');
    zxingResult = await decodeWithZXing(preprocessedBase64, true);
    if (zxingResult) {
      addUniqueResult(results, {
        type: 'barcode',
        value: zxingResult.text,
        format: zxingResult.format
      });
      console.log('✅ [readBarcode] 预处理+ZXing 成功！');
      return results;
    }

    // 第三阶段：所有方法都失败，分析原因并提供建议
    console.warn('❌ [readBarcode] 所有识别方法均失败，正在分析原因...');

    try {
      const { score, issues } = await assessImageQuality(normalizedBase64);
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
