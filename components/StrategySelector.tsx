import React from 'react';
import { AIStrategy } from '../types';

interface StrategySelectorProps {
  selectedStrategy: AIStrategy;
  onStrategyChange: (strategy: AIStrategy) => void;
}

const strategies: { id: AIStrategy, name: string, description: string }[] = [
    { id: 'CAUTIOUS', name: 'Cautious Analyst', description: 'Finds the safest, most probable bets.' },
    { id: 'VALUE_HUNTER', name: 'Value Hunter', description: 'Looks for bets with undervalued odds.' },
    { id: 'GOALS_SPECIALIST', name: 'Goals Specialist', description: 'Focuses only on goals-related markets.' },
];

const StrategySelector: React.FC<StrategySelectorProps> = ({ selectedStrategy, onStrategyChange }) => {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
        <label htmlFor="strategy-select" className="block text-sm font-medium text-slate-300 mb-2">
            AI Analysis Strategy
        </label>
        <select
            id="strategy-select"
            value={selectedStrategy}
            onChange={(e) => onStrategyChange(e.target.value as AIStrategy)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
            {strategies.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                </option>
            ))}
        </select>
        <p className="text-xs text-slate-500 mt-2">
            {strategies.find(s => s.id === selectedStrategy)?.description}
        </p>
    </div>
  );
};

export default StrategySelector;
