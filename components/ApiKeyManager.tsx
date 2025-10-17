import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';

interface ApiKeyManagerProps {
  apiKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKey, onSave, onClear }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    // If there's no API key, force the edit mode.
    if (!apiKey) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [apiKey]);

  const handleSave = () => {
    if (keyInput.trim()) {
      onSave(keyInput.trim());
      setKeyInput('');
    }
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) {
      return '****';
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <KeyIcon className="w-6 h-6 text-cyan-400 flex-shrink-0"/>
        <div className="flex-grow">
          <h3 className="font-semibold text-slate-200">Gemini API Key</h3>
          {!isEditing && apiKey ? (
            <p className="text-sm text-slate-400 font-mono">{maskApiKey(apiKey)}</p>
          ) : (
            <p className="text-sm text-slate-500">
                Your key is stored locally and never sent anywhere except to Google's API.
            </p>
          )}
        </div>
        {!isEditing && apiKey && (
            <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-slate-700 text-slate-200 font-semibold rounded-md hover:bg-slate-600 transition-colors"
            >
                Change Key
            </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-4 pl-9">
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API Key"
                    className="flex-grow w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Gemini API Key Input"
                />
                <button
                    onClick={handleSave}
                    disabled={!keyInput.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    Save Key
                </button>
                {apiKey && (
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setKeyInput('');
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;
