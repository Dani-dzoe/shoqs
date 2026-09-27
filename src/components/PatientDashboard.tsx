import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { queueEngine, calculatePriorityBreakdown } from '../services/queueEngine';
import { AuthUser } from '../types/auth';
import { Ticket, Department, UrgencyLevel, PatientQueueStatus, PriorityBreakdown } from '../types/queue';
import { playHospitalChime } from '../services/soundEffects';
import { DigitalTicketPass } from './DigitalTicketPass';
import { 
  Clock, 
  Users, 
  QrCode, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  LogIn, 
  ShieldCheck, 
  Stethoscope, 
  Building2, 
  ChevronRight, 
  Activity, 
  Bell, 
  Sparkles, 
  Trash2,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface PatientDashboardProps {
  onOpenAuthModal?: () => void;
  onNavigateToView?: (view: 'home' | 'lobby' | 'kiosk' | 'doctor') => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  onOpenAuthModal,
  onNavigateToView
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [queueStatus, setQueueStatus] = useState<PatientQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Check-In form state when patient has no ticket
  const [selectedDeptId, setSelectedDeptId] = useState<string>('cardiology');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel>(UrgencyLevel.Routine);
  const [hasAppointment, setHasAppointment] = useState<boolean>(true);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState<boolean>(false);

  // Sound chime reference for state changes
  const prevStatusRef = useRef<string | null>(null);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });
    return () => unsubAuth();
  }, []);

  // Fetch queue position based on logged-in user ID
  const fetchPatientQueue = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    setErrorMsg(null);

    const user = authService.getCurrentUser();
    if (!user) {
      setQueueStatus(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // 1. Try remote REST API endpoint: GET /api/queue/patient/:userId
      const status = await apiClient.getPatientQueueStatus(user.id, user.email);
      
      // If REST API returned null or no ticket, also check client-side queueEngine
      if (!status || !status.hasActiveTicket) {
        const localStatus = queueEngine.getPatientQueueStatus(user.id, user.email, user.name);
        setQueueStatus(localStatus);
      } else {
        setQueueStatus(status);
      }
    } catch {
      // 2. Fallback to client-side queueEngine simulation
      const localStatus = queueEngine.getPatientQueueStatus(user.id, user.email, user.name);
      setQueueStatus(localStatus);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefreshedAt(new Date());
    }
  }, []);

  // Poll for updates every 5 seconds and subscribe to queueEngine events
  useEffect(() => {
    fetchPatientQueue();

    const unsubQueue = queueEngine.subscribe(() => {
      fetchPatientQueue();
    });

    const intervalId = setInterval(() => {
      fetchPatientQueue();
    }, 5000);

    return () => {
      unsubQueue();
      clearInterval(intervalId);
    };
  }, [fetchPatientQueue, currentUser]);

  // Trigger audio alert when ticket is called
  useEffect(() => {
    if (queueStatus?.ticket) {
      const currentTicketStatus = queueStatus.ticket.status;
      if (
        (currentTicketStatus === 'Called' || currentTicketStatus === 'InConsultation') &&
        prevStatusRef.current !== currentTicketStatus
      ) {
        playHospitalChime();
      }
      prevStatusRef.current = currentTicketStatus;
    }
  }, [queueStatus?.ticket?.status]);

  // Handle self-check-in when user has no active ticket
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    setIsSubmittingCheckIn(true);
    setErrorMsg(null);

    try {
      const payload = {
        departmentId: selectedDeptId,
        patientName: currentUser.name,
        urgency: selectedUrgency,
        hasAppointment: hasAppointment,
        linkedUserId: currentUser.id,
        linkedUserEmail: currentUser.email
      };

      try {
        await apiClient.issueTicket(payload);
      } catch {
        // Fallback to local engine
        queueEngine.issueTicket(payload);
      }

      await fetchPatientQueue(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to check in to clinic queue. Please try again.');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // Handle canceling / leaving the queue
  const handleCancelTicket = () => {
    if (!queueStatus?.ticket) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel ticket ${queueStatus.ticket.ticketCode}? You will forfeit your position in line.`
    );
    if (!confirmCancel) return;

    // Update status in local engine
    queueEngine.updateStatus(queueStatus.ticket.id, 'Completed');
    fetchPatientQueue(true);
  };

  // Quick Demo Login helper for patient Eleanor Rigby
  const handleQuickDemoPatient = async () => {
    setIsLoading(true);
    try {
      await authService.loginWithPassword('patient.rigby@gmail.com', 'Password123!');
      await fetchPatientQueue(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo patient sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate priority breakdown for transparency card
  const priorityBreakdown: PriorityBreakdown | null = queueStatus?.ticket
    ? calculatePriorityBreakdown(
        queueStatus.ticket.createdAt,
        queueStatus.ticket.urgency,
        queueStatus.ticket.hasAppointment
      )
    : null;

  return (
    <div className="w-full space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="font-semibold text-blue-400">Patient Clinical Portal</span>
            <span>·</span>
            <span>Live Triage &amp; Wait Time Tracker</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            My Queue Position &amp; Wait Time
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized directly with clinic triage boards and physician examination consoles.
          </p>
        </div>

        {/* User Status Bar & Refresh Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto justify-between sm:justify-end">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-left min-w-0 flex-1 sm:flex-initial">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 truncate">
                  <span>ID: {currentUser.id.substring(0, 12)}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">{currentUser.role}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition shadow-md shadow-blue-600/20 cursor-pointer w-full sm:w-auto justify-center"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Patient ID</span>
            </button>
          )}

          <button
            onClick={() => fetchPatientQueue(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer shrink-0"
            title="Refresh current queue position"
            aria-label="Refresh queue position"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex items-start space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* STATE 1: USER IS NOT LOGGED IN */}
      {!currentUser && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-600/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Please Sign In to View Your Queue Status
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your digital ticket, exact queue position, and live estimated consultation time are securely linked to your logged-in patient account.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In or Register Account</span>
            </button>

            <button
              onClick={handleQuickDemoPatient}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Test with Eleanor Rigby (Patient Demo)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: USER IS LOGGED IN BUT HAS NO ACTIVE TICKET */}
      {currentUser && (!queueStatus?.hasActiveTicket || !queueStatus.ticket) && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: No Active Ticket Notice */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-700">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No Active Queue Ticket</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  You are currently logged in as <span className="text-white font-semibold">{currentUser.name}</span>, but you have no pending ticket in the clinical triage system.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="text-slate-300 font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>How Queue Optimization Works</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  When you check in, the system assigns you a ticket linked to your user account. Priority is dynamically calculated using triage urgency, wait duration, and scheduled appointment status.
                </p>
              </div>
            </div>

            {/* Fast link to Eleanor Rigby demo ticket */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleQuickDemoPatient}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-between transition cursor-pointer"
              >
                <span>Load Active Demo Ticket (Eleanor Rigby · CARD-101)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Instant Check-In & Queue Joining Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>Instant Self-Check-In</span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Join a Clinic Waiting Queue
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your department and triage level to generate your live digital ticket.
              </p>
            </div>

            <form onSubmit={handleJoinQueue} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Select Clinic Department
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="cardiology">Cardiology Clinic (Prefix: CARD)</option>
                  <option value="pediatrics">Pediatrics Wing (Prefix: PEDS)</option>
                  <option value="opd">General Outpatient - OPD (Prefix: OPD)</option>
                  <option value="emergency">Emergency / Acute Triage (Prefix: EMER)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Triage Urgency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { level: UrgencyLevel.Routine, label: 'Routine', color: 'border-slate-700 text-slate-300' },
                    { level: UrgencyLevel.Priority, label: 'Priority', color: 'border-blue-700 text-blue-300' },
                    { level: UrgencyLevel.Urgent, label: 'Urgent', color: 'border-amber-700 text-amber-300' },
                    { level: UrgencyLevel.Emergency, label: 'Emergency', color: 'border-rose-700 text-rose-300' }
                  ].map((item) => (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setSelectedUrgency(item.level)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                        selectedUrgency === item.level
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : `bg-slate-950 ${item.color} hover:bg-slate-800`
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <label className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAppointment}
                    onChange={(e) => setHasAppointment(e.target.checked)}
                    className="rounded border-slate-800 text-blue-600 focus:ring-blue-500/20 bg-slate-900"
                  />
                  <span>I have a pre-scheduled appointment today (+15 priority score)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCheckIn}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>{isSubmittingCheckIn ? 'Assigning Ticket...' : 'Check In & Join Live Queue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STATE 3: USER HAS AN ACTIVE TICKET IN QUEUE */}
      {currentUser && queueStatus?.hasActiveTicket && queueStatus.ticket && (
        <div className="space-y-6">
          
          {/* URGENT CALL BANNER: Displayed when status is 'Called' */}
          {queueStatus.isCalled && (
            <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white p-6 rounded-3xl shadow-2xl border-2 border-white/20 animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Bell className="w-8 h-8 text-white animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/90">
                    Your Turn · Doctor Ready
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">
                    Please Proceed to {queueStatus.ticket.roomNumber || 'Consultation Room'}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {queueStatus.ticket.doctorName || 'Attending Clinician'} is waiting to begin your examination.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPassModal(true)}
                className="px-5 py-3 bg-white text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
              >
                Show Digital Ticket QR
              </button>
            </div>
          )}

          {/* Core Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Metric 1: Current Queue Position */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-w-0 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Queue Position</span>
                <span className="text-xs text-blue-400 font-mono">
                  {queueStatus.ticket.departmentId.toUpperCase()}
                </span>
              </div>

              <div className="py-4">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  {queueStatus.ticket.status === 'Waiting' ? (
                    `#${queueStatus.queuePosition}`
                  ) : queueStatus.ticket.status === 'Called' ? (
                    <span className="text-rose-400 text-2xl sm:text-3xl">CALLED</span>
                  ) : queueStatus.ticket.status === 'InConsultation' ? (
                    <span className="text-emerald-400 text-2xl sm:text-3xl">IN ROOM</span>
                  ) : (
                    'DONE'
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 truncate">
                  <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {queueStatus.ticket.status === 'Waiting'
                      ? queueStatus.ticketsAheadCount === 0
                        ? 'You are next in line'
                        : `${queueStatus.ticketsAheadCount} patient${queueStatus.ticketsAheadCount === 1 ? '' : 's'} ahead of you`
                      : 'Consultation active'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Total waiting in clinic:</span>
                <span className="font-mono text-white font-semibold">
                  {queueEngine.getSnapshot(queueStatus.ticket.departmentId).totalWaiting} patients
                </span>
              </div>
            </div>

            {/* Metric 2: Estimated Wait Time */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-w-0 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Estimated Wait Time</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>

              <div className="py-4">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                  {queueStatus.ticket.status === 'Waiting' ? (
                    `~${queueStatus.estimatedWaitMinutes}m`
                  ) : (
                    <span className="text-emerald-400 text-2xl sm:text-3xl">0m</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    Checked in {Math.round(queueStatus.ticket.waitTimeMinutes)} mins ago
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Tracking Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Sync</span>
                </span>
              </div>
            </div>

            {/* Metric 3: Digital Ticket Code & Examination Room */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-w-0 h-full sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Assigned Ticket</span>
                <button
                  onClick={() => setShowPassModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View Pass</span>
                </button>
              </div>

              <div className="py-4">
                <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
                  {queueStatus.ticket.ticketCode}
                </div>
                <div className="text-xs text-slate-400 mt-2 truncate">
                  {queueStatus.department?.name || 'Hospital Department'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Room / Station:</span>
                <span className="text-white font-semibold truncate">
                  {queueStatus.ticket.roomNumber || 'Assigned on call'}
                </span>
              </div>
            </div>

          </div>

          {/* 4-Step Patient Journey Stepper */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Live Consultation Journey
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Updated {lastRefreshedAt.toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  step: '01',
                  title: 'Check-In Completed',
                  desc: 'Ticket issued & patient profile linked',
                  active: true,
                  completed: true
                },
                {
                  step: '02',
                  title: 'Priority Calculation',
                  desc: 'Continuous real-time queue ranking',
                  active: queueStatus.ticket.status === 'Waiting',
                  completed: queueStatus.ticket.status !== 'Waiting'
                },
                {
                  step: '03',
                  title: 'Patient Called',
                  desc: queueStatus.ticket.roomNumber ? `Proceed to ${queueStatus.ticket.roomNumber}` : 'Await chime call in lobby',
                  active: queueStatus.ticket.status === 'Called',
                  completed: queueStatus.ticket.status === 'InConsultation' || queueStatus.ticket.status === 'Completed'
                },
                {
                  step: '04',
                  title: 'In Consultation',
                  desc: queueStatus.ticket.doctorName || 'Clinical examination in progress',
                  active: queueStatus.ticket.status === 'InConsultation',
                  completed: queueStatus.ticket.status === 'Completed'
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                    item.active
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-lg shadow-blue-600/10'
                      : item.completed
                      ? 'bg-slate-950 border-slate-800 text-slate-400'
                      : 'bg-slate-950/50 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{item.step}</span>
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : item.active ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    )}
                  </div>
                  <div className={`text-xs font-bold ${item.active ? 'text-blue-300' : item.completed ? 'text-white' : 'text-slate-400'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Two Balanced Cards: Clinic Details & Patient Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Card 1: Clinic & Consultation Information */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Clinic &amp; Consultation Details
                  </h3>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    {queueStatus.department?.name || 'Clinic'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Key details regarding your scheduled visit and medical provider.
                </p>

                <div className="space-y-2.5 pt-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <span className="text-slate-400">Attending Physician:</span>
                    <span className="font-semibold text-white">
                      {queueStatus.ticket.doctorName || 'Dr. Sarah Jenkins, MD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <span className="text-slate-400">Assigned Room:</span>
                    <span className="font-semibold text-emerald-400">
                      {queueStatus.ticket.roomNumber || 'Room 302 (Upon Calling)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <span className="text-slate-400">Check-in Urgency:</span>
                    <span className="font-semibold text-blue-400">
                      {UrgencyLevel[queueStatus.ticket.urgency]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <span className="text-slate-400">Appointment Type:</span>
                    <span className="font-semibold text-slate-200">
                      {queueStatus.ticket.hasAppointment ? 'Scheduled Appointment' : 'Walk-In Patient'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Arrival: {Math.round(queueStatus.ticket.waitTimeMinutes)} min ago</span>
                <span className="text-emerald-400 font-medium">Auto-synced</span>
              </div>
            </div>

            {/* Card 2: Patient Pass & Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Digital Pass &amp; Actions
                  </h3>
                  <span className="text-[10px] font-mono uppercase bg-blue-950/60 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded">
                    Ticket #{queueStatus.ticket.ticketCode}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Access your boarding pass or keep track of calls on the lobby screen.
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 mt-4 text-center space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Current Calling Patient
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {queueStatus.currentCallingCode || '--'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {queueStatus.currentCallingCode ? 'Now being served in examination room' : 'Clinic ready for next patient call'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => setShowPassModal(true)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Open Digital QR Pass</span>
                </button>

                {onNavigateToView && (
                  <button
                    onClick={() => onNavigateToView('lobby')}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <span>View Public Waiting Room TV</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleCancelTicket}
                  className="w-full py-2 px-4 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs font-medium rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Leave Queue / Cancel Ticket</span>
                </button>
              </div>
            </div>

          </div>

          {/* Digital QR Ticket Modal */}
          {showPassModal && queueStatus.department && (
            <DigitalTicketPass
              ticket={queueStatus.ticket}
              department={queueStatus.department}
              queuePosition={queueStatus.queuePosition}
              onClose={() => setShowPassModal(false)}
              onNavigateToView={onNavigateToView as any}
            />
          )}

        </div>
      )}

    </div>
  );
};
