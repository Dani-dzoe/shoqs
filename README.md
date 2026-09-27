# Smart Hospital Queue Optimization System

A production-ready hospital queue optimization platform featuring dynamic triage priority calculation, real-time wait-time estimation, role-based workflows (Patient Kiosk, Patient Dashboard, Doctor Consultation Station, Public TV Lobby Display), and dual backend implementations (**Node.js/Express TypeScript** and **C# ASP.NET Core 8**).

---

## 1. System Architecture

The repository provides two deployment architectures depending on your infrastructure preference:

### Architecture Option A: Unified Full-Stack (Node.js + Express + React 19 SPA)
- **Frontend:** React 19 + TypeScript + Tailwind CSS (bundled via Vite)
- **Backend:** Express API server (`server.ts`) handling REST endpoints (`/api/*`), JWT Bearer tokens, PBKDF2 password hashing, and real-time polling
- **Static Hosting:** In production mode (`NODE_ENV=production`), the Node server directly serves the compiled React application from the `/dist` directory with SPA fallback routing.
- **Port:** Defaults to `3000`.

### Architecture Option B: C# / ASP.NET Core 8 Web API
- **Framework:** ASP.NET Core 8 Web API (`HospitalQueue.csproj`, `Program.cs`, `Controllers/`, `Models/`, `Db/`, `Hubs/`, `Utils/`)
- **Database:** Entity Framework Core In-Memory database with automatic seeder
- **Real-Time Engine:** ASP.NET Core SignalR hub (`/hubs/queue`) with group subscriptions
- **Authentication:** Dual mode: PBKDF2 password authentication and Google OAuth 2.0 with stateful HTTP-only session cookies
- **Port:** Defaults to `5000` (or `8080` in containerized environments).

### Architecture Option C: Decoupled Deployments
- **Frontend:** Static SPA deployed to Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront, or Firebase Hosting.
- **Backend:** API deployed to Render, Railway, AWS ECS, Google Cloud Run, or Azure App Service.

---

## 2. Deployment Guide: Full-Stack Node.js + React (Fastest & Recommended)

### Method 1: Using Docker (Containerized)
A production multi-stage `Dockerfile` is provided in the repository.

1. **Build the Docker container:**
   ```bash
   docker build -t hospital-queue-system .
   ```
2. **Run the container:**
   ```bash
   docker run -d -p 3000:3000 \
     -e NODE_ENV=production \
     -e PORT=3000 \
     -e JWT_SECRET=your-production-secure-random-secret \
     --name hospital-app \
     hospital-queue-system
   ```
3. Visit `http://localhost:3000`.

### Method 2: Google Cloud Run / AWS App Runner / DigitalOcean App Platform
1. Connect your Git repository or push the Docker image to Google Artifact Registry / Amazon ECR / Docker Hub.
2. In Cloud Run or App Runner:
   - **Container Port:** `3000`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `PORT=3000`
     - `JWT_SECRET=<generate a secure 64-character string>`
3. Set CPU allocation to 1 vCPU and memory to 512MB or 1GB.

### Method 3: Platform-as-a-Service (Render, Railway, Fly.io, Heroku)
1. **Render.com (Web Service):**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (runs `tsx server.ts`)
   - **Environment Variables:**
     - `NODE_ENV`: `production`
     - `PORT`: `3000`
     - `JWT_SECRET`: `secure-secret-key`

2. **Railway.app:**
   - Link repository. Railway automatically detects Node.js.
   - Set start command to `npm start`.
   - Add `PORT` (e.g. 3000) and `JWT_SECRET`.

---

## 3. Deployment Guide: C# ASP.NET Core 8 Web API

### Method 1: Azure App Service (Linux)
1. **Publish release binaries locally:**
   ```bash
   dotnet publish HospitalQueue.csproj -c Release -o ./publish
   ```
2. **Deploy to Azure App Service via Azure CLI:**
   ```bash
   az webapp up --name stjude-hospital-queue --resource-group rg-hospital --runtime "DOTNETCORE:8.0" --sku B1
   ```
3. In Azure Portal > Configuration:
   - `ASPNETCORE_ENVIRONMENT`: `Production`

### Method 2: Docker Container (`Dockerfile.dotnet`)
1. **Build the .NET 8 Docker image:**
   ```bash
   docker build -f Dockerfile.dotnet -t hospital-queue-dotnet:latest .
   ```
2. **Run container:**
   ```bash
   docker run -d -p 5000:5000 \
     -e ASPNETCORE_ENVIRONMENT=Production \
     -e ASPNETCORE_URLS=http://+:5000 \
     --name hospital-dotnet \
     hospital-queue-dotnet:latest
   ```

### Method 3: Self-Hosted Linux VM (Ubuntu / Debian + NGINX + systemd)
1. **Install .NET 8 ASP.NET Core Runtime on server:**
   ```bash
   sudo apt-get update && sudo apt-get install -y aspnetcore-runtime-8.0
   ```
2. **Publish and copy files:**
   ```bash
   dotnet publish -c Release -o ./publish
   scp -r ./publish/* user@your-server-ip:/var/www/hospital-queue/
   ```
3. **Configure systemd service (`/etc/systemd/system/hospital-queue.service`):**
   ```ini
   [Unit]
   Description=St. Jude Hospital Queue ASP.NET Core Service
   After=network.target

   [Service]
   WorkingDirectory=/var/www/hospital-queue
   ExecStart=/usr/bin/dotnet /var/www/hospital-queue/HospitalQueue.dll
   Restart=always
   RestartSec=10
   SyslogIdentifier=hospital-queue
   User=www-data
   Environment=ASPNETCORE_ENVIRONMENT=Production
   Environment=ASPNETCORE_URLS=http://127.0.0.1:5000

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start: `sudo systemctl enable --now hospital-queue`
4. **Configure NGINX reverse proxy with WebSocket/SignalR support:**
   ```nginx
   server {
       listen 80;
       server_name queue.stjude-hospital.org;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Add SSL certificate with `certbot --nginx -d queue.stjude-hospital.org`.

---

## 4. Deployment Guide: Decoupled Frontend (Vercel, Netlify, Cloudflare Pages)

If you prefer hosting the React frontend on a global edge CDN while running the backend API separately:

### Step 1: Build the Static Frontend
```bash
npm run build
```
This compiles optimized HTML, CSS, and JS assets into the `dist/` directory.

### Step 2: Deploy to Frontend Hosts

1. **Vercel:**
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Add Single-Page App rewrite rule in `vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```

2. **Netlify:**
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add `dist/_redirects` or `public/_redirects`:
     ```text
     /*    /index.html   200
     ```

3. **Cloudflare Pages:**
   - Build Command: `npm run build`
   - Build Output Directory: `dist`

4. **AWS S3 + CloudFront:**
   - Upload `/dist` files to an S3 bucket configured for static website hosting.
   - Attach CloudFront CDN distribution with custom error response: Redirect 404 to `/index.html` with response code 200.

---

## 5. Environment Variables & Production Checklist

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`development` or `production`) | `production` |
| `PORT` | Listening HTTP port | `3000` (Node) / `5000` (.NET) |
| `JWT_SECRET` | Cryptographic secret for signing API session JWTs | *Must be 32+ char random string* |
| `ALLOWED_ORIGIN` | Permitted CORS origin(s) for decoupled frontend | `https://hospital.yourdomain.com` |
| `ASPNETCORE_ENVIRONMENT` | .NET Core environment | `Production` |

### Production Checklist:
- [x] Configure HTTPS/TLS using Cloudflare, Let's Encrypt, or cloud provider certificates.
- [x] Ensure secure cookie configuration: `Secure=true`, `SameSite=Lax`, and `HttpOnly=true`.
- [x] Set strong random string for `JWT_SECRET`.
- [x] Point DNS records (`A` or `CNAME`) to your load balancer or hosting provider.
