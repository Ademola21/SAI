import React, { useState, useRef, useEffect } from 'react';
import { PickMode } from '../types';

interface PickModeSelectorProps {
    pickMode: PickMode;
    setPickMode: (mode: PickMode) => void;
    selectedMarkets: string[];
    setSelectedMarkets: (markets: string[]) => void;
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
    [PickMode.MARKET_SPECIALIST]: "You choose the market(s), the AI finds the best pick within them."
};

const PickModeSelector: React.FC<PickModeSelectorProps> = ({ 
    pickMode, setPickMode, 
    selectedMarkets, setSelectedMarkets, 
    matchCount, disabled 
}) => {
    const isHighRewardDisabled = matchCount !== 1;
    const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = e.target.value as PickMode;
        if (newMode === PickMode.HIGH_REWARD_SINGLE && isHighRewardDisabled) {
            return;
        }
        setPickMode(newMode);
        if (newMode !== PickMode.MARKET_SPECIALIST) {
            setSelectedMarkets([]);
        }
    };

    const handleMarketCheckboxChange = (market: string) => {
        setSelectedMarkets(
            selectedMarkets.includes(market)
                ? selectedMarkets.filter(m => m !== market)
                : [...selectedMarkets, market]
        );
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMarketDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                <div className="animate-fade-in relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-slate-300">
                        Select Market(s)
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
                        disabled={disabled}
                        className="mt-1 w-full text-left pl-3 pr-10 py-2 text-base bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 flex justify-between items-center"
                    >
                        <span className={selectedMarkets.length === 0 ? 'text-slate-400' : ''}>
                            {selectedMarkets.length > 0 ? `${selectedMarkets.length} market(s) selected` : '-- Choose markets --'}
                        </span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>

                    {isMarketDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            <ul className="p-2 space-y-1">
                                {bettingMarkets.map(market => (
                                    <li key={market}>
                                        <label className="flex items-center space-x-3 px-2 py-1.5 rounded-md hover:bg-slate-600/50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedMarkets.includes(market)}
                                                onChange={() => handleMarketCheckboxChange(market)}
                                                className="h-4 w-4 rounded bg-slate-800 border-slate-500 text-cyan-600 focus:ring-cyan-500"
                                            />
                                            <span className="text-sm text-slate-200">{market}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PickModeSelector;