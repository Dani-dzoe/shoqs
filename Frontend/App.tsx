/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { KioskView } from './components/KioskView';
import { DoctorView } from './components/DoctorView';
import { LobbyView } from './components/LobbyView';
import { MultiViewDemo } from './components/MultiViewDemo';
import { PatientDashboard } from './components/PatientDashboard';
import { UserNavMenu } from './components/UserNavMenu';
import { AuthModal } from './components/AuthModal';
import { UserRole } from './types/auth';
import { isSoundMuted, toggleSound } from './services/soundEffects';
import { 
  Home,
  Building2, 
  Stethoscope, 
  Tv, 
  Columns, 
  Volume2, 
  VolumeX, 
  Activity, 
  QrCode,
  Menu,
  X,
  Clock
} from 'lucide-react';

export type AppView = 'home' | 'patient' | 'triview' | 'kiosk' | 'doctor' | 'lobby';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [muted, setMuted] = useState<boolean>(isSoundMuted());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [defaultAuthRole, setDefaultAuthRole] = useState<UserRole>('Patient');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Support URL hash routing (e.g. #home, #kiosk, #doctor, #lobby, #patient, #triview)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'home' || hash === '') setActiveView('home');
      else if (hash === 'patient' || hash === 'my-queue' || hash === 'myqueue' || hash === 'queue') setActiveView('patient');
      else if (hash === 'kiosk') setActiveView('kiosk');
      else if (hash === 'doctor') setActiveView('doctor');
      else if (hash === 'lobby') setActiveView('lobby');
      else if (hash === 'triview' || hash === 'demo') setActiveView('triview');
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const setViewWithHash = (view: AppView) => {
    setActiveView(view);
    window.location.hash = view;
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSound = () => {
    const newMuted = toggleSound();
    setMuted(newMuted);
  };

  const handleOpenAuth = (role: UserRole = 'Patient') => {
    setDefaultAuthRole(role);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Universal Navbar: 3-Zone Contract */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Zone 1: Single Text Element Wordmark */}
          <button
            onClick={() => setViewWithHash('home')}
            className="text-left group focus:outline-none flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow-sm group-hover:bg-blue-500 transition-colors">
              +
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap">
              St. Jude Health
            </span>
          </button>

          {/* Zone 2: 4-6 Clean Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={() => setViewWithHash('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'home'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home &amp; Check-In
            </button>

            <button
              onClick={() => setViewWithHash('patient')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'patient'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>My Queue</span>
            </button>

            <button
              onClick={() => setViewWithHash('kiosk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'kiosk'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Self-Check-In Kiosk
            </button>

            <button
              onClick={() => setViewWithHash('doctor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'doctor'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Physician Console
            </button>

            <button
              onClick={() => setViewWithHash('lobby')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'lobby'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Waiting Room TV
            </button>

            <button
              onClick={() => setViewWithHash('triview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'triview'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Tri-View Simulator
            </button>
          </nav>

          {/* Zone 3: 1-2 Primary Actions + User Profile & Audio */}
          <div className="flex items-center gap-2">
            
            {/* Quick QR Pass CTA */}
            {activeView !== 'home' && (
              <button
                onClick={() => setViewWithHash('home')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Get QR Ticket</span>
              </button>
            )}

            <UserNavMenu
              onOpenAuthModal={() => handleOpenAuth()}
              onOpenPatientDashboard={() => setViewWithHash('patient')}
            />

            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center border transition-colors ${
                muted
                  ? 'bg-rose-950/30 text-rose-400 border-rose-800/40'
                  : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
              }`}
              title="Toggle Web Audio hospital chime"
              aria-label="Toggle audio chime"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 animate-fadeIn pb-2">
            <button
              onClick={() => setViewWithHash('home')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'home' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home &amp; Pass</span>
            </button>

            <button
              onClick={() => setViewWithHash('patient')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'patient' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Clock className="w-4 h-4 text-sky-400" />
              <span>My Queue</span>
            </button>

            <button
              onClick={() => setViewWithHash('kiosk')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'kiosk' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Patient Kiosk</span>
            </button>

            <button
              onClick={() => setViewWithHash('doctor')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'doctor' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Doctor Console</span>
            </button>

            <button
              onClick={() => setViewWithHash('lobby')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'lobby' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Lobby TV</span>
            </button>

            <button
              onClick={() => setViewWithHash('triview')}
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                activeView === 'triview' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Columns className="w-4 h-4 text-indigo-400" />
              <span>Tri-View Demo</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pb-24 sm:pb-8 w-full min-w-0 overflow-x-hidden">
        {activeView === 'home' && (
          <HomePage
            onNavigate={(view) => setViewWithHash(view)}
            onOpenAuth={(role) => handleOpenAuth(role)}
          />
        )}

        {activeView === 'triview' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Live Tri-View SignalR Simulation</h2>
                  <p className="text-xs text-slate-400">
                    Real-time synchronization across Patient Kiosk, Physician Console, and Waiting Room TV.
                  </p>
                </div>
              </div>
            </div>
            <MultiViewDemo />
          </div>
        )}

        {activeView === 'patient' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <PatientDashboard
              onOpenAuthModal={() => handleOpenAuth('Patient')}
              onNavigateToView={(v) => setViewWithHash(v as AppView)}
            />
          </div>
        )}

        {activeView === 'kiosk' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <KioskView />
          </div>
        )}

        {activeView === 'doctor' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <DoctorView />
          </div>
        )}

        {activeView === 'lobby' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <LobbyView />
          </div>
        )}
      </main>

      {/* Persistent Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">St. Jude Hospital Queue Optimization System</span>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-slate-500">Clinical Queue & Dispatch Management</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Real-Time Patient Flow</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} St. Jude Medical Pavilion</span>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Dock for Thumb Ergonomics */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setViewWithHash('home')}
          className={`flex flex-col items-center gap-1 p-1 text-[11px] font-medium transition-colors ${
            activeView === 'home' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setViewWithHash('patient')}
          className={`flex flex-col items-center gap-1 p-1 text-[11px] font-medium transition-colors ${
            activeView === 'patient' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>My Queue</span>
        </button>

        <button
          onClick={() => setViewWithHash('kiosk')}
          className={`flex flex-col items-center gap-1 p-1 text-[11px] font-medium transition-colors ${
            activeView === 'kiosk' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Kiosk</span>
        </button>

        <button
          onClick={() => setViewWithHash('doctor')}
          className={`flex flex-col items-center gap-1 p-1 text-[11px] font-medium transition-colors ${
            activeView === 'doctor' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Stethoscope className="w-5 h-5" />
          <span>Doctor</span>
        </button>

        <button
          onClick={() => setViewWithHash('lobby')}
          className={`flex flex-col items-center gap-1 p-1 text-[11px] font-medium transition-colors ${
            activeView === 'lobby' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span>Lobby TV</span>
        </button>
      </div>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        requiredRole={defaultAuthRole}
      />
    </div>
  );
}
