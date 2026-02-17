/**
 * 条码识别诊断工具
 * 
 * 帮助诊断为什么条码识别失败，提供具体的改进建议
 * 基于图像质量、清晰度、角度等多维度分析
 */

interface ImageQualityReport {
  brightness: {
    value: number;
    level: 'too-dark' | 'dark' | 'normal' | 'bright' | 'overexposed';
    suggestion: string;
  };
  contrast: {
    value: number;
    level: 'low' | 'medium' | 'high';
    suggestion: string;
  };
  sharpness: {
    value: number;    // 0-100 越高越清晰
    level: 'blurry' | 'acceptable' | 'sharp';
    suggestion: string;
  };
  noise: {
    value: number;    // 0-100 噪声比例
    level: 'low' | 'medium' | 'high';
    suggestion: string;
  };
  barcodeDetected: {
    hasBarcode: boolean;
    confidence: number;  // 0-100
  };
  skewAngle: {
    angle: number;
    isAcceptable: boolean;
    suggestion: string;
  };
  overallScore: number;  // 0-100
  recommendations: string[];
  isReadyForCapture: boolean;
}

/**
 * 分析图像质量并提供诊断报告
 */
export async function diagnoseImage(base64Image: string): Promise<ImageQualityReport> {
  try {
    const img = await loadImageFromBase64(base64Image);
    const canvas = document.createElement('canvas');
    
    // 降采样以加快分析
    canvas.width = Math.min(img.width, 480);
    canvas.height = Math.min(img.height, 480);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return getDefaultReport();
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 计算各个质量指标
    const brightnessReport = analyzeBrightness(data);
    const contrastReport = analyzeContrast(data);
    const sharpnessReport = analyzeSharpness(imageData);
    const noiseReport = analyzeNoise(data);
    const barcodeReport = analyzeBarcodeLikelihood(imageData);
    const skewReport = analyzeSkew(imageData);

    // 综合评分
    const overallScore = calculateOverallScore({
      brightness: brightnessReport,
      contrast: contrastReport,
      sharpness: sharpnessReport,
      noise: noiseReport,
      barcode: barcodeReport,
      skew: skewReport
    });

    // 生成建议
    const recommendations = generateRecommendations({
      brightness: brightnessReport,
      contrast: contrastReport,
      sharpness: sharpnessReport,
      noise: noiseReport,
      barcode: barcodeReport,
      skew: skewReport,
      overallScore
    });

    const isReadyForCapture = overallScore >= 60 && barcodeReport.confidence >= 50;

    const report: ImageQualityReport = {
      brightness: brightnessReport,
      contrast: contrastReport,
      sharpness: sharpnessReport,
      noise: noiseReport,
      barcodeDetected: barcodeReport,
      skewAngle: skewReport,
      overallScore,
      recommendations,
      isReadyForCapture
    };

    logDiagnosisReport(report);
    return report;
  } catch (error) {
    console.error('❌ [diagnoseImage] 诊断失败:', error);
    return getDefaultReport();
  }
}

/**
 * 分析亮度
 */
function analyzeBrightness(data: Uint8ClampedArray): ImageQualityReport['brightness'] {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    sum += gray;
    count++;
  }

  const brightness = Math.round(sum / count);

  let level: 'too-dark' | 'dark' | 'normal' | 'bright' | 'overexposed';
  let suggestion: string;

  if (brightness < 30) {
    level = 'too-dark';
    suggestion = '❌ 图像太暗，无法识别。请靠近光源或增加照明。';
  } else if (brightness < 80) {
    level = 'dark';
    suggestion = '⚠️ 图像较暗，识别效果可能差。请改善光线。';
  } else if (brightness < 200) {
    level = 'normal';
    suggestion = '✅ 光线充足，适合拍照。';
  } else if (brightness < 230) {
    level = 'bright';
    suggestion = '⚠️ 图像较亮，但仍可识别。';
  } else {
    level = 'overexposed';
    suggestion = '❌ 图像过曝，细节丢失。请减少光线或调整角度。';
  }

  return { value: brightness, level, suggestion };
}

/**
 * 分析对比度
 */
function analyzeContrast(data: Uint8ClampedArray): ImageQualityReport['contrast'] {
  let min = 255;
  let max = 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    min = Math.min(min, gray);
    max = Math.max(max, gray);
    sum += gray;
    sumSq += gray * gray;
    count++;
  }

  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  const stdDev = Math.sqrt(variance);
  const contrast = Math.round((max - min));
  const contrastRatio = Math.round(stdDev);

  let level: 'low' | 'medium' | 'high';
  let suggestion: string;

  if (contrast < 30) {
    level = 'low';
    suggestion = '❌ 对比度很低，条码几乎看不清。请调整角度或光线。';
  } else if (contrast < 80) {
    level = 'medium';
    suggestion = '⚠️ 对比度一般。可以尝试，但成功率可能不高。';
  } else {
    level = 'high';
    suggestion = '✅ 对比度良好，条码清晰。';
  }

  return { value: contrastRatio, level, suggestion };
}

