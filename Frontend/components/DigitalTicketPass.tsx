import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Ticket, Department } from '../types/queue';
import { 
  X, 
  QrCode, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface DigitalTicketPassProps {
  ticket: Ticket;
  department: Department;
  queuePosition?: number;
  onClose: () => void;
  onNavigateToView?: (view: 'kiosk' | 'doctor' | 'lobby' | 'triview') => void;
}

export const DigitalTicketPass: React.FC<DigitalTicketPassProps> = ({
  ticket,
  department,
  queuePosition = 1,
  onClose,
  onNavigateToView
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generate QR code data containing verification URL
  const passUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/#ticket=${ticket.ticketCode}`
    : `https://hospital-queue.local/#ticket=${ticket.ticketCode}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(passUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(err => {
        console.error('QR code generation failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [passUrl]);

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(passUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    setIsDownloading(true);
    const link = document.createElement('a');
    link.download = `HospitalPass-${ticket.ticketCode}.png`;
    link.href = qrDataUrl;
    link.click();
    setTimeout(() => setIsDownloading(false), 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isEmergency = ticket.urgency === 4;
  const isCalled = ticket.status === 'Called' || ticket.status === 'InConsultation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Top Header */}
        <div className={`px-5 py-4 ${isEmergency ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm">
              +
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300 font-medium">St. Jude Medical Center</p>
              <h3 className="text-sm font-semibold text-white truncate max-w-[220px] sm:max-w-xs">{department.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none"
            title="Close Pass"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket Body / Perforated Boarding Pass Styling */}
        <div className="p-5 sm:p-6 bg-slate-50/50">
          
          {/* Ticket Code & Callout Status */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Digital Boarding Pass</span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono tabular-nums text-slate-900">
                {ticket.ticketCode}
              </span>
            </div>

            {isCalled ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NOW CALLING to {ticket.roomNumber || 'Consultation Room'}</span>
              </div>
            ) : isEmergency ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>STAT Emergency Bypass Priority</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-600 flex items-center justify-center gap-2">
                <span>Queue Position: <strong className="text-slate-900 font-semibold font-mono">#{queuePosition}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Est. Wait: <strong className="text-slate-900 font-semibold font-mono">~{ticket.estimatedWaitMinutes} min</strong></span>
              </div>
            )}
          </div>

          {/* QR Code Matrix Area */}
          <div className="my-5 flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative group">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Code for Ticket ${ticket.ticketCode}`} 
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center bg-slate-100 animate-pulse text-slate-400">
                  <QrCode className="w-10 h-10" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors rounded-xl pointer-events-none" />
            </div>

            <p className="mt-3 text-xs text-slate-500 text-center max-w-[260px]">
              Scan with your mobile camera to keep your live place in queue on your phone.
            </p>
          </div>

          {/* Patient & Clinical Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase">Patient</span>
              <p className="font-semibold text-slate-900 truncate mt-0.5">{ticket.patientName}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block uppercase">Department</span>
              <p className="font-semibold text-slate-900 truncate mt-0.5">{department.prefix} · {department.name}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block uppercase">Booking Status</span>
              <p className="font-medium text-slate-800 mt-0.5">
                {ticket.hasAppointment ? 'Confirmed Appt' : 'Walk-In Ambulatory'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block uppercase">Check-In Time</span>
              <p className="font-medium text-slate-800 font-mono mt-0.5">
                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl || isDownloading}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium transition-colors shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>{isDownloading ? 'Saved' : 'Save QR'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium transition-colors shadow-sm active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium transition-colors shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>

          {/* Quick Cross-Station Navigation if on desktop or testing */}
          {onNavigateToView && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>View live on waiting screen:</span>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToView('lobby');
                }}
                className="font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                <span>Lobby Display</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">Audio chimes sound when called</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
