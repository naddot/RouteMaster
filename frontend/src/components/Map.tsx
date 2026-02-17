
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DeliveryStop, RouteStatus, UserLocation } from '../types';
import { INITIAL_MAP_CENTER, DEFAULT_ZOOM } from '../constants';
import { normalizePostcode } from '../config';

import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface MapProps {
  apiKey: string;
  stops: DeliveryStop[];
  onRouteCalculated: (result: google.maps.DirectionsResult) => void;
  onStatusChange: (status: RouteStatus) => void;
  onOptimizeOrder?: (newStops: DeliveryStop[]) => void;
  onError?: (msg: string) => void;
  userLocation?: UserLocation | null;
  isNavigating?: boolean;
  startFromUserLocation?: boolean;
  customStartAddress?: string;
  startPlaceId?: string;
  startLat?: number;
  startLng?: number;

  customEndAddress?: string;
  endPlaceId?: string;
  endLat?: number;
  endLng?: number;

  mobileViewActive?: boolean;
  enableOptimization?: boolean;
  onAddressNotFound?: () => void;
}

const Map: React.FC<MapProps> = ({
  apiKey,
  stops,
  onRouteCalculated,
  onStatusChange,
  onOptimizeOrder,
  onError,
  userLocation,
  isNavigating = false,
  startFromUserLocation = true,
  customStartAddress = '',
  startPlaceId,
  startLat,
  startLng,
  customEndAddress = '',
  endPlaceId,
  endLat,
  endLng,
  enableOptimization = true,
  onAddressNotFound
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Marker pool: key -> AdvancedMarkerElement
  const markerPoolRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new window.Map());
  // One InfoWindow reused for all markers
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { mode, error: loadError } = useGoogleMaps();
  const isLoaded = mode === 'places';
  const [autoCenter, setAutoCenter] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Debouncing states for manual address inputs
  const [debouncedEndAddress, setDebouncedEndAddress] = useState(customEndAddress);
  const [debouncedStartAddress, setDebouncedStartAddress] = useState(customStartAddress);
  const [isTyping, setIsTyping] = useState(false);

  const lastRouteSignature = useRef<string>("");
  const lastAttemptedSignature = useRef<string>("");

  // Safety: maps script might load without marker lib
  function assertMarkerLib() {
    if (!google?.maps?.marker?.AdvancedMarkerElement || !google?.maps?.marker?.PinElement) {
      throw new Error("Google Maps marker library not loaded. Ensure &libraries=marker is in the script URL.");
    }
  }

  function getOrCreateInfoWindow() {
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow({
        minWidth: 200,
        pixelOffset: new google.maps.Size(0, -30),
      });
    }
    return infoWindowRef.current;
  }

  // Small helper for stop priority
  function computeZIndex(stopStatus: string | undefined, stopIndex: number, activeNextIndex: number) {
    // Highest: arrived/current-ish, then next, then others
    if (stopIndex === activeNextIndex) return 1000;
    if (stopStatus === "arrived") return 900;
    if (stopStatus === "pending") return 800 - stopIndex;
    if (stopStatus === "completed") return 400 - stopIndex;
    if (stopStatus === "failed") return 300 - stopIndex;
    return 200 - stopIndex;
  }

  function buildPinContent(opts: {
    glyph: string;
    background?: string;
    borderColor?: string;
    glyphColor?: string;
    scale?: number;
    opacity?: number;
  }) {
    assertMarkerLib();

    const pin = new google.maps.marker.PinElement({
      glyphText: opts.glyph as string, // Fix deprecation warning
      background: opts.background,
      borderColor: opts.borderColor,
      glyphColor: opts.glyphColor,
      scale: opts.scale,
    });

    // Optional: set opacity on the underlying element
    if (opts.opacity !== undefined) {
      (pin.element as HTMLElement).style.opacity = String(opts.opacity);
    }

    return pin.element;
  }

  // String input: normalise (postcode-safe) before routing
  function toDirectionsLocation(
    stopOrString: DeliveryStop | string
  ): string | google.maps.LatLngLiteral | { placeId: string } {
    if (typeof stopOrString === "string") {
      return normalizePostcode(stopOrString);
    }

    if (stopOrString.placeId) return { placeId: stopOrString.placeId };

    if (stopOrString.lat != null && stopOrString.lng != null) {
      return { lat: stopOrString.lat, lng: stopOrString.lng };
    }

    const addr = stopOrString.rawAddress ?? stopOrString.address;
    return typeof addr === "string" ? normalizePostcode(addr) : addr;
  }

  // Debounce logic for address inputs
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      setDebouncedEndAddress(customEndAddress);
      setDebouncedStartAddress(customStartAddress);
      setIsTyping(false);
    }, 800); // 800ms delay to allow user to finish typing

    return () => clearTimeout(handler);
  }, [customEndAddress, customStartAddress]);

  // Map initialization effect
  useEffect(() => {
    if (loadError) {
      console.error("Map load error:", loadError);
      return;
    }

    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        const mapId = import.meta.env.VITE_GOOGLE_MAP_ID;
        console.log("Initializing map with ID:", mapId);

        const map = new Map(mapRef.current!, {
          center: INITIAL_MAP_CENTER,
          zoom: DEFAULT_ZOOM,
          disableDefaultUI: false,
          clickableIcons: false,
          mapId: mapId,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Add markers
        stops.forEach((stop) => {
          if (stop.lat && stop.lng) {
            const markerFunc = async () => {
              const markerContent = document.createElement('div');
              markerContent.className = 'w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold';
              markerContent.textContent = String(stop.id);

              const marker = new AdvancedMarkerElement({
                map: map,
                position: { lat: stop.lat, lng: stop.lng },
                title: stop.formattedAddress || stop.rawAddress,
                content: markerContent,
              });

              // The original code uses markerPoolRef.current.push(marker);
              // Assuming 'id' is unique for stops, we'll use it as key for markerPoolRef
              markerPoolRef.current.set(stop.id, marker);
            };
            markerFunc();
          }
        });

        // Fit bounds if stops exist
        if (stops.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          stops.forEach((stop) => {
            if (stop.lat && stop.lng) {
              bounds.extend({ lat: stop.lat, lng: stop.lng });
            }
          });
          map.fitBounds(bounds);
        }

        // Initialize DirectionsRenderer and TrafficLayer as they were in the original code
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);
        trafficLayerRef.current = trafficLayer;

        const renderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          suppressPolylines: true,
          preserveViewport: false
        });
        directionsRendererRef.current = renderer;

        map.addListener('dragstart', () => setAutoCenter(false));

      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();

  }, [isLoaded, loadError, stops]); // Added stops to dependency array to ensure markers are added on initial load
  // Unmount cleanup
  useEffect(() => {
    return () => {
      // Remove all markers
      if (markerPoolRef.current) {
        for (const marker of markerPoolRef.current.values()) {
          marker.map = null;
        }
        markerPoolRef.current.clear();
      }

      // Close info window
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isNavigating) setAutoCenter(true);
  }, [isNavigating]);

  // Render Polylines (Legacy logic kept separate)
  const polylinesRef = useRef<any[]>([]);
  const renderRouteLines = useCallback((result: google.maps.DirectionsResult) => {
    if (!mapInstanceRef.current) return;
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    const route = result.routes[0];
    if (!route || !route.legs) return;
    route.legs.forEach((leg, index) => {
      const isCurrentLeg = index === 0;
      const legPath: any[] = [];
      leg.steps.forEach((step: any) => step.path.forEach((point: any) => legPath.push(point)));
      const polyline = new (window.google.maps as any).Polyline({
        path: legPath, geodesic: true,
        strokeColor: isCurrentLeg ? '#1e3a8a' : '#93c5fd',
        strokeOpacity: isCurrentLeg ? 0.9 : 0.6,
        strokeWeight: isCurrentLeg ? 7 : 5,
        map: mapInstanceRef.current,
        zIndex: isCurrentLeg ? 10 : 5
      });
      polylinesRef.current.push(polyline);
    });
  }, []);

  const renderMarkers = useCallback(
    (result: google.maps.DirectionsResult, routingStops: DeliveryStop[]) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      assertMarkerLib();
      const infoWindow = getOrCreateInfoWindow();

      const route = result.routes?.[0];
      const legs = route?.legs;
      if (!route || !legs || legs.length === 0) return;

      const hasCustomEnd = debouncedEndAddress && debouncedEndAddress.trim().length > 0;

      // Calculate active next index for z-index priority (first pending stop)
      const activeNextIndex = routingStops.findIndex(s => s.status === 'pending');

      // Fix: derived ordered stops for correct marker mapping when optimization is on
      const wpOrder = route.waypoint_order ?? routingStops.map((_, i) => i);
      const orderedStops = hasCustomEnd
        ? wpOrder.map(i => routingStops[i])
        : [...wpOrder.map(i => routingStops[i]), routingStops[routingStops.length - 1]];

      // Track which marker keys should exist after this render
      const keepKeys = new Set<string>();

      // --- Stop markers (one per stop) ---
      const stopLegCount = hasCustomEnd ? legs.length - 1 : legs.length;

      for (let legIdx = 0; legIdx < stopLegCount; legIdx++) {
        const leg = legs[legIdx];
        const stop = orderedStops[legIdx];

        if (!stop) continue;

        const key = stop.id;
        keepKeys.add(key);

        const position = leg.end_location;
        const stopIndex = legIdx + 1;

        const zIndex = computeZIndex(stop.status, legIdx, activeNextIndex);

        // Status styling
        const isDone = stop.status === "completed";
        const isFailed = stop.status === "failed";
        const isArrived = stop.status === "arrived";

        const content = buildPinContent({
          glyph: String(stopIndex),
          background: isFailed ? "#b91c1c" : isDone ? "#334155" : isArrived ? "#16a34a" : "#2563eb",
          glyphColor: "#ffffff",
          borderColor: "#ffffff",
          scale: 1.1,
          opacity: isDone ? 0.75 : 1,
        });

        const existing = markerPoolRef.current.get(key);

        if (!existing) {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            content,
            zIndex,
          });

          marker.addListener("click", () => {
            infoWindow.setContent(`
              <div style="font-family: ui-sans-serif, system-ui; font-size: 13px;">
                <div style="font-weight: 700; margin-bottom: 4px;">Stop ${stopIndex}</div>
                <div style="margin-bottom: 4px;">${stop.address ?? ""}</div>
                ${stop.notes ? `<div style="color:#64748b;">${stop.notes}</div>` : ""}
                <div style="margin-top:6px; color:#64748b;">Status: ${stop.status ?? "unknown"}</div>
              </div>
            `);
            infoWindow.open({ map, anchor: marker });
          });

          markerPoolRef.current.set(key, marker);
        } else {
          existing.map = map;
          existing.position = position;
          existing.zIndex = zIndex;
          existing.content = content;
        }
      }

      // --- Destination marker (single) ---
      if (hasCustomEnd) {
        const destKey = "destination";
        keepKeys.add(destKey);

        const destinationLeg = legs[legs.length - 1];
        const destPos = destinationLeg.end_location;

        const destContent = buildPinContent({
          glyph: "END",
          background: "#0f172a",
          glyphColor: "#ffffff",
          borderColor: "#ffffff",
          scale: 1.2,
        });

        const existingDest = markerPoolRef.current.get(destKey);
        if (!existingDest) {
          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: destPos,
            content: destContent,
            zIndex: 1200,
          });

          marker.addListener("click", () => {
            infoWindow.setContent(`
              <div style="font-family: ui-sans-serif, system-ui; font-size: 13px;">
                <div style="font-weight: 700; margin-bottom: 4px;">Final destination</div>
                <div>${debouncedEndAddress}</div>
              </div>
            `);
            infoWindow.open({ map, anchor: marker });
          });

          markerPoolRef.current.set(destKey, marker);
        } else {
          existingDest.map = map;
          existingDest.position = destPos;
          existingDest.zIndex = 1200;
          existingDest.content = destContent;
        }
      } else {
        const dest = markerPoolRef.current.get("destination");
        if (dest) {
          dest.map = null;
          markerPoolRef.current.delete("destination");
        }
      }

      // --- Cleanup markers not present anymore (Two-pass) ---
      const pool = markerPoolRef.current;
      const toDelete: string[] = [];
      for (const key of pool.keys()) {
        if (!keepKeys.has(key)) toDelete.push(key);
      }
      toDelete.forEach((key) => {
        const marker = pool.get(key);
        if (marker) marker.map = null;
        pool.delete(key);
      });
    },
    [debouncedEndAddress] // activeNextIndex is derived inside
  );

  const calculateRoute = useCallback((forceRefresh = false) => {
    if (!mapInstanceRef.current || !directionsRendererRef.current) return;

    const focusStop = stops.find(s => s.status === 'pending' || s.status === 'arrived');
    const pendingStops = stops.filter(s => s.status === 'pending' && !s.isUnrecognized);

    if (!focusStop && pendingStops.length === 0) {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
      // Removed: legacy marker clear
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];

      // Clear pool if route is empty (maintain userLocation)
      const pool = markerPoolRef.current;
      const toDelete: string[] = [];
      for (const key of pool.keys()) {
        if (key !== "userLocation") toDelete.push(key);
      }
      toDelete.forEach((key) => {
        const marker = pool.get(key);
        if (marker) marker.map = null;
        pool.delete(key);
      });
      return;
    }

    const routingTargetStops = (focusStop?.status === 'arrived')
      ? pendingStops
      : [focusStop, ...pendingStops.filter(s => s.id !== focusStop?.id)].filter(Boolean) as DeliveryStop[];

    if (routingTargetStops.length === 0 && !debouncedEndAddress) return;

    const isUserLoc = (isNavigating || startFromUserLocation) && !!userLocation;
    const stopsSignature = routingTargetStops.map(s => `${s.id}-${s.status}`).join('|');
    const locSignature = isUserLoc ? `${userLocation?.lat.toFixed(4)},${userLocation?.lng.toFixed(4)}` : debouncedStartAddress;
    const currentSignature = `${stopsSignature}::${locSignature}::${debouncedEndAddress}::${enableOptimization}`;

    // Reset retry logic if the debounced inputs change
    if (currentSignature !== lastAttemptedSignature.current) {
      setRetryCount(0);
      lastAttemptedSignature.current = currentSignature;
    }

    if (retryCount >= 5) {
      onStatusChange(RouteStatus.ERROR);
      return;
    }

    if (!forceRefresh && currentSignature === lastRouteSignature.current) return;

    onStatusChange(RouteStatus.LOADING);
    const directionsService = new google.maps.DirectionsService();

    let origin: string | google.maps.LatLngLiteral | { placeId: string };

    if (isUserLoc) {
      origin = { lat: userLocation!.lat, lng: userLocation!.lng };
    } else if (startPlaceId) {
      origin = { placeId: startPlaceId };
    } else if (startLat != null && startLng != null) {
      origin = { lat: startLat, lng: startLng };
    } else {
      origin = toDirectionsLocation(debouncedStartAddress || routingTargetStops[0]);
    }

    const hasCustomEnd = debouncedEndAddress && debouncedEndAddress.trim().length > 0;
    let destination: string | google.maps.LatLngLiteral | { placeId: string };
    let waypoints: google.maps.DirectionsWaypoint[];

    if (hasCustomEnd) {
      if (endPlaceId) {
        destination = { placeId: endPlaceId };
      } else if (endLat != null && endLng != null) {
        destination = { lat: endLat, lng: endLng };
      } else {
        destination = debouncedEndAddress;
      }

      waypoints = routingTargetStops.map(stop => ({
        location: toDirectionsLocation(stop),
        stopover: true
      }));
    } else {
      const lastStop = routingTargetStops[routingTargetStops.length - 1];
      destination = toDirectionsLocation(lastStop);
      waypoints = routingTargetStops.length > 1
        ? routingTargetStops.slice(0, -1).map(stop => ({
          location: toDirectionsLocation(stop),
          stopover: true
        }))
        : [];
    }

    if (!origin || !destination) return;

    directionsService.route(
      {
        origin, destination, waypoints,
        optimizeWaypoints: enableOptimization,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS }
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setRetryCount(0);
          directionsRendererRef.current!.setDirections(result);
          renderMarkers(result, routingTargetStops);
          renderRouteLines(result);
          onRouteCalculated(result);
          onStatusChange(RouteStatus.CALCULATED);
          lastRouteSignature.current = currentSignature;

          if (onOptimizeOrder && result.routes[0]) {
            const waypointOrder = enableOptimization ? result.routes[0].waypoint_order : routingTargetStops.map((_, i) => i);
            const legs = result.routes[0].legs;
            let accumulatedTimeMs = Date.now();

            const reorderedPending = waypointOrder.map(idx => routingTargetStops[idx]);
            const withEtas = reorderedPending.map((stop, i) => {
              const durationSec = legs[i]?.duration_in_traffic?.value || legs[i]?.duration?.value || 0;
              accumulatedTimeMs += durationSec * 1000;
              const arrivalTime = new Date(accumulatedTimeMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              const arrivalTimeIso = new Date(accumulatedTimeMs).toISOString();
              accumulatedTimeMs += (15 + (15 * (stop.tyreCount || 2))) * 60 * 1000;
              return { ...stop, estimatedArrival: arrivalTime, estimatedArrivalIso: arrivalTimeIso, driveTime: legs[i]?.duration?.text || '0 min' };
            });
            onOptimizeOrder(withEtas);
          }
        } else {
          // Log expanded data for debugging
          const formatLoc = (loc: any) => {
            if (!loc) return "null";
            if (typeof loc === 'string') return loc;
            if (typeof loc.lat === 'function' && typeof loc.lng === 'function') {
              return `${loc.lat().toFixed(6)}, ${loc.lng().toFixed(6)}`;
            }
            if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
              return `${loc.lat}, ${loc.lng}`;
            }
            return JSON.stringify(loc);
          };

          console.error(`Directions Request Failed: ${status}`, {
            origin: formatLoc(origin),
            destination: formatLoc(destination),
            waypoints: waypoints?.map(wp => ({
              ...wp,
              location: formatLoc(wp.location)
            }))
          });

          // Only retry on transient errors (not NOT_FOUND or ZERO_RESULTS)
          const isTransient = !['NOT_FOUND', 'ZERO_RESULTS', 'INVALID_REQUEST'].includes(status);
          const nextCount = retryCount + 1;

          if (isTransient && nextCount < 5) {
            setTimeout(() => {
              setRetryCount(nextCount);
            }, 2000);
          } else {
            setRetryCount(5);
            onStatusChange(RouteStatus.ERROR);
            const msg = status === 'NOT_FOUND'
              ? "One or more addresses could not be located. Please check if the postcodes or raw addresses are valid."
              : status === 'ZERO_RESULTS'
                ? "No driving route found between these locations."
                : "Manual Review Flagged: A routing error occurred. Please check manifest accuracy.";
            onError?.(msg);
          }
        }
      }
    );
  }, [stops, onRouteCalculated, onStatusChange, onOptimizeOrder, onError, userLocation, isNavigating, startFromUserLocation, debouncedStartAddress, debouncedEndAddress, renderMarkers, renderRouteLines, enableOptimization, retryCount]);

  useEffect(() => { calculateRoute(); }, [calculateRoute]);

  const hasCenteredOnUser = useRef(false);

  // Handle User Location Marker (Update in place)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) {
      // Cleanup if user location lost
      const marker = markerPoolRef.current.get("userLocation");
      if (marker) {
        marker.map = null;
        markerPoolRef.current.delete("userLocation");
      }
      return;
    }

    try {
      const pos = { lat: userLocation.lat, lng: userLocation.lng };
      const key = "userLocation";
      const existing = markerPoolRef.current.get(key);

      if (!existing) {
        // New blue dot marker (Custom Div for true circle)
        assertMarkerLib();

        const dot = document.createElement("div");
        dot.style.width = "14px";
        dot.style.height = "14px";
        dot.style.borderRadius = "50%";
        dot.style.background = "#2563eb"; // blue-600
        dot.style.border = "2px solid #ffffff";
        dot.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.3)";

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: pos,
          content: dot,
          zIndex: 999
        });
        markerPoolRef.current.set(key, marker);
      } else {
        existing.position = pos;
      }

      // Pan to user if navigating OR if this is the first location fix
      if ((isNavigating && autoCenter) || !hasCenteredOnUser.current) {
        mapInstanceRef.current.panTo(pos);
        if (!hasCenteredOnUser.current) {
          mapInstanceRef.current.setZoom(14); // Zoom in for better context
          hasCenteredOnUser.current = true;
        }
      }
    } catch (e) {
      console.warn("Error updating user location marker:", e);
    }
  }, [userLocation, isNavigating, autoCenter]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner bg-slate-200 relative">
      <div ref={mapRef} className="w-full h-full" />
      {isNavigating && !autoCenter && (
        <button onClick={() => setAutoCenter(true)} className="absolute top-28 right-4 z-50 bg-white text-blue-600 px-4 py-2 rounded-full shadow-xl font-bold border border-slate-200">Recenter</button>
      )}
      {isTyping && (
        <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Typing Destination...</span>
        </div>
      )}
      {retryCount > 0 && retryCount < 5 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
          Address Retry {retryCount}/5...
        </div>
      )}
    </div>
  );
};

export default Map;
