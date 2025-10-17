export enum AnalysisState {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export type AIStrategy = 'CAUTIOUS' | 'VALUE_HUNTER' | 'GOALS_SPECIALIST';

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
  ticket: PredictionItem[];
  overallAnalysis?: string;
}
