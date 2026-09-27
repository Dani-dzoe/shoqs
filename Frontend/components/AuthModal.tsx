import React, { useState } from 'react';
import { authService } from '../services/authService';
import { UserRole } from '../types/auth';
import { 
  ShieldCheck, 
  Key, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  User, 
  Building, 
  ArrowRight, 
  AlertCircle,
  Stethoscope,
  Shield,
  HeartPulse,
  UserPlus,
  LogIn
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: UserRole;
  title?: string;
  subtitle?: string;
}

interface DemoAccount {
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  defaultPassword: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Dr. Sarah Jenkins, MD',
    email: 'dr.jenkins@stjude-hospital.org',
    role: 'Doctor',
    departmentId: 'cardiology',
    departmentName: 'Cardiology Clinic',
    defaultPassword: 'Doctor123!',
    badge: 'Cardiology MD'
  },
  {
    name: 'Dr. Michael Chen, MD',
    email: 'dr.chen@stjude-hospital.org',
    role: 'Doctor',
    departmentId: 'emergency',
    departmentName: 'Emergency Ward',
    defaultPassword: 'Doctor123!',
    badge: 'Emergency Triage'
  },
  {
    name: 'Elena Rostova',
    email: 'admin.security@stjude-hospital.org',
    role: 'Admin',
    defaultPassword: 'Admin123!',
    badge: 'Chief Security Officer'
  },
  {
    name: 'Eleanor Rigby (Patient)',
    email: 'patient.rigby@gmail.com',
    role: 'Patient',
    defaultPassword: 'Password123!',
    badge: 'Patient Portal'
  }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  requiredRole,
  title = 'Hospital Clinical Portal Access',
  subtitle = 'Sign in with your email and password or register a new clinical account.'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Normal Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Normal Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>(requiredRole || 'Doctor');
  const [signupDepartment, setSignupDepartment] = useState('cardiology');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Feedback State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const email = loginEmail.trim();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.loginWithPassword(email, loginPassword);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNormalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = signupName.trim();
    const email = signupEmail.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!signupPassword) {
      setErrorMsg('Please enter a password.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.signupWithPassword(
        name,
        email,
        signupPassword,
        signupRole,
        signupRole === 'Doctor' ? signupDepartment : undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try a different email address.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demo: DemoAccount) => {
    setMode('signin');
    setLoginEmail(demo.email);
    setLoginPassword(demo.defaultPassword);
    setErrorMsg(null);
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const email = mode === 'signup' && signupEmail ? signupEmail : loginEmail || 'dr.jenkins@stjude-hospital.org';
      const name = mode === 'signup' && signupName ? signupName : undefined;
      const role = mode === 'signup' ? signupRole : (requiredRole || 'Doctor');
      const dept = role === 'Doctor' ? signupDepartment : undefined;

      await authService.loginWithGoogle({
        email,
        name: name || email.split('@')[0],
        role,
        departmentId: dept
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-t-3xl"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Security Badge Note */}
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-2.5 text-xs text-slate-300">
          <Key className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="text-[11px] leading-snug">
            <span className="font-semibold text-white">Cryptographic Bearer Session:</span> Sign in to receive an encrypted 24-hour JWT Bearer token with role-based access control.
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              mode === 'signin'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
              mode === 'signup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Feedback Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start space-x-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* MODE: SIGN IN */}
        {mode === 'signin' && (
          <form onSubmit={handleNormalLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. dr.jenkins@stjude-hospital.org"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[10px] text-slate-500">
                  Demo: <code className="text-slate-400">Doctor123!</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 text-blue-600 focus:ring-blue-500/20 bg-slate-950"
                />
                <span className="text-[11px]">Remember session for 24h</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('dr.jenkins@stjude-hospital.org');
                  setLoginPassword('Doctor123!');
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition"
              >
                Auto-fill Doctor
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In with Email & Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* MODE: SIGN UP */}
        {mode === 'signup' && (
          <form onSubmit={handleNormalSignup} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full Name & Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Dr. Catherine Price, MD"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. catherine.price@stjude-hospital.org"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Hospital Role
                </label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Doctor">Doctor (Physician)</option>
                  <option value="Nurse">Triage Nurse / Staff</option>
                  <option value="Admin">Hospital Administrator</option>
                  <option value="Patient">Patient / Family</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={signupDepartment}
                  onChange={(e) => setSignupDepartment(e.target.value)}
                  disabled={signupRole !== 'Doctor'}
                  className="w-full bg-slate-950 border border-slate-800 disabled:opacity-40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="cardiology">Cardiology Clinic</option>
                  <option value="pediatrics">Pediatrics Wing</option>
                  <option value="opd">Outpatient (OPD)</option>
                  <option value="emergency">Emergency (ER)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Creating Account...' : 'Complete Registration & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or quick access</span>
          </div>
        </div>

        {/* Pre-Seeded Clinician Credentials Section */}
        <div className="space-y-2 mb-4">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Pre-Configured Test Accounts</span>
            <span className="text-[10px] text-slate-500">Click to fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemoAccount(acc)}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition group cursor-pointer"
              >
                <div className="text-xs font-semibold text-white group-hover:text-blue-400 truncate">
                  {acc.name.split(',')[0]}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {acc.badge}
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-1">
                  pwd: {acc.defaultPassword}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Alternative Google OAuth Single-Click */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2.5 transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google Single Sign-On</span>
        </button>
      </div>
    </div>
  );
};
