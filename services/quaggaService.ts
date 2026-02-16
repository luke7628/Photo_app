import Quagga from '@ericblade/quagga2';

/**
 * Quagga2 条码识别服务
 * 强大的条码定位和解码引擎，支持多种条码格式
 * 
 * 优势：
 * - 支持条码定位（自动找到条码位置）
 * - 处理旋转和缩放的条码
 * - 更多的条码格式支持
 * - 返回置信度信息
 */

interface QuaggaResult {
  type: 'barcode' | 'qrcode';
  value: string;
  format?: string;
  confidence?: number; // 0-1, 置信度
  localized?: boolean;
}

/**
 * 初始化 Quagga2（仅需一次）
 */
let isInitialized = false;
export async function initializeQuagga(): Promise<void> {
  if (isInitialized) return;
  
  try {
    // Quagga2 自动初始化，我们只需要设置默认配置
    isInitialized = true;
    console.log('✅ [quagga] Quagga2 已准备好');
  } catch (error) {
    console.error('❌ [quagga] 初始化失败:', error);
    throw error;
  }
}

/**
 * 使用 Quagga2 识别静态图像中的条码
 * 最实用的方法：自动定位条码，支持旋转和缩放
 * 
 * @param base64Image - Base64 编码的图像
 * @returns 识别结果数组
 */
async function decodeWithQuagga(base64Image: string): Promise<QuaggaResult[]> {
  const results: QuaggaResult[] = [];

  if (!base64Image) {
    console.warn('❌ [quagga] 输入图像为空');
    return results;
  }

  const normalizedBase64 = base64Image.startsWith('data:') 
    ? base64Image 
    : `data:image/jpeg;base64,${base64Image}`;

  try {
    console.log('🔍 [quagga] 使用 Quagga2 进行条码定位和解码...');

    // Quagga2 配置：启用条码定位，支持多种格式
    const config = {
      src: normalizedBase64,
      multiple: true, // 如果有多个条码则全部检测
      locate: true, // 启用条码定位（关键特性）
      inputStream: {
        size: 800, // 默认大小，自动缩放
      },
      decoder: {
        readers: [
          'code_128_reader',
          'code_39_reader',
          'code_93_reader',
          'codabar_reader',
          'ean_reader',
          'ean_8_reader',
          'upc_reader',
          'upc_e_reader',
          'i2of5_reader',
          '2of5_reader',
          'code_32_reader',
          'pharmacode_reader'
        ],
      },
    };

    return new Promise((resolve) => {
      Quagga.decodeSingle(
        config as any,
        function (result: any) {
          if (!result) {
            console.log('ℹ️ [quagga] 未检测到条码');
            return resolve(results);
          }

          // 处理单个条码结果
          if (result.codeResult) {
            const codeResult = result.codeResult;
            const code = codeResult.code?.trim();

            if (code) {
              const confidence = codeResult.confidence !== undefined
                ? codeResult.confidence
                : (codeResult.decodedCodes?.length > 0 ? 0.8 : 0.5);

              results.push({
                type: 'barcode',
                value: code,
                format: codeResult.format ? codeResult.format.toUpperCase() : 'UNKNOWN',
                confidence: Math.min(1, confidence),
                localized: !!result.box, // 如果有定位框则表示已定位
              });

              console.log(
                `✅ [quagga] 识别成功 (${codeResult.format}): ${code}`,
                `(置信度: ${(confidence * 100).toFixed(0)}%)`
              );
            }
          }

          // 处理多条码结果
          if (result.boxes && result.boxes.length > 0) {
            result.boxes.forEach((box: any, idx: number) => {
              if (box.codeResult && box.codeResult.code) {
                const code = box.codeResult.code.trim();
                if (code && !results.some(r => r.value === code)) {
                  const confidence = box.codeResult.confidence || 0.7;
                  results.push({
                    type: 'barcode',
                    value: code,
                    format: box.codeResult.format
                      ? box.codeResult.format.toUpperCase()
                      : 'UNKNOWN',
                    confidence: Math.min(1, confidence),
                    localized: true,
                  });
                }
              }
            });
          }

          resolve(results);
        }
      );
    });
  } catch (error) {
    console.error('❌ [quagga] Quagga2 识别失败:', error);
    return results;
  }
}

/**
 * 简单的图像预处理：对比度增强
 * 帮助Quagga2处理质量问题较差的图像
 */
async function enhanceImageForQuagga(base64Image: string): Promise<string> {
  if (!base64Image) return base64Image;

  try {
    const img = new Image();
    img.src = base64Image.startsWith('data:')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 对比度增强（1.5倍）
    const factor = 1.5;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
    }

    ctx.putImageData(imageData, 0, 0);
    const enhanced = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

    console.log('✨ [quagga] 图像已优化（对比度增强）');
    return enhanced;
  } catch (error) {
    console.warn('⚠️ [quagga] 图像优化失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 主识别函数：两阶段识别
 * 1. 原图识别（Quagga2 有强大的定位能力）
 * 2. 如果失败，应用预处理后重试
 * 
 * @param base64Image - Base64 编码的图像
 * @returns 识别结果数组
 */
export async function readBarcodeWithQuagga(base64Image: string): Promise<QuaggaResult[]> {
  const results: QuaggaResult[] = [];

  try {
    const normalizedBase64 = base64Image.startsWith('data:')
      ? base64Image.split(',')[1]
      : base64Image;

    if (!normalizedBase64) {
      console.warn('❌ [readBarcodeWithQuagga] 输入图像为空');
      return results;
    }

    console.log('🔍 [readBarcodeWithQuagga] 开始识别（Quagga2：原图 → 增强）');

    // 第一阶段：原图识别
    console.log('📍 第一阶段：尝试原始图像识别...');
    let quaggaResults = await decodeWithQuagga(normalizedBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第一阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 第二阶段：增强后重试
    console.log('📍 第二阶段：应用图像增强后重试...');
    const enhancedBase64 = await enhanceImageForQuagga(normalizedBase64);
    quaggaResults = await decodeWithQuagga(enhancedBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第二阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 都失败了
    console.warn('❌ [readBarcodeWithQuagga] Quagga2 无法识别条码');
    console.log('💡 建议：确保条码清晰、光线充足、条码完整、没有过度旋转');
    return results;
  } catch (error) {
    console.error('❌ [readBarcodeWithQuagga] 异常:', error);
    return results;
  }
}

/**
 * 清理资源
 */
export function cleanupQuagga(): void {
  try {
    if (typeof Quagga !== 'undefined' && Quagga.stop) {
      Quagga.stop();
    }
  } catch (error) {
    console.warn('⚠️ [quagga] 清理失败:', error);
  }
}
