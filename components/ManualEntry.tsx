import React, { useState } from 'react';
import { PlusIcon } from './icons/PlusIcon';

interface ManualEntryProps {
  onAddMatch: (match: string) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onAddMatch }) => {
  const [match, setMatch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (match.trim()) {
      onAddMatch(match.trim());
      setMatch('');
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <label htmlFor="manual-match" className="sr-only">
          Enter match manually
        </label>
        <input
          id="manual-match"
          type="text"
          value={match}
          onChange={(e) => setMatch(e.target.value)}
          placeholder="e.g., Man City vs Arsenal"
          className="flex-grow w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="w-5 h-5"/>
          Add Match
        </button>
      </form>
    </div>
  );
};

export default ManualEntry;
