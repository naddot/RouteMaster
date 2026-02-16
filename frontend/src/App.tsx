import { useState, useEffect, useRef } from 'react';
import DeliveryList from './components/DeliveryList';
import MapView from './components/Map';
import CurrentStopOverlay from './components/CurrentStopOverlay';
import FuelFinder from './components/FuelFinder';
import { DeliveryStop, FuelStation, IntendedRouteTelemetry, RouteStats } from './types';
import { GOOGLE_MAPS_API_KEY } from './constants';
import { sendIntendedRoute } from './services/telemetryService';
import { loadRuntimeConfig } from './config';
import { findFuelStations } from './services/geminiService';

// Hooks
import { useRouteManager } from './hooks/useRouteManager';
import { useGeolocation } from './hooks/useGeolocation';
import { useJourney } from './hooks/useJourney';
import { useQueueSync } from './hooks/useQueueSync';

function App() {
  const [driverId] = useState('driver-1');
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Disabled as per user requirement
  const enableOptimization = false;

  const [startFromUserLocation, setStartFromUserLocation] = useState(true);
  const [customStartAddress, setCustomStartAddress] = useState('');
  const [startPlaceId, setStartPlaceId] = useState<string | undefined>();
  const [startLat, setStartLat] = useState<number | undefined>();
  const [startLng, setStartLng] = useState<number | undefined>();

  const [customEndAddress, setCustomEndAddress] = useState('');
  const [endPlaceId, setEndPlaceId] = useState<string | undefined>();
  const [endLat, setEndLat] = useState<number | undefined>();
  const [endLng, setEndLng] = useState<number | undefined>();

  // Navigation State (Hoisted for Hook Dependencies)
  const [isNavigating, setIsNavigating] = useState(false);

  // Fuel Finder State
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [isSearchingFuel, setIsSearchingFuel] = useState(false);
  const [showFuelFinder, setShowFuelFinder] = useState(false);

  // Load Config
  useEffect(() => { loadRuntimeConfig(); }, []);

  // 1. Data & Route Management
  const {
    stops, setStops,
    routeStatus, setRouteStatus,
    routeStats, setRouteStats,
    handleRouteUpdate, updateStopStatus,
    shiftId
  } = useRouteManager(driverId);

  // 2. Geolocation (Depends on isNavigating)
  const { userLocation, geolocationError } = useGeolocation(isNavigating, startFromUserLocation);

  // 3. Journey & Telemetry (Depends on userLocation & isNavigating)
  const { toggleJourney } = useJourney({
    driverId,
    shiftId,
    userLocation,
    routeStats,
    isNavigating,
    setIsNavigating
  });

  // 4. Offline Queue Sync (Global)
  const { queued, isFlushing, online, flushNow } = useQueueSync();

  const [dynamicMapsKey, setDynamicMapsKey] = useState<string>(GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await loadRuntimeConfig();
      if (config.googleMapsApiKey) {
        setDynamicMapsKey(config.googleMapsApiKey);
      }
    };
    fetchConfig();
  }, []);

  const activeNextStop = stops.find(s => s.status === 'pending' || s.status === 'arrived');
  const activeNextIndex = activeNextStop ? stops.indexOf(activeNextStop) : -1;

  const findFuel = async () => {
    let lat = userLocation?.lat;
    let lng = userLocation?.lng;

    if (!lat || !lng) {
      alert("GPS Signal required to find nearby fuel. Please wait for location lock.");
      return;
    }

    setShowFuelFinder(true);
    setIsSearchingFuel(true);
    try {
      const results = await findFuelStations(lat, lng);
      setFuelStations(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingFuel(false);
    }
  };

  const handleSelectFuelStation = (station: FuelStation) => {
    const fuelStop: DeliveryStop = {
      id: `FUEL-${crypto.randomUUID()}`,
      address: station.address || station.name,
      notes: `Allstar Accepted: ${station.brand}`,
      status: 'pending',
      tyreCount: 1,
      stopType: 'fuel',
    };

    setStops(prev => {
      const newStops = [...prev];

      // Calculate insertion index
      let targetIndex = 0;
      if (isNavigating) {
        // Find last index that is arrived or completed
        const lastActiveIdx = [...newStops].reverse().findIndex(s => s.status === 'arrived' || s.status === 'completed');
        const currentIdx = lastActiveIdx !== -1 ? (newStops.length - 1 - lastActiveIdx) : -1;

        const firstPendingIdx = newStops.findIndex(s => s.status === 'pending');

        if (currentIdx >= 0) {
          targetIndex = currentIdx + 1;
        } else if (firstPendingIdx >= 0) {
          targetIndex = firstPendingIdx;
        } else {
          targetIndex = newStops.length;
        }
      }

      newStops.splice(targetIndex, 0, fuelStop);
      return newStops;
    });

    setShowFuelFinder(false);
    if (window.innerWidth < 1024) {
      setMobileTab('map');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="flex flex-col h-full w-full bg-slate-50 lg:flex-row">
        <div className="lg:hidden flex bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${mobileTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Manifest
          </button>
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${mobileTab === 'map' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Map View
          </button>
        </div>

        <div className={`flex-1 flex flex-col lg:flex-row h-full overflow-hidden`}>
          <div className={`w-full lg:w-[400px] xl:w-[440px] h-full ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
            <DeliveryList
              stops={stops}
              setStops={setStops}
              routeStatus={routeStatus}
              routeStats={routeStats}
              errorMessage={errorMessage || geolocationError}
              startFromUserLocation={startFromUserLocation}
              customStartAddress={customStartAddress}
              onSelectStart={(p) => {
                setCustomStartAddress(p.rawAddress);
                setStartPlaceId(p.placeId);
                setStartLat(p.lat);
                setStartLng(p.lng);
              }}
              customEndAddress={customEndAddress}
              onSelectEnd={(p) => {
                setCustomEndAddress(p.rawAddress);
                setEndPlaceId(p.placeId);
                setEndLat(p.lat);
                setEndLng(p.lng);
              }}
              onToggleStartLocation={() => setStartFromUserLocation(!startFromUserLocation)}
              isNavigating={isNavigating}
              onStartJourney={toggleJourney}
              updateStopStatus={updateStopStatus}
              enableOptimization={enableOptimization}
              onFindFuel={findFuel}
            />
          </div>

          <div className={`flex-1 h-full relative ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
            <MapView
              apiKey={dynamicMapsKey}
              stops={stops}
              onRouteCalculated={(res) => {
                const legs = res.routes[0].legs;
                const hasCustomEnd = customEndAddress && customEndAddress.trim().length > 0;
                const relevantLegs = hasCustomEnd && legs.length > 1 ? legs.slice(0, -1) : legs;
                const totalDist = relevantLegs.reduce((acc, l) => acc + (l.distance?.value || 0), 0);
                const trafficDur = relevantLegs.reduce((acc, l) => acc + (l.duration_in_traffic?.value || l.duration?.value || 0), 0);
                const stats: RouteStats = {
                  totalDistance: (totalDist / 1609.34).toFixed(1) + " miles",
                  totalDuration: Math.round(trafficDur / 60) + " mins",
                  trafficDuration: Math.round(trafficDur / 60) + " mins",
                  startAddress: legs[0].start_address,
                  endAddress: legs[legs.length - 1].end_address,
                  driveDurationStr: Math.round(trafficDur / 60) + "m",
                  serviceDurationStr: stops.filter(s => s.status === 'pending' || s.status === 'arrived').reduce((acc, s) => acc + (15 + (15 * (s.tyreCount || 2))), 0) + "m"
                };
                setRouteStats(stats);
                const path: IntendedRouteTelemetry[] = [];
                legs.forEach((leg, legIdx) => {
                  leg.steps.forEach(step => {
                    step.path.forEach(pt => {
                      path.push({
                        driver_id: driverId,
                        job_id: stops[legIdx]?.id || 'START',
                        timestamp: new Date().toISOString(),
                        latitude: pt.lat.toString(),
                        longitude: pt.lng.toString(),
                        eventId: crypto.randomUUID()
                      });
                    });
                  });
                });
                if (isNavigating) {
                  sendIntendedRoute(path as IntendedRouteTelemetry[]);
                }
              }}
              onStatusChange={setRouteStatus}
              onOptimizeOrder={handleRouteUpdate}
              userLocation={userLocation}
              isNavigating={isNavigating}
              startFromUserLocation={startFromUserLocation}
              customStartAddress={customStartAddress}
              startPlaceId={startPlaceId}
              startLat={startLat}
              startLng={startLng}
              customEndAddress={customEndAddress}
              endPlaceId={endPlaceId}
              endLat={endLat}
              endLng={endLng}
              enableOptimization={enableOptimization}
            />

            {activeNextStop && (
              <CurrentStopOverlay
                stop={activeNextStop}
                stopIndex={activeNextIndex}
                totalStops={stops.length}
                onArrive={() => updateStopStatus(activeNextStop.id, 'arrived')}
                onComplete={() => updateStopStatus(activeNextStop.id, 'completed')}
                onFail={() => updateStopStatus(activeNextStop.id, 'failed')}
                onFindFuel={findFuel}
              />
            )}

            {showFuelFinder && (
              <FuelFinder
                stations={fuelStations}
                isLoading={isSearchingFuel}
                onClose={() => setShowFuelFinder(false)}
                onSelectStation={handleSelectFuelStation}
              />
            )}
          </div>
        </div>
      </div>

      {/* Offline Sync Status Widget */}
      <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-slate-200 z-[9999] text-xs font-mono min-w-[140px]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-bold">{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <div className="space-y-1 text-slate-600">
          <div className="flex justify-between">
            <span>Queued:</span>
            <span className="font-bold">{queued}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span>{isFlushing ? 'Syncing...' : 'Idle'}</span>
          </div>
        </div>
        <button
          onClick={() => void flushNow()}
          disabled={!online || isFlushing || queued === 0}
          className={`mt-2 w-full py-1 px-2 rounded font-bold text-center transition-colors ${(!online || isFlushing || queued === 0)
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {isFlushing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}

export default App;
