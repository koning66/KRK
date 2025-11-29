import { GoogleGenAI, Type, SchemaParams } from "@google/genai";
import { BodyMetrics, AIAnalysis } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: "AIzaSyAWIF2pXfTuqDfMy53bn5Z4VWv_vLSDiQg" });

/**
 * Extracts InBody data from an image (photo of result sheet or QR Code).
 */
export const extractDataFromImage = async (base64Image: string): Promise<Partial<BodyMetrics>> => {
  try {
    const model = "gemini-2.5-flash"; // Flash is excellent for vision tasks
    
    const prompt = `
      Analyze this image. It is either:
      1. A photo of an InBody (or similar) body composition result sheet.
      2. A photo of a QR code containing body composition data.
      
      If it is a QR code, attempt to read the data encoded within it if it is visible text or standard JSON format.
      If it is a result sheet, perform OCR to extract the values.
      
      Extract the following values:
      - Weight (in kg)
      - Skeletal Muscle Mass (in kg)
      - Body Fat Mass (in kg)
      - Percent Body Fat (in %)
      
      Look for labels like "Weight", "SMM", "Muscle Mass", "Body Fat Mass", "PBF", "Percent Body Fat".
      If a value is not clearly visible, return null for that field.
      Return strictly a JSON object.
    `;

    const schema: SchemaParams = {
      type: Type.OBJECT,
      properties: {
        weight: { type: Type.NUMBER, description: "Total body weight in kg" },
        skeletalMuscleMass: { type: Type.NUMBER, description: "Skeletal Muscle Mass in kg" },
        bodyFatMass: { type: Type.NUMBER, description: "Body Fat Mass in kg" },
        percentBodyFat: { type: Type.NUMBER, description: "Percentage of body fat" },
      },
      required: ["weight", "skeletalMuscleMass", "bodyFatMass", "percentBodyFat"],
    };

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");

    return JSON.parse(text) as Partial<BodyMetrics>;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to extract data. Please ensure the text or QR code is clear.");
  }
};

/**
 * Analyzes trends and provides health insights based on history.
 */
export const analyzeTrends = async (history: BodyMetrics[]): Promise<AIAnalysis> => {
  try {
    // Sort by date ascending for the AI context
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // We only send the last 10 records to save tokens and keep context relevant
    const recentHistory = sortedHistory.slice(-10);

    const prompt = `
      You are an expert fitness coach with a tough love, spicy personality. 
      Analyze the following body composition history (JSON).
      Identify trends in Weight, Muscle Mass, and Body Fat.
      
      Provide:
      1. A concise, punchy summary of progress.
      2. Trend direction for Muscle and Fat.
      3. One specific, actionable recommendation to improve results.
      
      Data:
      ${JSON.stringify(recentHistory)}
    `;

    const schema: SchemaParams = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A 1-2 sentence summary of progress." },
        muscleTrend: { type: Type.STRING, enum: ["up", "down", "stable"] },
        fatTrend: { type: Type.STRING, enum: ["up", "down", "stable"] },
        recommendation: { type: Type.STRING, description: "One specific, encouraging piece of advice." },
      },
      required: ["summary", "muscleTrend", "fatTrend", "recommendation"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned");

    return JSON.parse(text) as AIAnalysis;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "Unable to analyze trends at this time.",
      muscleTrend: "stable",
      fatTrend: "stable",
      recommendation: "Keep tracking your data to see long-term results.",
    };
  }
};