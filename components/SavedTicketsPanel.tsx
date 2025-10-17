import React from 'react';
import { PredictionTicket } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface SavedTicketsPanelProps {
  savedTickets: PredictionTicket[];
  onLoad: (ticket: PredictionTicket) => void;
  onDelete: (ticketId: string) => void;
}

const SavedTicketsPanel: React.FC<SavedTicketsPanelProps> = ({ savedTickets, onLoad, onDelete }) => {
  if (savedTickets.length === 0) {
    return null; // Don't render anything if there are no saved tickets
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-slate-200 mb-4">
        Saved Analyses ({savedTickets.length})
      </h2>
      <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {savedTickets.map(ticket => (
          <li
            key={ticket.id}
            className="bg-slate-700/50 p-3 rounded-lg text-slate-300 text-sm shadow-sm animate-fade-in"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-100">
                  {ticket.ticket.length}-Match Ticket
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Strategy: <span className="font-medium text-cyan-400">{ticket.pickModeUsed}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Saved: {formatDate(ticket.savedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                <button
                  onClick={() => onLoad(ticket)}
                  className="px-3 py-1 text-xs bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => onDelete(ticket.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-md hover:bg-slate-600"
                  aria-label="Delete saved analysis"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedTicketsPanel;