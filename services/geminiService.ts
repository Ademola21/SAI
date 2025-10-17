import { GoogleGenAI } from "@google/genai";
import { PredictionTicket, PredictionItem, PredictionSource } from '../types';

function getAiClient(apiKey: string): GoogleGenAI {
    if (!apiKey) {
        throw new Error("Gemini API key not provided.");
    }
    return new GoogleGenAI({ apiKey });
}

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function extractMatchesFromImage(file: File, apiKey: string): Promise<string[]> {
  const ai = getAiClient(apiKey);
  const imagePart = await fileToGenerativePart(file);
  const model = 'gemini-2.5-flash';
  
  const prompt = `You are an expert OCR tool for sports betting apps. Extract the names of the matches from this screenshot. A match is in the format 'Team A vs Team B'. List only the full match names, one per line. Do not include headers, odds, timestamps, or any other text. If no matches are found, return an empty response.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [ imagePart, { text: prompt } ] }
  });

  const text = response.text;
  if (!text.trim()) { return []; }
  return text.trim().split('\n').map(match => match.trim()).filter(Boolean);
}

function getMasterAnalystPrompt(match: string): string {
    return `
        You are a single, unified "Master Football Analyst" AI. Your process is two-fold: first you determine the best analytical strategy for a match, and then you execute a deep analysis using that strategy.

        Analyze the following match:
        - ${match}

        **Step 1: Pre-Analysis & Strategy Selection**
        Perform a high-level pre-analysis to determine the nature of the match. Based on this, you will autonomously adopt one of three internal personas for your deep analysis. You MUST choose one:
        1.  **Cautious Analyst:** Adopt this persona for tight, unpredictable games, derbies, or when data is conflicting. Your goal is extreme risk aversion.
        2.  **Value Hunter:** Adopt this persona when you identify a potential market inefficiency or an outcome with better-than-implied odds. This is for finding smart, calculated risks.
        3.  **Goals Specialist:** Adopt this persona for matches where goal-related markets appear most predictable (e.g., two high-scoring teams meeting, or a defensive stalemate).

        **Step 2: Deep Analysis (using your chosen persona)**
        You must now execute your deep analysis based on the five pillars:
        1.  **Recent Form (Last 5 Games):** Analyze wins, losses, goals scored/conceded. Is there clear momentum?
        2.  **Head-to-Head (H2H) History:** Look for patterns of dominance or recurring outcomes (e.g., always low-scoring).
        3.  **Key Player Analysis:** Identify significant injuries, suspensions, or in-form star players that could heavily influence the game.
        4.  **Match Context & Motivation:** Is this a cup final, a dead-rubber league game, or a relegation battle? What are the stakes?
        5.  **Tactical Matchup:** Compare styles. Does one team's high-press counter the other's build-from-the-back style?

        **Step 3: Prediction & Justification**
        -   **Synthesize & Conclude:** Use web search to gather data for the five pillars and form your own expert conclusion.
        -   **Comparative Reasoning (Devil's Advocate):** You MUST consider at least two other plausible bets and briefly explain why you discarded them. You must also state the single biggest risk to your chosen prediction.
        -   **Select Prediction:** Based on your chosen persona, select a prediction.
            -   If Cautious: Pick ONLY from "Home or Draw", "Away or Draw", "Under 4.5 goals", "Under 3.5 goals", "Over 0.5 goals". If no pick meets these extreme safety standards, you MUST predict "No Safe Bet Found".
            -   If Value Hunter or Goals Specialist: You may use any standard betting market.

        **Step 4: JSON Output**
        Your conviction level (1-5) must be justified by the pillar alignment. Your final output MUST be a single, valid JSON object and nothing else. Do not use markdown.
        {
            "match": "${match}",
            "strategyUsed": "The name of the persona you adopted (e.g., Cautious Analyst, Value Hunter, Goals Specialist)",
            "prediction": "Your specific prediction string.",
            "conviction": A number from 1 to 5,
            "reasoning": {
                "main": "A concise summary (2-3 sentences) of your rationale, mentioning the key pillars that influenced your decision.",
                "consideredAlternatives": "State two other bets you considered and why you rejected them.",
                "devilsAdvocate": "State the single biggest risk to your chosen prediction."
            }
        }
    `;
}

async function analyzeSingleMatch(match: string, signal: AbortSignal, apiKey: string): Promise<PredictionItem> {
    const ai = getAiClient(apiKey);
    const model = 'gemini-2.5-flash';
    const prompt = getMasterAnalystPrompt(match);

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { tools: [{googleSearch: {}}] }
    }, { signal });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: PredictionSource[] = groundingChunks
        .map(chunk => ({
            title: chunk.web?.title || '',
            uri: chunk.web?.uri || '',
        }))
        .filter(source => source.uri);

    const text = response.text.trim();
    
    try {
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) { throw new Error(`No valid JSON object found in the model's response.`); }
        
        const jsonString = jsonMatch[0];
        const result = JSON.parse(jsonString);
        
        if (result && result.match && result.prediction && result.strategyUsed && typeof result.conviction === 'number' && result.reasoning && result.reasoning.main && result.reasoning.devilsAdvocate && result.reasoning.consideredAlternatives) {
            result.conviction = Math.round(result.conviction);
            result.sources = sources;
            return result as PredictionItem;
        }
        throw new Error(`Invalid JSON structure received for match "${match}".`);
    } catch (e) {
        console.error(`Failed to parse JSON for match "${match}":`, text);
        console.error('Original error:', e);
        throw new Error(`The analysis for "${match}" returned an invalid format.`);
    }
}

