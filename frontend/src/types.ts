
export interface DeliveryStop {
  id: string;
  address: string;         // Display address (Formatted if available, else Raw)
  rawAddress?: string;      // Original user input (Always preserved)

  placeId?: string;        // Best for routing
  lat?: number;
  lng?: number;
  formattedAddress?: string; // Cache Google's normalization

  notes?: string;
  estimatedArrival?: string;
  estimatedArrivalIso?: string;
  driveTime?: string;
  status: 'pending' | 'completed' | 'failed' | 'arrived';
  tyreCount?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  actualArrivalEta?: string | null;
  isUnrecognized?: boolean;
  stopType?: 'delivery' | 'fuel';
}

export interface FuelStation {
  name: string;
  address: string;
  distance?: string;
  uri: string;
  brand: string;
}

export interface RouteStats {
  totalDistance: string;
  totalDuration: string;
  trafficDuration: string;
  startAddress: string;
  endAddress: string;
  hasHeavyTraffic?: boolean;
  trafficDelayMins?: number;
  driveDurationStr?: string;
  serviceDurationStr?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
}

export interface JobTelemetry {
  job_id: string;
  shift_id: string;
  address: string;
  planned_eta?: string;
  actual_arrival_eta?: string | null;
  completion_time: string;
  status: 'pending' | 'arrived' | 'completed' | 'failed';
  tyre_count: string;
  stop_type?: string;
  eventId: string;
}

export interface GpsLogTelemetry {
  driver_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  heading: string;
  speed: number;
  job_id: number | null;
  eventId: string;
}

export interface ShiftTelemetry {
  Shift_id: string;
  driver_id: string;
  Start_time: string;
  End_time: string | null;
  total_distance_miles: number | null;
  total_drive_time: string | null;
  Total_fitting_time: string | null;
  eventId: string;
}

export interface IntendedRouteTelemetry {
  driver_id: string;
  job_id: string;
  timestamp: string;
  latitude: string;
  longitude: string;
  eventId: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export enum RouteStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  CALCULATED = 'CALCULATED',
  ERROR = 'ERROR'
}

declare global {
  interface Window {
    google: any;
  }
  interface ImportMeta {
    env: Record<string, string>;
  }
  namespace google {
    namespace maps {
      namespace marker {
        class AdvancedMarkerElement {
          constructor(options?: any);
          map: Map | null;
          position: LatLng | { lat: number; lng: number } | null;
          content: Element | null;
          zIndex: number | null;
          addListener(eventName: string, handler: (e?: any) => void): any;
        }
        class PinElement {
          constructor(options?: any);
          element: HTMLElement;
          glyph: string | Element;
          background: string;
          borderColor: string;
          glyphColor: string;
          scale: number;
        }
      }
      namespace event {
        function trigger(instance: any, eventName: string, ...args: any[]): void;
        function addListener(instance: any, eventName: string, handler: (e?: any) => void): any;
      }
      class Map {
        constructor(mapDiv: Element | null, opts?: any);
        panTo(latLng: LatLng | { lat: number; lng: number }): void;
        setZoom(zoom: number): void;
        getZoom(): number;
        setTilt(tilt: number): void;
        setHeading(heading: number): void;
        addListener(eventName: string, handler: (e?: any) => void): any;
      }
      class Marker {
        constructor(opts?: any);
        setMap(map: Map | null): void;
        setPosition(latLng: LatLng | { lat: number; lng: number }): void;
        setIcon(icon: any): void;
        addListener(eventName: string, handler: (e?: any) => void): any;
      }
      class InfoWindow {
        constructor(opts?: any);
        setContent(content: string | Element): void;
        open(map?: Map | any, anchor?: Marker | any): void;
        close(): void;
      }
      class DirectionsRenderer {
        constructor(opts?: any);
        setDirections(result: DirectionsResult): void;
        setOptions(options: any): void;
      }
      class DirectionsService {
        route(
          request: any,
          callback: (result: DirectionsResult | null, status: DirectionsStatus) => void
        ): void;
      }
      class TrafficLayer {
        setMap(map: Map | null): void;
      }
      class Geocoder {
        geocode(request: any): Promise<{ results: any[] }>;
      }
      class Size {
        constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
        width: number;
        height: number;
      }
      class Point {
        constructor(x: number, y: number);
        x: number;
        y: number;
      }
      enum ControlPosition {
        TOP_LEFT = 10.0,
        RIGHT_BOTTOM = 6.0,
      }
      enum TravelMode { DRIVING = 'DRIVING' }
      enum TrafficModel { BEST_GUESS = 'BEST_GUESS' }
      enum DirectionsStatus { OK = 'OK', NOT_FOUND = 'NOT_FOUND', ZERO_RESULTS = 'ZERO_RESULTS' }
      enum SymbolPath { CIRCLE = 0 }
      namespace places {
        class Autocomplete {
          constructor(input: HTMLInputElement, opts?: any);
          addListener(eventName: string, handler: () => void): void;
          getPlace(): any;
        }
        class PlacesService {
          constructor(attrContainer: HTMLDivElement | Map);
          findPlaceFromQuery(request: any, callback: (results: any[] | null, status: any) => void): void;
        }
        enum PlacesServiceStatus {
          OK = 'OK'
        }
      }
      interface LatLngLiteral {
        lat: number;
        lng: number;
      }
      interface DirectionsWaypoint {
        location: string | LatLngLiteral | { placeId: string };
        stopover: boolean;
      }
      interface DirectionsResult {
        routes: {
          waypoint_order: number[];
          legs: {
            distance?: { value: number; text: string };
            duration?: { value: number; text: string };
            duration_in_traffic?: { value: number; text: string };
            start_location: LatLng;
            end_location: LatLng;
            start_address: string;
            end_address: string;
            steps: {
              path: LatLng[];
              distance?: { value: number; text: string };
              duration?: { value: number; text: string };
            }[];
          }[];
        }[];
      }
    }
  }
}
