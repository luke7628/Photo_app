/**
 * 实时条码检测服务 - 移动设备优化版本
 * 专为 iPhone 和 Android 优化，提供实时反馈和用户引导
 * 
 * 核心功能：
 * - 实时视频流条码检测
 * - 图像质量预检（拍照前评估）
 * - ROI (Region of Interest) 检测和裁剪
 * - 智能帧率控制（性能优化）
 * - 用户引导系统（靠近/光线/稳定）
 */

export interface RealtimeDetectionResult {
  detected: boolean;
  value?: string;
  format?: string;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageQualityFeedback {
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  ready: boolean; // 是否适合拍照
}

export interface RealtimeDetectionConfig {
  targetFrameRate?: number; // 目标帧率（默认：3 fps，即每333ms一帧）
  minConfidence?: number; // 最小置信度（默认：0.6）
  roiEnabled?: boolean; // 启用ROI裁剪（默认：true）
  roiCenterRatio?: number; // ROI中心区域比例（默认：0.6，即60%）
  qualityCheckEnabled?: boolean; // 启用质量检查（默认：true）
  formatPriority?: string[]; // 格式优先级（默认：CODE_128优先）
}

/**
 * 实时条码检测器类
 * 管理视频流的持续检测和质量评估
 */
export class RealtimeBarcodeDetector {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastDetectionTime = 0;
  private config: Required<RealtimeDetectionConfig>;
  private barcodeDetector: any = null;
  private detectionCallback: ((result: RealtimeDetectionResult) => void) | null = null;
  private qualityCallback: ((quality: ImageQualityFeedback) => void) | null = null;

  constructor(config: RealtimeDetectionConfig = {}) {
    this.config = {
      targetFrameRate: config.targetFrameRate ?? 3,
      minConfidence: config.minConfidence ?? 0.6,
      roiEnabled: config.roiEnabled ?? true,
      roiCenterRatio: config.roiCenterRatio ?? 0.6,
      qualityCheckEnabled: config.qualityCheckEnabled ?? true,
      formatPriority: config.formatPriority ?? ['code_128', 'qr_code', 'code_39'],
    };

    // 创建离屏canvas用于图像处理
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    // 初始化BarcodeDetector API（如果支持）
    this.initBarcodeDetector();
  }

