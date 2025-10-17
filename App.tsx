import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisState, PredictionTicket, AIStrategy } from './types';
import { extractMatchesFromImage, analyzeMatches, analyzeOverallTicket } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import MatchList from './components/MatchList';
import AnalysisPanel from './components/AnalysisPanel';
import ManualEntry from './components/ManualEntry';
import StrategySelector from './components/StrategySelector';
import Toast from './components/Toast';

const App: React.FC = () => {
  const [matches, setMatches] = useState<string[]>(() => {
    try {
      const savedMatches = window.localStorage.getItem('matches');
      return savedMatches ? JSON.parse(savedMatches) : [];
    } catch (error) {
      console.error("Failed to parse matches from localStorage", error);
      return [];
    }
  });

  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [predictionTicket, setPredictionTicket] = useState<PredictionTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isAnalyzingOverall, setIsAnalyzingOverall] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<AIStrategy>('CAUTIOUS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const analysisAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    window.localStorage.setItem('matches', JSON.stringify(matches));
  }, [matches]);
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleImagesUpload = useCallback(async (files: File[]) => {
    setAnalysisState(AnalysisState.EXTRACTING);
    setError(null);
    try {
      const extractionPromises = files.map(file => extractMatchesFromImage(file));
      const results = await Promise.all(extractionPromises);
      const newMatches = results.flat();
      
      let addedCount = 0;
      let duplicateCount = 0;

      setMatches(prevMatches => {
        const uniqueNewMatches = newMatches.filter(m => !prevMatches.includes(m));
        addedCount = uniqueNewMatches.length;
        duplicateCount = newMatches.length - addedCount;
        return [...prevMatches, ...uniqueNewMatches];
      });

      if (duplicateCount > 0) {
        showToast(`${duplicateCount} duplicate match${duplicateCount > 1 ? 'es were' : ' was'} ignored.`);
      }

      setAnalysisState(AnalysisState.IDLE);
    } catch (err) {
      console.error(err);
      setError('Failed to extract matches from the image. Please try a clearer screenshot.');
      setAnalysisState(AnalysisState.ERROR);
    }
  }, []);

  const handleAddManualMatch = useCallback((match: string) => {
    if (match && !matches.includes(match)) {
      setMatches(prev => [...prev, match]);
    } else if (matches.includes(match)) {
        showToast("This match is already in the list.");
    }
  }, [matches]);

  const handleStartAnalysis = useCallback(async () => {
    if (matches.length === 0) return;

    setAnalysisState(AnalysisState.ANALYZING);
    setError(null);
    setPredictionTicket(null);
    setAnalysisProgress({ completed: 0, total: matches.length });

    analysisAbortController.current = new AbortController();
    const signal = analysisAbortController.current.signal;

    try {
      const onProgress = (completed: number, total: number) => {
        setAnalysisProgress({ completed, total });
      };

      const result = await analyzeMatches(matches, aiStrategy, signal, onProgress);
      setPredictionTicket(result);
      setAnalysisState(AnalysisState.DONE);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Analysis was cancelled.');
        setAnalysisState(AnalysisState.IDLE);
      } else {
        console.error(err);
        setError('An error occurred during analysis. The model may be unavailable or the request timed out. Please try again.');
        setAnalysisState(AnalysisState.ERROR);
      }
    } finally {
        analysisAbortController.current = null;
    }
  }, [matches, aiStrategy]);

  useEffect(() => {
    const hasRunOverallAnalysis = !!predictionTicket?.overallAnalysis;
    if (analysisState === AnalysisState.DONE && predictionTicket && !hasRunOverallAnalysis && !isAnalyzingOverall) {
      const performOverallAnalysis = async () => {
        setIsAnalyzingOverall(true);
        try {
          const controller = new AbortController(); 
          const summary = await analyzeOverallTicket(predictionTicket, controller.signal);
          setPredictionTicket(prev => prev ? { ...prev, overallAnalysis: summary } : null);
        } catch (err) {
          console.error("Failed to get overall ticket analysis:", err);
        } finally {
          setIsAnalyzingOverall(false);
        }
      };
      performOverallAnalysis();
    }
  }, [analysisState, predictionTicket, isAnalyzingOverall]);

  const handleCancelAnalysis = useCallback(() => {
    if (analysisAbortController.current) {
        analysisAbortController.current.abort();
    }
  }, []);

  const handleReset = useCallback(() => {
    setMatches([]);
    setAnalysisState(AnalysisState.IDLE);
    setPredictionTicket(null);
    setError(null);
    setAnalysisProgress(null);
    setIsAnalyzingOverall(false);
    if(analysisAbortController.current) {
        analysisAbortController.current.abort();
    }
    window.localStorage.removeItem('matches');
  }, []);
  
  const handleClearMatches = useCallback(() => {
      setMatches([]);
      window.localStorage.removeItem('matches');
  }, []);

  const handleDeleteMatch = useCallback((indexToDelete: number) => {
    setMatches(prevMatches => prevMatches.filter((_, index) => index !== indexToDelete));
  }, []);

  return (
    <>
      <Toast message={toastMessage} />
      <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
              <ImageUploader 
                onImagesUpload={handleImagesUpload} 
                isExtracting={analysisState === AnalysisState.EXTRACTING}
              />
              <ManualEntry onAddMatch={handleAddManualMatch}/>
              <StrategySelector
                selectedStrategy={aiStrategy}
                onStrategyChange={setAiStrategy}
              />
              <MatchList 
                  matches={matches} 
                  onClear={handleClearMatches}
                  onDelete={handleDeleteMatch}
              />
            </div>
            <div className="lg:sticky top-8 self-start">
              <AnalysisPanel
                analysisState={analysisState}
                predictionTicket={predictionTicket}
                error={error}
                onStart={handleStartAnalysis}
                onCancel={handleCancelAnalysis}
                onReset={handleReset}
                hasMatches={matches.length > 0}
                analysisProgress={analysisProgress}
                isAnalyzingOverall={isAnalyzingOverall}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default App;
