
import React from 'react';
import { FuelStation } from '../types';

interface FuelFinderProps {
  stations: FuelStation[];
  isLoading: boolean;
  onClose: () => void;
  onSelectStation: (station: FuelStation) => void;
}

const FuelFinder: React.FC<FuelFinderProps> = ({ stations, isLoading, onClose, onSelectStation }) => {
  const getBrandColor = (brand: string) => {
    const b = brand.toLowerCase();
    if (b.includes('shell')) return 'bg-yellow-500';
    if (b.includes('bp')) return 'bg-green-600';
    if (b.includes('esso')) return 'bg-red-600';
    if (b.includes('texaco')) return 'bg-red-700';
    if (b.includes('asda')) return 'bg-green-500';
    if (b.includes('tesco')) return 'bg-blue-600';
    if (b.includes('sainsbury')) return 'bg-orange-500';
    if (b.includes('morrison')) return 'bg-yellow-600';
    return 'bg-slate-700';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Allstar One Fuel Finder</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nearby Accepted Stations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Locating Accepted Pumps...</p>
            </div>
          ) : stations.length > 0 ? (
            stations.map((station, i) => (
              <div key={i} className="relative border border-slate-200 rounded-xl p-3 hover:border-blue-400 transition-all shadow-sm flex items-center gap-2 md:gap-3 group bg-white">
                <div className={`w-1.5 h-full absolute left-0 top-0 rounded-l-xl ${getBrandColor(station.brand)}`}></div>
                <div className="flex-1 pl-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase ${getBrandColor(station.brand)} whitespace-nowrap`}>
                        {station.brand}
                      </span>
                    </div>
                    {station.distance && (
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
                        {station.distance}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[13px] font-black text-slate-800 truncate">{station.name}</h3>
                  {station.address && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{station.address}</p>}
                </div>
                <button 
                  onClick={() => onSelectStation(station)}
                  className="bg-slate-900 text-white px-2.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200 group-hover:shadow-blue-100 flex items-center gap-1 shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm font-medium italic">No accepted stations found in the immediate vicinity.</p>
              <button onClick={onClose} className="mt-4 text-xs font-black text-blue-600 uppercase tracking-widest underline">Return to Manifest</button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight text-center">
            Accepted: ASDA, Morrisons, Sainsburys, Tesco, BP, Shell, Esso & Texaco
          </p>
        </div>
      </div>
    </div>
  );
};

export default FuelFinder;