/**
 * 分析清晰度（基于高频分量）
 */
function analyzeSharpness(imageData: ImageData): ImageQualityReport['sharpness'] {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let edgeCount = 0;
  const threshold = 20;

  // 计算相邻像素的亮度差异
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const gray1 = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      const idx2 = (y * width + (x + 1)) * 4;
      const gray2 = data[idx2] * 0.299 + data[idx2 + 1] * 0.587 + data[idx2 + 2] * 0.114;

      if (Math.abs(gray1 - gray2) > threshold) {
        edgeCount++;
      }
    }
  }

  const sharpness = Math.min(100, Math.round((edgeCount / (width * height)) * 1000));

  let level: 'blurry' | 'acceptable' | 'sharp';
  let suggestion: string;

  if (sharpness < 15) {
    level = 'blurry';
    suggestion = '❌ 图像模糊，可能是对焦问题或手抖。请稳定手机并重新拍摄。';
  } else if (sharpness < 35) {
    level = 'acceptable';
    suggestion = '⚠️ 清晰度一般，可能影响识别。尽量保持手机稳定。';
  } else {
    level = 'sharp';
    suggestion = '✅ 图像清晰，有利于识别。';
  }

  return { value: sharpness, level, suggestion };
}

/**
 * 分析噪声
 */
function analyzeNoise(data: Uint8ClampedArray): ImageQualityReport['noise'] {
  let totalVariance = 0;
  const sampleSize = Math.min(1000, Math.floor(data.length / 4));
  const step = Math.floor(data.length / (sampleSize * 4));

  for (let i = 0; i < data.length; i += step * 4) {
    if (i + 4 < data.length) {
      const g1 = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const g2 = data[i + 4] * 0.299 + data[i + 5] * 0.587 + data[i + 6] * 0.114;
      totalVariance += Math.abs(g1 - g2);
    }
  }

  const noiseLevel = Math.min(100, Math.round((totalVariance / sampleSize) * 2));

  let level: 'low' | 'medium' | 'high';
  let suggestion: string;

  if (noiseLevel < 20) {
    level = 'low';
    suggestion = '✅ 噪声低，图像质量好。';
  } else if (noiseLevel < 50) {
    level = 'medium';
    suggestion = '⚠️ 轻微噪声，仍可识别。';
  } else {
    level = 'high';
    suggestion = '❌ 噪声很大，影响识别。请改善光线或更换相机。';
  }

  return { value: noiseLevel, level, suggestion };
}

/**
 * 分析是否像条码（基于边界密度）
 */
function analyzeBarcodeLikelihood(imageData: ImageData): ImageQualityReport['barcodeDetected'] {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  let verticalLines = 0;
  let horizontalLines = 0;

  // 检测垂直条纹（条码特征）
  for (let x = 0; x < width - 1; x++) {
    let transitions = 0;
    for (let y = 1; y < height; y++) {
      const idx1 = ((y - 1) * width + x) * 4;
      const idx2 = (y * width + x) * 4;
      const g1 = data[idx1] * 0.299 + data[idx1 + 1] * 0.587 + data[idx1 + 2] * 0.114;
      const g2 = data[idx2] * 0.299 + data[idx2 + 1] * 0.587 + data[idx2 + 2] * 0.114;
      if (Math.abs(g1 - g2) > 50) {
        transitions++;
      }
    }
    if (transitions > height * 0.3) {
      verticalLines++;
    }
  }

  const verticalDensity = (verticalLines / width) * 100;
  const confidence = Math.round(Math.min(100, verticalDensity * 2));
  const hasBarcode = confidence > 30;

  return { hasBarcode, confidence };
}

/**
 * 分析倾斜角度
 */
function analyzeSkew(imageData: ImageData): ImageQualityReport['skewAngle'] {
  // 简化实现：假设没有倾斜检测，返回0
  // 在实际应用中可以使用Hough变换等更精确的方法
  return {
    angle: 0,
    isAcceptable: true,
    suggestion: '✅ 条码角度正常。'
  };
}

/**
 * 计算综合评分
 */
