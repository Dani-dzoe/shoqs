import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  FileCode, 
  Layers, 
  Server, 
  Key, 
  Database,
  ArrowRight,
  Cloud,
  Globe,
  Cpu
} from 'lucide-react';
import { 
  PROGRAM_CS_CODE, 
  AUTH_CONTROLLER_CODE, 
  QUEUE_CONTROLLER_CODE, 
  DTOS_MODELS_CODE, 
  CSPROJ_CODE 
} from '../data/csharpCode';

interface CodeExplorerViewProps {
  programCsContent?: string;
  csprojContent?: string;
}

type ExplorerTab = 'program' | 'authController' | 'queueController' | 'dtos' | 'csproj' | 'architecture' | 'cli' | 'deployment';

export const CodeExplorerView: React.FC<CodeExplorerViewProps> = ({
  programCsContent = PROGRAM_CS_CODE,
  csprojContent = CSPROJ_CODE
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('authController');
  const [copied, setCopied] = useState<boolean>(false);

  const getActiveCode = (): { filename: string; content: string } => {
    switch (activeTab) {
      case 'program':
        return { filename: 'Program.cs', content: programCsContent };
      case 'authController':
        return { filename: 'Controllers/AuthController.cs', content: AUTH_CONTROLLER_CODE };
      case 'queueController':
        return { filename: 'Controllers/QueueController.cs', content: QUEUE_CONTROLLER_CODE };
      case 'dtos':
        return { filename: 'Models/DTOs.cs', content: DTOS_MODELS_CODE };
      case 'csproj':
        return { filename: 'HospitalQueue.csproj', content: csprojContent };
      default:
        return { filename: 'Program.cs', content: programCsContent };
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.split('/').pop() || filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFile = getActiveCode();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-purple-600/30">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="font-semibold text-purple-400">.NET 8 Enterprise Web API</span>
              <span>·</span>
              <span>Clean Modular Architecture</span>
              <span>·</span>
              <span className="text-emerald-400">Normal Login &amp; Signup Enabled</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              C# ASP.NET Core 8 Backend Architecture
            </h1>
            <p className="text-xs text-slate-400">
              Refactored into dedicated Controllers, Models, Utilities, DbContext, and SignalR Hub with full session authentication.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleCopy(activeFile.content)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : `Copy ${activeFile.filename.split('/').pop()}`}</span>
          </button>

          <button
            onClick={() => handleDownload(activeFile.filename, activeFile.content)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('authController')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'authController'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-sky-400" />
          <span>AuthController.cs (Normal Login &amp; Signup)</span>
        </button>

        <button
          onClick={() => setActiveTab('program')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'program'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Program.cs (Startup Pipeline)</span>
        </button>

        <button
          onClick={() => setActiveTab('queueController')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'queueController'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>QueueController.cs</span>
        </button>

        <button
          onClick={() => setActiveTab('dtos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'dtos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Models &amp; DTOs</span>
        </button>

        <button
          onClick={() => setActiveTab('csproj')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'csproj'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>HospitalQueue.csproj</span>
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'architecture'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture &amp; Formula</span>
        </button>

        <button
          onClick={() => setActiveTab('cli')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'cli'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Run (dotnet run)</span>
        </button>

        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'deployment'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>Deployment Guide (Docker, Cloud, Azure)</span>
        </button>
      </div>

      {/* Code Viewer */}
      {activeTab !== 'architecture' && activeTab !== 'cli' && activeTab !== 'deployment' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {activeFile.filename} · C# ASP.NET Core 8 Web API
            </span>
            <button
              onClick={() => handleCopy(activeFile.content)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-6 text-xs font-mono text-slate-300 overflow-x-auto max-h-[700px] leading-relaxed selection:bg-blue-600 selection:text-white">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      )}

      {/* Architecture Spec */}
      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
              <Layers className="w-5 h-5" />
              <span>Modular Clean Backend Structure</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              The C# backend adheres to strict separation of concerns for enterprise maintainability:
            </p>
            <ul className="text-xs text-slate-400 space-y-2.5">
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong className="text-white">Controllers/AuthController.cs:</strong> Normal email + password Login, Signup with cryptographic PBKDF2 hashing, and Google OAuth 2.0 with stateful HTTP-only session cookies.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong className="text-white">Controllers/QueueController.cs:</strong> Ticket issuing, dynamic queue prioritization, and doctor calling guarded by <code className="text-purple-300">DoctorOnly</code> authorization policies.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong className="text-white">Models/:</strong> Strongly-typed entities and DTOs (LoginRequest, SignupRequest, Ticket, Department, UserAccount).</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong className="text-white">Utils/AuthUtils.cs &amp; PriorityCalculator.cs:</strong> RFC2898 password hashing &amp; verification and dynamic priority scoring algorithms.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong className="text-white">Db/HospitalDbContext.cs:</strong> Entity Framework Core in-memory database with automated seeder on application startup.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <Key className="w-5 h-5" />
              <span>Multi-Factor Authentication &amp; Sessions</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Security is enforced at both controller and route levels:
            </p>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-white font-semibold">1. Standard Credentials Authentication</div>
                <div>PBKDF2 SHA-256 with 100,000 iterations and per-user cryptographic salts.</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-white font-semibold">2. Stateful Encrypted Session Cookie</div>
                <div>Cookie: <code className="text-sky-300">hospital_session_token</code> (HttpOnly, SameSite=Lax, 24h expiration, SlidingExpiration).</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-white font-semibold">3. Dynamic Priority Formula</div>
                <div className="font-mono text-amber-300 text-[11px]">Score = (WaitMinutes &times; 1.5) + (Urgency &times; 20) + ApptBonus</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLI Execution */}
      {activeTab === 'cli' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <Terminal className="w-5 h-5" />
            <span>Running with .NET 8 SDK</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-slate-400">1. Initialize and run the C# Web API solution:</div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 flex items-center justify-between">
              <code>dotnet run --project HospitalQueue.csproj</code>
              <button
                onClick={() => handleCopy('dotnet run --project HospitalQueue.csproj')}
                className="text-slate-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="text-slate-400 pt-2">2. Test normal user registration via curl:</div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 flex items-center justify-between">
              <code>curl -X POST http://localhost:5000/api/auth/signup -H "Content-Type: application/json" -d '{`{"fullName":"Dr. Sarah Jenkins","email":"dr.jenkins@stjude-hospital.org","password":"Doctor123!","role":"Doctor"}`}'</code>
              <button
                onClick={() => handleCopy(`curl -X POST http://localhost:5000/api/auth/signup -H "Content-Type: application/json" -d '{"fullName":"Dr. Sarah Jenkins","email":"dr.jenkins@stjude-hospital.org","password":"Doctor123!","role":"Doctor"}'`)}
                className="text-slate-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Guide */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/40 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Cloud className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Full-Stack Deployment Architectures</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              This repository is designed with dual-target deployment flexibility. You can deploy it as a unified full-stack container (Node/Express serving the React 19 SPA), an enterprise C# ASP.NET Core 8 Web API on Azure/Docker, or as decoupled static frontend and cloud backend microservices.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Option 1: Unified Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <Layers className="w-4 h-4" />
                  <span>Option 1: Unified Full-Stack</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/40">
                  Recommended &middot; Single Port 3000
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Packages Node.js Express API and built React SPA into a single multi-stage Docker container. The Express server serves REST APIs on <code className="text-sky-300">/api/*</code> and serves production static assets from <code className="text-sky-300">/dist</code>.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="font-semibold text-slate-200">Ideal for:</div>
                  <div>• Google Cloud Run</div>
                  <div>• Render / Railway / Fly.io</div>
                  <div>• AWS ECS / App Runner</div>
                  <div>• DigitalOcean App Platform</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400">Docker build &amp; run:</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                  <code>docker build -t hospital-app .</code>
                  <button onClick={() => handleCopy('docker build -t hospital-app .')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                  <code>docker run -p 3000:3000 hospital-app</code>
                  <button onClick={() => handleCopy('docker run -d -p 3000:3000 -e NODE_ENV=production -e JWT_SECRET=prod_secret_key hospital-app')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Option 2: C# ASP.NET Core 8 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                  <Cpu className="w-4 h-4" />
                  <span>Option 2: C# .NET 8 Backend</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-900/60 text-purple-300 border border-purple-700/40">
                  Enterprise Web API &middot; Port 5000
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Publishes the compiled C# Web API solution with SignalR real-time hubs, PBKDF2 cryptography, and EF Core in-memory database to Azure App Service or Linux containers.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="font-semibold text-slate-200">Ideal for:</div>
                  <div>• Azure App Service (.NET 8 runtime)</div>
                  <div>• Docker with <code className="text-purple-300">Dockerfile.dotnet</code></div>
                  <div>• Linux VM (Ubuntu + NGINX + systemd)</div>
                  <div>• AWS Elastic Beanstalk</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400">Publish &amp; Azure CLI:</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300 flex items-center justify-between">
                  <code>dotnet publish -c Release -o ./publish</code>
                  <button onClick={() => handleCopy('dotnet publish HospitalQueue.csproj -c Release -o ./publish')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300 flex items-center justify-between">
                  <code>az webapp up --runtime "DOTNETCORE:8.0"</code>
                  <button onClick={() => handleCopy('az webapp up --name hospital-queue-api --resource-group rg-hospital --runtime "DOTNETCORE:8.0"')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Option 3: Decoupled Frontend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                  <Globe className="w-4 h-4" />
                  <span>Option 3: Decoupled Frontend</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-900/60 text-sky-300 border border-sky-700/40">
                  Global Edge CDN &middot; Static SPA
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Compile the React 19 SPA with Vite into <code className="text-sky-300">dist/</code> and host on global edge CDNs, connecting to your deployed API server via CORS.
                </p>
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="font-semibold text-slate-200">Ideal for:</div>
                  <div>• Vercel (zero-config Vite preset)</div>
                  <div>• Netlify (SPA redirects)</div>
                  <div>• Cloudflare Pages</div>
                  <div>• AWS S3 + CloudFront Distribution</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono text-slate-400">Build frontend:</div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300 flex items-center justify-between">
                  <code>npm run build</code>
                  <button onClick={() => handleCopy('npm run build')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300 flex items-center justify-between">
                  <code>npx vercel deploy --prod</code>
                  <button onClick={() => handleCopy('npx vercel --prod')} className="text-slate-500 hover:text-white">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration & Environment Variables */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Production Environment Variables &amp; Secrets</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-white">Node / Express Server (.env)</div>
                <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                  <div>NODE_ENV=production</div>
                  <div>PORT=3000</div>
                  <div>JWT_SECRET=your_32_character_cryptographic_secret</div>
                  <div>ALLOWED_ORIGIN=https://hospital.yourdomain.com</div>
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-white">C# ASP.NET Core (appsettings.json / Env)</div>
                <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                  <div>ASPNETCORE_ENVIRONMENT=Production</div>
                  <div>ASPNETCORE_URLS=http://+:5000</div>
                  <div>AllowedOrigins=*</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
