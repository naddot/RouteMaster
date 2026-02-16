import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  hasKey: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, hasKey }) => {
  const [isOpen, setIsOpen] = useState(!hasKey);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    if (!hasKey) {
      setIsOpen(true);
    }
  }, [hasKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onSave(keyInput.trim());
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Google Maps API Key Required</h2>
        <p className="text-slate-600 mb-4 text-sm">
          To visualize routes and traffic data, this app requires a valid Google Maps API Key with <strong>Maps JavaScript API</strong> and <strong>Directions API</strong> enabled.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">API Key</label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
            >
              Enable Maps
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-400 text-center">
          The key is stored locally in your session and is not sent to any other server.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;