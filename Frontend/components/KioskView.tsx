import React, { useState, useEffect } from 'react';
import { queueEngine } from '../services/queueEngine';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { AuthUser } from '../types/auth';
import { UrgencyLevel, Ticket } from '../types/queue';
import { playHospitalChime, playEmergencyAlertSound } from '../services/soundEffects';
import { AuthModal } from './AuthModal';
import { DigitalTicketPass } from './DigitalTicketPass';
import { 
  Heart, 
  Baby, 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Printer, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Cookie,
  UserCheck,
  QrCode
} from 'lucide-react';

interface KioskViewProps {
  embedded?: boolean;
}

export const KioskView: React.FC<KioskViewProps> = ({ embedded = false }) => {
  const departments = queueEngine.getDepartments();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('cardiology');
  const [patientName, setPatientName] = useState<string>('');
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.Routine);
  const [hasAppointment, setHasAppointment] = useState<boolean>(false);
  const [issuedTicket, setIssuedTicket] = useState<{ ticket: Ticket; queuePosition: number } | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const handleAuth = () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user && !patientName) {
        setPatientName(user.name);
      }
    };
    handleAuth();
    const unsub = authService.subscribe(handleAuth);
    return () => unsub();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      try {
        // Dispatch to REST API backend
        apiClient.issueTicket({
          departmentId: selectedDept,
          patientName,
          urgency,
          hasAppointment
        }).catch(err => console.warn('REST API async issue ticket:', err));

        const result = queueEngine.issueTicket({
          departmentId: selectedDept,
          patientName,
          urgency,
          hasAppointment
        });

        if (urgency === UrgencyLevel.Emergency) {
          playEmergencyAlertSound();
        } else {
          playHospitalChime();
        }

        setIssuedTicket(result);
      } catch (err: any) {
        alert(err.message || 'Error issuing ticket');
      } finally {
        setIsSubmitting(false);
      }
    }, 250);
  };

  const handleReset = () => {
    setIssuedTicket(null);
    setPatientName('');
    setUrgency(UrgencyLevel.Routine);
    setHasAppointment(false);
  };

  const deptIcons: Record<string, React.ReactNode> = {
    cardiology: <Heart className="w-5 h-5 text-rose-400" />,
    pediatrics: <Baby className="w-5 h-5 text-sky-400" />,
    opd: <Stethoscope className="w-5 h-5 text-emerald-400" />,
    emergency: <AlertTriangle className="w-5 h-5 text-amber-400" />
  };

  return (
    <div className={`w-full ${embedded ? 'p-0' : 'max-w-3xl mx-auto'}`}>
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-lg shadow-blue-500/25 shrink-0">
              +
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-full">
                  Kiosk Terminal #01
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live SignalR</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                Patient Self-Service Check-In
              </h1>
              <p className="text-xs text-slate-400">
                St. Jude Memorial Hospital • Smart Triage & Priority Queue
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Google Identity & Session Cookie Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {currentUser ? (
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`;
              }}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center space-x-1.5 truncate">
                <span className="truncate">Account: {currentUser.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold shrink-0">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 font-mono truncate">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Ticket linked to your patient profile</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Have a Google Account?</div>
              <div className="text-[11px] text-slate-400">Sign in to sync your ticket and receive real-time notifications.</div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full sm:w-auto justify-center px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center space-x-2 transition shrink-0 cursor-pointer"
        >
          <span>{currentUser ? 'Switch Google Account' : 'Sign In with Google'}</span>
        </button>
      </div>

      {!issuedTicket ? (
        /* Check-in Form Card */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Patient Full Name (Optional)
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition"
              />
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Select Hospital Department
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departments.map((dept) => {
                  const isSelected = selectedDept === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDept(dept.id)}
                      className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start space-x-3.5 min-w-0 ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600/20' : 'bg-slate-900'}`}>
                        {deptIcons[dept.id] || <Stethoscope className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                          <span className="truncate">{dept.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                            {dept.prefix}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1">
                          {dept.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Triage Urgency Level
                </label>
                <span className="text-[11px] text-slate-400">Affects Priority Score</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { level: UrgencyLevel.Routine, label: 'Routine', sub: 'Regular Checkup', score: '+20 pts', color: 'border-slate-700 text-slate-300' },
                  { level: UrgencyLevel.Priority, label: 'Priority', sub: 'Moderate Pain', score: '+40 pts', color: 'border-blue-500/60 text-blue-400' },
                  { level: UrgencyLevel.Urgent, label: 'Urgent', sub: 'High Fever/Distress', score: '+60 pts', color: 'border-amber-500/60 text-amber-400' },
                  { level: UrgencyLevel.Emergency, label: 'Emergency', sub: 'Immediate Threat', score: 'Top Bypass', color: 'border-red-500 text-red-400' },
                ].map((item) => {
                  const isSelected = urgency === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setUrgency(item.level)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? item.level === UrgencyLevel.Emergency
                            ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-500/20'
                            : 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-white mb-0.5 flex items-center justify-center space-x-1">
                        {item.level === UrgencyLevel.Emergency && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                        <span>{item.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-1">{item.sub}</div>
                      <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${item.color} bg-slate-900`}>
                        {item.score}
                      </span>
                    </button>
                  );
                })}
              </div>

              {urgency === UrgencyLevel.Emergency && (
                <div className="mt-2.5 p-3 rounded-xl bg-red-950/30 border border-red-800/50 flex items-start space-x-2 text-xs text-red-300">
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-200">Emergency Protocol Active:</span> Ticket will automatically bypass standard scoring and move directly to the top of the waiting queue.
                  </div>
                </div>
              )}
            </div>

            {/* Scheduled Appointment Checkbox */}
            <label className="flex items-center space-x-3.5 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
              <input
                type="checkbox"
                checked={hasAppointment}
                onChange={(e) => setHasAppointment(e.target.checked)}
                className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>I have a pre-booked appointment for today</span>
                </div>
                <div className="text-xs text-slate-400">
                  Adds +15 points to your initial queue priority score.
                </div>
              </div>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isSubmitting ? 'Calculating Priority & Issuing...' : 'Issue My Priority Ticket'}</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      ) : (
        /* Issued Ticket Result Pass */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500"></div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Check-In Successful
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Please Keep Your Ticket</h2>
          </div>

          {/* Ticket Pass Cutout Visual */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 max-w-md mx-auto shadow-inner relative">
            <div className="flex justify-between items-center pb-4 border-b border-dashed border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Hospital Department</div>
                <div className="text-sm font-bold text-white">
                  {queueEngine.getDepartment(issuedTicket.ticket.departmentId)?.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Triage Level</div>
                <div className={`text-xs font-bold ${issuedTicket.ticket.urgency === UrgencyLevel.Emergency ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                  {UrgencyLevel[issuedTicket.ticket.urgency]}
                </div>
              </div>
            </div>

            {/* Giant Ticket Code */}
            <div className="text-center py-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                Your Ticket Number
              </div>
              <div className="text-5xl sm:text-6xl font-mono font-black tracking-tight text-white">
                {issuedTicket.ticket.ticketCode}
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">
                {issuedTicket.ticket.patientName}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-dashed border-slate-800 text-center">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Position</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  #{issuedTicket.queuePosition}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Est. Wait</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  ~{issuedTicket.ticket.estimatedWaitMinutes}m
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Priority Score</div>
                <div className="text-sm font-mono font-bold text-amber-400 mt-1">
                  {issuedTicket.ticket.urgency === UrgencyLevel.Emergency
                    ? 'TOP BYPASS'
                    : `${issuedTicket.ticket.priorityScore.toFixed(0)} pts`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition shadow-md shadow-blue-600/25"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital QR Pass</span>
            </button>
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition"
            >
              Check In Another Patient
            </button>
          </div>

          {showQrModal && issuedTicket && (
            <DigitalTicketPass
              ticket={issuedTicket.ticket}
              department={queueEngine.getDepartment(issuedTicket.ticket.departmentId) || queueEngine.getDepartments()[0]}
              queuePosition={issuedTicket.queuePosition}
              onClose={() => setShowQrModal(false)}
            />
          )}

          <p className="text-center text-[11px] text-slate-500 mt-4">
            Please watch the central Lobby TV screens. When your ticket is summoned, a chime will sound with your assigned room number.
          </p>
        </div>
      )}

      {/* Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        requiredRole="Patient"
        title="Patient Google Sign-In"
        subtitle="Connect your Google profile to track your ticket status."
      />
    </div>
  );
};
