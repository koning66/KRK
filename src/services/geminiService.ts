// src/services/geminiService.ts
import { BodyMetrics, AIAnalysis } from "../types";

const apiKey =
  // Vite / Vercel 會在這裡注入環境變數
  (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

console.log("🔑 Gemini Key Loaded:", Boolean(apiKey), apiKey?.slice(0, 5));
// 方便你之後偵錯：如果沒設 API Key，先在 console 提醒
if (!apiKey) {
  console.warn(
    "⚠️ VITE_GEMINI_API_KEY 未設定，影像辨識與趨勢分析將無法使用，將使用預設文字。"
  );
}

export interface ExtractedMetrics {
  weight?: number | null;
  skeletalMuscleMass?: number | null;
  bodyFatMass?: number | null;
  percentBodyFat?: number | null;
}

/** 將 "61.4 kg (43.8~59.2)" 這種字串轉成純數字 */
function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    // 去掉中文字、單位、括號、~ 等，只留數字、小數點、負號
    const cleaned = value.replace(/[^\d.\-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * 解析 InBody / ACCUNIQ 類型的身體組成報表圖片
 * base64Image：不含 "data:image/jpeg;base64," 的純 base64 內容
 */
export async function extractDataFromImage(
  base64Image: string
): Promise<Partial<BodyMetrics>> {
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY – 無法呼叫 Gemini API");
  }

  const prompt = `
你會看到一張「身體組成分析」的量測結果圖片，來源可能是 InBody、ACCUNIQ 或類似的體脂機。

請你只做下面這件事：
從圖片中讀取（如果有顯示）這四個數值：

- weight：體重（kg）
- skeletalMuscleMass：骨骼肌重 / Muscle Mass（kg）
- bodyFatMass：體脂肪重（kg）
- percentBodyFat：體脂肪率（%），有時候叫 PBF、Body Fat %

請特別注意：
- 優先使用主要量測結果，不要用括號裡的「標準範圍」。
- 如果數值的格式像「61.4 kg (43.8~59.2)」，請只取 61.4。
- 如果某一個數值在圖上看不到或不確定，就把那個欄位設為 null，不要亂猜。

請你「只輸出 JSON」，不要加任何解釋文字，也不要放在程式碼區塊裡。
格式例如：

{
  "weight": 61.4,
  "skeletalMuscleMass": 34.8,
  "bodyFatMass": 23.8,
  "percentBodyFat": 38.5
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;



    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg", // PNG 其實也可以，Gemini 都吃得下去
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Gemini API HTTP error:", res.status, errText);
      throw new Error("Gemini API 呼叫失敗");
    }

    const json = await res.json();
    // 官方格式：candidates[0].content.parts[0].text
    const rawText =
      json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    console.log("🔍 Gemini raw response (extract):", rawText);

    // 從回傳文字中取出最外層 { ... } JSON 區段
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Gemini 沒有回傳 JSON 物件");
    }

    const jsonSnippet = rawText.slice(start, end + 1);

    let data: any = {};
    try {
      data = JSON.parse(jsonSnippet);
    } catch (e) {
      console.error("❌ JSON parse error (extract):", e, jsonSnippet);
      throw new Error("無法解析 Gemini 回傳資料");
    }

    const result: ExtractedMetrics = {
      weight: toNumber(data.weight),
      skeletalMuscleMass: toNumber(
        data.skeletalMuscleMass ?? data.muscleMass
      ),
      bodyFatMass: toNumber(data.bodyFatMass),
      percentBodyFat: toNumber(
        data.percentBodyFat ?? data.pbf ?? data.bodyFatPercent
      ),
    };

    console.log("✅ Parsed metrics:", result);
    return result;
  } catch (err) {
    console.error("❌ Gemini Extraction Error:", err);
    throw err;
  }
}

// 🔎 Trend Insight Analysis (English version, allow analysis with 1–2 records)
export const analyzeTrends = async (
  history: BodyMetrics[]
): Promise<AIAnalysis> => {
  // ⬅️ 只有「完全沒有資料」才用預設文字
  if (!history || history.length === 0) {
    return {
      summary:
        "No measurement data yet. Once you start recording, I can help you analyze your trends.",
      muscleTrend: "stable",
      fatTrend: "stable",
      recommendation:
        "Take your first measurement and then keep tracking regularly to see your progress over time.",
    };
  }

  // 沒 API key：不要丟錯，回穩定預設文案（UI 不會壞）
  if (!apiKey) {
    return {
      summary:
        "AI trend analysis is temporarily unavailable. Keep recording your data consistently!",
      muscleTrend: "stable",
      fatTrend: "stable",
      recommendation:
        "Continue regular tracking. More records will reveal better long-term patterns.",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;


    // 和之前一樣，只餵關鍵欄位
    const formattedHistory = history.map((h) => ({
      date: h.date,
      weight: h.weight,
      muscle: h.skeletalMuscleMass,
      fat: h.bodyFatMass,
    }));

    const prompt = `
You are a fitness coach specializing in body composition improvement.

Analyze the following chronological measurement data:
${JSON.stringify(formattedHistory, null, 2)}

Your task:
1. Identify trends for weight, skeletal muscle mass, and fat mass (increasing, decreasing, or roughly stable).
2. Write a short, friendly summary in English (maximum 120 words), speaking directly to the user.
3. Provide a practical, actionable recommendation (e.g., training, nutrition, lifestyle).
4. Output ONLY JSON (no markdown, no extra text).

Format exactly as:
{
  "summary": "...",
  "muscleTrend": "up | down | stable",
  "fatTrend": "up | down | stable",
  "recommendation": "..."
}
`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        "❌ Gemini API HTTP error (analyzeTrends):",
        res.status,
        errText
      );
      return {
        summary:
          "AI could not analyze the data this time, but all your records are safely stored.",
        muscleTrend: "stable",
        fatTrend: "stable",
        recommendation:
          "Try running the trend analysis again later when the AI service is more stable.",
      };
    }

    const json = await res.json();
    const rawText =
      json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log("🔍 Gemini raw response (analyzeTrends):", rawText);

    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("No JSON returned from AI");
    }

    const snippet = rawText.slice(start, end + 1);
    const parsed = JSON.parse(snippet);

    // 簡單補預設值，避免少欄位讓 UI 掛掉
    return {
      summary:
        parsed.summary ||
        "AI analyzed your history but did not provide a detailed summary this time.",
      muscleTrend: parsed.muscleTrend || "stable",
      fatTrend: parsed.fatTrend || "stable",
      recommendation:
        parsed.recommendation ||
        "Keep a consistent routine and continue tracking to see clearer trends.",
    };
  } catch (err) {
    console.error("❌ analyzeTrends Error:", err);
    return {
      summary:
        "An error occurred while running AI trend analysis, but your data is still saved.",
      muscleTrend: "stable",
      fatTrend: "stable",
      recommendation:
        "You can try running the analysis again later, or simply watch your charts for overall direction.",
    };
  }
};
