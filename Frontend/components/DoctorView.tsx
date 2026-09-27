import React, { useState, useEffect } from 'react';
import { queueEngine, calculatePriorityBreakdown } from '../services/queueEngine';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { AuthUser } from '../types/auth';
import { Ticket, UrgencyLevel, TicketStatus } from '../types/queue';
import { playHospitalChime, speakAnnouncement } from '../services/soundEffects';
import { AuthModal } from './AuthModal';
import { 
  Stethoscope, 
  UserCheck, 
  PhoneCall, 
  CheckCircle, 
  UserX, 
  Clock, 
  HelpCircle, 
  RefreshCw, 
  ShieldAlert, 
  Building2, 
  DoorOpen,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Lock,
  Key
} from 'lucide-react';

interface DoctorViewProps {
  embedded?: boolean;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ embedded = false }) => {
  const departments = queueEngine.getDepartments();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('cardiology');
  const [roomNumber, setRoomNumber] = useState<string>('Room 302 - Heart Center');
  const [doctorName, setDoctorName] = useState<string>('Dr. Sarah Jenkins');
  const [snapshot, setSnapshot] = useState(() => queueEngine.getSnapshot('cardiology'));
  const [selectedTicketForInspection, setSelectedTicketForInspection] = useState<Ticket | null>(null);
  const [isCalling, setIsCalling] = useState<boolean>(false);

  useEffect(() => {
    const handleAuth = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user?.name) {
        setDoctorName(user.name);
      }
      if (user?.departmentId) {
        setSelectedDept(user.departmentId);
      }
    };
    handleAuth();
    const unsubAuth = authService.subscribe(handleAuth);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const update = () => {
      setSnapshot(queueEngine.getSnapshot(selectedDept));
    };
    update();
    const unsubscribe = queueEngine.subscribe(update);
    return () => unsubscribe();
  }, [selectedDept]);

  const handleDeptChange = (deptId: string) => {
    setSelectedDept(deptId);
    if (deptId === 'emergency') {
      setRoomNumber('Trauma Bay 01');
      setDoctorName(currentUser?.name || 'Dr. Michael Chen');
    } else if (deptId === 'pediatrics') {
      setRoomNumber('Room 108 - Peds');
      setDoctorName(currentUser?.name || 'Dr. Emily Watson');
    } else if (deptId === 'opd') {
      setRoomNumber('Room 204 - General');
      setDoctorName(currentUser?.name || 'Dr. Robert Thorne');
    } else {
      setRoomNumber('Room 302 - Heart Center');
      setDoctorName(currentUser?.name || 'Dr. Sarah Jenkins');
    }
  };

  const isAuthorized = authService.isDoctor();

  const handleCallNext = async () => {
    if (!isAuthorized) {
      authService.recordUnauthorizedAttempt('/api/doctor/call-next');
      setIsAuthModalOpen(true);
      return;
    }

    setIsCalling(true);
    try {
      // Execute authenticated REST API request with Bearer Token
      apiClient.callNext({
        departmentId: selectedDept,
        doctorName: currentUser?.name || doctorName,
        roomNumber
      }).catch(err => console.warn('REST API async sync:', err));

      const ticket = queueEngine.callNext({
        departmentId: selectedDept,
        roomNumber,
        doctorName: currentUser?.name || doctorName
      });
      playHospitalChime();
      speakAnnouncement(`Ticket ${ticket.ticketCode}, please proceed to ${roomNumber}`);
    } catch (e: any) {
      console.warn('Call next patient error:', e);
    } finally {
      setIsCalling(false);
    }
  };

  const handleUpdateStatus = (ticketId: string, newStatus: TicketStatus) => {
    if (!isAuthorized) {
      authService.recordUnauthorizedAttempt('/api/doctor/complete-consultation');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      if (newStatus === 'Completed') {
        apiClient.completeConsultation(selectedDept, ticketId).catch(() => {});
      }
      queueEngine.updateStatus(ticketId, newStatus);
    } catch (e: any) {
      console.warn('Update consultation error:', e);
    }
  };

  const activeTicket = snapshot.currentlyCalled.find(
    t => t.roomNumber === roomNumber || snapshot.currentlyCalled[0]?.id === t.id
  ) || snapshot.currentlyCalled[0];

  return (
    <div className="w-full space-y-6">
      {/* Security Banner if Unauthenticated */}
      {!isAuthorized && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200">
                Physician Authentication Required
              </div>
              <div className="text-[11px] text-slate-300">
                You are viewing in read-only mode. Please sign in with your Google account with Doctor or Administrator privileges to call patients and update consultations.
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        </div>
      )}

      {/* Top Bar / Doctor Profile & Room Setup */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-emerald-600/30">
            Dr
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full">
                Physician Console
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Workstation</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Doctor Consultation Workstation
            </h1>
          </div>
        </div>

        {/* Doctor Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          {/* Department */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>Department</span>
            </label>
            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.prefix})
                </option>
              ))}
            </select>
          </div>

          {/* Room Number */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center space-x-1">
              <DoorOpen className="w-3 h-3 text-slate-500" />
              <span>Assigned Room</span>
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Doctor Name */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center space-x-1">
              <Stethoscope className="w-3 h-3 text-slate-500" />
              <span>Attending Doctor</span>
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Queue Management & Call Next */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Call Action Hero */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                  Dynamic Priority Engine
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">
                  Auto-evaluates every minute
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {snapshot.waitingQueue.length > 0
                  ? `Next Patient: ${snapshot.waitingQueue[0].ticketCode} (${snapshot.waitingQueue[0].patientName})`
                  : 'Queue Empty: Ready for Patients'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Formula: (Wait Time × 1.5) + (Urgency × 20) + (Appt ? 15 : 0). Emergency bypasses to top.
              </p>
            </div>

            <button
              onClick={handleCallNext}
              disabled={snapshot.waitingQueue.length === 0 || isCalling}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold rounded-xl text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2.5 transition transform active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <PhoneCall className="w-5 h-5 animate-bounce" />
              <span>{isCalling ? 'Broadcasting...' : 'Call Next Patient'}</span>
            </button>
          </div>

          {/* Dynamic Priority Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-white text-base">Active Waiting Queue</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {snapshot.waitingQueue.length} Waiting
                </span>
              </div>
              <button
                onClick={() => queueEngine.recalculateAllScores()}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-score Queue</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Urgency</th>
                    <th className="py-3 px-4">Appointment</th>
                    <th className="py-3 px-4">Wait Time</th>
                    <th className="py-3 px-4">Priority Ranking</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {snapshot.waitingQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm font-semibold">No patients waiting in {departments.find(d => d.id === selectedDept)?.name}</p>
                        <p className="text-xs text-slate-600">Issue new tickets via the Patient Kiosk view.</p>
                      </td>
                    </tr>
                  ) : (
                    snapshot.waitingQueue.map((ticket, index) => {
                      const isEmergency = ticket.urgency === UrgencyLevel.Emergency;
                      const waitMins = Math.round(ticket.waitTimeMinutes);

                      return (
                        <tr
                          key={ticket.id}
                          className={`hover:bg-slate-800/40 transition ${index === 0 ? 'bg-emerald-950/20' : ''}`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                              index === 0 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center space-x-1.5">
                            <span>{ticket.ticketCode}</span>
                            {isEmergency && (
                              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-200 font-medium">
                            {ticket.patientName}
                          </td>
                          <td className="py-3.5 px-4">
                            {ticket.urgency === UrgencyLevel.Routine && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
                                Routine
                              </span>
                            )}
                            {ticket.urgency === UrgencyLevel.Priority && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Priority
                              </span>
                            )}
                            {ticket.urgency === UrgencyLevel.Urgent && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Urgent
                              </span>
                            )}
                            {ticket.urgency === UrgencyLevel.Emergency && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40 font-bold animate-pulse">
                                Emergency
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {ticket.hasAppointment ? (
                              <span className="text-emerald-400 font-semibold text-xs flex items-center space-x-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Booked</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">Walk-in</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                            {waitMins} min{waitMins === 1 ? '' : 's'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {isEmergency ? (
                              <span className="text-red-400 font-black tracking-wide text-xs">
                                CRITICAL STAT
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-xs font-semibold">
                                Rank #{index + 1}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedTicketForInspection(ticket)}
                              className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                            >
                              Triage Info
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Active Room Consultation Lifecycle */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">Active Consultation</h3>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Room State
              </span>
            </div>

            {/* Currently Called / In Room Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-5 text-center relative overflow-hidden">
              {activeTicket && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
              )}
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Current Room Patient
              </div>
              <div className="text-4xl font-mono font-black text-emerald-400 my-1">
                {activeTicket ? activeTicket.ticketCode : '--'}
              </div>
              <div className="text-sm font-semibold text-white">
                {activeTicket ? activeTicket.patientName : 'Room currently unoccupied'}
              </div>

              {activeTicket && (
                <div className="mt-3 flex items-center justify-center space-x-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    activeTicket.status === 'Called'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                      : activeTicket.status === 'InConsultation'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    Status: {activeTicket.status}
                  </span>
                </div>
              )}
            </div>

            {/* State Machine Transition Actions */}
            <div className="space-y-2.5">
              <button
                disabled={!activeTicket || activeTicket.status === 'InConsultation'}
                onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, 'InConsultation')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <UserCheck className="w-4 h-4" />
                <span>Mark In-Consultation</span>
              </button>

              <button
                disabled={!activeTicket}
                onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, 'Completed')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete Consultation</span>
              </button>

              <button
                disabled={!activeTicket}
                onClick={() => activeTicket && handleUpdateStatus(activeTicket.id, 'NoShow')}
                className="w-full py-3 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-rose-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <UserX className="w-4 h-4" />
                <span>Mark No-Show</span>
              </button>
            </div>
          </div>

          {/* Mathematical Formula Inspector Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 shadow-md">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Priority Formula Logic</span>
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 border border-slate-800 mb-3 leading-relaxed">
              Score = (WaitMins × 1.5) + (Urgency × 20) + (Appt ? 15 : 0)
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>• <span className="text-slate-400">Wait Duration:</span> Increases score dynamically by 1.5 per minute.</li>
              <li>• <span className="text-slate-400">Urgency Level:</span> Routine = +20, Priority = +40, Urgent = +60.</li>
              <li>• <span className="text-slate-400">Emergency (4):</span> Absolute override (Score = 999,999+) moves directly to #1.</li>
              <li>• <span className="text-slate-400">Pre-Booked Appointment:</span> +15 points.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ticket Priority Math Inspection Modal */}
      {selectedTicketForInspection && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Triage Information
                </h3>
                <span className="text-xs font-mono text-emerald-400">
                  {selectedTicketForInspection.ticketCode}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicketForInspection(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Patient Name:</span>
                <span className="font-semibold text-white">{selectedTicketForInspection.patientName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Triage Urgency:</span>
                <span className={`font-semibold ${
                  selectedTicketForInspection.urgency === UrgencyLevel.Emergency 
                    ? 'text-red-400 font-bold' 
                    : selectedTicketForInspection.urgency === UrgencyLevel.Urgent
                    ? 'text-amber-400'
                    : 'text-blue-400'
                }`}>
                  {UrgencyLevel[selectedTicketForInspection.urgency]}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Appointment Type:</span>
                <span className="font-semibold text-white">
                  {selectedTicketForInspection.hasAppointment ? 'Pre-scheduled Appointment' : 'Walk-in Registration'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Waiting Duration:</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(selectedTicketForInspection.waitTimeMinutes)} minutes elapsed
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Consultation Status:</span>
                <span className="font-semibold text-slate-200">
                  {selectedTicketForInspection.status}
                </span>
              </div>

              <button
                onClick={() => setSelectedTicketForInspection(null)}
                className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google OAuth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        requiredRole="Doctor"
        title="Doctor Workstation Access"
        subtitle="Sign in with your Google Workspace / Physician Google account to call patients."
      />
    </div>
  );
};
