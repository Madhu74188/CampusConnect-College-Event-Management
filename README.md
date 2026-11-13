# CampusConnect – Professional College Event Management System

[![Deploy Frontend to GitHub Pages](https://github.com/Madhu74188/CampusConnect-College-Event-Management/actions/workflows/deploy.yml/badge.svg)](https://github.com/Madhu74188/CampusConnect-College-Event-Management/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/Live_Portal-GitHub_Pages-2ea44f?style=flat&logo=github)](https://madhu74188.github.io/CampusConnect-College-Event-Management/)
[![Backend API](https://img.shields.io/badge/Backend_API-Render-46e3b7?style=flat&logo=render)](https://campusconnect-college-event-management-w1ll.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**CampusConnect** is a comprehensive, production-ready, full-stack College Event Management platform built specifically for academic institutions. Engineered with **Node.js, Express.js, MongoDB (Mongoose), Vite, HTML5, CSS3, and JavaScript**, it provides role-based access for Students, Event Coordinators, and Institutional Administrators.

---

## 🌐 Live Deployments & Repository Links

- **Frontend Live Portal (GitHub Pages):** [https://madhu74188.github.io/CampusConnect-College-Event-Management/](https://madhu74188.github.io/CampusConnect-College-Event-Management/)
- **Backend API Base URL (Render):** [https://campusconnect-college-event-management-w1ll.onrender.com/api](https://campusconnect-college-event-management-w1ll.onrender.com/api)
- **GitHub Repository:** [https://github.com/Madhu74188/CampusConnect-College-Event-Management](https://github.com/Madhu74188/CampusConnect-College-Event-Management)

---

## 🎯 Key Highlights & Architecture

1. **Clean Login Selection Portal**:
   - First page displays two distinct authentication pathways: **Student Portal** (with student account creation) and **Admin / Coordinator Portal** (Staff Login).
   - Staff login uses role-based token routing to send Coordinators to their event workspace and Administrators to the institution-wide governance dashboard.

2. **Student Authentication & Multi-Event Registration**:
   - Fields: Full Name, College Email, Password (hashed using `bcryptjs`), Register Number, and Department.
   - JWT authentication with secure session persistence in `localStorage`.
   - **Multi-Event Support**: Students can use a single verified account to register for unlimited distinct events (both individually and as a team leader or team member).

3. **Complete Event Details Page**:
   - **Basic Information**: Event Title, Description, Category, Poster, Date, Automatically calculated Day of the Week, Timings, Venue, Open/Closed status.
   - **Detailed Schedule**: Reporting time, Start/End timings, Morning break, Lunch break, Evening break, and remarks.
   - **Hospitality & Food**: Itemized details for Breakfast, Lunch, and Evening Snacks with dining venue instructions.
   - **Participation & Team Rules**: Individual/Team flags, Min/Max team size constraints, Inter-department permissions, Inter-college rules, and custom rules.
   - **Fee Structure**: Clear pricing with explicit fee type (`Per Person` or `Per Team`), real-time calculated total, and payment instructions.
   - **Event Rules**: Formatted numbered list of institution regulations.
   - **Contact Information**: Coordinator Name, Contact Phone, and Email address.

4. **Coordinator Dashboard**:
   - Complete multi-section event creation wizard with live day-of-week calculation.
   - Event status toggle (Open, Closed, Completed).
   - Real-time participant roster with team and individual breakdowns.
   - Edit and delete capabilities with validation.

5. **Institutional Administrator Dashboard**:
   - Summary statistics: Total Students, Total Events, Total Registered Teams, and Total Unique Registrations.
   - **Event-wise Summary Table**: Shows Individual Registrations, Total Teams, and Total Unique Students.
   - **Strictly Professional UI**: Zero unnecessary charts, graphs, or pie diagrams. Clean cards with navy blue theme.
   - Student directory management with active/inactive toggles.
   - Master registration manager with cancellation permissions.

6. **Automated Email Confirmation Service**:
   - Automated registration confirmation emails dispatched via Nodemailer.
   - Contains event details, date, venue, team roster, payable fee, payment guidelines, and contact numbers.
   - Works with real Gmail SMTP (via Google App Password) or falls back to development logging.

---

## 🛠️ Complete Technology Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (CSS Variables, Flexbox, Grid), JavaScript (ES6+), Vite Bundler |
| **Backend** | Node.js (v18+), Express.js (v5) |
| **Database** | MongoDB with Mongoose ODM (MongoDB Atlas in Production) |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS whitelist |
| **Email Service** | Nodemailer (SMTP / Gmail App Passwords) |
| **CI/CD Pipeline** | GitHub Actions (`actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`) |
| **Cloud Hosting** | GitHub Pages / Vercel (Frontend), Render (Backend), MongoDB Atlas (Database) |

---

## 📁 Repository Directory Structure

```text
college-event-management/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Actions deployment to GitHub Pages
├── client/
│   ├── assets/                   # Static assets and icons
│   ├── dist/                     # Production build output (generated by Vite)
│   ├── .env.example              # Frontend environment template
│   ├── .gitignore                # Frontend git ignore rules
│   ├── index.html                # Semantic HTML5 single-page application
│   ├── package.json              # Frontend scripts and Vite dependencies
│   ├── script.js                 # Complete client controller, auth, API calls
│   ├── style.css                 # Professional Navy Blue theme styling
│   ├── vercel.json               # SPA routing rewrite configuration for Vercel
│   └── vite.config.js            # Vite configuration with base: './'
├── server/
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & role authorization (Student/Coord/Admin)
│   ├── models/
│   │   ├── Event.js              # Comprehensive Event schema with schedule & rules
│   │   ├── Registration.js       # Event registration schema with team tracking
│   │   └── User.js               # User model with bcrypt password hashing
│   ├── routes/
│   │   ├── adminRoutes.js        # Admin summary counts, student management, master list
│   │   ├── authRoutes.js         # Student signup, unified login, profile retrieval
│   │   ├── eventRoutes.js        # Event CRUD, day calculation, status updates
│   │   └── registrationRoutes.js # Event registration, team validation, email dispatch
│   ├── utils/
│   │   └── emailService.js       # Nodemailer confirmation email generator
│   ├── .env.example              # Backend environment template (safe for Git)
│   ├── .gitignore                # Backend git ignore rules (protects .env)
│   ├── package.json              # Server dependencies and start scripts
│   └── server.js                 # Express entry point, Atlas DNS fix, initial database seeder
├── .env.example                  # Root environment setup guide
├── .gitignore                    # Root git ignore (prevents .env, node_modules from pushing)
├── README.md                     # Comprehensive project documentation
└── vercel.json                   # Root Vercel SPA configuration
```

---

## 🔑 Default Login Credentials

Upon initial database connection, initial administrator and coordinator accounts are automatically seeded:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@college.com` | `Admin@123` | Full institutional dashboard, student & event control |
| **Coordinator** | `coordinator@college.com` | `Coordinator@123` | Event creation, schedule management, participant rosters |
| **Student** | Any registered student | *(User created)* | Browse events, view details, register, my registrations |

*(Students can register immediately using the **Create Student Account** link on the login portal).*

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) (Local Community Server or free MongoDB Atlas URI)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Madhu74188/CampusConnect-College-Event-Management.git
cd CampusConnect-College-Event-Management
```

### 2. Configure Backend Server
```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/collegeEvents
JWT_SECRET=your_super_secret_jwt_key_2026
DEFAULT_ADMIN_EMAIL=admin@college.com
DEFAULT_ADMIN_PASSWORD=Admin@123
DEFAULT_COORD_EMAIL=coordinator@college.com
DEFAULT_COORD_PASSWORD=Coordinator@123
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
```

Start the backend:
```bash
npm run dev
# or: node server.js
```

### 3. Configure Frontend Client
In a separate terminal:
```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm run dev
```

Open your browser at `http://localhost:5173` (or the URL printed by Vite).

---

## ☁️ Production Deployment Guide

### A. Deploy Backend to Render (Free Web Service)

1. **Create Free MongoDB Atlas Database**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
   - Click **Create a Deployment** and select the free **M0 Sandbox** cluster.
   - Under **Security -> Database Access**, create a user (e.g., `campus_admin`) and a secure password.
   - Under **Security -> Network Access**, click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Connect -> Drivers -> Node.js** and copy your connection string:
     `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/collegeEvents?retryWrites=true&w=majority`

2. **Deploy to Render**:
   - Sign up / Log in to [Render](https://render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository: `Madhu74188/CampusConnect-College-Event-Management`.
   - Configure the following settings:
     - **Name**: `campusconnect-backend`
     - **Root Directory**: `server`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Instance Type**: `Free`
   - Under **Environment Variables**, add:
     - `NODE_ENV`: `production`
     - `PORT`: `5000`
     - `MONGO_URI`: `your_mongodb_atlas_connection_string`
     - `JWT_SECRET`: `your_long_random_jwt_secret`
     - `DEFAULT_ADMIN_EMAIL`: `admin@college.com`
     - `DEFAULT_ADMIN_PASSWORD`: `Admin@123`
     - `DEFAULT_COORD_EMAIL`: `coordinator@college.com`
     - `DEFAULT_COORD_PASSWORD`: `Coordinator@123`
     - `CLIENT_URL`: `https://madhu74188.github.io`
   - Click **Deploy Web Service**.
   - Your live backend API URL will be: `https://campusconnect-college-event-management-w1ll.onrender.com`.

---

### B. Deploy Frontend to GitHub Pages (Automated GitHub Actions)

The repository includes a ready-to-run GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Open your repository on GitHub: `https://github.com/Madhu74188/CampusConnect-College-Event-Management`.
2. Go to **Settings** -> **Pages** (under Code and automation).
3. Under **Build and deployment -> Source**, select **GitHub Actions**.
4. *(Optional)* Under **Settings -> Secrets and variables -> Actions**, add a Repository Secret:
   - Name: `VITE_API_URL`
   - Value: `https://campusconnect-college-event-management-w1ll.onrender.com/api`
5. Push any commit to `main`, or go to the **Actions** tab and click **Run workflow**.
6. The action will build the Vite project, upload artifacts, and deploy directly to GitHub Pages.
7. You will see:
   - A **Green Tick ✅** in the GitHub Actions tab.
   - An active **"Visit site"** button under **Deployments** on the repository homepage.

---

### C. Deploy Frontend to Vercel (Alternative)

1. Sign in to [Vercel](https://vercel.com/) and click **Add New... -> Project**.
2. Import `Madhu74188/CampusConnect-College-Event-Management`.
3. In Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://campusconnect-college-event-management-w1ll.onrender.com/api`
5. Click **Deploy**. Vercel will deploy the frontend with instantaneous CDN edge routing.

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new student account |
| `POST` | `/api/auth/login` | Public | Unified login for Students, Coordinators, and Admins |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and role |

### Events (`/api/events`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Fetch all events (supports `?search=` and `?category=`) |
| `GET` | `/api/events/:id` | Public | Fetch full event details including rules and schedule |
| `POST` | `/api/events` | Coord / Admin | Create a new event with schedule and food information |
| `PUT` | `/api/events/:id` | Coord / Admin | Update event details, fees, or limits |
| `PATCH` | `/api/events/:id/status`| Coord / Admin | Toggle registration status (`open`, `closed`, `completed`) |
| `DELETE`| `/api/events/:id` | Coord / Admin | Remove event and associated records |

### Registrations (`/api/registrations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/registrations` | Student | Register for an event (Individual or Team) |
| `GET` | `/api/my-registrations`| Student | Get registrations belonging to logged-in student |
| `GET` | `/api/registrations/event/:id` | Coord / Admin | View all participants for a specific event |

### Administration (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/summary` | Admin | Overall counts & event-wise registration summaries |
| `GET` | `/api/admin/students`| Admin | Retrieve list of all registered students |
| `PATCH`| `/api/admin/students/:id/status` | Admin | Activate or suspend student accounts |
| `GET` | `/api/admin/registrations` | Admin | Master list of all registrations |
| `DELETE`| `/api/admin/registrations/:id` | Admin | Cancel and remove a registration |

---

## 🔒 Security Best Practices

- **Strict Environment Separation**: Database secrets, JWT keys, and SMTP credentials are stored exclusively in `.env` and are strictly excluded from Git commits via `.gitignore`.
- **Password Protection**: Passwords are never stored in plaintext; salted with 10 rounds of `bcryptjs`.
- **JWT Protection**: Protected routes require a valid bearer token verified via `authMiddleware.js`.
- **Input Validation**: All forms enforce client-side and server-side schema validation to prevent invalid states and injection.

---

## 📄 License
This project is licensed under the MIT License - feel free to use and adapt for academic and institutional event management.
