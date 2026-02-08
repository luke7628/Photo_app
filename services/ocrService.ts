import { createWorker } from 'tesseract.js';

/**
 * 本地 OCR 识别服务 - 使用 Tesseract.js
 * 完全在浏览器中运行，无需 API Key，完全离线
 */

let worker: Tesseract.Worker | null = null;

async function initWorker() {
  if (worker) return worker;
  
  worker = await createWorker('eng', 1, {
    logger: (m) => {
      // 可选：显示加载进度
      if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
        console.log(`OCR: ${m.status} - ${Math.round((m.progress || 0) * 100)}%`);
      }
    },
  });
  
  return worker;
}

export async function analyzeWithOCR(base64Image: string): Promise<{ serialNumber: string; model: string; confidence: number }> {
  try {
    const worker = await initWorker();
    
    // 识别图像中的文字
    const { data: { text, confidence } } = await worker.recognize(`data:image/jpeg;base64,${base64Image}`);
    
    console.log('OCR Raw Text:', text);
    console.log('OCR Confidence:', confidence);
    
    // 提取序列号和型号
    const result = extractPrinterInfo(text);
    
    return {
      ...result,
      confidence: confidence / 100 // 转换为 0-1 范围
    };
  } catch (error) {
    console.error('Local OCR Error:', error);
    throw new Error('Local OCR analysis failed');
  }
}

/**
 * 从 OCR 文本中提取打印机序列号和型号
 */
function extractPrinterInfo(text: string): { serialNumber: string; model: string } {
  // 常见的序列号模式
  // 示例: s123456789, TEST123456, SN:12345, Serial Number: ABCD1234
  const serialPatterns = [
    /(?:S\/N|SN|Serial\s*Number|Serial)[:\s]*([A-Z0-9]+)/i,
    /\b([A-Z]{1,5}\d{6,12})\b/, // 如 TEST123456
    /\b(s\d{9})\b/i, // 如 s123456789
    /\b([A-Z0-9]{8,15})\b/ // 通用字母数字组合
  ];
  
  // 常见的型号模式
  // 示例: ZT411, ZT421, Model: ZT411
  const modelPatterns = [
    /\b(ZT4[0-9]{2})\b/i, // ZT4xx 系列
    /(?:Model|Type)[:\s]*(ZT4[0-9]{2})/i,
    /\b(ZT\s*4\s*[0-9]\s*[0-9])\b/i // 处理空格分隔的情况
  ];
  
  let serialNumber = '';
  let model = '';
  
  // 提取序列号
  for (const pattern of serialPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      serialNumber = match[1].toUpperCase().replace(/\s/g, '');
      break;
    }
  }
  
  // 提取型号
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      model = match[1].toUpperCase().replace(/\s/g, '');
      break;
    }
  }
  
  // 如果没找到型号，默认使用 ZT411
  if (!model) {
    model = 'ZT411';
  }
  
  return { serialNumber, model };
}

/**
 * 清理资源
 */
export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
