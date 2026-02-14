import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
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
    barcodeReader = new BrowserMultiFormatReader();
    // 优化识别提示：优先识别 Code128（常用于工业标签）
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      4, // QR_CODE
      1, // AZTEC
      2, // CODABAR
      4, // CODE_39
      5, // CODE_93
      13, // CODE_128（工业常用）
      26, // DATA_MATRIX
      33, // EAN_13
      34, // EAN_8
      10, // PDF_417
      20, // UPC_A
      21  // UPC_E
    ]);
  }
  return barcodeReader;
}

/**
 * 从图像中识别条形码（支持多种格式）
 * @param base64Image - Base64 编码的图像
 * @returns 条形码数组
 */
export async function readBarcode(base64Image: string): Promise<BarcodeResult[]> {
  const results: BarcodeResult[] = [];
  
  try {
    // 预处理图像以提高识别率
    const processedImage = await preprocessImage(base64Image);
    
    // 1. 尝试识别条形码（Code128, EAN等）
    try {
      const reader = getReader();
      const imageUrl = `data:image/jpeg;base64,${processedImage}`;
      
      const img = new Image();
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const result = await reader.decodeFromImageElement(img);
      
      if (result && result.getText()) {
        const text = result.getText().trim();
        if (text) {
          results.push({
            type: 'barcode',
            value: text,
            format: result.getBarcodeFormat?.toString() || 'UNKNOWN'
          });
          console.log('✅ 条形码识别成功:', text, '(格式:', result.getBarcodeFormat?.toString(), ')');
        }
      }
    } catch (error) {
      console.log('ℹ️ Code128/EAN条形码未找到或识别失败');
    }
    
    // 2. 尝试识别 QR 码
    try {
      const qrResult = await readQRCode(base64Image);
      if (qrResult) {
        results.push({
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
