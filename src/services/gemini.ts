import { GoogleGenAI, Type } from "@google/genai";
import { AIInsightResponse } from "../types";

export interface InsightPayload {
    basketItems: any[];
    investments: any[];
    settings: any;
    range: string;
    startDateISO: string;
    endDateISO: string;
    computed: {
        personalInflationPct?: number;
        topDrivers?: Array<{ name: string; category?: string; contributionPct?: number }>;
    };
}

export const generateInsights = async (payload: InsightPayload): Promise<AIInsightResponse> => {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Sanitize payload to reduce token count
    const sanitizedBasket = payload.basketItems.map(i => ({
        name: i.name,
        category: i.category,
        price: i.price,
        trend: i.trend,
        startPrice: i.history?.length ? i.history[0].value : i.price
    }));

    const sanitizedInvestments = payload.investments.map(i => ({
        symbol: i.symbol,
        type: i.type,
        qty: i.quantity,
        current: i.currentPrice
    }));

    const prompt = `
    Analyze this personal inflation and investment data.
    Context:
    - User Currency: ${payload.settings.currency}
    - Range: ${payload.range} (${payload.startDateISO} to ${payload.endDateISO})
    - Computed Personal Inflation: ${payload.computed.personalInflationPct?.toFixed(2)}%

    Basket Data: ${JSON.stringify(sanitizedBasket)}
    Investment Data: ${JSON.stringify(sanitizedInvestments)}

    Task:
    Provide a concise JSON response with:
    1. A short summary of their financial health regarding inflation.
    2. Key drivers (items) causing their inflation.
    3. Actionable suggestions to save money or hedge.
    4. A standard financial disclaimer.
    
    Use ONLY the provided JSON. Do NOT invent prices. If data is insufficient, say so.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    drivers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    disclaimer: { type: Type.STRING }
                },
                required: ["summary", "drivers", "suggestions", "disclaimer"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    try {
        return JSON.parse(text) as AIInsightResponse;
    } catch (e) {
        console.error("Failed to parse AI response", text);
        throw new Error("AI response was not valid JSON");
    }
};