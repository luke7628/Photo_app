import Quagga from '@ericblade/quagga2';

/**
 * Quagga2 条码识别服务 - 移动设备优化版本
 * 强大的条码定位和解码引擎，支持多种条码格式
 * 
 * 优势：
 * - 支持条码定位（自动找到条码位置）
 * - 处理旋转和缩放的条码
 * - 更多的条码格式支持
 * - 返回置信度信息
 * 
 * 移动优化：
 * - ROI 裁剪（中心区域优先）
 * - 智能分辨率调整
 * - 多阶段识别策略
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
 * ROI (Region of Interest) 裁剪：只处理图像中心区域
 * 移动设备优化：减少处理区域，提升速度
 */
async function cropToROI(base64Image: string, centerRatio: number = 0.7): Promise<string> {
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

    // 计算ROI区域
    const roiWidth = Math.floor(img.width * centerRatio);
    const roiHeight = Math.floor(img.height * centerRatio);
    const roiX = Math.floor((img.width - roiWidth) / 2);
    const roiY = Math.floor((img.height - roiHeight) / 2);

    canvas.width = roiWidth;
    canvas.height = roiHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    // 绘制ROI区域到canvas
    ctx.drawImage(img, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    console.log(`✂️ [quagga] ROI裁剪: ${roiWidth}x${roiHeight} (${(centerRatio * 100).toFixed(0)}%)`);
    return croppedBase64;
  } catch (error) {
    console.warn('⚠️ [quagga] ROI裁剪失败，使用原图:', error);
    return base64Image;
  }
}

/**
 * 智能分辨率调整：移动设备优化
 */
async function optimizeResolution(base64Image: string, maxDimension: number = 1600): Promise<string> {
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

    if (img.width <= maxDimension && img.height <= maxDimension) {
      return base64Image;
    }

    const canvas = document.createElement('canvas');
    let newWidth = img.width;
    let newHeight = img.height;

    if (img.width > img.height) {
      if (img.width > maxDimension) {
        newWidth = maxDimension;
        newHeight = Math.floor((img.height * maxDimension) / img.width);
      }
    } else {
      if (img.height > maxDimension) {
        newHeight = maxDimension;
        newWidth = Math.floor((img.width * maxDimension) / img.height);
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return base64Image;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    console.log(`📐 [quagga] 分辨率优化: ${img.width}x${img.height} → ${newWidth}x${newHeight}`);
    return optimizedBase64;
  } catch (error) {
    console.warn('⚠️ [quagga] 分辨率优化失败，使用原图:', error);
    return base64Image;
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
 * 主识别函数：多阶段识别（移动优化）
 * 1. 分辨率优化（减少处理时间）
 * 2. 全图识别
 * 3. ROI裁剪后识别（中心区域）
 * 4. 增强后重试
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

    console.log('🔍 [readBarcodeWithQuagga] 开始多阶段识别（Quagga2 移动优化）');

    // 预优化：分辨率调整
    console.log('📐 [readBarcodeWithQuagga] 预优化：调整分辨率...');
    const optimizedBase64 = await optimizeResolution(normalizedBase64, 1600);

    // 第一阶段：原图识别（全图）
    console.log('📍 第一阶段：尝试全图识别...');
    let quaggaResults = await decodeWithQuagga(optimizedBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第一阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 第二阶段：ROI裁剪（中心70%区域）
    console.log('📍 第二阶段：ROI裁剪（中心区域）后识别...');
    const roiBase64 = await cropToROI(optimizedBase64, 0.7);
    quaggaResults = await decodeWithQuagga(roiBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第二阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 第三阶段：ROI + 图像增强
    console.log('📍 第三阶段：ROI + 图像增强后重试...');
    const enhancedBase64 = await enhanceImageForQuagga(roiBase64);
    quaggaResults = await decodeWithQuagga(enhancedBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第三阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 第四阶段：全图 + 图像增强（最后尝试）
    console.log('📍 第四阶段：全图增强后重试...');
    const fullEnhancedBase64 = await enhanceImageForQuagga(optimizedBase64);
    quaggaResults = await decodeWithQuagga(fullEnhancedBase64);

    if (quaggaResults.length > 0) {
      console.log(`✅ [readBarcodeWithQuagga] 第四阶段成功！检测到 ${quaggaResults.length} 个条码`);
      return quaggaResults;
    }

    // 所有阶段都失败
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
