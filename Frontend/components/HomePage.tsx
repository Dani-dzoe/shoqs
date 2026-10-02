import React, { useState, useEffect } from 'react';
import { Department, Ticket, UrgencyLevel } from '../types/queue';
import { queueEngine } from '../services/queueEngine';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { AuthUser, UserRole } from '../types/auth';
import { DigitalTicketPass } from './DigitalTicketPass';
import {
  QrCode,
  LogIn,
  UserPlus,
  Clock,
  Activity,
  Heart,
  Baby,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Search,
  Monitor,
  UserCheck,
  Sparkles,
  Smartphone,
  ExternalLink,
  Layers
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: 'home' | 'kiosk' | 'doctor' | 'lobby' | 'triview') => void;
  onOpenAuth: (defaultRole?: UserRole) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenAuth }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  
  // Express Check-in Form state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('cardiology');
  const [patientName, setPatientName] = useState<string>('');
  const [hasAppointment, setHasAppointment] = useState<boolean>(false);
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.Routine);
  
  // Generated Ticket / Modal state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [activePosition, setActivePosition] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticket Lookup state
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Live department waiting counts
  const [deptStats, setDeptStats] = useState<Record<string, { waiting: number; estWait: number }>>({});

  useEffect(() => {
    const unsubscribeAuth = authService.subscribe(() => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser && !patientName) {
        setPatientName(currentUser.name);
      }
    });

    const refreshData = () => {
      const depts = queueEngine.getDepartments();
      setDepartments(depts);

      const stats: Record<string, { waiting: number; estWait: number }> = {};
      for (const d of depts) {
        const snap = queueEngine.getSnapshot(d.id);
        const waitCount = snap.waitingQueue.length;
        const estWait = waitCount === 0 ? 5 : waitCount * 12;
        stats[d.id] = { waiting: waitCount, estWait };
      }
      setDeptStats(stats);
    };

    refreshData();
    const unsubscribeQueue = queueEngine.subscribe(refreshData);

    return () => {
      unsubscribeAuth();
      unsubscribeQueue();
    };
  }, []);

  // Pre-fill user name if logged in
  useEffect(() => {
    if (user && !patientName) {
      setPatientName(user.name);
    }
  }, [user]);

  // Handle URL hash on initial load (e.g. #ticket=CARD-101)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/#ticket=([A-Z0-9-]+)/i);
      if (match && match[1]) {
        const found = queueEngine.findTicket(match[1]);
        if (found) {
          setActiveTicket(found.ticket);
          setActiveDept(found.department);
          setActivePosition(found.queuePosition);
        }
      }
    }
  }, []);

  const handleIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Async broadcast to backend REST API
      apiClient.issueTicket({
        departmentId: selectedDeptId,
        patientName: patientName.trim() || 'Walk-In Patient',
        urgency,
        hasAppointment
      }).catch(() => {
        // Fallback handled locally in queueEngine
      });

      // Issue ticket through synchronized queue engine
      const { ticket: issued, queuePosition: position } = queueEngine.issueTicket({
        departmentId: selectedDeptId,
        patientName: patientName.trim() || 'Walk-In Patient',
        urgency,
        hasAppointment,
        linkedUserId: user?.id,
        linkedUserEmail: user?.email
      });

      const dept = queueEngine.getDepartments().find(d => d.id === selectedDeptId);

      setActiveTicket(issued);
      setActiveDept(dept || null);
      setActivePosition(position > 0 ? position : 1);

      // Reset name if not logged in
      if (!user) {
        setPatientName('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;

    // Check local queue first
    const found = queueEngine.findTicket(lookupCode);
    if (found) {
      setActiveTicket(found.ticket);
      setActiveDept(found.department);
      setActivePosition(found.queuePosition);
      setLookupError(null);
    } else {
      // Try REST API lookup
      try {
        const remote = await apiClient.getTicket(lookupCode);
        if (remote && remote.ticket) {
          setActiveTicket(remote.ticket);
          setActiveDept(remote.department);
          setActivePosition(remote.queuePosition);
          setLookupError(null);
          return;
        }
      } catch {
        // Continue to error
      }
      setLookupError(`No active ticket found for "${lookupCode.trim().toUpperCase()}". Please check your code.`);
    }
  };

  const handleSampleLookup = (code: string) => {
    setLookupCode(code);
    const found = queueEngine.findTicket(code);
    if (found) {
      setActiveTicket(found.ticket);
      setActiveDept(found.department);
      setActivePosition(found.queuePosition);
      setLookupError(null);
    }
  };

  const getDepartmentIcon = (deptId: string) => {
    switch (deptId) {
      case 'cardiology':
        return <Heart className="w-5 h-5 text-rose-500" />;
      case 'pediatrics':
        return <Baby className="w-5 h-5 text-amber-500" />;
      case 'opd':
        return <Stethoscope className="w-5 h-5 text-blue-400" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-w-0 flex-1 bg-slate-950 text-slate-100 pb-20 sm:pb-12">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-8 pb-14 sm:py-16 lg:py-20 border-b border-slate-800/80">
        
        {/* Subtle background ambient mesh */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Value Proposition & Onboarding */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-sky-400 text-xs font-medium backdrop-blur-sm border border-slate-800">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hospital Queue &amp; Patient Flow System</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
                Skip the Waiting Room. Get Your Digital Hospital Pass.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Check in seamlessly from any phone or browser. Receive an instant scannable QR ticket code, track your live position in queue, and get notified the moment your physician is ready.
              </p>

              {/* Primary Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href="#get-ticket"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-98"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Get QR Ticket Pass</span>
                </a>

                {user ? (
                  <div className="inline-flex items-center justify-between sm:justify-start gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full border border-sky-400"
                    />
                    <div className="text-left">
                      <p className="font-semibold text-white truncate max-w-[140px]">{user.name}</p>
                      <p className="text-slate-400">{user.role} Verified</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenAuth()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-sm font-semibold rounded-xl transition-all"
                  >
                    <LogIn className="w-4 h-4 text-sky-400" />
                    <span>Sign In</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('triview')}
                  className="hidden md:inline-flex items-center justify-center gap-2 px-5 py-3.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  <span>Tri-View Simulator</span>
                </button>
              </div>

              {/* Editorial Trust Elements */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Paperless digital ticket passes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Real-time live queue tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>HIPAA &amp; privacy compliant</span>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Asset & Floating Mobile Pass Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group">
                
                {/* Hero architectural image */}
                <img
                  src="/Frontend/assets/images/hero_hospital_reception_1790126181724.jpg"
                  alt="Modern St. Jude Hospital Ambulatory Care Pavilion"
                  className="w-full h-64 sm:h-80 object-cover object-center group-hover:scale-102 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent" />

                {/* Floating Interactive Live Ticket Card */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-3.5 sm:p-4 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 min-w-0">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-semibold text-slate-200">Live Hospital Queue</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Updated just now</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs text-slate-400 truncate">Now Calling in Cardiology</p>
                      <p className="text-lg sm:text-xl font-mono font-extrabold text-white tracking-tight">CARD-100</p>
                      <p className="text-[11px] sm:text-xs text-emerald-400 font-medium truncate">Room 302 · Dr. Sarah Jenkins</p>
                    </div>

                    <button
                      onClick={() => handleSampleLookup('CARD-101')}
                      className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 transition-colors border border-blue-700/50 text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                      <span>Scan Pass</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. EXPRESS CHECK-IN & GET QR TICKET FORM (Anchor: #get-ticket) */}
      <section id="get-ticket" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Fast & Contactless</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Express Check-In: Issue Digital QR Pass</h2>
                <p className="text-sm text-slate-400 mt-1">Select your clinic, enter your name, and receive your scannable ticket immediately.</p>
              </div>

              {/* Fast Track / Pre-Authentication Notice */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                {!user ? (
                  <button
                    onClick={() => onOpenAuth('Patient')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Sign in to link ticket</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 text-xs font-medium border border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Signed in as {user.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Check-In Form */}
            <form onSubmit={handleIssueTicket} className="mt-6 space-y-6">
              
              {/* Step 1: Choose Clinic Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. Select Clinic / Specialty Department
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptId === dept.id;
                    const stats = deptStats[dept.id] || { waiting: 0, estWait: 10 };
                    const isER = dept.id === 'emergency';

                    return (
                      <button
                        type="button"
                        key={dept.id}
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          if (isER) setUrgency(UrgencyLevel.Emergency);
                          else if (urgency === UrgencyLevel.Emergency) setUrgency(UrgencyLevel.Routine);
                        }}
                        className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between h-full min-w-0 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-950/40 shadow-sm ring-2 ring-blue-500/25 text-white'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shadow-2xs">
                              {getDepartmentIcon(dept.id)}
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">{dept.prefix}</span>
                          </div>

                          <h3 className="text-sm font-semibold text-white">{dept.name}</h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{dept.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <span>Waiting: <strong className="text-white font-mono font-semibold">{stats.waiting}</strong></span>
                          <span>Est. wait: <strong className="text-white font-mono font-semibold">{isER ? '0 min' : `~${stats.estWait}m`}</strong></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Patient Identification & Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                {/* Patient Name */}
                <div className="md:col-span-1">
                  <label htmlFor="patient-name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    2. Patient Full Name
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Doe or Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    required
                  />
                  {user && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Auto-filled from user profile ({user.email})
                    </span>
                  )}
                </div>

                {/* Appointment Status */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    3. Booking Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasAppointment(false)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                        !hasAppointment
                          ? 'border-blue-500 bg-blue-600/20 text-blue-300 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      Walk-In Arrival
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasAppointment(true)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                        hasAppointment
                          ? 'border-blue-500 bg-blue-600/20 text-blue-300 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      Prior Appointment (+15 pts)
                    </button>
                  </div>
                </div>

                {/* Clinical Urgency Level */}
                <div className="md:col-span-1">
                  <label htmlFor="urgency-level" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    4. Clinical Urgency
                  </label>
                  <select
                    id="urgency-level"
                    value={urgency}
                    onChange={(e) => setUrgency(Number(e.target.value) as UrgencyLevel)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={UrgencyLevel.Routine}>Level 1: Routine (Checkup, refill, standard)</option>
                    <option value={UrgencyLevel.Priority}>Level 2: Priority (Moderate symptoms, elderly)</option>
                    <option value={UrgencyLevel.Urgent}>Level 3: Urgent (High fever, acute pain)</option>
                    <option value={UrgencyLevel.Emergency}>Level 4: STAT Emergency (Chest pain, bypass)</option>
                  </select>
                </div>

              </div>

              {/* Submit / Issue Button */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Tickets update in real-time on public screens and physician tablets.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all active:scale-98 min-h-[44px] cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isSubmitting ? 'Generating Pass...' : 'Issue & View QR Pass'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

            </form>

          </div>

          {/* Quick Lookup Banner */}
          <div className="bg-slate-950/90 px-6 py-4 border-t border-slate-800">
            <form onSubmit={handleLookupTicket} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Already Have a Ticket?</span>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Enter code (e.g. CARD-101, PEDS-201)"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Lookup
                </button>
              </div>

              {/* Sample quick buttons */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => handleSampleLookup('CARD-101')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-400 hover:border-blue-500 font-mono text-[11px] cursor-pointer"
                >
                  CARD-101
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleLookup('EMER-901')}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-400 hover:border-rose-500 font-mono text-[11px] cursor-pointer"
                >
                  EMER-901 (STAT)
                </button>
              </div>
            </form>

            {lookupError && (
              <p className="mt-2 text-xs text-rose-400 font-medium">{lookupError}</p>
            )}
          </div>

        </div>
      </section>

      {/* 3. LIVE DEPARTMENT QUEUE OVERVIEW (Desktop & Mobile) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Wait Times</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Hospital Clinical Departments</h2>
          </div>
          <button
            onClick={() => onNavigate('lobby')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
          >
            <span>Open Full Waiting Room TV Display</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {departments.map((dept) => {
            const snap = queueEngine.getSnapshot(dept.id);
            const currentlyCalled = snap.currentlyCalled[0];
            const stats = deptStats[dept.id] || { waiting: snap.waitingQueue.length, estWait: 10 };

            return (
              <div 
                key={dept.id}
                className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 bg-slate-800 border border-slate-700/60 rounded">
                      {dept.prefix}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Clinic Open</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white">{dept.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{dept.description}</p>

                  <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 uppercase block font-medium">Current Status</span>
                    {currentlyCalled ? (
                      <div className="mt-1">
                        <span className="text-sm font-mono font-bold text-white">{currentlyCalled.ticketCode}</span>
                        <span className="text-xs text-slate-400 block truncate">{currentlyCalled.roomNumber || 'Consultation'}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">Ready for next patient</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    <span className="block">Waiting: <strong className="text-white font-semibold">{stats.waiting}</strong></span>
                    <span className="block text-[11px] text-slate-500">Avg wait: ~{stats.estWait}m</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDeptId(dept.id);
                      const el = document.getElementById('get-ticket');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Check In
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOSPITAL ECOSYSTEM: INTEGRATED STATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Connected Care</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Complete Hospital Queue Ecosystem
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Seamless, coordinated patient journeys from arrival to physician consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Station 1: Patient Kiosk */}
          <div 
            onClick={() => onNavigate('kiosk')}
            className="cursor-pointer bg-slate-900/90 rounded-xl border border-slate-800 hover:border-blue-500/50 p-5 sm:p-6 shadow-xs transition-all group flex flex-col justify-between h-full min-w-0"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Patient Kiosk</span>
                <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Self-service check-in terminal with instant department routing and digital pass generation.
              </p>
            </div>
          </div>

          {/* Station 2: Physician Console */}
          <div 
            onClick={() => onNavigate('doctor')}
            className="cursor-pointer bg-slate-900/90 rounded-xl border border-slate-800 hover:border-emerald-500/50 p-5 sm:p-6 shadow-xs transition-all group flex flex-col justify-between h-full min-w-0"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Doctor Workstation</span>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Clinical summon console with patient queue management, room assignment, and consultation controls.
              </p>
            </div>
          </div>

          {/* Station 3: Public Lobby Display */}
          <div 
            onClick={() => onNavigate('lobby')}
            className="cursor-pointer bg-slate-900/90 rounded-xl border border-slate-800 hover:border-amber-500/50 p-5 sm:p-6 shadow-xs transition-all group flex flex-col justify-between h-full min-w-0"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Lobby TV Display</span>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                High-visibility waiting room monitor with chime alerts, voice announcements, and real-time callouts.
              </p>
            </div>
          </div>

          {/* Station 4: Tri-View Simulator */}
          <div 
            onClick={() => onNavigate('triview')}
            className="cursor-pointer bg-slate-900/90 rounded-xl border border-slate-800 hover:border-indigo-500/50 p-5 sm:p-6 shadow-xs transition-all group flex flex-col justify-between h-full min-w-0"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Tri-View Simulator</span>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Live synchronized multi-panel simulation demonstrating patient kiosk check-in, physician summoning, and lobby display.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. TICKET QR MODAL PASS */}
      {activeTicket && activeDept && (
        <DigitalTicketPass
          ticket={activeTicket}
          department={activeDept}
          queuePosition={activePosition}
          onClose={() => setActiveTicket(null)}
          onNavigateToView={(view) => {
            setActiveTicket(null);
            onNavigate(view);
          }}
        />
      )}

    </div>
  );
};
