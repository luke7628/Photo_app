
import { GoogleGenAI, Type } from "@google/genai";

export async function analyzePrinterPhoto(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  } catch (error) {
    console.error("Gemini Production Error:", error);
    // In production, we throw or return a specific error flag
    throw new Error("Analysis failed. Please enter serial number manually.");
  }
}
