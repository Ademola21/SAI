import { PredictionTicket, PredictionItem, PredictionSource } from '../types';

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function makeGeminiRequest(model: string, apiKey: string, body: object, signal?: AbortSignal) {
    const url = `${API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP error! status: ${response.status}` } }));
        const errorMessage = errorData?.error?.message || 'An unknown API error occurred.';
        throw new Error(`Failed to call the Gemini API: ${errorMessage}`);
    }

    return response.json();
}


function base64FromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result) {
            resolve((reader.result as string).split(',')[1]);
        } else {
            reject(new Error("Failed to read file."));
        }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function extractMatchesFromImage(file: File, apiKey: string): Promise<string[]> {
  const base64Data = await base64FromFile(file);
  const model = 'gemini-2.5-flash';
  
  const prompt = `You are an expert OCR tool for sports betting apps. Extract the names of the matches from this screenshot. A match is in the format 'Team A vs Team B'. List only the full match names, one per line. Do not include headers, odds, timestamps, or any other text. If no matches are found, return an empty response.`;

  const body = {
    contents: [
        {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: prompt }
            ]
        }
    ]
  };

  const data = await makeGeminiRequest(model, apiKey, body);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
            -   If **Cautious Analyst**: Your mandate is to be a **"Ticket Protector"**. Your goal is EXTREME risk aversion. You must follow a strict, data-driven, tiered evaluation process to select the single most stable and probable outcome. You must AVOID picking "Draw" as a standalone prediction.

                **Tiered Decision Logic:**

                **Tier 1 – Stability Picks (Highest Priority):** These are your primary considerations.
                -   **Double Chance (“Home or Draw”, “Away or Draw”, “Home or Away”):** The safest fundamental pick, covering two of three outcomes.
                -   **Draw No Bet (“Home”, “Away”):** A very secure option when a draw is a strong possibility you want to insure against.
                -   **Home/Away Clean Sheet (Yes):** Only select this when deep analysis of recent form (last 5 games) and defensive records shows consistent clean sheets against similar-level opponents.

                **Tier 2 – Controlled Defensive Picks (Moderate Safety):** Only consider these if a Tier 1 pick is not suitable.
                -   **Under 2.5 or Under 3.5 Goals:** Only select this if your analysis of both teams’ last 5 matches shows their games average less than 2.4 total goals.
                -   **Handicap +1 or +1.5 (for the underdog):** Only select this if the underdog shows a strong defensive record and a history of narrow losses or draws against superior teams.

                **Tier 3 – Offensive Confidence Picks (Lowest Safety for Cautious Mode):** Only use these when data is overwhelmingly positive.
                -   **Home Win (1) or Away Win (2):** Only select this if your final conviction level is 4/5 or higher (equivalent to ≥ 75% confidence).
                -   **Over 1.5 or Over 2.5 Goals:** Only select this if your analysis shows both teams combined average more than 1.8 goals per game AND both concede often.
                
                **Forbidden Picks (Avoid unless ultra-high confidence ≥ 90% or 5/5 conviction):**
                -   “Over 0.5 Goals” (too low value)
                -   Exact Scores
                -   Over 3.5 Goals or higher (unless justified by Tier 3 logic)

                **Mandatory Safety Evaluation:**
                Before finalizing your pick from the tiers, you MUST cross-check against these factors:
                1.  ✅ Form Consistency (W/D/L patterns)
                2.  ✅ Goals Per Match (For/Against averages)
                3.  ✅ Defensive Record (Clean sheets, goals conceded)
                4.  ✅ Motivation (home advantage, tournament pressure, etc.)
                5.  ✅ Head-to-Head (at least last 5 games)
                6.  ✅ Recent injuries/suspensions (key players missing)

                **Downgrade Rule:** If your analysis finds that **3 or more** of these safety checks are uncertain or negative for your considered pick, you MUST downgrade your pick to a safer Tier. For example, if you considered a 'Home Win' (Tier 3) but Form, H2H, and Injuries are uncertain, you MUST downgrade to a 'Double Chance' (Tier 1) pick instead. Crucially, if you cannot find a pick that meets these extreme standards of safety, your correct and required output is "No Safe Bet Found".

            -   If **Value Hunter** or **Goals Specialist**: You may use any standard betting market.

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
    const model = 'gemini-2.5-flash';
    const prompt = getMasterAnalystPrompt(match);

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
    };
    
    const data = await makeGeminiRequest(model, apiKey, body, signal);
    
    const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: PredictionSource[] = groundingChunks
        .map((chunk: any) => ({
            title: chunk.web?.title || '',
            uri: chunk.web?.uri || '',
        }))
        .filter((source: PredictionSource) => source.uri);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text.trim() || '';
    
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
        while (true) {
            if (signal.aborted) {
                throw new DOMException('Analysis cancelled by user.', 'AbortError');
            }
            
            const task = taskQueue.shift();
            if (!task) {
                break; // No more tasks in the queue
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

    const body = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    const data = await makeGeminiRequest(model, apiKey, body, signal);
    return data.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "Could not generate overall analysis.";
}