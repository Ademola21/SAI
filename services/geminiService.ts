import { GoogleGenAI } from "@google/genai";
import { PredictionTicket, PredictionItem, AIStrategy, PredictionSource } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export async function extractMatchesFromImage(file: File): Promise<string[]> {
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

function getPromptForStrategy(match: string, strategy: AIStrategy): string {
    const baseAnalysis = `
        Your analytical process is as follows:
        1.  **Synthesize Data:** Use your web search capabilities to gather data from multiple sources on form, H2H, player news, and team stats. Do not trust a single source. Cross-reference the information to form a holistic view.
        2.  **Perform Your Own Analysis:** Based on the synthesized data, perform your own deep analysis. Identify the core strengths and weaknesses of each team. What is the most likely narrative of this match? Is it a high-scoring affair, a tight defensive battle, or a one-sided victory? Your analysis is your own; you do not simply repeat what you find on web pages.
    `;

    const jsonStructure = `
        IMPORTANT: Your final output MUST be a single, valid JSON object and nothing else. Do not add any text before or after the JSON object. Do not use markdown backticks. The JSON object must strictly follow this structure:
        {
            "match": "The original match name string",
            "prediction": "Your specific prediction string, conforming to the allowed formats for your strategy.",
            "confidence": A number from 1 to 5 (integer),
            "reasoning": "A concise summary (2-3 sentences) explaining the rationale for your expert, data-driven pick."
        }
    `;
    
    const allPredictionMarkets = `
        - Home win (1)
        - Away win (2)
        - Home or Away
        - Home or Draw
        - Away or Draw
        - Over 0.5 goals
        - Over 1.5 goals
        - Over 2.5 goals
        - Over 3.5 goals
        - Over 4.5 goals
        - Under 0.5 goals
        - Under 1.5 goals
        - Under 2.5 goals
        - Under 3.5 goals
        - Under 4.5 goals
        - Both Teams To Score (Yes)
        - Both Teams To Score (No)
        - Home Over 0.5 goals
        - Home Over 1.5 goals
        - Home Over 2.5 goals
        - Away Over 0.5 goals
        - Away Over 1.5 goals
        - Away Over 2.5 goals
        - Handicap Home -1
        - Handicap Away -1
        - Handicap Home +1
        - Handicap Away +1
        - First Half Home
        - First Half Away
        - First Half Over 0.5
        - First Half Over 1.5
        - First Half Under 0.5
        - First Half Under 1.5
        - Second Half Home
        - Second Half Away
        - Second Half Over 0.5
        - Second Half Over 1.5
        - Second Half Under 0.5
        - Second Half Under 1.5
        - Clean Sheet Home (Yes)
        - Clean Sheet Away (Yes)
        - Team To Score First – Home
        - Team To Score First – Away
        - Win To Nil – Home
        - Win To Nil – Away
        - Goal in Both Halves (Yes)
        - Goal in Both Halves (No)
        - Correct Score (e.g., "Correct Score: 1-0")
        - Exact Goals – 0 goals
        - Exact Goals – 1 goal
        - Exact Goals – 2 goals
        - Exact Goals – 3 goals
        - Exact Goals – 4+ goals
        - Total Corners Over 7.5
        - Total Corners Under 7.5
        - Total Corners Over 9.5
        - Total Corners Under 9.5
        - Home Corners Over 4.5
        - Away Corners Over 4.5
        - Booking Points Over 30.5
        - Booking Points Over 50.5
        - Booking Points Under 30.5
        - Draw No Bet – Home
        - Draw No Bet – Away
        - Both Halves Over 0.5
        - Both Halves Over 1.5
    `;

    const goalsPredictionMarkets = `
        - Over 0.5 goals
        - Over 1.5 goals
        - Over 2.5 goals
        - Over 3.5 goals
        - Over 4.5 goals
        - Under 0.5 goals
        - Under 1.5 goals
        - Under 2.5 goals
        - Under 3.5 goals
        - Under 4.5 goals
        - Both Teams To Score (Yes)
        - Both Teams To Score (No)
        - Home Over 0.5 goals
        - Home Over 1.5 goals
        - Home Over 2.5 goals
        - Away Over 0.5 goals
        - Away Over 1.5 goals
        - Away Over 2.5 goals
        - First Half Over 0.5
        - First Half Over 1.5
        - First Half Under 0.5
        - First Half Under 1.5
        - Second Half Over 0.5
        - Second Half Over 1.5
        - Second Half Under 0.5
        - Second Half Under 1.5
        - Clean Sheet Home (Yes)
        - Clean Sheet Away (Yes)
        - Team To Score First – Home
        - Team To Score First – Away
        - Win To Nil – Home
        - Win To Nil – Away
        - Goal in Both Halves (Yes)
        - Goal in Both Halves (No)
        - Correct Score (e.g., "Correct Score: 2-1")
        - Exact Goals – 0 goals
        - Exact Goals – 1 goal
        - Exact Goals – 2 goals
        - Exact Goals – 3 goals
        - Exact Goals – 4+ goals
        - Both Halves Over 0.5
        - Both Halves Over 1.5
    `;

    switch (strategy) {
        case 'VALUE_HUNTER':
            return `
                You are a sharp sports betting analyst AI, an expert at finding "value" bets where the perceived odds are higher than the actual probability.

                Analyze the following match:
                - ${match}

                ${baseAnalysis}
                3.  **Identify Value:** Your task is to find a bet that offers good value, not just the most likely outcome. This may involve looking at handicaps, specific goal totals, or other non-mainstream markets if you find a statistical edge. Your reasoning must justify why you believe this is a value bet compared to market expectations.
                4.  **Select Prediction Format:** Your final prediction **MUST** be chosen from the following list of allowed formats:
                    ${allPredictionMarkets}

                ${jsonStructure}
            `;
        case 'GOALS_SPECIALIST':
            return `
                You are a specialist sports betting analyst AI with a deep focus on goals markets. 

                Analyze the following match with the primary goal of finding the most probable goals-related bet:
                - ${match}

                ${baseAnalysis}
                3.  **Find the Goals Angle:** Focus your analysis on scoring and defensive capabilities.
                4.  **Select Prediction Format:** Your final prediction **MUST** be chosen from this exclusive list of goals-related markets:
                    ${goalsPredictionMarkets}

                ${jsonStructure}
            `;
        case 'CAUTIOUS': // Ultra-Cautious Analyst (default)
        default:
            return `
                You are an AI analyst with an extreme, almost paranoid, aversion to risk. Your ONLY objective is to identify a single betting outcome that is so overwhelmingly probable it is almost a certainty. You are not trying to find value or decent odds; you are trying to find the safest possible pick, even if the implied odds are very low.

                Analyze the following match:
                - ${match}
                
                ${baseAnalysis}
                3.  **Apply Ultra-Safe Filter:** You must adhere to these strict rules:
                    -   **DO NOT** predict a specific winner (e.g., "Team A to Win"). This is too risky.
                    -   **DO NOT** predict an exact score.
                    -   Your prediction **MUST** come from this exclusive list of ultra-low-risk markets:
                        *   **Double Chance (e.g., "Home or Draw")**: If a team is overwhelmingly dominant.
                        *   **Draw No Bet (e.g., "Draw No Bet - Home")**: A very strong alternative to Double Chance.
                        *   **Over 0.5 Total Goals**: If there is almost no conceivable scenario where the match ends 0-0. This is a primary consideration.
                        *   **A dominant team to score Over 0.5 Goals (e.g., "Home Over 0.5 goals")**: If a top-tier team is playing a much weaker opponent.
                        *   **Under [High Number] Goals (e.g., "Under 5.5 goals")**: If both teams are extremely defensive and low-scoring.
                4.  **Honest Assessment:** If, after your deep analysis, you cannot find a single pick that meets these extreme safety standards, your prediction **MUST BE** "No Safe Bet Found". In this case, your reasoning should explain why all potential bets carry too much risk.

                ${jsonStructure}
            `;
    }
}


async function analyzeSingleMatch(match: string, strategy: AIStrategy, signal: AbortSignal): Promise<PredictionItem> {
    const model = 'gemini-2.5-flash';
    const prompt = getPromptForStrategy(match, strategy);

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
        
        if (result && result.match && result.prediction && typeof result.confidence === 'number' && result.reasoning) {
            result.confidence = Math.round(result.confidence);
            result.sources = sources; // Add the extracted sources
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
    strategy: AIStrategy,
    signal: AbortSignal,
    onProgress: (completed: number, total: number) => void
): Promise<PredictionTicket> {
    const ticketItems: PredictionItem[] = [];
    let completedCount = 0;
    const totalMatches = matches.length;

    for (const match of matches) {
        if (signal.aborted) {
            throw new DOMException('Analysis cancelled by user.', 'AbortError');
        }

        try {
            const result = await analyzeSingleMatch(match, strategy, signal);
            ticketItems.push(result);
        } catch (error) {
            // Don't throw if the request was aborted, just add the error item
            if (signal.aborted) {
                 throw new DOMException('Analysis cancelled by user.', 'AbortError');
            }
            console.error(`Analysis failed for match: ${match}`, error);
            ticketItems.push({
                match: match,
                prediction: "Analysis Failed",
                confidence: 0,
                reasoning: (error instanceof Error) ? error.message : "An unknown error occurred.",
                sources: [],
                error: true
            });
        }

        completedCount++;
        onProgress(completedCount, totalMatches);
    }
    
    if (signal.aborted) {
        throw new DOMException('Analysis cancelled by user.', 'AbortError');
    }

    return { ticket: ticketItems };
}

export async function analyzeOverallTicket(ticket: PredictionTicket, signal: AbortSignal): Promise<string> {
    const model = 'gemini-2.5-flash';
    
    const ticketString = ticket.ticket
        .filter(item => !item.error)
        .map(item => `- ${item.match}: ${item.prediction} (Confidence: ${item.confidence}/5)`)
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