  private async initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await (window as any).BarcodeDetector.getSupportedFormats();
        console.log('✅ [RealtimeDetector] BarcodeDetector支持的格式:', formats);
        this.barcodeDetector = new (window as any).BarcodeDetector({
          formats: formats,
        });
      } catch (error) {
        console.warn('⚠️ [RealtimeDetector] BarcodeDetector初始化失败:', error);
      }
    } else {
      console.warn('⚠️ [RealtimeDetector] 浏览器不支持BarcodeDetector API');
    }
  }

  /**
   * 启动实时检测
   * @param video - 视频元素
   * @param onDetection - 检测到条码时的回调
   * @param onQualityUpdate - 质量更新时的回调
   */
  public start(
    video: HTMLVideoElement,
    onDetection: (result: RealtimeDetectionResult) => void,
    onQualityUpdate?: (quality: ImageQualityFeedback) => void
  ) {
    if (this.isRunning) {
      console.warn('⚠️ [RealtimeDetector] 已在运行中');
      return;
    }

    this.video = video;
    this.detectionCallback = onDetection;
    this.qualityCallback = onQualityUpdate ?? null;
    this.isRunning = true;
    this.lastDetectionTime = 0;

    console.log('🚀 [RealtimeDetector] 启动实时检测', this.config);
    this.loop();
  }

  /**
   * 停止实时检测
   */
  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('⏹️ [RealtimeDetector] 已停止实时检测');
  }

  /**
   * 主循环：按目标帧率检测条码
   */
  private loop() {
    if (!this.isRunning || !this.video) return;

    this.animationFrameId = requestAnimationFrame(() => {
      const now = performance.now();
      const targetInterval = 1000 / this.config.targetFrameRate;

      if (now - this.lastDetectionTime >= targetInterval) {
        this.lastDetectionTime = now;
        this.processFrame();
      }

      this.loop();
    });
  }

  /**
   * 处理单帧：检测条码 + 质量评估
   */
  private async processFrame() {
    if (!this.video || this.video.videoWidth === 0) return;

    try {
      // 1. 捕获视频帧
      const frameData = this.captureFrame();
      if (!frameData) return;

      // 2. 质量评估（如果启用）
      if (this.config.qualityCheckEnabled && this.qualityCallback) {
        const quality = this.assessFrameQuality(frameData);
        this.qualityCallback(quality);
        
        // 如果质量太差，不进行条码检测（节省性能）
        if (quality.score < 30) {
          return;
        }
      }

      // 3. 条码检测
      await this.detectBarcode(frameData);
    } catch (error) {
      console.error('❌ [RealtimeDetector] 处理帧失败:', error);
    }
  }

  /**
   * 从视频流捕获帧（带ROI裁剪）
   */
  private captureFrame(): ImageData | null {
    if (!this.video) return null;

    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) return null;

    let captureX = 0;
    let captureY = 0;
    let captureWidth = videoWidth;
    let captureHeight = videoHeight;

    // ROI裁剪：只处理中心区域（提升性能 + 引导用户对准）
    if (this.config.roiEnabled) {
      const ratio = this.config.roiCenterRatio;
      captureWidth = Math.floor(videoWidth * ratio);
      captureHeight = Math.floor(videoHeight * ratio);
      captureX = Math.floor((videoWidth - captureWidth) / 2);
      captureY = Math.floor((videoHeight - captureHeight) / 2);
    }

    // 额外降低分辨率以提升性能（最大800px宽度）
    const maxWidth = 800;
    let processWidth = captureWidth;
    let processHeight = captureHeight;
    if (captureWidth > maxWidth) {
      const scale = maxWidth / captureWidth;
      processWidth = maxWidth;
      processHeight = Math.floor(captureHeight * scale);
    }

    this.canvas.width = processWidth;
    this.canvas.height = processHeight;

    // 绘制视频帧到canvas（带裁剪和缩放）
    this.ctx.drawImage(
      this.video,
      captureX,
      captureY,
      captureWidth,
      captureHeight,
      0,
      0,
      processWidth,
      processHeight
    );

    return this.ctx.getImageData(0, 0, processWidth, processHeight);
  }

  /**
   * 检测条码（使用BarcodeDetector API）
   */
  private async detectBarcode(frameData: ImageData) {
    if (!this.barcodeDetector || !this.detectionCallback) return;

    try {
      const barcodes = await this.barcodeDetector.detect(frameData);

      if (barcodes && barcodes.length > 0) {
        // 找到置信度最高的条码
        const bestBarcode = barcodes[0];
        const confidence = this.estimateConfidence(bestBarcode);

        if (confidence >= this.config.minConfidence) {
          const result: RealtimeDetectionResult = {
            detected: true,
            value: bestBarcode.rawValue,
            format: bestBarcode.format,
            confidence: confidence,
            boundingBox: bestBarcode.boundingBox
              ? {
                  x: bestBarcode.boundingBox.x,
                  y: bestBarcode.boundingBox.y,
                  width: bestBarcode.boundingBox.width,
                  height: bestBarcode.boundingBox.height,
                }
              : undefined,
          };

          this.detectionCallback(result);
        } else {
          // 检测到但置信度不足
          this.detectionCallback({ detected: false });
        }
      } else {
        // 未检测到
        this.detectionCallback({ detected: false });
      }
    } catch (error) {
      console.error('❌ [RealtimeDetector] 条码检测失败:', error);
      this.detectionCallback({ detected: false });
    }
  }

  /**
   * 评估帧质量（亮度、对比度、清晰度）
   */
  private assessFrameQuality(frameData: ImageData): ImageQualityFeedback {
    const data = frameData.data;
    const pixelCount = data.length / 4;

    // 1. 计算亮度
    let brightness = 0;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      brightness += luminance;
      minBrightness = Math.min(minBrightness, luminance);
      maxBrightness = Math.max(maxBrightness, luminance);
    }

    brightness /= pixelCount;
    const contrast = maxBrightness - minBrightness;

    // 2. 评估清晰度（边缘检测 - Sobel算子）
    const sharpness = this.calculateSharpness(frameData);

    // 3. 生成质量评分和反馈
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 亮度检查
    if (brightness < 50) {
      score -= 30;
      issues.push('Too dark');
      suggestions.push('💡 Improve lighting or enable flashlight');
    } else if (brightness > 220) {
      score -= 20;
      issues.push('Overexposed');
      suggestions.push('☀️ Reduce lighting or move away from light source');
    }

    // 对比度检查
    if (contrast < 30) {
      score -= 25;
      issues.push('Low contrast');
      suggestions.push('📐 Adjust angle or improve lighting');
    }

    // 清晰度检查
    if (sharpness < 10) {
      score -= 30;
      issues.push('Blurry');
      suggestions.push('📷 Hold steady and wait for autofocus');
    }

    // 距离建议（基于条码占比）
    const barcodeArea = this.estimateBarcodeArea(frameData);
    if (barcodeArea < 0.05) {
      score -= 15;
      issues.push('Too far');
      suggestions.push('👁️ Move closer to barcode');
    } else if (barcodeArea > 0.7) {
      score -= 10;
      issues.push('Too close');
      suggestions.push('⬅️ Move back slightly');
    }

    score = Math.max(0, Math.min(100, score));
    const ready = score >= 70 && issues.length === 0;

    return {
      score,
      issues,
      suggestions,
      ready,
    };
  }

  /**
   * 计算图像清晰度（Sobel边缘检测）
   */
  private calculateSharpness(frameData: ImageData): number {
    const { data, width, height } = frameData;
    let edgeStrength = 0;
    let sampleCount = 0;

    // 采样：每4个像素检测一次（性能优化）
    for (let y = 1; y < height - 1; y += 4) {
      for (let x = 1; x < width - 1; x += 4) {
        const idx = (y * width + x) * 4;
        const center = data[idx];
        const left = data[idx - 4];
        const right = data[idx + 4];
        const top = data[idx - width * 4];
        const bottom = data[idx + width * 4];

        const gx = Math.abs(right - left);
        const gy = Math.abs(bottom - top);
        const gradient = Math.sqrt(gx * gx + gy * gy);

        edgeStrength += gradient;
        sampleCount++;
      }
    }

    return sampleCount > 0 ? edgeStrength / sampleCount : 0;
  }

  /**
   * 估算条码占图像的面积比例（简单的边缘密度检测）
   */
  private estimateBarcodeArea(frameData: ImageData): number {
    // 简化版本：假设条码区域的边缘密度较高
    const { data, width, height } = frameData;
    let edgePixels = 0;
    const totalPixels = width * height;

    // 采样检测
    for (let y = 0; y < height - 1; y += 4) {
      for (let x = 0; x < width - 1; x += 4) {
        const idx = (y * width + x) * 4;
        const center = data[idx];
        const right = data[idx + 4];
        const bottom = data[idx + width * 4];

        if (Math.abs(center - right) > 30 || Math.abs(center - bottom) > 30) {
          edgePixels++;
        }
      }
    }

    const edgeDensity = (edgePixels * 16) / totalPixels; // 乘以16因为采样间隔为4
    return Math.min(1, edgeDensity * 2); // 归一化到0-1
  }

  /**
   * 估算条码置信度（基于BarcodeDetector结果）
   */
  private estimateConfidence(barcode: any): number {
    // BarcodeDetector API不直接返回置信度，我们根据以下因素估算：
    // 1. 是否有完整的boundingBox
    // 2. 条码值的长度和格式
    
    let confidence = 0.5; // 基础置信度

    if (barcode.boundingBox) {
      confidence += 0.2; // 有边界框 +20%
    }

    if (barcode.cornerPoints && barcode.cornerPoints.length === 4) {
      confidence += 0.15; // 有四个角点 +15%
    }

    if (barcode.rawValue && barcode.rawValue.length >= 8) {
      confidence += 0.15; // 值长度合理 +15%
    }

    return Math.min(1, confidence);
  }

  /**
   * 获取当前帧的base64图像（用于调试或手动拍照）
   */
  public captureCurrentFrame(): string | null {
    const frameData = this.captureFrame();
    if (!frameData) return null;

    // 将ImageData放回canvas
    this.ctx.putImageData(frameData, 0, 0);
    return this.canvas.toDataURL('image/jpeg', 0.9);
  }
}

/**
 * 工厂函数：创建实时检测器
 */
export function createRealtimeDetector(
  config?: RealtimeDetectionConfig
): RealtimeBarcodeDetector {
  return new RealtimeBarcodeDetector(config);
}