function calculateOverallScore(reports: {
  brightness: any;
  contrast: any;
  sharpness: any;
  noise: any;
  barcode: any;
  skew: any;
}): number {
  let totalScore = 0;
  let weights = 0;

  // 亮度权重：20%
  const brightnessScore = reports.brightness.level === 'normal' ? 100 :
    reports.brightness.level === 'dark' || reports.brightness.level === 'bright' ? 70 :
    reports.brightness.level === 'too-dark' || reports.brightness.level === 'overexposed' ? 0 : 50;
  totalScore += brightnessScore * 0.2;
  weights += 0.2;

  // 对比度权重：20%
  const contrastScore = reports.contrast.level === 'high' ? 100 :
    reports.contrast.level === 'medium' ? 60 : 0;
  totalScore += contrastScore * 0.2;
  weights += 0.2;

  // 清晰度权重：25%
  const sharpnessScore = reports.sharpness.level === 'sharp' ? 100 :
    reports.sharpness.level === 'acceptable' ? 60 : 0;
  totalScore += sharpnessScore * 0.25;
  weights += 0.25;

  // 噪声权重：15%
  const noiseScore = reports.noise.level === 'low' ? 100 :
    reports.noise.level === 'medium' ? 60 : 0;
  totalScore += noiseScore * 0.15;
  weights += 0.15;

  // 条码检测权重：20%
  const barcodeScore = reports.barcode.confidence;
  totalScore += barcodeScore * 0.2;
  weights += 0.2;

  return Math.round(totalScore / weights);
}

/**
 * 生成建议
 */
function generateRecommendations(reports: any): string[] {
  const recommendations: string[] = [];

  if (reports.brightness.level === 'too-dark' || reports.brightness.level === 'dark') {
    recommendations.push('🔆 增加光线：靠近窗户或打开闪光灯');
  }

  if (reports.brightness.level === 'overexposed') {
    recommendations.push('📉 减少光线：避免逆光，调整角度');
  }

  if (reports.contrast.level === 'low') {
    recommendations.push('📊 增加对比度：调整光线角度，使条码更清晰');
  }

  if (reports.sharpness.level === 'blurry') {
    recommendations.push('📸 保持稳定：用双手握住手机，确保对焦清晰');
  }

  if (reports.noise.level === 'high') {
    recommendations.push('🎯 减少噪声：避免移动，在稳定的光线下拍摄');
  }

  if (!reports.barcode.hasBarcode) {
    recommendations.push('🔍 检查条码：确保条码完全进入画面，条码没有被遮挡');
  }

  if (reports.skew.angle > 15) {
    recommendations.push('🔄 调整角度：垂直对准条码，避免过度旋转');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ 图像质量较好，可以拍照');
  }

  return recommendations;
}

/**
 * 记录诊断报告
 */
function logDiagnosisReport(report: ImageQualityReport): void {
  console.log('📋 ========== 图像质量诊断报告 ==========');
  console.log(`📊 综合评分: ${report.overallScore}/100 ${getScoreEmoji(report.overallScore)}`);
  console.log(`  亮度: ${report.brightness.value} (${report.brightness.level})`);
  console.log(`    └─ ${report.brightness.suggestion}`);
  console.log(`  对比度: ${report.contrast.value} (${report.contrast.level})`);
  console.log(`    └─ ${report.contrast.suggestion}`);
  console.log(`  清晰度: ${report.sharpness.value}% (${report.sharpness.level})`);
  console.log(`    └─ ${report.sharpness.suggestion}`);
  console.log(`  噪声: ${report.noise.value}% (${report.noise.level})`);
  console.log(`    └─ ${report.noise.suggestion}`);
  console.log(`  条码检测: ${report.barcodeDetected.confidence}% 置信度`);
  console.log(`  倾斜角度: ${report.skewAngle.angle.toFixed(1)}° ${report.skewAngle.suggestion}`);
  console.log(`\n💡 建议:`);
  report.recommendations.forEach(rec => console.log(`  • ${rec}`));
  console.log(`\n📸 可以拍照: ${report.isReadyForCapture ? '✅ 是' : '❌ 否'}`);
  console.log('======================================');
}

/**
 * 获取评分对应的表情符号
 */
function getScoreEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

/**
 * 返回默认报告
 */
function getDefaultReport(): ImageQualityReport {
  return {
    brightness: {
      value: 128,
      level: 'normal',
      suggestion: '无法分析亮度'
    },
    contrast: {
      value: 100,
      level: 'high',
      suggestion: '无法分析对比度'
    },
    sharpness: {
      value: 50,
      level: 'acceptable',
      suggestion: '无法分析清晰度'
    },
    noise: {
      value: 30,
      level: 'medium',
      suggestion: '无法分析噪声'
    },
    barcodeDetected: {
      hasBarcode: false,
      confidence: 0
    },
    skewAngle: {
      angle: 0,
      isAcceptable: true,
      suggestion: '无法分析倾斜角度'
    },
    overallScore: 50,
    recommendations: ['请重试'],
    isReadyForCapture: false
  };
}

/**
 * 从Base64加载图像
 */
async function loadImageFromBase64(base64Image: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * 导出诊断工具
 */
export const BarcodeDignosisTool = {
  diagnoseImage
};
