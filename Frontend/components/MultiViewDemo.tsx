import React, { useState, useEffect } from 'react';
import { queueEngine } from '../services/queueEngine';
import { Department, Ticket, UrgencyLevel, TicketStatus } from '../types/queue';
import { SimulationControls } from './SimulationControls';
import { playHospitalChime, playEmergencyAlertSound, speakAnnouncement } from '../services/soundEffects';
import { 
  Building2, 
  UserCheck, 
  Tv, 
  ArrowRight, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2,
  Users,
  QrCode,
  Check
} from 'lucide-react';

export const MultiViewDemo: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('cardiology');
  const [patientName, setPatientName] = useState<string>('');
  const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.Routine);
  const [hasAppointment, setHasAppointment] = useState<boolean>(true);
  const [justIssuedTicket, setJustIssuedTicket] = useState<{ ticket: Ticket; queuePosition: number } | null>(null);

  // Doctor panel state
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const roomNumber = 'Room 302';
  const doctorName = 'Dr. Sarah Jenkins';

  // Snapshot data for the selected department
  const [snapshot, setSnapshot] = useState(queueEngine.getSnapshot('cardiology'));

  const refreshData = () => {
    setDepartments(queueEngine.getDepartments());
    setSnapshot(queueEngine.getSnapshot(selectedDeptId));
  };

  useEffect(() => {
    refreshData();
    const unsub = queueEngine.subscribe(refreshData);
    return () => unsub();
  }, [selectedDeptId]);

  // Panel 1: Issue Ticket handler
  const handleIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const name = patientName.trim() || 'Walk-In Patient';
    const result = queueEngine.issueTicket({
      departmentId: selectedDeptId,
      patientName: name,
      urgency,
      hasAppointment
    });

    if (urgency === UrgencyLevel.Emergency) {
      playEmergencyAlertSound();
    } else {
      playHospitalChime();
    }

    setJustIssuedTicket(result);
    setPatientName('');
  };

  // Panel 2: Call Next Patient handler
  const handleCallNext = () => {
    if (snapshot.waitingQueue.length === 0) return;
    setIsCalling(true);
    try {
      const ticket = queueEngine.callNext({
        departmentId: selectedDeptId,
        roomNumber,
        doctorName
      });
      playHospitalChime();
      speakAnnouncement(`Ticket ${ticket.ticketCode}, please proceed to ${roomNumber}`);
    } finally {
      setIsCalling(false);
    }
  };

  // Panel 2: Update Consultation Status
  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    queueEngine.updateStatus(ticketId, status);
  };

  const currentlyCalledTicket = snapshot.currentlyCalled[0];

  return (
    <div className="space-y-6">
      <SimulationControls />

      {/* 3 Evenly Placed, Balanced Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: PATIENT SELF-CHECK-IN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg overflow-hidden h-full">
          {/* Card Header */}
          <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Patient Check-In Kiosk</h3>
                <p className="text-[11px] text-slate-400">Self-service ticket generation</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-blue-400">Self-Service</span>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            {justIssuedTicket ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-3 my-auto">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Your Ticket Code</div>
                  <div className="text-4xl font-mono font-black text-white mt-0.5">{justIssuedTicket.ticket.ticketCode}</div>
                  <div className="text-xs text-slate-300 mt-1 font-medium">{justIssuedTicket.ticket.patientName}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Position</span>
                    <span className="font-bold font-mono text-white">#{justIssuedTicket.queuePosition} in line</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Est. Wait</span>
                    <span className="font-bold font-mono text-emerald-400">~{justIssuedTicket.ticket.estimatedWaitMinutes}m</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setJustIssuedTicket(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Check In Another Patient
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssueTicket} className="space-y-4">
                {/* Department Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Clinic Department
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.prefix})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Triage Urgency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { level: UrgencyLevel.Routine, label: 'Routine', sub: 'Standard Checkup' },
                      { level: UrgencyLevel.Priority, label: 'Priority', sub: 'Moderate Distress' },
                      { level: UrgencyLevel.Urgent, label: 'Urgent', sub: 'Acute Pain' },
                      { level: UrgencyLevel.Emergency, label: 'Emergency', sub: 'Immediate Stat' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.level}
                        onClick={() => setUrgency(item.level)}
                        className={`p-2 rounded-lg border text-left transition text-xs cursor-pointer ${
                          urgency === item.level
                            ? item.level === UrgencyLevel.Emergency
                              ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-semibold'
                              : 'bg-blue-600 text-white border-blue-500 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-[10px] opacity-75">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appointment Toggle */}
                <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    id="has-appt"
                    checked={hasAppointment}
                    onChange={(e) => setHasAppointment(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="has-appt" className="cursor-pointer select-none">
                    Patient has prior scheduled appointment
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Issue Live Ticket</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* CARD 2: PHYSICIAN WORKSTATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg overflow-hidden h-full">
          {/* Card Header */}
          <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Physician Workstation</h3>
                <p className="text-[11px] text-slate-400">{doctorName} · {roomNumber}</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-emerald-400">Doctor Console</span>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            
            {/* Active Patient Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Currently in Examination Room
              </span>
              <div className="text-3xl font-mono font-black text-emerald-400">
                {currentlyCalledTicket ? currentlyCalledTicket.ticketCode : '--'}
              </div>
              <div className="text-xs font-semibold text-white">
                {currentlyCalledTicket ? currentlyCalledTicket.patientName : 'No patient currently summoned'}
              </div>

              {currentlyCalledTicket && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(currentlyCalledTicket.id, 'InConsultation')}
                    disabled={currentlyCalledTicket.status === 'InConsultation'}
                    className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 disabled:opacity-40 text-blue-300 text-[11px] font-semibold rounded border border-blue-500/30 transition cursor-pointer"
                  >
                    In Room
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(currentlyCalledTicket.id, 'Completed')}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-semibold rounded border border-emerald-500/30 transition cursor-pointer"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(currentlyCalledTicket.id, 'NoShow')}
                    className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] font-semibold rounded border border-rose-500/30 transition cursor-pointer"
                  >
                    No-Show
                  </button>
                </div>
              )}
            </div>

            {/* Call Next Button */}
            <button
              onClick={handleCallNext}
              disabled={snapshot.waitingQueue.length === 0 || isCalling}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>
                {isCalling ? 'Summoning...' : `Call Next Patient (${snapshot.waitingQueue.length} Waiting)`}
              </span>
            </button>

            {/* Waiting Queue List */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold pb-1 border-b border-slate-800">
                <span>Waiting Queue (Triage Ranked)</span>
                <span className="font-mono">{snapshot.waitingQueue.length} Patients</span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {snapshot.waitingQueue.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Queue empty. No patients currently waiting.
                  </div>
                ) : (
                  snapshot.waitingQueue.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white shrink-0">{t.ticketCode}</span>
                        <span className="text-slate-400 truncate">{t.patientName}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 shrink-0">
                        ~{Math.round(t.waitTimeMinutes)}m wait
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* CARD 3: WAITING ROOM TV MONITOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg overflow-hidden h-full">
          {/* Card Header */}
          <div className="px-5 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Public Waiting Room TV</h3>
                <p className="text-[11px] text-slate-400">High-contrast patient summoning display</p>
              </div>
            </div>
            <button
              onClick={() => playHospitalChime()}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Test hospital audio chime"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            
            {/* Primary Summoned Display */}
            <div className="bg-slate-950 border-2 border-emerald-500/80 rounded-xl p-5 text-center space-y-2 shadow-inner">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Now Calling</span>
              </div>

              <div className="text-5xl font-mono font-black text-white tracking-tight">
                {currentlyCalledTicket ? currentlyCalledTicket.ticketCode : '--'}
              </div>

              <div className="text-xs text-slate-300 font-medium">
                {currentlyCalledTicket ? currentlyCalledTicket.patientName : 'Waiting for next patient call'}
              </div>

              <div className="pt-2 border-t border-slate-900">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Proceed To</span>
                <span className="text-lg font-black text-emerald-400">
                  {currentlyCalledTicket ? currentlyCalledTicket.roomNumber || roomNumber : 'Next Available Room'}
                </span>
              </div>
            </div>

            {/* Upcoming Queue Grid on Screen */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold pb-1 border-b border-slate-800">
                <span>Next Upcoming Patients</span>
                <span className="text-[11px]">Please watch the screen</span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {snapshot.waitingQueue.slice(0, 4).length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No upcoming tickets in queue.
                  </div>
                ) : (
                  snapshot.waitingQueue.slice(0, 4).map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">#{idx + 1}</span>
                        <span className="font-mono font-bold text-white">{t.ticketCode}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Estimated ~{Math.round(t.estimatedWaitMinutes)}m</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-center text-[11px] text-slate-400">
              Chimes emit automatically when your ticket is summoned.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
