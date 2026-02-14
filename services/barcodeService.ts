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

function uniqueBase64List(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach(value => {
    if (!value) return;
    if (seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });
  return result;
}

async function loadImageFromBase64(base64Image: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64Image}`;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  return img;
}

function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.9): string {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1] || '';
}

function cropBandToBase64(source: HTMLCanvasElement, yStartRatio: number, yEndRatio: number, scale = 1): string {
  const startY = Math.max(0, Math.floor(source.height * yStartRatio));
  const endY = Math.min(source.height, Math.ceil(source.height * yEndRatio));
  const bandHeight = Math.max(1, endY - startY);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.max(1, Math.round(source.width * scale));
  outCanvas.height = Math.max(1, Math.round(bandHeight * scale));

  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return '';
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(
    source,
    0,
    startY,
    source.width,
    bandHeight,
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );

  return canvasToBase64(outCanvas);
}

async function createBarcodeCandidates(base64Images: string[]): Promise<string[]> {
  const candidates: string[] = [];

  for (const base64Image of base64Images) {
    if (!base64Image) continue;

    const img = await loadImageFromBase64(base64Image);
    console.log('🔍 [createBarcodeCandidates] 原始图像尺寸:', img.width, 'x', img.height);
    const maxWidth = 2400;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;

    const scaledWidth = Math.max(1, Math.round(img.width * scale));
    const scaledHeight = Math.max(1, Math.round(img.height * scale));
    console.log('🔍 [createBarcodeCandidates] 缩放比例:', scale, '缩放后尺寸:', scaledWidth, 'x', scaledHeight);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      candidates.push(base64Image);
      continue;
    }

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

    const full = canvasToBase64(canvas);
    console.log('🔍 [createBarcodeCandidates] 生成完整图候选，大小:', full.length);

    // Top half (serial number label)
    const topCanvas = document.createElement('canvas');
    topCanvas.width = scaledWidth;
    topCanvas.height = Math.max(1, Math.round(scaledHeight * 0.55));
    const topCtx = topCanvas.getContext('2d');
    if (topCtx) {
      topCtx.drawImage(canvas, 0, 0, scaledWidth, topCanvas.height, 0, 0, scaledWidth, topCanvas.height);
    }
    const top = topCtx ? canvasToBase64(topCanvas) : '';
    console.log('🔍 [createBarcodeCandidates] 生成顶部候选，尺寸:', topCanvas.width, 'x', topCanvas.height);

    // Bottom half (part number label)
    const bottomCanvas = document.createElement('canvas');
    bottomCanvas.width = scaledWidth;
    bottomCanvas.height = Math.max(1, scaledHeight - topCanvas.height);
    const bottomCtx = bottomCanvas.getContext('2d');
    if (bottomCtx) {
      bottomCtx.drawImage(canvas, 0, topCanvas.height, scaledWidth, bottomCanvas.height, 0, 0, scaledWidth, bottomCanvas.height);
    }
    const bottom = bottomCtx ? canvasToBase64(bottomCanvas) : '';
    console.log('🔍 [createBarcodeCandidates] 生成底部候选，尺寸:', bottomCanvas.width, 'x', bottomCanvas.height);

    const topBand = cropBandToBase64(canvas, 0.18, 0.38, 1);
    const topBandZoom = cropBandToBase64(canvas, 0.18, 0.38, 2);
    const bottomBand = cropBandToBase64(canvas, 0.58, 0.78, 1);
    const bottomBandZoom = cropBandToBase64(canvas, 0.58, 0.78, 2);
    console.log('🔍 [createBarcodeCandidates] 生成带状候选，共4个');

    candidates.push(base64Image, full, top, bottom, topBand, topBandZoom, bottomBand, bottomBandZoom);
    console.log('🔍 [createBarcodeCandidates] 总候选数:', candidates.length);
  }

  return uniqueBase64List(candidates);
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

  const img = await loadImageFromBase64(base64Image);

  try {
    const reader = getReader();
    const multiDecode = (reader as any).decodeMultipleFromImageElement as ((el: HTMLImageElement) => any) | undefined;

    if (multiDecode) {
      console.log('🔍 [decodeBarcodeFromBase64] 使用 multiDecode');
      const results = await multiDecode(img);
      console.log('🔍 [decodeBarcodeFromBase64] multiDecode 返回:', results);
      if (Array.isArray(results) && results.length > 0) {
        const first = results.find((res: any) => res?.getText?.()) || results[0];
        console.log('🔍 [decodeBarcodeFromBase64] 第一个结果:', first);
        const text = first?.getText?.()?.trim();
        console.log('🔍 [decodeBarcodeFromBase64] getText 返回:', text);
        if (!text) return null;
        
        // 正确调用 getBarcodeFormat 函数
        let format = 'UNKNOWN';
        try {
          const formatFunc = first.getBarcodeFormat;
          console.log('🔍 [decodeBarcodeFromBase64] formatFunc:', formatFunc);
          if (formatFunc && typeof formatFunc === 'function') {
            const formatObj = formatFunc.call(first);
            console.log('🔍 [decodeBarcodeFromBase64] formatObj:', formatObj);
            format = formatObj?.toString?.() || 'UNKNOWN';
          }
        } catch (e) {
          console.log('🔍 [decodeBarcodeFromBase64] 获取格式失败:', e);
        }
        
        return {
          text,
          format
        };
      }
      return null;
    }

    console.log('🔍 [decodeBarcodeFromBase64] 使用单 decode');
    const result = await reader.decodeFromImageElement(img);
    console.log('🔍 [decodeBarcodeFromBase64] decode 返回:', result);
    const text = result?.getText?.()?.trim();
    console.log('🔍 [decodeBarcodeFromBase64] getText 返回:', text);
    if (!text) return null;
    
    // 正确调用 getBarcodeFormat 函数
    let format = 'UNKNOWN';
    try {
      const formatFunc = result.getBarcodeFormat;
      console.log('🔍 [decodeBarcodeFromBase64] formatFunc:', formatFunc);
      if (formatFunc && typeof formatFunc === 'function') {
        const formatObj = formatFunc.call(result);
        console.log('🔍 [decodeBarcodeFromBase64] formatObj:', formatObj);
        format = formatObj?.toString?.() || 'UNKNOWN';
      }
    } catch (e) {
      console.log('🔍 [decodeBarcodeFromBase64] 获取格式失败:', e);
    }
    
    return {
      text,
      format
    };
  } catch (error) {
    console.log('🔍 [decodeBarcodeFromBase64] 异常:', error);
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
    console.log('🔍 [readBarcode] 开始识别，输入长度:', base64Image.length);
    const normalizedBase64 = normalizeBase64(base64Image);
    console.log('🔍 [readBarcode] 规范化后长度:', normalizedBase64.length);
    
    // 预处理图像以提高识别率
    const processedImage = await preprocessImage(normalizedBase64);
    console.log('🔍 [readBarcode] 预处理完成，输出长度:', processedImage?.length);

    const barcodeCandidates = await createBarcodeCandidates([
      normalizedBase64,
      processedImage || ''
    ]);
    console.log('🔍 [readBarcode] 生成候选接收', barcodeCandidates.length, '个');

    // 0. 尝试原生 BarcodeDetector（部分移动端更稳定）
    try {
      console.log('🔍 [readBarcode] 尝试 BarcodeDetector...');
      for (const candidate of barcodeCandidates) {
        const detectorResults = await decodeWithBarcodeDetector(candidate);
        console.log('🔍 [readBarcode] BarcodeDetector 返回:', detectorResults.length, '个结果');
        detectorResults.forEach(r => {
          console.log('🔍 [readBarcode] 添加BarcodeDetector结果:', r.value);
          addUniqueResult(results, r);
        });
        if (detectorResults.length > 0) {
          console.log('✅ BarcodeDetector 识别成功:', detectorResults.map(r => r.value));
        }
        if (results.length >= 2) break;
      }
    } catch (error) {
      console.log('ℹ️ BarcodeDetector 不可用或识别失败:', error);
    }
    
    // 1. 尝试识别条形码（Code128, EAN等）
    try {
      console.log('🔍 [readBarcode] 尝试 ZXing... (候选总数:', barcodeCandidates.length, ')');
      for (let i = 0; i < barcodeCandidates.length; i++) {
        const candidate = barcodeCandidates[i];
        console.log(`🔍 [readBarcode] 处理候选 ${i}，长度:`, candidate.length);
        const decoded = await decodeBarcodeFromBase64(candidate);
        if (decoded) {
          console.log(`✅ [readBarcode] 候选 ${i} 返回文本:`, decoded.text, '格式:', decoded.format);
          addUniqueResult(results, {
            type: 'barcode',
            value: decoded.text,
            format: decoded.format || 'UNKNOWN'
          });
          console.log('✅ 条形码识别成功:', decoded.text, '(格式:', decoded.format, ')');
        } else {
          console.log(`ℹ️ [readBarcode] 候选 ${i} 无结果`);
        }
        if (results.length >= 2) break;
      }
    } catch (error) {
      console.log('ℹ️ Code128/EAN条形码未找到或识别失败:', error);
    }
    
    // 2. 尝试识别 QR 码（优先使用预处理图像，失败则尝试原图）
    try {
      console.log('🔍 [readBarcode] 尝试 jsQR...');
      let qrResult = await readQRCode(processedImage || normalizedBase64);
      if (!qrResult && processedImage !== normalizedBase64) {
        console.log('🔍 [readBarcode] jsQR在预处理图像失败，尝试原图...');
        qrResult = await readQRCode(normalizedBase64);
      }
      if (qrResult) {
        console.log('🔍 [readBarcode] jsQR 返回:', qrResult);
        addUniqueResult(results, {
          type: 'qrcode',
          value: qrResult
        });
        console.log('✅ QR码识别成功:', qrResult);
      } else {
        console.log('🔍 [readBarcode] jsQR 无结果');
      }
    } catch (error) {
      console.log('ℹ️ QR码未找到:', error);
    }
    
    console.log('🔍 [readBarcode] 返回结果数:', results.length, 'results:', results);
    return results;
  } catch (error) {
    console.error('条形码识别错误:', error);
    console.log('🔍 [readBarcode] 返回空结果数组');
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
