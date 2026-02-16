
import React from 'react';
import { DeliveryStop } from '../types';

interface CurrentStopOverlayProps {
  stop: DeliveryStop;
  stopIndex: number;
  totalStops: number;
  onArrive: () => void;
  onComplete: () => void;
  onFail: () => void;
  onFindFuel?: () => void;
}

const CurrentStopOverlay: React.FC<CurrentStopOverlayProps> = ({ 
  stop, 
  stopIndex, 
  totalStops, 
  onArrive,
  onComplete, 
  onFail,
  onFindFuel
}) => {
  const openExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`;
    window.open(url, '_blank');
  };

  const handleArriveClick = () => {
    if (!stop.id.startsWith('FUEL-')) {
      const url = `https://jobs.dev.blackcircles.network/Job/Customer/${stop.id}`;
      window.open(url, '_blank');
    }
    onArrive();
  };

  const isArrived = stop.status === 'arrived';
  const isFuel = stop.id.startsWith('FUEL-');

  return (
    <div className="absolute bottom-6 left-4 right-4 z-30 animate-in slide-in-from-bottom-2 duration-300 max-w-lg mx-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center justify-center w-4 h-4 text-white text-[8px] font-black rounded-full ${isFuel ? 'bg-yellow-500' : 'bg-slate-900'}`}>
              {isFuel ? '⛽' : stopIndex + 1}
            </span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
              {isFuel ? 'Fuel Stop Priority' : `Stop ${stopIndex + 1} of ${totalStops}`}
            </span>
            {isArrived && (
              <span className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded-sm font-black uppercase tracking-tighter">
                Arrived
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isFuel && (
              <button 
                onClick={onFindFuel}
                className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full hover:bg-yellow-100 transition-colors"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[8px] font-black uppercase">Fuel</span>
              </button>
            )}
            {!isFuel && (
              <button 
                onClick={openExternalMaps}
                className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="text-[8px] font-black uppercase">Nav</span>
              </button>
            )}
          </div>
        </div>

        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-black text-slate-900 leading-tight truncate flex-1">
              {stop.address}
            </h3>
            {!isFuel && (
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 rounded uppercase shrink-0">
                {stop.tyreCount || 2}T
              </span>
            )}
          </div>
          
          {stop.notes && (
            <p className={`text-[9px] font-bold mb-2 truncate px-1.5 py-0.5 rounded border ${isFuel ? 'text-yellow-700 bg-yellow-50 border-yellow-100' : 'text-blue-600 bg-blue-50/50 border-blue-100/50'}`}>
              {stop.notes}
            </p>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleArriveClick}
              disabled={isArrived}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-sm ${
                isArrived 
                ? 'bg-blue-50 text-blue-300 border border-blue-100 cursor-not-allowed' 
                : isFuel ? 'bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95 shadow-yellow-100' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-100'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Arrive
            </button>
            {!isFuel && (
              <button 
                onClick={onFail}
                className="px-3 py-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-all active:scale-95 flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button 
              onClick={onComplete}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-lg active:scale-95 ${
                isFuel ? 'bg-slate-900 hover:bg-black shadow-slate-200' : 'bg-green-600 hover:bg-green-700 shadow-green-100'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              {isFuel ? 'Refueled' : 'Deliver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentStopOverlay;
