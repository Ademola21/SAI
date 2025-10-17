import React, { useState } from 'react';
import { AnalysisState, PredictionTicket } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { LinkIcon } from './icons/LinkIcon';
import { SaveIcon } from './icons/SaveIcon';

interface AnalysisPanelProps {
  analysisState: AnalysisState;
  predictionTicket: PredictionTicket | null;
  error: string | null;
  onStart: () => void;
  onCancel: () => void;
  onReset: () => void;
  hasMatches: boolean;
  analysisProgress: { completed: number; total: number } | null;
  isAnalyzingOverall: boolean;
  isApiKeySet: boolean;
  onSave: () => void;
  isTicketSaved: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysisState,
  predictionTicket,
  error,
  onStart,
  onCancel,
  onReset,
  hasMatches,
  analysisProgress,
  isAnalyzingOverall,
  isApiKeySet,
  onSave,
  isTicketSaved,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyTicketToClipboard = () => {
    if (!predictionTicket) return;

    let ticketText = '--- SPORTYBET AI PREDICTION TICKET ---\n\n';
    
    if (predictionTicket.pickModeUsed) {
        ticketText += `Strategy Used: ${predictionTicket.pickModeUsed}\n\n`;
    }

    if (predictionTicket.overallAnalysis) {
        ticketText += `--- OVERALL ANALYSIS ---\n${predictionTicket.overallAnalysis}\n\n`;
    }
    
    ticketText += '--- PREDICTIONS ---\n\n';

    ticketText += predictionTicket.ticket.map(item => {
        if (item.error) {
            return `Match: ${item.match}\nPrediction: ${item.prediction}\nReason: ${item.reasoning.main}`;
        }
        return `Match: ${item.match}\nPrediction: ${item.prediction}\nConviction: ${'★'.repeat(item.conviction)}${'☆'.repeat(5 - item.conviction)}\nReasoning: ${item.reasoning.main}\nConsidered Alternatives: ${item.reasoning.consideredAlternatives}\nMain Risk: ${item.reasoning.devilsAdvocate}`;
    }).join('\n\n---\n\n');

    navigator.clipboard.writeText(ticketText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy ticket.');
    });
  };

  const renderContent = () => {
    switch (analysisState) {
      case AnalysisState.ANALYZING:
        const progressPercentage = analysisProgress && analysisProgress.total > 0
            ? Math.round((analysisProgress.completed / analysisProgress.total) * 100)
            : 0;

        return (
          <div className="text-center p-8 w-full">
            <div className="inline-block relative">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-cyan-400">AI</div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-200">Analyzing Matches...</h3>
            <p className="text-slate-400 mt-2">Gemini is searching the web and crunching the numbers. This may take a moment.</p>
            
            {analysisProgress && analysisProgress.total > 0 && (
                <div className="mt-6">
                    <div className="flex justify-between mb-1 text-sm font-medium text-slate-400">
                        <span>Progress</span>
                        <span>{analysisProgress.completed} / {analysisProgress.total} Matches</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <button
              onClick={onCancel}
              className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel Analysis
            </button>
          </div>
        );

      case AnalysisState.DONE:
        if (!predictionTicket) return <p>Analysis complete, but no ticket was generated.</p>;
        return (
            <div className="w-full">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-500">
                            AI Prediction Ticket
                        </h2>
                        {predictionTicket.pickModeUsed && (
                             <p className="text-sm text-slate-400 mt-1">Strategy: <span className="font-semibold text-cyan-400">{predictionTicket.pickModeUsed}</span></p>
                        )}
                    </div>
                    <button 
                        onClick={copyTicketToClipboard}
                        disabled={isCopied}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 font-semibold rounded-lg transition-colors ${isCopied ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                    >
                        {isCopied ? <CheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                        {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {isAnalyzingOverall && (
                        <div className="text-center p-4 bg-slate-800 rounded-lg">
                            <p className="text-sm text-slate-400 animate-pulse">Performing overall ticket analysis...</p>
                        </div>
                    )}

                    {predictionTicket.overallAnalysis && (
                        <div className="p-4 rounded-lg bg-slate-900/70 border border-cyan-500/30 shadow-lg animate-fade-in">
                            <h3 className="font-bold text-lg text-cyan-400 mb-2">Overall Ticket Summary</h3>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{predictionTicket.overallAnalysis}</p>
                        </div>
                    )}
                    
                    {predictionTicket.ticket.map((item, index) => (
                        <div key={index} className={`p-4 rounded-lg shadow-lg ${item.error ? 'bg-red-900/30 border border-red-500/50' : 'bg-slate-800'}`}>
                            <h4 className="font-bold text-slate-100">{item.match}</h4>
                            
                            <p className={`font-semibold mt-2 ${item.error ? 'text-red-400' : 'text-cyan-400'}`}>{item.prediction}</p>
                            
                            {!item.error && (
                                <>
                                    <div className="flex items-center my-2">
                                        <span className="text-sm text-slate-400 mr-2">Conviction:</span>
                                        <div className="flex">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <svg key={i} className={`w-5 h-5 ${i < item.conviction ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400">{item.reasoning.main}</p>

                                    <div className="mt-3 text-xs text-slate-500 space-y-2 border-l-2 border-slate-700 pl-3">
                                        <p><span className="font-semibold text-slate-400">Considered Alternatives:</span> {item.reasoning.consideredAlternatives}</p>
                                        <p><span className="font-semibold text-red-400">Main Risk:</span> {item.reasoning.devilsAdvocate}</p>
                                    </div>

                                    {item.sources && item.sources.length > 0 && (
                                        <details className="mt-3 group">
                                            <summary className="text-xs text-slate-500 cursor-pointer group-hover:text-slate-400 transition-colors flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3"/>
                                                Show Sources
                                            </summary>
                                            <ul className="mt-2 pl-2 border-l border-slate-700 space-y-1">
                                                {item.sources.map((source, i) => (
                                                    <li key={i}>
                                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline truncate block" title={source.uri}>
                                                            {source.title || new URL(source.uri).hostname}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </>
                            )}

                            {item.error && (
                                <p className="text-sm text-red-300 mt-2">{item.reasoning.main}</p>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                     <button
                        onClick={onSave}
                        disabled={isTicketSaved}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                    >
                        <SaveIcon className="w-5 h-5"/>
                        {isTicketSaved ? 'Saved' : 'Save Analysis'}
                    </button>
                    <button
                        onClick={onReset}
                        className="flex-1 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Start New Analysis
                    </button>
                </div>
            </div>
        );

      case AnalysisState.ERROR:
        return (
          <div className="text-center p-8 bg-red-900/20 border border-red-500/50 rounded-lg">
            <h3 className="text-xl font-semibold text-red-400">An Error Occurred</h3>
            <p className="text-slate-300 mt-2">{error}</p>
            <button
              onClick={onReset}
              className="mt-6 px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default: // IDLE
        return (
            <div className="text-center p-8">
                <h3 className="text-xl font-semibold text-slate-200">
                    {isApiKeySet ? 'Ready for Analysis' : 'API Key Required'}
                </h3>
                <p className="text-slate-400 mt-2">
                    {!isApiKeySet 
                        ? "Please set your Gemini API key above to enable analysis."
                        : hasMatches 
                            ? "Select your strategy and press Start to begin the AI-powered prediction." 
                            : "Upload screenshots or add a match manually to build your list."}
                </p>
                <button
                    onClick={onStart}
                    disabled={!hasMatches || analysisState !== AnalysisState.IDLE || !isApiKeySet}
                    className="mt-6 px-8 py-3 bg-emerald-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                    Start Analysis
                </button>
            </div>
        );
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
      {renderContent()}
    </div>
  );
};

export default AnalysisPanel;