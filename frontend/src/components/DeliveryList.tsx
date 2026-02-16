
import React, { useState } from 'react';
import { DeliveryStop, RouteStatus, RouteStats } from '../types';
import { ManifestInput } from './ManifestInput';
import { StopItem } from './StopItem';
import { AddressSearch, PlaceSelection } from './AddressSearch';

interface DeliveryListProps {
  stops: DeliveryStop[];
  setStops: (newStops: DeliveryStop[]) => void;
  routeStatus: RouteStatus;
  routeStats: RouteStats | null;
  errorMessage?: string | null;
  startFromUserLocation?: boolean;
  customStartAddress?: string;
  onSelectStart?: (p: PlaceSelection) => void;
  customEndAddress?: string;
  onSelectEnd?: (p: PlaceSelection) => void;
  isLocating?: boolean;
  onToggleStartLocation?: () => void;
  isNavigating?: boolean;
  onStartJourney?: () => void;
  updateStopStatus: (id: string, newStatus: 'pending' | 'completed' | 'failed' | 'arrived') => void;
  enableOptimization?: boolean;
  onFindFuel?: () => void;
  // Sync Status Props
  syncStatus?: {
    online: boolean;
    queued: number;
    isFlushing: boolean;
    flushNow: () => Promise<void>;
  };
}

