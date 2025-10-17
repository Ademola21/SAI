import React from 'react';
import { PickMode } from '../types';

interface PickModeSelectorProps {
    pickMode: PickMode;
    setPickMode: (mode: PickMode) => void;
    selectedMarket: string | null;
    setSelectedMarket: (market: string | null) => void;
    matchCount: number;
    disabled: boolean;
}

const bettingMarkets = [
    "Home win (1)", "Away win (2)", "Home or Away", "Home or Draw", "Away or Draw",
    "Over 0.5 goals", "Over 1.5 goals", "Over 2.5 goals", "Over 3.5 goals",
    "Under 1.5 goals", "Under 2.5 goals", "Under 3.5 goals", "Under 4.5 goals",
    "Both Teams To Score (Yes)", "Both Teams To Score (No)",
    "Handicap Home -1", "Handicap Away -1", "Handicap Home +1", "Handicap Away +1",
    "Draw No Bet – Home", "Draw No Bet – Away", "Total Corners Over 9.5", "Total Corners Under 9.5"
];

const modeDescriptions: Record<PickMode, string> = {
    [PickMode.ACCUMULATOR_BUILDER]: "Finds the safest, highest-probability picks. Ideal for multi-game tickets.",
    [PickMode.VALUE_HUNTER]: "Searches for picks where the odds seem better than the true probability.",
    [PickMode.HIGH_REWARD_SINGLE]: "Finds a plausible, high-odds outcome. Only for single match analysis.",
    [PickMode.MARKET_SPECIALIST]: "You choose the market, the AI finds the best pick within it."
};

const PickModeSelector: React.FC<PickModeSelectorProps> = ({ 
    pickMode, setPickMode, 
    selectedMarket, setSelectedMarket, 
    matchCount, disabled 
}) => {
    const isHighRewardDisabled = matchCount !== 1;
    
    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = e.target.value as PickMode;
        if (newMode === PickMode.HIGH_REWARD_SINGLE && isHighRewardDisabled) {
            return; // Don't allow selection if disabled
        }
        setPickMode(newMode);
        if (newMode !== PickMode.MARKET_SPECIALIST) {
            setSelectedMarket(null); // Reset market if not in specialist mode
        }
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
            <div>
                <label htmlFor="pick-mode" className="block text-sm font-medium text-slate-300">
                    Betting Strategy
                </label>
                <select
                    id="pick-mode"
                    value={pickMode}
                    onChange={handleModeChange}
                    disabled={disabled}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {Object.values(PickMode).map(mode => (
                        <option 
                            key={mode} 
                            value={mode}
                            disabled={mode === PickMode.HIGH_REWARD_SINGLE && isHighRewardDisabled}
                        >
                            {mode}
                        </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                    {modeDescriptions[pickMode]}
                    {pickMode === PickMode.HIGH_REWARD_SINGLE && isHighRewardDisabled && " (Requires exactly 1 match)."}
                </p>
            </div>

            {pickMode === PickMode.MARKET_SPECIALIST && (
                <div className="animate-fade-in">
                    <label htmlFor="market-select" className="block text-sm font-medium text-slate-300">
                        Select Market
                    </label>
                    <select
                        id="market-select"
                        value={selectedMarket || ''}
                        onChange={(e) => setSelectedMarket(e.target.value)}
                        disabled={disabled}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="" disabled>-- Choose a market --</option>
                        {bettingMarkets.map(market => (
                            <option key={market} value={market}>{market}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default PickModeSelector;
