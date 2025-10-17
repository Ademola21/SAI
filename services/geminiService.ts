import { GoogleGenAI } from "@google/genai";
import { PredictionTicket, PredictionItem, AIStrategy, PredictionSource, PredictionReasoning } from '../types';

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

function getPromptForStrategy(match: string, strategy: AIStrategy): string {
    const baseAnalysisFramework = `
        As a world-class football analyst, you must evaluate this match based on our five pillars of analysis:
        1.  **Recent Form (Last 5 Games):** Analyze wins, losses, goals scored/conceded. Is there clear momentum?
        2.  **Head-to-Head (H2H) History:** Look for patterns of dominance or recurring outcomes (e.g., always low-scoring).
        3.  **Key Player Analysis:** Identify significant injuries, suspensions, or in-form star players that could heavily influence the game.
        4.  **Match Context & Motivation:** Is this a cup final, a dead-rubber league game, or a relegation battle? What are the stakes?
        5.  **Tactical Matchup:** Compare styles. Does one team's high-press counter the other's build-from-the-back style?

        Your analytical process is as follows:
        1.  **Synthesize Data:** Use web search to gather data for all five pillars. Cross-reference information to form a holistic view.
        2.  **Form an Expert Conclusion:** Based on your synthesis of the five pillars, perform your own deep analysis.
        3.  **Comparative Reasoning (Devil's Advocate):** Before finalizing your pick, you MUST consider at least two other plausible bets and briefly explain why you discarded them. You must also state the single biggest risk to your chosen prediction.
    `;

    const jsonStructure = `
        Your conviction level (from 1 to 5) must be justified by the alignment of the analytical pillars:
        -   **5/5 Conviction:** All five pillars strongly point to the same outcome.
        -   **3/5 Conviction:** The pillars are mixed (e.g., Form points one way, but H2H points another).
        -   **1/5 Conviction:** The match is highly unpredictable with conflicting signals.

        IMPORTANT: Your final output MUST be a single, valid JSON object and nothing else. Do not add any text before or after the JSON object. Do not use markdown backticks. The JSON object must strictly follow this structure:
        {
            "match": "The original match name string",
            "prediction": "Your specific prediction string, conforming to the allowed formats for your strategy.",
            "conviction": A number from 1 to 5 (integer), based on the pillar alignment,
            "reasoning": {
                "main": "A concise summary (2-3 sentences) explaining your rationale, explicitly mentioning which pillars most heavily influenced your decision.",
                "consideredAlternatives": "Briefly state two other bets you considered and why you rejected them.",
                "devilsAdvocate": "State the single biggest risk or counter-argument to your chosen prediction."
            }
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
        - Over 0.5 goals to Over 4.5 goals
        - Under 0.5 goals to Under 4.5 goals
        - Both Teams To Score (Yes/No)
        - Home/Away Over/Under 0.5/1.5/2.5 goals
        - First/Second Half Over/Under 0.5/1.5 goals
        - Clean Sheet Home/Away (Yes)
        - Team To Score First – Home/Away
        - Win To Nil – Home/Away
        - Goal in Both Halves (Yes/No)
        - Correct Score, Exact Goals, Both Halves Over/Under
    `;

    switch (strategy) {
        case 'VALUE_HUNTER':
            return `
                You are a sharp sports betting analyst AI, an expert at finding "value" bets.

                Analyze the following match:
                - ${match}

                ${baseAnalysisFramework}
                Your task is to find a bet that offers good value, not just the most likely outcome. Your final prediction **MUST** be chosen from the following list:
                ${allPredictionMarkets}

                ${jsonStructure}
            `;
        case 'GOALS_SPECIALIST':
            return `
                You are a specialist sports betting analyst AI with a deep focus on goals markets. 

                Analyze the following match:
                - ${match}

                ${baseAnalysisFramework}
                Your final prediction **MUST** be chosen from this exclusive list of goals-related markets:
                ${goalsPredictionMarkets}

                ${jsonStructure}
            `;
        case 'CAUTIOUS': // Ultra-Risk-Averse Analyst
        default:
            return `
                You are an AI analyst with an extreme, almost paranoid, aversion to risk. Your ONLY objective is to use the Five Pillars of Analysis to identify a single betting outcome that is so overwhelmingly probable it is almost a certainty.

                Analyze the following match:
                - ${match}
                
                ${baseAnalysisFramework}
                You must adhere to these strict rules:
                -   **Forbidden Bets:** You are forbidden from predicting a specific winner (e.g., "Team A to Win") or an exact score.
                -   **Select from this Exclusive Safe List:** Based on your deep analysis, your prediction MUST be one of the following formats: "Home or Draw", "Away or Draw", "Under 4.5 goals", "Under 3.5 goals", "Over 0.5 goals", "Home Over 0.5 goals", "Away Over 0.5 goals".
                -   **Honest Assessment:** If, after your analysis, you cannot find a pick that meets these extreme safety standards, your prediction **MUST BE** "No Safe Bet Found".

                ${jsonStructure}
            `;
    }
}


async function analyzeSingleMatch(match: string, strategy: AIStrategy, signal: AbortSignal, apiKey: string): Promise<PredictionItem> {
    const ai = getAiClient(apiKey);
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
        
        if (result && result.match && result.prediction && typeof result.conviction === 'number' && result.reasoning && result.reasoning.main && result.reasoning.devilsAdvocate && result.reasoning.consideredAlternatives) {
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
    strategy: AIStrategy,
    signal: AbortSignal,
    onProgress: (completed: number, total: number) => void,
    apiKey: string,
): Promise<PredictionTicket> {
    const CONCURRENCY_LIMIT = 3;
    const totalMatches = matches.length;
    const results: (PredictionItem | null)[] = new Array(totalMatches).fill(null);
    let completedCount = 0;
    let matchIndex = 0;

    const worker = async () => {
        while (matchIndex < totalMatches) {
            if (signal.aborted) {
                throw new DOMException('Analysis cancelled by user.', 'AbortError');
            }

            const currentIndex = matchIndex++;
            if (currentIndex >= totalMatches) {
                break;
            }
            
            const match = matches[currentIndex];

            try {
                const result = await analyzeSingleMatch(match, strategy, signal, apiKey);
                results[currentIndex] = result;
            } catch (error) {
                if (signal.aborted) {
                    throw new DOMException('Analysis cancelled by user.', 'AbortError');
                }
                
                const reasoningText = (error instanceof Error) ? error.message : "An unknown error occurred.";
                results[currentIndex] = {
                    match: match,
                    prediction: "Analysis Failed",
                    conviction: 0,
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