const DeliveryList: React.FC<DeliveryListProps> = ({
  stops,
  setStops,
  routeStatus,
  routeStats,
  errorMessage,
  startFromUserLocation = true,
  customStartAddress = '',
  onSelectStart,
  customEndAddress = '',
  onSelectEnd,
  onToggleStartLocation,
  isNavigating = false,
  onStartJourney,
  updateStopStatus,
  enableOptimization = true,
  onFindFuel,
  syncStatus
}) => {
  const [inputMode, setInputMode] = useState<'visual' | 'text'>('text');
  const [isResolving, setIsResolving] = useState(false);

  const clearStops = () => {
    setStops([]);
    setInputMode('text');
  };

  const handleResolve = async () => {
    if (!window.google?.maps?.places) return;
    setIsResolving(true);

    // Create a dummy div for PlacesService as it requires a map or a container
    const dummyDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(dummyDiv);

    const unresolvedStops = stops.filter(s => !s.placeId && !s.isUnrecognized && s.status === 'pending');
    const newStops = [...stops];

    for (const stop of unresolvedStops) {
      const idx = newStops.findIndex(s => s.id === stop.id);
      if (idx === -1) continue;

      try {
        const result = await new Promise<PlaceSelection | null>((resolve) => {
          service.findPlaceFromQuery({
            query: stop.rawAddress || stop.address,
            fields: ["place_id", "formatted_address", "geometry"]
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
              const r = results[0];
              resolve({
                rawAddress: stop.rawAddress || stop.address,
                placeId: r.place_id,
                formattedAddress: r.formatted_address,
                lat: r.geometry?.location?.lat(),
                lng: r.geometry?.location?.lng()
              });
            } else {
              resolve(null);
            }
          });
        });

        if (result) {
          newStops[idx] = {
            ...newStops[idx],
            placeId: result.placeId,
            lat: result.lat,
            lng: result.lng,
            formattedAddress: result.formattedAddress,
            address: result.formattedAddress || newStops[idx].address,
            rawAddress: result.rawAddress
          };
        }

        // Rate limiting: 200ms delay
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error("Resolution error for stop:", stop.id, err);
      }
    }

    setStops(newStops);
    setIsResolving(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-xl z-20 w-full relative">
      <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center justify-between">
          Daily Manifest
          <span className="text-[10px] md:text-xs font-normal text-slate-500 px-2 py-0.5 bg-slate-200 rounded-full">{stops.length} stops</span>
        </h2>

        <div className="mt-2 md:mt-3 bg-blue-50 border border-blue-100 p-3 md:p-4 rounded-xl shadow-sm ring-1 ring-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Routing Mode</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-green-600 uppercase tracking-tight">AI Tracking Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-700/80 font-medium leading-relaxed max-w-[70%]">
              Sequence tracking live. Need fuel?
            </p>
            <button
              onClick={onFindFuel}
              className="bg-slate-900 text-white px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-600 transition-all shadow-md active:scale-95"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Find Fuel
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Origin (Start At)</label>
              <button onClick={onToggleStartLocation} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded transition-colors ${startFromUserLocation ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                {startFromUserLocation ? "Using GPS" : "Set Manually"}
              </button>
            </div>
            {startFromUserLocation ? (
              <input type="text" disabled value="Current Location (GPS Active)" className="block w-full px-3 py-2 text-[11px] border border-slate-300 rounded-lg bg-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            ) : (
              <AddressSearch
                placeholder="Enter starting address..."
                initialValue={customStartAddress}
                onSelect={(p) => onSelectStart?.(p)}
              />
            )}
          </div>

          {stops.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight px-1">Final Destination (End At)</label>
              <AddressSearch
                placeholder="Home, Office, or Base..."
                initialValue={customEndAddress}
                onSelect={(p) => onSelectEnd?.(p)}
              />
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-4 md:mx-6 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-800 font-medium">{errorMessage}</div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
        {stops.length === 0 || inputMode === 'text' ? (
          <ManifestInput
            customEndAddress={customEndAddress}
            onSelectEnd={onSelectEnd}
            setStops={(newStops) => {
              // Wrap raw addresses and ensure unique IDs if coming from AI
              const wrapped = newStops.map(s => ({
                ...s,
                id: s.id || `stop-${crypto.randomUUID()}`,
                rawAddress: s.rawAddress || s.address
              }));
              setStops(wrapped);
            }}
            setInputMode={setInputMode}
          />
        ) : (
          <div className="space-y-3 pb-6">
            <button
              onClick={handleResolve}
              disabled={isResolving || stops.every(s => s.placeId)}
              className="w-full py-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              {isResolving ? "Resolving Addresses..." : "Verify & Resolve Addresses"}
            </button>
            {stops.map((stop, index) => (
              <StopItem
                key={stop.id}
                stop={stop}
                index={index}
                isLast={index === stops.length - 1}
                updateStopStatus={updateStopStatus}
              />
            ))}
            <button onClick={clearStops} className="w-full mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Discard Manifest</button>
          </div>
        )}
      </div>

      {stops.length > 0 && inputMode === 'visual' && (
        <div className="p-3 md:p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0 shadow-inner">
          {routeStats && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Route</p>
                <p className="text-sm font-black text-slate-900">{routeStats.totalDistance}</p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Est. Driving</p>
                <p className="text-sm font-black text-slate-900">{routeStats.totalDuration}</p>
              </div>
            </div>
          )}
          {onStartJourney && (
            <button onClick={onStartJourney} disabled={stops.every(s => s.status === 'completed' || s.status === 'failed')} className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-[0.98] ${isNavigating ? 'bg-red-500 shadow-red-100 animate-pulse' : 'bg-slate-900 shadow-slate-200'} text-sm uppercase tracking-widest`}>
              {isNavigating ? "Finish Workday" : "Start Route"}
            </button>
          )}
        </div>
      )}
      {syncStatus && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${syncStatus.online ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                {syncStatus.online ? 'Online' : 'Offline'}
              </span>
            </div>
            {syncStatus.queued > 0 && (
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 italic">
                {syncStatus.queued} pending
              </span>
            )}
          </div>
          <button
            onClick={() => void syncStatus.flushNow()}
            disabled={!syncStatus.online || syncStatus.isFlushing || syncStatus.queued === 0}
            className={`w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${(!syncStatus.online || syncStatus.isFlushing || syncStatus.queued === 0)
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95'
              }`}
          >
            {syncStatus.isFlushing ? 'Syncing...' : 'Sync Data Now'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryList;
