import React, { useState, useEffect, useRef } from 'react';
import { queueEngine } from '../services/queueEngine';
import { Ticket, UrgencyLevel } from '../types/queue';
import { 
  playHospitalChime, 
  isSoundMuted, 
  toggleSound 
} from '../services/soundEffects';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Clock, 
  Radio, 
  Sparkles, 
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface LobbyViewProps {
  embedded?: boolean;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ embedded = false }) => {
  const [snapshot, setSnapshot] = useState(() => queueEngine.getSnapshot());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [muted, setMuted] = useState<boolean>(isSoundMuted());
  const lastCalledIdRef = useRef<string | null>(null);

  useEffect(() => {
    const update = () => {
      const snap = queueEngine.getSnapshot();
      if (snap.currentlyCalled.length > 0 && snap.currentlyCalled[0].id !== lastCalledIdRef.current) {
        lastCalledIdRef.current = snap.currentlyCalled[0].id;
      }
      setSnapshot(snap);
    };

    update();
    const unsubscribe = queueEngine.subscribe(update);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubscribe();
      clearInterval(clockTimer);
    };
  }, []);

  const handleToggleSound = () => {
    const newMuted = toggleSound();
    setMuted(newMuted);
  };

  const handleTestChime = () => {
    playHospitalChime();
  };

  const calledTickets = snapshot.currentlyCalled.slice(0, 4);
  const waitingTickets = snapshot.waitingQueue.slice(0, 8);

  return (
    <div className="w-full space-y-6">
      {/* TV Header Bar */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 sm:space-x-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-blue-500/30 shrink-0">
            +
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                Central Lobby TV Feed
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>SignalR Live Stream</span>
              </span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide uppercase mt-0.5">
              St. Jude Memorial Hospital — Patient Calling Display
            </h1>
          </div>
        </div>

        {/* Top Right Controls & Clock */}
        <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          {/* Sound Effect Chime Controller */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                muted
                  ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                  : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
              }`}
              title="Toggle Web Audio API chime alerts"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{muted ? 'Chime Muted' : 'Chime Active'}</span>
            </button>
            <button
              onClick={handleTestChime}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
            >
              Test Chime
            </button>
          </div>

          {/* Clinical Real-Time Clock */}
          <div className="text-right pl-2 border-l border-slate-800">
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-slate-400">
              {currentTime.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Screen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: CURRENTLY CALLED TICKETS (Large TV Hero) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center space-x-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-400">
                  Currently Called Patients
                </h2>
              </div>
              <span className="text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-3 py-1 rounded-full">
                Proceed to Doctor Room
              </span>
            </div>

            {/* List of Called Tickets */}
            <div className="space-y-4 flex-1">
              {calledTickets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl mb-3">
                    ⏳
                  </div>
                  <p className="text-lg font-bold text-slate-300">All consultation rooms are currently preparing.</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    New announcements will appear here automatically with room assignment and audio chime.
                  </p>
                </div>
              ) : (
                calledTickets.map((ticket, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div
                      key={ticket.id}
                      className={`rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 min-w-0 ${
                        isFirst
                          ? 'bg-slate-950 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10'
                          : 'bg-slate-950/70 border border-slate-800/90'
                      }`}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] sm:text-xs uppercase font-bold text-slate-400 flex items-center space-x-2 truncate">
                            <span>{ticket.departmentId.toUpperCase()}</span>
                            <span>•</span>
                            <span className="truncate">{ticket.patientName}</span>
                          </div>
                          <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight mt-0.5">
                            {ticket.ticketCode}
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                        <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                          Please Proceed To
                        </span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 flex items-center sm:justify-end space-x-1.5">
                          <span>{ticket.roomNumber || 'Consultation Room'}</span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">
                          {ticket.doctorName || 'Attending Physician'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* TV Screen Notice Bottom */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Audio Chimes emit automatically upon physician call</span>
              </span>
              <span>St. Jude In-Patient & Out-Patient Triage</span>
            </div>
          </div>
        </div>

        {/* Right Side: UPCOMING WAITING QUEUE */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-blue-400">
                  Upcoming Queue
                </h2>
                <p className="text-xs text-slate-400">Ordered by Dynamic Priority Engine</p>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full">
                {snapshot.waitingQueue.length} In Line
              </span>
            </div>

            {/* Waiting Queue List */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Ticket</th>
                    <th className="py-3 px-3.5">Dept</th>
                    <th className="py-3 px-3.5">Urgency</th>
                    <th className="py-3 px-3.5">Wait</th>
                    <th className="py-3 px-3.5 text-right">Est. Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {waitingTickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        All patient queues are currently empty.
                      </td>
                    </tr>
                  ) : (
                    waitingTickets.map((ticket, index) => {
                      const isEmergency = ticket.urgency === UrgencyLevel.Emergency;

                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-slate-800/30 transition border-b border-slate-800/60"
                        >
                          <td className="py-3.5 px-3.5 font-mono font-bold text-white flex items-center space-x-1.5">
                            <span>{ticket.ticketCode}</span>
                            {isEmergency && (
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 uppercase text-[11px] font-semibold text-slate-300">
                            {ticket.departmentId.substring(0, 4)}
                          </td>
                          <td className="py-3.5 px-3.5">
                            {ticket.urgency === UrgencyLevel.Routine && (
                              <span className="text-slate-400 text-[11px]">Routine</span>
                            )}
                            {ticket.urgency === UrgencyLevel.Priority && (
                              <span className="text-blue-400 text-[11px] font-semibold">Priority</span>
                            )}
                            {ticket.urgency === UrgencyLevel.Urgent && (
                              <span className="text-amber-400 text-[11px] font-semibold">Urgent</span>
                            )}
                            {ticket.urgency === UrgencyLevel.Emergency && (
                              <span className="text-red-400 text-[11px] font-black animate-pulse">EMERGENCY</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 font-mono text-slate-400 text-[11px]">
                            {Math.round(ticket.waitTimeMinutes)}m
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-mono font-bold text-emerald-400 text-xs">
                            {isEmergency ? 'NEXT' : `~${ticket.estimatedWaitMinutes}m`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Showing top {waitingTickets.length} waiting patients</span>
              <span className="text-emerald-400 font-mono">Formula: (Wait×1.5)+(Urg×20)+(Appt?15)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
