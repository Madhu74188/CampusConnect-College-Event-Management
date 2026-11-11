# CampusConnect – Professional College Event Management System

**CampusConnect** is a complete, modern, responsive, secure, and professional College Event Management web application built with Node.js, Express.js, MongoDB (Mongoose), and Vanilla HTML5/CSS3/JavaScript.

---

## 🚀 Key Highlights & Implemented Features

1. **Login Selection Screen**:
   - Only two options displayed: **Student Portal** (with "Create Student Account" option) and **Admin / Coordinator Portal** (Staff Login).
   - Staff login intelligently routes Coordinators and Administrators to their dedicated dashboards based on their database role.

2. **Student Registration & Login**:
   - Fields: Full Name, College Email, Password (min 6 characters, hashed with bcryptjs), Register Number, Department.
   - Strict validation, duplicate email and register number checks, JWT authentication.

3. **Student Dashboard & Event Browsing**:
   - Personalized student welcome banner.
   - Dynamic search by event title, venue, or description.
   - Category filtering (Technical, Cultural, Sports, Workshop, Hackathon, Seminar, Management, Other).
   - Attractive event cards with banners, category chips, status pills, date, day, venue, and fee type.

4. **Complete Event Details Page (Section 6 Requirements)**:
   - **Basic Info**: Name, Description, Category, Banner, Date, Automatically calculated Day (e.g., Saturday), Start Time, End Time, Reporting Time, Venue, Registration Status.
   - **Complete Schedule**: Reporting time, Morning break, Lunch break, Evening break, and special session remarks.
   - **Food & Hospitality**: Clear breakdown of Breakfast, Lunch, and Snacks availability, plus menu/dining hall details.
   - **Participation & Team Rules**: Individual/Team permissions, Min & Max team size limits, Inter-department rules, Inter-college participation rules, and restrictions.
   - **Registration Fee & Payment**: Amount, explicit Fee Type (`Per Person` or `Per Team`), calculation explanation, payment instructions, and deadline.
   - **Registration Timeline**: Start date, Last date, Instructions, and real-time Open/Closed status.
   - **Numbered Event Rules**: Explicit list of event rules and regulations.
   - **Coordinator Contacts**: Faculty/Student coordinator Name, Phone number, and Email.
   - Prominent **Register Now** call-to-action button.

5. **Student Event Registration**:
   - Dynamic Individual or Team registration adhering strictly to event rules.
   - Interactive Team Member addition/removal with live team size counter and min/max team size validation.
   - Accurate real-time fee calculation (`Per Person` multiplies by total team count; `Per Team` is flat fee).
   - Strict duplicate prevention for leaders and team members.

6. **My Registrations**:
   - Shows private registrations with event name, date, venue, team name, team member list, total fee, payment instructions, and status.

7. **Coordinator Dashboard**:
   - **Create Event**: Complete 9-section form capturing every detail from Section 6 with automatic Day calculation.
   - **Manage Events**: View all events, edit full details, toggle registration status (Open/Closed), mark as Completed, and delete with confirmation.
   - **View Registrations**: Filter registrations by event and review participants.

8. **Admin Dashboard**:
   - **Clean Summary Cards**: Total Students, Total Events, Total Teams, Total Registrations *(strictly zero charts or graphs)*.
   - **Event-wise Summary Table**: Shows Individual Registrations, Total Teams, and Total Unique Students.
   - **Team & Student Count Logic**: 1 Team of 5 members is counted as 1 Team and 5 Students. Unique student counts prevent double counting.
   - **Master Registrations Table**: Searchable list of all registrations with delete permissions.
   - **Manage Students Table**: View registered students with account status and activate/deactivate toggles.

9. **Email Confirmation Messages**:
   - **Event Registration Confirmation Email**: Sent automatically to the student's registered email address upon registering for any event. Includes event name, category, date, day, venue, timings, breaks, food details, team member list, fee breakdown, payment instructions, rules, and coordinator contact details.
   - **Account Welcome Email**: Sent when a student signs up with their registration information.
   - **Configurable SMTP / Gmail Support**: Can send real emails directly to Gmail/Outlook inboxes, or output development preview URLs without setup.

---

## 📁 Project Directory Structure

```text
college-event-management/
├── client/
│   ├── index.html        # Complete semantic, responsive single-page portal
│   ├── style.css         # Navy Blue professional theme (zero chart clutter)
│   ├── script.js         # Complete frontend controller, JWT handling, CRUD operations
│   └── package.json
├── server/
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT token verification and role-based access control
│   ├── models/
│   │   ├── User.js             # User schema (Student, Coordinator, Admin)
│   │   ├── Event.js            # Comprehensive Event schema with schedule, food, rules
│   │   └── Registration.js     # Event registration schema with team and fee tracking
│   ├── routes/
│   │   ├── authRoutes.js       # Student registration, unified login, profile (/me)
│   │   ├── eventRoutes.js      # Event CRUD, status toggle, auto Day calculation
│   │   ├── registrationRoutes.js # Event registration, team validation, student registrations
│   │   └── adminRoutes.js      # Admin summary counts, students management
│   ├── .env                    # Environment variables (Mongo URI, Port, JWT Secret)
│   ├── server.js               # Express application entry point & data seeder
│   └── package.json
└── README.md
```

---

## 🔑 Default Login Credentials

Initial administrator and coordinator accounts are automatically created if they do not exist:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@college.com` | `Admin@123` |
| **Coordinator** | `coordinator@college.com` | `Coordinator@123` |
| **Student** | Any created student or `student@test.com` | `Password@123` |

*(Students can also register directly via the "Create Student Account" button on the portal.)*

---

## ⚙️ How to Run the Application

### Prerequisites:
- **Node.js** (v18 or newer recommended, v22 installed)
- **MongoDB** (running on `mongodb://127.0.0.1:27017`)

### 1. Start the Backend Server:

Open PowerShell and navigate to the `server` directory:

```powershell
cd "C:\Users\canra\Desktop\college-event-management\server"
node server.js
```

You should see:
```text
MongoDB Connected Successfully to: mongodb://127.0.0.1:27017/collegeEvents
CampusConnect Server Running at: http://localhost:5000
API Base URL: http://localhost:5000/api
```

### 2. Open the Frontend Application:

The server automatically hosts the static client files directly:
- Open your web browser and go to: **`http://localhost:5000`**

*(Alternatively, you can open `C:\Users\canra\Desktop\college-event-management\client\index.html` using VS Code Live Server or double-click to view in any browser.)*
