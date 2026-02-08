
import { GoogleGenAI, Type } from "@google/genai";
import { analyzeWithOCR } from './services/ocrService';

/**
 * 智能识别服务 - 优先使用 Gemini AI，自动回退到本地 OCR
 * 
 * 模式：
 * 1. 如果配置了 Gemini API Key，使用 Gemini（云端，更准确）
 * 2. 如果未配置或失败，使用 Tesseract.js（本地，完全离线）
 */

export async function analyzePrinterPhoto(base64Image: string) {
  const apiKey = process.env.API_KEY;
  
  // 尝试使用 Gemini AI
  if (apiKey && apiKey !== 'undefined' && apiKey.trim().length > 0) {
    try {
      console.log('🤖 使用 Gemini AI 识别...');
      const result = await analyzeWithGemini(base64Image, apiKey);
      console.log('✅ Gemini AI 识别成功:', result);
      return result;
    } catch (error) {
      console.warn('⚠️ Gemini AI 识别失败，切换到本地 OCR:', error);
      // 继续执行本地 OCR
    }
  } else {
    console.log('ℹ️ Gemini API Key 未配置，使用本地 OCR...');
  }
  
  // 回退到本地 OCR
  try {
    console.log('📷 使用本地 OCR 识别...');
    const result = await analyzeWithOCR(base64Image);
    console.log('✅ 本地 OCR 识别完成:', result);
    return result;
  } catch (error) {
    console.error('❌ 本地 OCR 识别失败:', error);
    throw new Error('Both AI and OCR analysis failed. Please enter serial number manually.');
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
          text: "Extract the printer serial number and model from this image. Return the result in pure JSON format."
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
