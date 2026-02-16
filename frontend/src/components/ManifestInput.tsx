import React, { useState } from 'react';
import { parseAddressInput } from '../services/geminiService';
import { DeliveryStop } from '../types';
import { AddressSearch, PlaceSelection } from './AddressSearch';

interface ManifestInputProps {
    customEndAddress: string;
    onSelectEnd?: (p: PlaceSelection) => void;
    setStops: (stops: DeliveryStop[]) => void;
    setInputMode: (mode: 'visual' | 'text') => void;
}

export const ManifestInput: React.FC<ManifestInputProps> = ({
    customEndAddress,
    onSelectEnd,
    setStops,
    setInputMode
}) => {
    const [inputText, setInputText] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    const handleParse = async () => {
        if (!inputText.trim()) return;
        setIsParsing(true);
        try {
            const parsedStops = await parseAddressInput(inputText);
            setStops(parsedStops);
            setInputMode('visual');
        } catch (e: any) {
            alert(e.message || "Failed to parse input. Please try again.");
        } finally {
            setIsParsing(false);
        }
    };

    const canGenerate = !isParsing && inputText.trim().length > 0;

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block ml-1">Preferred End Area</label>
                <AddressSearch
                    placeholder="Where do you finish your day?"
                    initialValue={customEndAddress}
                    onSelect={(p) => onSelectEnd?.(p)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block ml-1">Manual Paste Manifest</label>
                <textarea
                    className="w-full h-32 p-3 text-sm border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-inner"
                    placeholder={`Example:\n1. 10 Down St, London (4 tyres)\n2. 20 High St, Bristol (2 tyres)`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
            </div>
            <button
                onClick={handleParse}
                disabled={!canGenerate}
                className={`w-full py-4 rounded-xl font-black text-sm transition-all shadow-md uppercase tracking-wider ${canGenerate ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
                {isParsing ? "Analyzing..." : "Load Manifest Data"}
            </button>
        </div>
    );
};
