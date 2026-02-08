
import { GoogleGenAI, Type } from "@google/genai";
import { analyzeWithOCR } from './services/ocrService';
import { readBarcode } from './services/barcodeService';

/**
 * 三重识别系统 - 最高准确率方案
 * 
 * 识别策略（按优先级）：
 * 1. 条形码识别（最准确，针对序列号）
 * 2. Gemini AI（云端，全面识别）
 * 3. 本地 OCR（离线备用）
 */

export async function analyzePrinterPhoto(base64Image: string) {
  let serialNumber = '';
  let model = '';
  
  // ============================================
  // 策略 1: 尝试条形码识别（获取序列号）
  // ============================================
  try {
    console.log('📊 尝试条形码识别...');
    const barcodeResult = await readBarcode(base64Image);
    if (barcodeResult && barcodeResult.length >= 10) {
      serialNumber = barcodeResult;
      console.log('✅ 条形码识别成功，序列号:', serialNumber);
    }
  } catch (error) {
    console.log('ℹ️ 条形码识别跳过:', error);
  }
  
  // ============================================
  // 策略 2: 尝试 Gemini AI（完整识别）
  // ============================================
  const apiKey = process.env.API_KEY;
  if (apiKey && apiKey !== 'undefined' && apiKey.trim().length > 0) {
    try {
      console.log('🤖 使用 Gemini AI 识别...');
      const geminiResult = await analyzeWithGemini(base64Image, apiKey);
      console.log('✅ Gemini AI 识别成功:', geminiResult);
      
      // 如果没有从条形码得到序列号，使用 Gemini 的结果
      if (!serialNumber && geminiResult.serialNumber) {
        serialNumber = geminiResult.serialNumber;
      }
      
      // 型号优先使用 Gemini 的结果（更准确）
      if (geminiResult.model) {
        model = geminiResult.model;
      }
      
      // 如果 Gemini 给出了完整结果，直接返回
      if (serialNumber && model) {
        return { serialNumber, model, confidence: geminiResult.confidence || 0.9 };
      }
    } catch (error) {
      console.warn('⚠️ Gemini AI 识别失败，切换到本地 OCR:', error);
    }
  } else {
    console.log('ℹ️ Gemini API Key 未配置，跳过云端识别');
  }
  
  // ============================================
  // 策略 3: 本地 OCR 识别（备用/补充）
  // ============================================
  try {
    console.log('📷 使用本地 OCR 识别...');
    const ocrResult = await analyzeWithOCR(base64Image);
    console.log('✅ 本地 OCR 识别完成:', ocrResult);
    
    // 补充缺失的信息
    if (!serialNumber && ocrResult.serialNumber) {
      serialNumber = ocrResult.serialNumber;
    }
    if (!model && ocrResult.model) {
      model = ocrResult.model;
    }
    
    return {
      serialNumber: serialNumber || ocrResult.serialNumber,
      model: model || ocrResult.model,
      confidence: ocrResult.confidence
    };
  } catch (error) {
    console.error('❌ 所有识别方法均失败:', error);
    
    // 返回已获取的部分信息
    if (serialNumber || model) {
      return {
        serialNumber: serialNumber || '',
        model: model || 'ZT411',
        confidence: 0.5
      };
    }
    
    throw new Error('All recognition methods failed. Please enter serial number manually.');
  }
}

/**
 * 使用 Gemini AI 进行识别
 */
async function analyzeWithGemini(base64Image: string, apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `Analyze this Zebra printer label image and extract the following information:
1. Serial Number (usually after "Serial No." or in the barcode, 10-15 characters)
2. Model (usually after "Model" or "Model/Modèle", like ZT411, ZT421)

Return the result in JSON format with serialNumber and model fields.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          serialNumber: { type: Type.STRING },
          model: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["serialNumber", "model"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}
