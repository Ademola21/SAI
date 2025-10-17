export enum AnalysisState {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export enum PickMode {
    ACCUMULATOR_BUILDER = 'Accumulator Builder',
    VALUE_HUNTER = 'Value Hunter',
    HIGH_REWARD_SINGLE = 'High-Reward Single',
    MARKET_SPECIALIST = 'Market Specialist'
}

export interface PredictionSource {
  title: string;
  uri: string;
}

export interface PredictionReasoning {
  main: string;
  devilsAdvocate: string;
  consideredAlternatives: string;
}

export interface PredictionItem {
  match: string;
  prediction: string;
  conviction: number;
  reasoning: PredictionReasoning;
  sources: PredictionSource[];
  error?: boolean;
}

export interface PredictionTicket {
  id: string;
  savedAt?: string;
  ticket: PredictionItem[];
  overallAnalysis?: string;
  pickModeUsed?: PickMode;
}