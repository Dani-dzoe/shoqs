import React from 'react';
import { queueEngine } from '../services/queueEngine';
import { UrgencyLevel } from '../types/queue';
import { playHospitalChime, playEmergencyAlertSound } from '../services/soundEffects';
import { ShieldAlert, UserPlus, PhoneCall, RotateCcw, AlertTriangle } from 'lucide-react';

export const SimulationControls: React.FC = () => {
  const handleAddEmergency = () => {
    queueEngine.issueTicket({
      departmentId: 'emergency',
      patientName: 'Emergency Trauma Patient',
      urgency: UrgencyLevel.Emergency,
      hasAppointment: false
    });
    playEmergencyAlertSound();
  };

  const handleAddUrgent = () => {
    const names = ['Michael Scott', 'Jim Halpert', 'Pam Beesly', 'Dwight Schrute', 'Angela Martin'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    queueEngine.issueTicket({
      departmentId: 'cardiology',
      patientName: randomName,
      urgency: UrgencyLevel.Urgent,
      hasAppointment: false
    });
    playHospitalChime();
  };

  const handleAddRoutine = () => {
    const names = ['Stanley Hudson', 'Kevin Malone', 'Phyllis Vance', 'Oscar Martinez', 'Toby Flenderson'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    queueEngine.issueTicket({
      departmentId: 'cardiology',
      patientName: randomName,
      urgency: UrgencyLevel.Routine,
      hasAppointment: true
    });
    playHospitalChime();
  };

  const handleQuickCall = () => {
    try {
      queueEngine.callNext({
        departmentId: 'cardiology',
        roomNumber: 'Room 302',
        doctorName: 'Dr. Sarah Jenkins'
      });
      playHospitalChime();
    } catch {
      // If no patients, queue is clear
    }
  };

  const handleReset = () => {
    queueEngine.resetAll();
    playHospitalChime();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="text-xs font-bold text-white tracking-tight">
          Simulation Event Generator
        </div>
        <div className="text-[11px] text-slate-400">
          Simulate real-time events to see instant synchronization across all stations.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAddRoutine}
          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-400" />
          <span>+ Routine Patient</span>
        </button>

        <button
          onClick={handleAddUrgent}
          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Urgent Patient</span>
        </button>

        <button
          onClick={handleAddEmergency}
          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>+ Emergency STAT</span>
        </button>

        <button
          onClick={handleQuickCall}
          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
          <span>Call Next</span>
        </button>

        <button
          onClick={handleReset}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          title="Reset to default seed queue"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
