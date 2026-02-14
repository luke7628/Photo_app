import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import jsQR from 'jsqr';
import { preprocessImage } from './imagePreprocessor';

/**
 * 条形码和QR码识别服务 - 完全离线
 * - ZXing 库：识别 Code128, EAN, Code39 等多种条形码
 * - jsQR 库：识别 QR 码并提取数据
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

function addUniqueResult(results: BarcodeResult[], next: BarcodeResult) {
  if (!next.value) return;
  if (results.some(r => r.type === next.type && r.value === next.value)) return;
  results.push(next);
}

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

async function decodeBarcodeFromBase64(base64Image: string): Promise<{ text: string; format?: string } | null> {
  if (!base64Image) return null;

  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64Image}`;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  try {
    const reader = getReader();
    const result = await reader.decodeFromImageElement(img);
    const text = result?.getText?.()?.trim();
    if (!text) return null;
    return {
      text,
      format: result.getBarcodeFormat?.toString() || 'UNKNOWN'
    };
  } catch {
    return null;
  }
}

/**
 * 从图像中识别条形码（支持多种格式）
 * @param base64Image - Base64 编码的图像
 * @returns 条形码数组
 */
function normalizeBase64(base64Image: string): string {
  if (!base64Image) return '';
  if (base64Image.startsWith('data:')) {
    const parts = base64Image.split(',');
    return parts[1] || '';
  }
  return base64Image;
}

export async function readBarcode(base64Image: string): Promise<BarcodeResult[]> {
  const results: BarcodeResult[] = [];
  
  try {
    const normalizedBase64 = normalizeBase64(base64Image);
    // 预处理图像以提高识别率
    const processedImage = await preprocessImage(normalizedBase64);

    // 0. 尝试原生 BarcodeDetector（部分移动端更稳定）
    try {
      const detectorResults = await decodeWithBarcodeDetector(processedImage || normalizedBase64);
      if (detectorResults.length === 0 && processedImage !== normalizedBase64) {
        const fallbackDetector = await decodeWithBarcodeDetector(normalizedBase64);
        fallbackDetector.forEach(r => addUniqueResult(results, r));
      }
      detectorResults.forEach(r => addUniqueResult(results, r));
      if (detectorResults.length > 0) {
        console.log('✅ BarcodeDetector 识别成功:', detectorResults.map(r => r.value));
      }
    } catch (error) {
      console.log('ℹ️ BarcodeDetector 不可用或识别失败');
    }
    
    // 1. 尝试识别条形码（Code128, EAN等）
    try {
      const primary = await decodeBarcodeFromBase64(processedImage);
      const fallback = primary ? null : await decodeBarcodeFromBase64(normalizedBase64);
      const decoded = primary || fallback;
      if (decoded) {
        addUniqueResult(results, {
          type: 'barcode',
          value: decoded.text,
          format: decoded.format || 'UNKNOWN'
        });
        console.log('✅ 条形码识别成功:', decoded.text, '(格式:', decoded.format, ')');
      }
    } catch (error) {
      console.log('ℹ️ Code128/EAN条形码未找到或识别失败');
    }
    
    // 2. 尝试识别 QR 码（优先使用预处理图像，失败则尝试原图）
    try {
      let qrResult = await readQRCode(processedImage || normalizedBase64);
      if (!qrResult && processedImage !== normalizedBase64) {
        qrResult = await readQRCode(normalizedBase64);
      }
      if (qrResult) {
        addUniqueResult(results, {
          type: 'qrcode',
          value: qrResult
        });
        console.log('✅ QR码识别成功:', qrResult);
      }
    } catch (error) {
      console.log('ℹ️ QR码未找到');
    }
    
    return results;
  } catch (error) {
    console.error('条形码识别错误:', error);
    return results;
  }
}

/**
 * 识别 QR 码（使用 jsQR 库）
 * @param base64Image - Base64 编码的图像
 * @returns QR 码内容
 */
async function readQRCode(base64Image: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        resolve(code.data);
      } else {
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * 清理资源
 */
export function resetBarcodeReader() {
  if (barcodeReader) {
    barcodeReader.reset();
  }
}
