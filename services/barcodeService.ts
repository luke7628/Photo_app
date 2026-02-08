import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 条形码识别服务
 * 使用 ZXing 库识别标签上的条形码（通常是序列号）
 */

let barcodeReader: BrowserMultiFormatReader | null = null;

function getReader() {
  if (!barcodeReader) {
    barcodeReader = new BrowserMultiFormatReader();
  }
  return barcodeReader;
}

/**
 * 从图像中识别条形码
 * @param base64Image - Base64 编码的图像
 * @returns 条形码文本，如果没找到返回 null
 */
export async function readBarcode(base64Image: string): Promise<string | null> {
  try {
    const reader = getReader();
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
    
    // 创建临时图像元素
    const img = new Image();
    img.src = imageUrl;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    // 尝试识别条形码
    const result = await reader.decodeFromImageElement(img);
    
    if (result && result.getText()) {
      const text = result.getText().trim();
      console.log('✅ 条形码识别成功:', text);
      return text;
    }
    
    return null;
  } catch (error) {
    console.log('ℹ️ 未找到条形码或识别失败:', error);
    return null;
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
