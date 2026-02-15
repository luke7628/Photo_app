import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * 条形码和QR码识别服务 - 完全离线、优化移动端
 * 
 * 识别策略（按优先级）：
 * 1. BarcodeDetector API（浏览器原生，移动端快且准）
 * 2. ZXing 库（兜底，支持更多格式）
 * 
 * 适用场景：照片质量好、光线充足，无需预处理
 */

let barcodeReader: BrowserMultiFormatReader | null = null;

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
 * 使用浏览器原生 BarcodeDetector API
 * 在移动端性能和识别率通常优于 ZXing
 */
async function decodeWithBarcodeDetector(base64Image: string): Promise<BarcodeResult[]> {
  const detected: BarcodeResult[] = [];
  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  if (!BarcodeDetectorCtor || !base64Image) return detected;

  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64Image}`;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

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

  return detected;
}

/**
 * 使用 ZXing 库识别条码（兜底方案）
 * 直接从原图读取，不做预处理
 */
async function decodeWithZXing(base64Image: string): Promise<{ text: string; format?: string } | null> {
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
    
    return { text, format };
  } catch (error) {
    return null;
  }
}

/**
 * 主识别函数：优先 BarcodeDetector，失败则用 ZXing 兜底
 * 针对移动端优化，照片质量好的场景
 * 
 * @param base64Image - Base64 编码的图像
 * @returns 条形码结果数组
 */
export async function readBarcode(base64Image: string): Promise<BarcodeResult[]> {
  const results: BarcodeResult[] = [];
  
  try {
    const normalizedBase64 = normalizeBase64(base64Image);
    if (!normalizedBase64) {
      console.warn('[readBarcode] 输入图像为空');
      return results;
    }

    console.log('🔍 [readBarcode] 开始识别（优先 BarcodeDetector，兜底 ZXing）');

    // 1. 优先使用原生 BarcodeDetector（移动端快且准）
    try {
      const detectorResults = await decodeWithBarcodeDetector(normalizedBase64);
      if (detectorResults.length > 0) {
        detectorResults.forEach(r => addUniqueResult(results, r));
        console.log('✅ BarcodeDetector 识别成功:', detectorResults.map(r => `${r.value} (${r.format})`).join(', '));
        return results; // 识别成功直接返回
      }
    } catch (error) {
      console.log('ℹ️ BarcodeDetector 不可用或失败，尝试 ZXing 兜底');
    }

    // 2. 兜底：使用 ZXing
    try {
      const zxingResult = await decodeWithZXing(normalizedBase64);
      if (zxingResult) {
        addUniqueResult(results, {
          type: 'barcode',
          value: zxingResult.text,
          format: zxingResult.format
        });
        console.log('✅ ZXing 识别成功:', zxingResult.text, `(${zxingResult.format})`);
        return results;
      }
    } catch (error) {
      console.log('ℹ️ ZXing 识别失败');
    }

    // 3. 都失败
    if (results.length === 0) {
      console.warn('❌ 所有识别方法均失败。建议：靠近条码、调整光线、确保条码清晰');
    }
    
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
