# 🏥 St. Jude Smart Hospital Queue Optimization System

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![C# ASP.NET Core 8](https://img.shields.io/badge/ASP.NET_Core-8.0-512bd4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SignalR](https://img.shields.io/badge/Real--Time-SignalR_&_SSE-brightgreen)](https://dotnet.microsoft.com/apps/aspnet/signalr)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **A modern, intelligent, real-time hospital queue management platform designed to eliminate waiting room congestion, prioritize acute clinical emergencies, and provide stress-free digital passes for patients and doctors.**

---

## 📑 Table of Contents

- [🌟 What Is This Website?](#-what-is-this-website)
  - [The Problem We Solve](#the-problem-we-solve)
  - [Key User Roles](#key-user-roles)
- [⚡ Quick Start (Run Locally in 60 Seconds)](#-quick-start-run-locally-in-60-seconds)
  - [Demo Accounts & Credentials](#demo-accounts--credentials)
- [🎮 5-Minute Interactive Walkthrough](#-5-minute-interactive-walkthrough)
- [🖥️ System Views & Interactive Tour](#️-system-views--interactive-tour)
  - [1. Multi-View Simulation Command Center](#1-multi-view-simulation-command-center)
  - [2. Self-Service Patient Kiosk](#2-self-service-patient-kiosk)
  - [3. Doctor Consultation Station](#3-doctor-consultation-station)
  - [4. Public TV Lobby Display](#4-public-tv-lobby-display)
  - [5. Patient Mobile Pass & Live Tracker](#5-patient-mobile-pass--live-tracker)
- [🧠 Clinical Triage & Priority Scoring Engine](#-clinical-triage--priority-scoring-engine)
- [📂 Project Architecture (Frontend & Backend Folders)](#-project-architecture-frontend--backend-folders)
- [🚀 Deployment Guide](#-deployment-guide)
  - [Option A: Google Cloud Run (Recommended)](#option-a-google-cloud-run-recommended)
  - [Option B: Docker & Docker Compose](#option-b-docker--docker-compose)
  - [Option C: Dedicated C# ASP.NET Core 8 Web API](#option-c-dedicated-c-aspnet-core-8-web-api)
  - [Option D: Static Edge CDN (Vercel / Netlify / Cloudflare)](#option-d-static-edge-cdn-vercel--netlify--cloudflare)
- [🔌 REST API & Real-Time Specifications](#-rest-api--real-time-specifications)
- [⚙️ Environment Variables](#️-environment-variables)
- [❓ Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)

---

## 🌟 What Is This Website?

The **St. Jude Smart Hospital Queue Optimization System** is a full-featured clinical workflow application that replaces confusing paper tickets and chaotic hospital waiting halls with an **intelligent, automated, triage-aware dispatch system**.

### The Problem We Solve
- ❌ **Traditional First-Come, First-Served (FIFO) is dangerous:** A patient suffering acute cardiac distress should never wait behind someone needing routine medication refills just because they arrived 5 minutes later.
- ❌ **Waiting Room Anxiety:** Patients sit for hours without knowing their true position, doctor status, or estimated consultation time.
- ❌ **Doctor Inefficiency:** Physicians waste consultation minutes manually stepping into hallways or searching for the next patient.

### Key User Roles
| Role | Portal / View | Primary Actions |
| :--- | :--- | :--- |
| **Patients** | **Self-Service Kiosk & Mobile Pass** | Issue check-in ticket, select acuity, track live line countdown via QR code on mobile. |
| **Doctors** | **Doctor Consultation Station** | View priority-ranked queue, call next patient with 1 click, trigger room chimes, complete consultations. |
| **Lobby Visitors** | **Public TV Display** | High-contrast display board with audio chimes and voice announcements for called tickets. |
| **Triage Staff** | **Multi-View Command Center** | Override patient triage acuity, monitor wait times across all departments in real time. |

---

## ⚡ Quick Start (Run Locally in 60 Seconds)

### Prerequisites
- **Node.js 18+** or **Node.js 22** (LTS recommended)
- *(Optional)* **.NET 8 SDK** (if you wish to build or run the C# ASP.NET Core backend natively)

### Step 1: Clone the repository
```bash
git clone https://github.com/your-username/hospital-queue-system.git
cd hospital-queue-system
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Start development server
```bash
npm run dev
```

Open your browser to:
👉 **`http://localhost:3000`**

> **How it works behind the scenes:**
> `npm run dev` starts `server.ts`. It automatically detects if .NET 8 is available on your machine. If .NET is installed, it boots the C# ASP.NET Core server in `Backend/` and proxies all `/api/*` and SignalR `/hubs/*` requests to C# Kestrel on port 5050. If .NET is not installed, it seamlessly utilizes the built-in high-performance fallback engine so you never experience container crashes or missing dependencies!

---

### Demo Accounts & Credentials

You can test any role instantly with pre-seeded accounts:

| Role | Email | Password | Department | Features Available |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor** | `dr.jenkins@stjude-hospital.org` | `Doctor123!` | Cardiology Clinic | Calling patients, completing visits, loudspeaker recall |
| **Doctor** | `dr.chen@stjude-hospital.org` | `Doctor123!` | Emergency (ER) | Acute triage queue, code red alerts, bypass control |
| **Admin** | `admin.security@stjude-hospital.org` | `Admin123!` | All Departments | Audit log inspector, session revoker, security settings |
| **Patient** | `patient.rigby@gmail.com` | `Patient123!` | Cardiology Clinic | Pre-linked active ticket `CARD-101`, digital pass, live status |

*(Quick-switch demo buttons are also provided in the top navigation bar!)*

---

## 🎮 5-Minute Interactive Walkthrough

Want to experience the full clinical lifecycle right away? Follow this 5-step test path:

1. **Launch the Multi-View Simulation:**
   - Click the **"Multi-View Simulation"** tab in the top navigation bar.
   - You will see 4 live panels simultaneously: **Kiosk (Left)**, **Doctor Console (Middle-Left)**, **Patient Pass (Middle-Right)**, and **TV Lobby Board (Right)**.
2. **Issue an Emergency Ticket:**
   - In the Kiosk panel, enter name *"Arthur Pendelton"*.
   - Set Urgency to **"Emergency (Level 4)"**.
   - Click **"Issue Digital Ticket"**.
   - Notice: An immediate emergency chime rings, and the ticket instantly **bypasses all other waiting patients** to take the #1 queue spot!
3. **Issue an Urgent Appointment Ticket:**
   - Enter name *"Maria Garcia"*, choose **"Urgent (Level 3)"**, and toggle **"Has Scheduled Appointment"** to ON.
   - Notice how the clinical score calculates: `Wait Time + Urgency (60 pts) + Appointment Bonus (15 pts)`.
4. **Call the Next Patient as Doctor:**
   - Look at the Doctor Station panel. Click **"Call Next Patient"**.
   - Listen for the hospital chime: *"Ding-Dong: Ticket CARD-101, please proceed to Room 302."*
   - Watch the TV Lobby Board flash with the live room assignment.
   - Watch the Patient Mobile Pass update in real time from **"Waiting (Position #1)"** to **"NOW CALLING - PLEASE PROCEED TO ROOM 302"**!
5. **Complete Consultation:**
   - Click **"Complete Consultation"** in the Doctor Station. The patient is marked completed, and the next patient in line advances.

---

## 🖥️ System Views & Interactive Tour

### 1. Multi-View Simulation Command Center
- **Access:** Navigation item `Multi-View Demo`
- **Purpose:** A master dashboard that displays the Kiosk, Doctor Station, Patient Pass, and Lobby Board all on one screen. Includes instant simulation reset controls and live event feeds.

### 2. Self-Service Patient Kiosk
- **Access:** Navigation item `Self-Service Kiosk`
- **Purpose:** Touch-friendly kiosk interface placed at hospital entrances. Patients check in, select their primary symptoms/acuity, enter scheduled appointments, and receive a digital ticket with QR code.

### 3. Doctor Consultation Station
- **Access:** Navigation item `Doctor Station`
- **Purpose:** Specialized clinical dashboard for attending physicians. Automatically sorts patients by calculated acuity score, displays wait time escalation indicators, allows 1-click patient calling, and provides a "Recall Speaker" button if a patient does not respond.

### 4. Public TV Lobby Display
- **Access:** Navigation item `TV Lobby Display`
- **Purpose:** Fullscreen, high-contrast display designed for 55"+ waiting room monitors. Features high-visibility ticket numbers, blinking alerts for newly called tickets, audio chime announcements, and department status meters.

### 5. Patient Mobile Pass & Live Tracker
- **Access:** Navigation item `Patient Dashboard`
- **Purpose:** Personal mobile-optimized ticket pass. Patients can step outside, visit the hospital cafeteria, or wait in their car while watching their live wait time countdown, tickets ahead, and push notification status.

---

## 🧠 Clinical Triage & Priority Scoring Engine

Unlike naive FIFO (first-in, first-out) queues, the St. Jude queue optimization engine uses a multi-factor dynamic formula executed in real time:

$$\text{Priority Score} = (\text{Wait Time (mins)} \times 1.5) + (\text{Acuity Level} \times 20) + (\text{Appointment Bonus})$$

### Scoring Factors Explained:
1. **Acuity Level (Urgency):**
   - **Level 4 - Emergency:** Score automatically jumps to `999,999 + Wait Time`. Instantly bypasses all non-emergencies and sounds a red alert.
   - **Level 3 - Urgent (Chest pain, acute fever, fractures):** `+60 points`.
   - **Level 2 - Priority (Follow-ups, scheduled procedures):** `+40 points`.
   - **Level 1 - Routine (General checkups, standard renewals):** `+20 points`.
2. **Scheduled Appointment Bonus:**
   - Patients with verified pre-booked clinic appointments receive `+15 points` to honor their reserved slot while still deferring to higher clinical emergencies.
3. **Wait Time Escalation (Anti-Starvation):**
   - Every patient gains `1.5 points per minute` elapsed. A routine patient waiting 40 minutes earns `60 points`, preventing lower-acuity patients from being stranded indefinitely.

---

## 📂 Project Architecture (Frontend & Backend Folders)

The codebase is organized into dedicated, intuitive folders for simple navigation:

```text
├── Frontend/                           # React 19 Frontend SPA (Vite + Tailwind)
│   ├── assets/                         # Hospital visual assets and imagery
│   ├── components/                     # Modular React views
│   │   ├── AuthModal.tsx               # Login, Signup & Google OAuth modal
│   │   ├── DigitalTicketPass.tsx       # Printable/scannable QR ticket pass
│   │   ├── DoctorView.tsx              # Physician hopper and consultation panel
│   │   ├── HomePage.tsx                # Hospital portal landing page
│   │   ├── KioskView.tsx               # Patient check-in touch screen
│   │   ├── LobbyView.tsx               # High-contrast public TV display
│   │   ├── MultiViewDemo.tsx           # 4-in-1 live synchronized simulation
│   │   ├── PatientDashboard.tsx        # Personal patient queue tracker
│   │   ├── SimulationControls.tsx      # Quick scenario injector & reset buttons
│   │   └── UserNavMenu.tsx             # Profile, role switch & navigation bar
│   ├── services/                       # Client networking & audio
│   │   ├── apiClient.ts                # REST & SSE stream client
│   │   ├── authService.ts              # Session & JWT token state manager
│   │   ├── queueEngine.ts              # Queue synchronization engine
│   │   └── soundEffects.ts             # Web Audio API chime & speech synthesis
│   ├── types/                          # TypeScript interfaces (Queue, User, Ticket)
│   ├── App.tsx                         # Main navigation controller
│   ├── main.tsx                        # React DOM root entry point
│   └── index.css                       # Tailwind CSS 4 directives
│
├── Backend/                            # C# ASP.NET Core 8 Web API
│   ├── HospitalQueue.csproj            # .NET 8 project file (EF Core, SignalR)
│   ├── Program.cs                      # Kestrel startup, DI, CORS & middleware
│   ├── Controllers/                    # ASP.NET Core API Controllers
│   │   ├── AuthController.cs           # PBKDF2 hash, JWT tokens & session cookies
│   │   ├── DepartmentsController.cs    # Hospital departments API
│   │   ├── DoctorController.cs         # Call next, complete visit, recall
│   │   ├── EventsController.cs         # Server-Sent Events (SSE) live stream
│   │   ├── QueueController.cs          # Overview, ticket issuance, patient status
│   │   └── SimulationController.cs     # Simulation state reset and seeding
│   ├── Db/                             # Entity Framework Core In-Memory database
│   │   ├── HospitalDbContext.cs        # EF Core DbContext
│   │   └── DbSeeder.cs                 # Clinical demo data seeder
│   ├── Hubs/                           # Real-Time SignalR
│   │   └── QueueHub.cs                 # WebSocket hub for live queue updates
│   ├── Models/                         # C# Domain Models & DTOs
│   │   ├── Department.cs               # Department entity
│   │   ├── DTOs.cs                     # Request & Response DTOs
│   │   ├── Enums.cs                    # UrgencyLevel, TicketStatus enums
│   │   ├── Ticket.cs                   # Ticket entity with priority calculator
│   │   └── UserAccount.cs              # User entity with password salts
│   └── Utils/                          # C# Utilities
│       ├── AuthUtils.cs                # PBKDF2 password hashing & HMAC-SHA256 JWT
│       ├── PriorityCalculator.cs       # C# priority algorithm implementation
│       └── QueueEventsBroadcaster.cs   # Multi-subscriber thread-safe event bus
│
├── server.ts                           # Unified gateway & container launcher
├── vite.config.ts                      # Vite build configuration (points to Frontend/)
├── tsconfig.json                       # TypeScript compiler options
├── Dockerfile                          # Production multi-stage Dockerfile
├── Dockerfile.dotnet                   # Standalone C# .NET 8 Dockerfile
└── docker-compose.yml                  # Compose configuration for container options
```

---

## 🚀 Deployment Guide

### Option A: Google Cloud Run (Recommended)
This application includes zero-crash container environment detection, making deployment to Google Cloud Run instantaneous.

1. **Deploy with Cloud Run CLI:**
   ```bash
   gcloud run deploy hospital-queue-system \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000
   ```
2. Cloud Run builds the container and maps incoming traffic to port 3000 automatically.

---

### Option B: Docker & Docker Compose

#### Using Docker Compose:
To spin up the complete containerized stack in one command:
```bash
docker-compose up --build
```
- Full-Stack Gateway: Available at `http://localhost:3000`
- Direct .NET 8 API (if running option 2): Available at `http://localhost:5000`

#### Using the Full-Stack Dockerfile:
```bash
# 1. Build Docker image
docker build -t hospital-queue-system .

# 2. Run container
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --name hospital-app \
  hospital-queue-system
```

---

### Option C: Dedicated C# ASP.NET Core 8 Web API
If your enterprise hosts the backend on Azure App Service, AWS ECS, or a self-hosted Windows/Linux server:

1. **Build and Publish Binaries:**
   ```bash
   cd Backend
   dotnet publish HospitalQueue.csproj -c Release -o ../publish
   ```
2. **Run C# Kestrel directly:**
   ```bash
   dotnet ../publish/HospitalQueue.dll --urls=http://0.0.0.0:5000
   ```
3. **Build with `Dockerfile.dotnet`:**
   ```bash
   docker build -f Dockerfile.dotnet -t hospital-dotnet-api .
   docker run -d -p 5000:5000 -e ASPNETCORE_ENVIRONMENT=Production hospital-dotnet-api
   ```

---

### Option D: Static Edge CDN (Vercel / Netlify / Cloudflare)
You can deploy the `Frontend/` folder to any static hosting provider:

```bash
npm run build
```
- Output folder: `dist/`
- Set Single-Page Application (SPA) rewrite rule to redirect all routes to `index.html`.

---

## 🔌 REST API & Real-Time Specifications

All endpoints are standardized and support both JSON payloads and HTTP Bearer tokens:

| Method | Endpoint | Description | Sample Request / Query |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | List all hospital departments | — |
| `GET` | `/api/queue/overview` | Full multi-department snapshot with wait counts | — |
| `GET` | `/api/queue/:deptId` | Specific department waiting queue | `/api/queue/cardiology` |
| `GET` | `/api/queue/patient/:id` | Look up patient's active ticket & wait position | `/api/queue/patient/usr-patient-rigby` |
| `POST` | `/api/tickets` | Issue a new patient ticket | `{"departmentId": "cardiology", "patientName": "Jane", "urgency": 2, "hasAppointment": true}` |
| `GET` | `/api/tickets/:code` | Look up ticket details by code | `/api/tickets/CARD-101` |
| `POST` | `/api/doctor/call-next` | Advance and call the next priority patient | `{"departmentId": "cardiology", "roomNumber": "Room 302", "doctorName": "Dr. Jenkins"}` |
| `POST` | `/api/doctor/complete-consultation` | Mark consultation completed and discharge | `{"departmentId": "cardiology", "ticketId": "t-seed-1"}` |
| `POST` | `/api/doctor/recall` | Re-announce the current patient over lobby speakers | `{"departmentId": "cardiology"}` |
| `POST` | `/api/simulation/reset` | Reset database to initial seed data | — |
| `GET` | `/api/events/stream` | Server-Sent Events (SSE) live updates | Stream: `data: {"type": "PATIENT_CALLED", ...}` |
| `POST` | `/api/auth/login` | Authenticate user and receive token | `{"email": "dr.jenkins@stjude-hospital.org", "password": "Doctor123!"}` |
| `POST` | `/api/auth/signup` | Create a new user profile | `{"email": "john@doe.com", "password": "Secret123!", "fullName": "John Doe"}` |
| `GET` | `/api/auth/me` | Fetch currently authenticated user session | `Authorization: Bearer <token>` |
| `GET` | `/api/auth/audit-logs` | Retrieve security and access audit logs | — |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure optional overrides:

```bash
# Server Port (defaults to 3000)
PORT=3000

# Environment Mode (development | production)
NODE_ENV=development

# JWT Secret Key for token signing
JWT_SECRET=StJude-Hospital-Secure-Secret-Key-2026

# Allowed CORS Origins (optional, defaults to all origins)
ALLOWED_ORIGIN=*

# .NET ASP.NET Core Environment
ASPNETCORE_ENVIRONMENT=Production
```

---

## ❓ Frequently Asked Questions (FAQ)

### 1. Does the app make audible sound announcements?
**Yes!** When a doctor calls a patient, a two-tone hospital chime plays and browser Speech Synthesis reads the announcement (*"Ticket CARD-101, please proceed to Room 302"*).
> *Note: Browsers require a user interaction (like clicking a button) before audio can play.*

### 2. Can I run this on a tablet or mobile device?
**Yes!** The application is 100% responsive.
- Mount tablets on walls or podiums to run the **Self-Service Kiosk**.
- Open the **Patient Mobile Pass** on any iPhone or Android phone by scanning the QR code on the ticket.
- Connect a PC or smart TV stick to a widescreen monitor to run the **TV Lobby Display**.

### 3. What happens if .NET 8 is not installed on my computer?
No problem! The application includes an **embedded high-performance engine** in `server.ts`. When you run `npm run dev` or deploy to container environments without .NET, the system automatically detects this and serves all queue logic, priority calculations, and API routes seamlessly without throwing errors.

### 4. Can I reset the simulation if I make too many test tickets?
**Yes!** Simply click the **"Reset Simulation"** button in the Multi-View Demo or top bar. It will instantly restore the queue to the clean, initial clinical demo state.

---

## 📄 License

This project is licensed under the **MIT License** — you are free to modify, distribute, and use it in clinical and commercial projects.
