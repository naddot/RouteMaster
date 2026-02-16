import React from 'react';
import { DeliveryStop } from '../types';

interface StopItemProps {
    stop: DeliveryStop;
    index: number;
    isLast: boolean;
    updateStopStatus: (id: string, newStatus: 'pending' | 'completed' | 'failed' | 'arrived') => void;
}

export const StopItem: React.FC<StopItemProps> = ({ stop, index, isLast, updateStopStatus }) => {
    const isCompleted = stop.status === 'completed';
    const isArrived = stop.status === 'arrived';
    const isPending = stop.status === 'pending';
    const isFuel = stop.id.startsWith('FUEL-');
    const displayTime = stop.actualArrivalEta
        ? new Date(stop.actualArrivalEta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : stop.estimatedArrival;

    return (
        <div className="relative pl-6 group">
            {!isLast && (<div className="absolute left-[11px] top-6 bottom-[-12px] w-0.5 bg-slate-100"></div>)}

            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isFuel ? 'bg-yellow-500 border-yellow-500 text-white' :
                    isArrived ? 'bg-blue-500 border-blue-500 text-white' :
                        'bg-white border-slate-900 text-slate-900'
                }`}>
                {isCompleted ? '✓' : isFuel ? '⛽' : index + 1}
            </div>

            <div className={`border p-3 rounded-lg shadow-sm transition-all ${isCompleted ? 'opacity-50 bg-slate-50' :
                isFuel ? 'bg-yellow-50/50 border-yellow-200' :
                    'bg-white hover:border-blue-300'
                }`}>
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{stop.address}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${isFuel ? 'text-yellow-700' : 'text-blue-600'}`}>
                                {isFuel ? 'Fuel Stop' : `BC NO: ${stop.id}`}
                            </span>
                            {stop.placeId && (
                                <span className="text-[8px] font-black bg-blue-100 text-blue-700 px-1 py-0.5 rounded uppercase tracking-tighter">Resolved</span>
                            )}
                            <span className="text-[9px] text-slate-400 font-medium italic truncate">{stop.notes}</span>
                        </div>
                    </div>
                    {displayTime && stop.status !== 'failed' && (
                        <div className="flex flex-col items-end shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isArrived || isCompleted ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{displayTime}</span>
                            <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-tighter">{stop.actualArrivalEta ? 'Actual' : 'ETA'}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{isFuel ? 'Refuel' : `${stop.tyreCount || 2} Tyres`}</span>
                    <div className="flex gap-1 items-center">
                        {isPending && (
                            <button onClick={() => updateStopStatus(stop.id, 'arrived')} className={`p-1 rounded transition-colors ${isFuel ? 'hover:bg-yellow-100 text-yellow-700' : 'hover:bg-blue-50 text-blue-600'}`} title="Mark Arrived">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                            </button>
                        )}
                        {(isPending || isArrived) && (
                            <>
                                <button onClick={() => updateStopStatus(stop.id, 'completed')} className="p-1 hover:bg-green-50 text-green-600 rounded transition-colors" title="Complete">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </button>
                                <button onClick={() => updateStopStatus(stop.id, 'failed')} className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors" title="Fail">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </>
                        )}
                        {(isCompleted || stop.status === 'failed' || isArrived) && (
                            <span className={`text-[9px] font-black uppercase tracking-tight ${isCompleted ? 'text-green-600' : isArrived ? 'text-blue-600' : 'text-red-600'}`}>
                                {stop.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
