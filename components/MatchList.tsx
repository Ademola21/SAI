import React from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';

interface MatchListProps {
  matches: string[];
  onClear: () => void;
  onDelete: (index: number) => void;
}

const MatchList: React.FC<MatchListProps> = ({ matches, onClear, onDelete }) => {
  if (matches.length === 0) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-400">Your Match List is Empty</h2>
            <p className="text-sm text-slate-500 mt-1">Add matches using a screenshot or the manual entry field above.</p>
        </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-200">
          Matches for Analysis ({matches.length})
        </h2>
        <button 
            onClick={onClear} 
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
            aria-label="Clear all matches"
        >
          <TrashIcon className="w-4 h-4" />
          Clear List
        </button>
      </div>
      <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {matches.map((match, index) => (
          <li
            key={`${match}-${index}`}
            className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg text-slate-300 font-medium text-sm shadow animate-fade-in group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span>{match}</span>
            <button 
              onClick={() => onDelete(index)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all focus:opacity-100"
              aria-label={`Remove match: ${match}`}
            >
              <XIcon className="w-5 h-5"/>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MatchList;
