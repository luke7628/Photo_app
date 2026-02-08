import { createWorker } from 'tesseract.js';
import { preprocessImage } from './imagePreprocessor';

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
    // 图像预处理（增强对比度，锐化等）
    console.log('🎨 开始图像预处理...');
    const processedImage = await preprocessImage(base64Image);
    console.log('✅ 图像预处理完成');
    
    const worker = await initWorker();
    
    // 识别图像中的文字
    const { data: { text, confidence } } = await worker.recognize(`data:image/jpeg;base64,${processedImage}`);
    
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
 * 针对 Zebra 打印机标签优化
 */
function extractPrinterInfo(text: string): { serialNumber: string; model: string } {
  console.log('📝 OCR 原始文本:', text);
  
  // Zebra 标签的序列号模式（优先级高到低）
  const serialPatterns = [
    // "Serial No." 或 "Serial No./No. de Série" 后面的数字
    /Serial\s*No\.?[/\s]*(?:No\.\s*de\s*Série)?[:\s]*([A-Z0-9]{10,15})/i,
    // 独立的长数字序列（10-15位）
    /\b(\d{10,15})\b/,
    // 带字母前缀的序列号（如 99J204501782）
    /\b([A-Z0-9]{2}[A-Z]\d{9})\b/i,
    // S/N 格式
    /S[\s/]*N[:\s]*([A-Z0-9]{10,15})/i,
    // 通用格式：SN: 或 Serial Number: 后面的内容
    /(?:SN|Serial\s*Number)[:\s]*([A-Z0-9]+)/i,
    // 小写 s 开头的序列号（如 s123456789）
    /\b(s\d{9})\b/i,
    // 通用字母数字组合（8-15位）
    /\b([A-Z0-9]{8,15})\b/
  ];
  
  // Zebra 打印机型号模式（优先级高到低）
  const modelPatterns = [
    // "Model:" 或 "Model/Modèle:" 后面的内容
    /Model(?:\/Modèle)?[:\s]*(ZT\d{3,4})/i,
    // 独立的 ZT 型号
    /\b(ZT\s*4\s*\d{2})\b/i,
    /\b(ZT4\d{2})\b/i,
    // 更宽泛的 ZT 系列匹配
    /\b(ZT\d{3,4})\b/i
  ];
  
  let serialNumber = '';
  let model = '';
  
  // 提取序列号 - 尝试所有模式
  for (const pattern of serialPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].toUpperCase().replace(/\s/g, '');
      // 验证候选序列号的质量
      if (candidate.length >= 10 && /[0-9]/.test(candidate)) {
        serialNumber = candidate;
        console.log('✅ 找到序列号:', serialNumber, '(模式:', pattern, ')');
        break;
      }
    }
  }
  
  // 提取型号 - 尝试所有模式
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      model = match[1].toUpperCase().replace(/\s/g, '');
      console.log('✅ 找到型号:', model, '(模式:', pattern, ')');
      break;
    }
  }
  
  // 如果没找到型号，默认使用 ZT411
  if (!model) {
    model = 'ZT411';
    console.log('⚠️ 未找到型号，使用默认值:', model);
  }
  
  if (!serialNumber) {
    console.log('⚠️ 未找到序列号');
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
