import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnalysisState, PredictionTicket, PickMode } from './types';
import { extractMatchesFromImage, analyzeMatches, analyzeOverallTicket } from './services/geminiService';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import MatchList from './components/MatchList';
import AnalysisPanel from './components/AnalysisPanel';
import ManualEntry from './components/ManualEntry';
import Toast from './components/Toast';
import ApiKeyManager from './components/ApiKeyManager';
import PickModeSelector from './components/PickModeSelector';
import SavedTicketsPanel from './components/SavedTicketsPanel';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => window.localStorage.getItem('gemini-api-key'));
  const [pickMode, setPickMode] = useState<PickMode>(PickMode.ACCUMULATOR_BUILDER);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  const [matches, setMatches] = useState<string[]>(() => {
    try {
      const savedMatches = window.localStorage.getItem('matches');
      return savedMatches ? JSON.parse(savedMatches) : [];
    } catch (error) {
      console.error("Failed to parse matches from localStorage", error);
      return [];
    }
  });
  
  const [savedTickets, setSavedTickets] = useState<PredictionTicket[]>(() => {
    try {
        const saved = window.localStorage.getItem('saved-tickets');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error("Failed to parse saved tickets from localStorage", error);
        return [];
    }
  });

  const [analysisState, setAnalysisState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [predictionTicket, setPredictionTicket] = useState<PredictionTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isAnalyzingOverall, setIsAnalyzingOverall] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const analysisAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    window.localStorage.setItem('matches', JSON.stringify(matches));
  }, [matches]);
  
  useEffect(() => {
    window.localStorage.setItem('saved-tickets', JSON.stringify(savedTickets));
  }, [savedTickets]);
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  const handleApiKeySave = (newKey: string) => {
    window.localStorage.setItem('gemini-api-key', newKey);
    setApiKey(newKey);
    showToast("API Key saved successfully!");
  };

  const handleApiKeyClear = () => {
      window.localStorage.removeItem('gemini-api-key');
      setApiKey(null);
  };

  const handleImagesUpload = useCallback(async (files: File[]) => {
    if (!apiKey) {
        showToast("Please set your API key before uploading images.");
        return;
    };
    setAnalysisState(AnalysisState.EXTRACTING);
    setError(null);
    try {
      const extractionPromises = files.map(file => extractMatchesFromImage(file, apiKey));
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to extract matches from the image. Please try a clearer screenshot.');
      setAnalysisState(AnalysisState.ERROR);
    }
  }, [apiKey]);

  const handleAddManualMatch = useCallback((match: string) => {
    if (match && !matches.includes(match)) {
      setMatches(prev => [...prev, match]);
    } else if (matches.includes(match)) {
        showToast("This match is already in the list.");
    }
  }, [matches]);

  const handleStartAnalysis = useCallback(async () => {
    if (matches.length === 0 || !apiKey) return;
    if (pickMode === PickMode.MARKET_SPECIALIST && !selectedMarket) {
        showToast("Please select a market for the Market Specialist mode.");
        return;
    }

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

      const result = await analyzeMatches(matches, signal, onProgress, apiKey, pickMode, selectedMarket, matches.length);
      const ticketWithId: PredictionTicket = {
        ...result,
        id: `ticket-${Date.now()}`,
        pickModeUsed: pickMode,
      };
      setPredictionTicket(ticketWithId);
      setAnalysisState(AnalysisState.DONE);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Analysis was cancelled.');
        setAnalysisState(AnalysisState.IDLE);
      } else {
        console.error(err);
        setError(err.message || 'An error occurred during analysis. The model may be unavailable or the request timed out. Please try again.');
        setAnalysisState(AnalysisState.ERROR);
      }
    } finally {
        analysisAbortController.current = null;
    }
  }, [matches, apiKey, pickMode, selectedMarket]);

  useEffect(() => {
    const hasRunOverallAnalysis = !!predictionTicket?.overallAnalysis;
    if (analysisState === AnalysisState.DONE && predictionTicket && !hasRunOverallAnalysis && !isAnalyzingOverall) {
      const performOverallAnalysis = async () => {
        if (!apiKey) return;
        setIsAnalyzingOverall(true);
        try {
          const controller = new AbortController(); 
          const summary = await analyzeOverallTicket(predictionTicket, controller.signal, apiKey);
          setPredictionTicket(prev => prev ? { ...prev, overallAnalysis: summary } : null);
        } catch (err) {
          console.error("Failed to get overall ticket analysis:", err);
        } finally {
          setIsAnalyzingOverall(false);
        }
      };
      performOverallAnalysis();
    }
  }, [analysisState, predictionTicket, isAnalyzingOverall, apiKey]);

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
  
  const handleSaveTicket = useCallback(() => {
    if (!predictionTicket) return;
    if (savedTickets.some(t => t.id === predictionTicket.id)) {
        showToast("This analysis is already saved.");
        return;
    }
    const ticketToSave = { ...predictionTicket, savedAt: new Date().toISOString() };
    setSavedTickets(prev => [ticketToSave, ...prev]);
    showToast("Analysis saved!");
  }, [predictionTicket, savedTickets]);

  const handleDeleteTicket = useCallback((ticketId: string) => {
    setSavedTickets(prev => prev.filter(t => t.id !== ticketId));
    if (predictionTicket?.id === ticketId) {
        setPredictionTicket(null);
        setAnalysisState(AnalysisState.IDLE);
    }
    showToast("Saved analysis deleted.");
  }, [predictionTicket]);
  
  const handleLoadTicket = useCallback((ticket: PredictionTicket) => {
      setPredictionTicket(ticket);
      setAnalysisState(AnalysisState.DONE);
      setError(null);
      setIsAnalyzingOverall(false);
      setAnalysisProgress(null);
  }, []);

  const isCurrentTicketSaved = savedTickets.some(t => t.id === predictionTicket?.id);
  const isAppDisabled = !apiKey;

  return (
    <>
      <Toast message={toastMessage} />
      <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Header />
          <div className="mt-6">
            <ApiKeyManager 
              apiKey={apiKey}
              onSave={handleApiKeySave}
              onClear={handleApiKeyClear}
            />
          </div>

          <main className={`mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 ${isAppDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex flex-col gap-6">
              <ImageUploader 
                onImagesUpload={handleImagesUpload} 
                isExtracting={analysisState === AnalysisState.EXTRACTING}
                disabled={isAppDisabled}
              />
              <ManualEntry 
                onAddMatch={handleAddManualMatch}
                disabled={isAppDisabled}
              />
              <PickModeSelector
                pickMode={pickMode}
                setPickMode={setPickMode}
                selectedMarket={selectedMarket}
                setSelectedMarket={setSelectedMarket}
                matchCount={matches.length}
                disabled={isAppDisabled}
              />
              <MatchList 
                  matches={matches} 
                  onClear={handleClearMatches}
                  onDelete={handleDeleteMatch}
              />
              <SavedTicketsPanel
                savedTickets={savedTickets}
                onLoad={handleLoadTicket}
                onDelete={handleDeleteTicket}
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
                isApiKeySet={!!apiKey}
                onSave={handleSaveTicket}
                isTicketSaved={isCurrentTicketSaved}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default App;