/**
 * 条码库诊断工具 - 用于验证库是否正确加载和初始化
 */

export async function diagnosticLibraries() {
  console.log('🔍 [诊断] 开始库诊断...');
  
  // 1. 检查 Quagga
  console.log('📦 [诊断] 检查 Quagga...');
  if (typeof (window as any).Quagga !== 'undefined') {
    console.log('✅ [诊断] Quagga 已加载');
    console.log('  └─ Quagga.decodeSingle:', typeof (window as any).Quagga.decodeSingle);
    console.log('  └─ Quagga.init:', typeof (window as any).Quagga.init);
  } else {
    console.warn('❌ [诊断] Quagga 未加载！');
  }

  // 2. 检查 ZXing
  console.log('📦 [诊断] 检查 ZXing...');
  try {
    const ZXing = await import('@zxing/library');
    console.log('✅ [诊断] ZXing 已加载');
    console.log('  └─ BrowserMultiFormatReader:', typeof ZXing.BrowserMultiFormatReader);
    console.log('  └─ BarcodeFormat:', typeof ZXing.BarcodeFormat);
    
    // 尝试创建 reader
    const reader = new ZXing.BrowserMultiFormatReader();
    console.log('✅ [诊断] ZXing BrowserMultiFormatReader 初始化成功');
  } catch (e) {
    console.error('❌ [诊断] ZXing 加载失败:', e);
  }

  // 3. 检查 Buffer
  console.log('📦 [诊断] 检查 Buffer...');
  if (typeof (window as any).Buffer !== 'undefined') {
    console.log('✅ [诊断] Buffer 已加载');
  } else {
    console.warn('❌ [诊断] Buffer 未加载！');
  }

  console.log('✅ [诊断] 库诊断完成\n');
}

/**
 * 简单的条码识别测试 - 用于验证库的基础功能
 * @param base64Image - Base64 编码的图像
 */
export async function testBasicBarcode(base64Image: string) {
  console.log('🧪 [测试] 开始基础条码识别测试...');

  // 先诊断库
  await diagnosticLibraries();

  // 创建图像
  const img = new Image();
  img.src = base64Image;

  // 等待图像加载
  return new Promise<void>((resolve) => {
    img.onload = async () => {
      console.log(`🖼️ [测试] 图像已加载: ${img.width}x${img.height}`);

      // 1. 尝试 Quagga
      console.log('\n📍 [测试] 阶段 1: Quagga 测试...');
      try {
        const Quagga = (window as any).Quagga;
        if (!Quagga || !Quagga.decodeSingle) {
          console.error('❌ [测试] Quagga.decodeSingle 不可用');
        } else {
          await new Promise<void>((quaggaResolve) => {
            const timeout = setTimeout(() => {
              console.warn('⏱️ [测试] Quagga 超时（5000ms）');
              quaggaResolve();
            }, 5000);

            Quagga.decodeSingle({
              src: img.src,
              numOfWorkers: 0,
              decoder: {
                readers: ['code_128_reader', 'code_39_reader']
              }
            }, (result: any) => {
              clearTimeout(timeout);
              if (result && result.codeResult && result.codeResult.code) {
                console.log(`✅ [测试] Quagga 识别成功: ${result.codeResult.code}`);
              } else {
                console.log('ℹ️ [测试] Quagga 未找到条码');
              }
              quaggaResolve();
            });
          });
        }
      } catch (e) {
        console.error('❌ [测试] Quagga 异常:', e);
      }

      // 2. 尝试 ZXing
      console.log('\n📍 [测试] 阶段 2: ZXing 测试...');
      try {
        const ZXing = await import('@zxing/library');
        const reader = new ZXing.BrowserMultiFormatReader();
        
        const result = await reader.decodeFromImageElement(img);
        if (result) {
          const text = result.getText?.()?.trim();
          const format = result.getBarcodeFormat?.call(result)?.toString?.() || 'UNKNOWN';
          console.log(`✅ [测试] ZXing 识别成功: ${text} (${format})`);
        } else {
          console.log('ℹ️ [测试] ZXing 未找到条码');
        }
      } catch (e) {
        console.error('❌ [测试] ZXing 异常:', e);
      }

      console.log('\n✅ [测试] 基础条码识别测试完成\n');
      resolve();
    };

    img.onerror = () => {
      console.error('❌ [测试] 图像加载失败');
      resolve();
    };

    // 如果图像已缓存
    if (img.complete) {
      img.onload?.(new Event('load'));
    }
  });
}