export async function analyzeMatches(
    matches: string[],
    signal: AbortSignal,
    onProgress: (completed: number, total: number) => void,
    apiKey: string,
): Promise<PredictionTicket> {
    const CONCURRENCY_LIMIT = 3;
    const totalMatches = matches.length;
    const results: (PredictionItem | null)[] = new Array(totalMatches).fill(null);
    let completedCount = 0;
    
    const taskQueue = matches.map((match, index) => ({ match, index }));

    const worker = async () => {
        while (taskQueue.length > 0) {
            if (signal.aborted) {
                throw new DOMException('Analysis cancelled by user.', 'AbortError');
            }

            const task = taskQueue.shift();
            if (!task) {
                break;
            }
            
            const { match, index } = task;

            try {
                const result = await analyzeSingleMatch(match, signal, apiKey);
                results[index] = result;
            } catch (error) {
                if (signal.aborted) {
                    throw new DOMException('Analysis cancelled by user.', 'AbortError');
                }
                
                const reasoningText = (error instanceof Error) ? error.message : "An unknown error occurred.";
                results[index] = {
                    match: match,
                    prediction: "Analysis Failed",
                    conviction: 0,
                    strategyUsed: 'N/A',
                    reasoning: {
                        main: reasoningText,
                        devilsAdvocate: 'N/A',
                        consideredAlternatives: 'N/A'
                    },
                    sources: [],
                    error: true
                };
            } finally {
                if (!signal.aborted) {
                    completedCount++;
                    onProgress(completedCount, totalMatches);
                }
            }
        }
    };

    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(() => worker());
    await Promise.all(workers);

    if (signal.aborted) {
        throw new DOMException('Analysis cancelled by user.', 'AbortError');
    }

    const finalTicketItems = results.filter((item): item is PredictionItem => item !== null);
    return { ticket: finalTicketItems };
}

export async function analyzeOverallTicket(ticket: PredictionTicket, signal: AbortSignal, apiKey: string): Promise<string> {
    const ai = getAiClient(apiKey);
    const model = 'gemini-2.5-flash';
    
    const ticketString = ticket.ticket
        .filter(item => !item.error)
        .map(item => `- ${item.match}: ${item.prediction} (Conviction: ${item.conviction}/5)`)
        .join('\n');

    if (!ticketString) {
        return "No successful predictions were available to analyze.";
    }

    const prompt = `
        You are a world-class senior betting analyst providing a final review of a completed accumulator ticket. Your job is to give a direct, expert opinion on its overall strength. Do not re-analyze the games.

        Here is the compiled ticket:
        ${ticketString}

        Provide a concise "meta-analysis" summary (3-4 sentences). Your summary MUST address the following points with confidence:
        1.  **Risk Assessment:** State the overall risk level (e.g., Low-Risk, Moderate, Ambitious but Plausible, High-Risk).
        2.  **The Banker:** Identify the single pick you consider the "banker" of the slip – the most solid foundation.
        3.  **The Risk:** Identify the single pick that poses the greatest risk to the ticket's success.
        4.  **Expert Verdict:** Give a final, concluding verdict on the ticket's overall chances.

        Provide your response as a single block of text. Do not use markdown formatting.
    `;

    const response = await ai.models.generateContent({
        model, contents: prompt
    }, { signal });

    return response.text.trim();
}