
import React, { useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
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
  const { mode, google } = useGoogleMaps();
  const [inputMode, setInputMode] = useState<'visual' | 'text'>('text');
  const [isResolving, setIsResolving] = useState(false);
  const resolutionCache = React.useRef<Map<string, PlaceSelection>>(new Map());

  const clearStops = () => {
    setStops([]);
    setInputMode('text');
  };

  const handleResolve = async () => {
    if (mode !== 'places' || !google) {
      alert("Google Maps Places library is not loaded. Please check your configuration.");
      return;
    }
    setIsResolving(true);

    try {
      const lib = await google.maps.importLibrary("places") as any;
      const Place = lib.Place;
      const unresolvedStops = stops.filter(s => !s.placeId && !s.isUnrecognized && s.status === 'pending');
      const newStops = [...stops];

      // Process in chunks of 3 to respect rate limits
      const CHUNK_SIZE = 3;
      for (let i = 0; i < unresolvedStops.length; i += CHUNK_SIZE) {
        const chunk = unresolvedStops.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (stop) => {
          const query = (stop.rawAddress || stop.address)?.trim();
          if (!query) return;

          const cacheKey = query.toLowerCase();

          // Check cache first
          if (resolutionCache.current.has(cacheKey)) {
            const cached = resolutionCache.current.get(cacheKey)!;
            const idx = newStops.findIndex(s => s.id === stop.id);
            if (idx !== -1) {
              newStops[idx] = {
                ...newStops[idx],
                ...cached,
                address: cached.formattedAddress || newStops[idx].address
              };
            }
            return;
          }

          try {
            // searchByText
            const { places } = await Place.searchByText({
              textQuery: query,
              fields: ['location', 'formattedAddress', 'id'],
              isOpenNow: false, // Don't restrict
            });

            if (places && places.length > 0) {
              const topResult = places[0];

              // "High confidence" check: has location + address
              if (topResult.location && topResult.formattedAddress) {
                const selection: PlaceSelection = {
                  rawAddress: query,
                  placeId: topResult.id,
                  formattedAddress: topResult.formattedAddress,
                  lat: topResult.location.lat(),
                  lng: topResult.location.lng()
                };

                // Update cache
                resolutionCache.current.set(cacheKey, selection);

                // Update stop
                const idx = newStops.findIndex(s => s.id === stop.id);
                if (idx !== -1) {
                  newStops[idx] = {
                    ...newStops[idx],
                    placeId: selection.placeId,
                    lat: selection.lat,
                    lng: selection.lng,
                    formattedAddress: selection.formattedAddress,
                    address: selection.formattedAddress || newStops[idx].address,
                    // keep rawAddress
                  };
                }
              }
            } else {
              // Mark as unrecognized? For now just leave it pending/failed
              console.warn(`No results found for: ${query}`);
            }
          } catch (err: any) {
            console.error("Error resolving stop:", stop.id, err);
            if (err.message && err.message.includes("OVER_QUERY_LIMIT")) {
              // If we hit limits, maybe pause longer?
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }));

        // Gentle delay between chunks
        if (i + CHUNK_SIZE < unresolvedStops.length) {
          await new Promise(r => setTimeout(r, 600)); // Increased delay slightly
        }
      }

      setStops(newStops);

    } catch (e) {
      console.error("Fatal resolution error", e);
    } finally {
      setIsResolving(false);
    }
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
            <button onClick={onStartJourney} disabled={!isNavigating && stops.every(s => s.status === 'completed' || s.status === 'failed')} className={`w-full py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-[0.98] ${isNavigating ? 'bg-red-500 shadow-red-100 animate-pulse' : 'bg-slate-900 shadow-slate-200'} text-sm uppercase tracking-widest`}>
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
