/**
 * CampusConnect - Professional College Event Management System
 * Full Client Application Logic
 */

// Configure API base URL: read dynamic VITE_API_URL in production with localhost fallback
const API_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL)
    ? import.meta.env.VITE_API_URL
    : (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "http://localhost:5000/api"
        : "https://campusconnect-backend.onrender.com/api");

// --------------------------------------------------
// GLOBAL STATE
// --------------------------------------------------
let currentUser = JSON.parse(localStorage.getItem("campus_user")) || null;
let token = localStorage.getItem("campus_token") || null;
let allEvents = [];
let selectedEvent = null;
let currentStudentTab = "events";
let currentCoordTab = "manage";
let currentAdminTab = "summary";

// --------------------------------------------------
// API REQUEST HELPER
// --------------------------------------------------
async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
}

// --------------------------------------------------
// SCREEN NAVIGATION
// --------------------------------------------------
function hideAllScreens() {
    const screens = [
        "loginSelection",
        "studentLogin",
        "studentRegister",
        "staffLogin",
        "studentDashboard",
        "coordinatorDashboard",
        "adminDashboard"
    ];

    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
    });
}

function showScreen(screenId) {
    hideAllScreens();
    const target = document.getElementById(screenId);
    if (target) {
        target.hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    updateHeaderUI();
}

function showLogin(type) {
    clearAlerts();
    if (type === "student") {
        showScreen("studentLogin");
    } else {
        showScreen("staffLogin");
    }
}

function showRegister() {
    clearAlerts();
    showScreen("studentRegister");
}

function backToSelection() {
    clearAlerts();
    showScreen("loginSelection");
}

function updateHeaderUI() {
    const userBadge = document.getElementById("userBadge");
    const userBadgeRole = document.getElementById("userBadgeRole");
    const userBadgeName = document.getElementById("userBadgeName");
    const logoutBtn = document.getElementById("logoutBtn");

    if (currentUser && token) {
        userBadge.hidden = false;
        logoutBtn.hidden = false;
        userBadgeRole.textContent = currentUser.role.toUpperCase();
        userBadgeName.textContent = currentUser.name || "User";
    } else {
        userBadge.hidden = true;
        logoutBtn.hidden = true;
    }
}

function logout() {
    localStorage.removeItem("campus_token");
    localStorage.removeItem("campus_user");
    token = null;
    currentUser = null;
    allEvents = [];
    selectedEvent = null;
    showScreen("loginSelection");
}

function showAlert(elementId, message, type = "danger") {
    const alertEl = document.getElementById(elementId);
    if (!alertEl) return;
    alertEl.className = `alert-box alert-${type}`;
    alertEl.textContent = message;
    alertEl.hidden = false;
}

function clearAlerts() {
    document.querySelectorAll(".alert-box").forEach(el => {
        el.hidden = true;
        el.textContent = "";
    });
}

// --------------------------------------------------
// DAY OF WEEK CALCULATION HELPER
// --------------------------------------------------
function getDayOfWeek(dateString) {
    if (!dateString) return "";
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const parts = dateString.split("-");
    if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(dateObj.getTime())) {
            return days[dateObj.getDay()];
        }
    }
    const d = new Date(dateString);
    return !isNaN(d.getTime()) ? days[d.getDay()] : "";
}

function formatDateDisplay(dateString) {
    if (!dateString) return "TBA";
    const parts = dateString.split("-");
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        }
    }
    return dateString;
}

// --------------------------------------------------
// AUTHENTICATION LOGIC
// --------------------------------------------------

// 1. Student Registration
const studentRegisterForm = document.getElementById("studentRegisterForm");
if (studentRegisterForm) {
    studentRegisterForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const studentData = {
            name: document.getElementById("studentName").value.trim(),
            email: document.getElementById("registerEmail").value.trim(),
            password: document.getElementById("registerPassword").value,
            registerNumber: document.getElementById("studentRegisterNumber").value.trim(),
            department: document.getElementById("studentDepartment").value.trim()
        };

        try {
            const result = await apiRequest("/auth/student/register", {
                method: "POST",
                body: JSON.stringify(studentData)
            });

            showAlert("studentRegisterAlert", "Registration successful! Signing you in...", "success");

            // Save login
            token = result.token;
            currentUser = {
                id: result.id,
                name: result.name,
                role: result.role,
                email: result.email,
                registerNumber: result.registerNumber,
                department: result.department
            };
            localStorage.setItem("campus_token", token);
            localStorage.setItem("campus_user", JSON.stringify(currentUser));

            setTimeout(() => {
                studentRegisterForm.reset();
                showStudentDashboard();
            }, 1000);
        } catch (error) {
            showAlert("studentRegisterAlert", error.message, "danger");
        }
    });
}

// 2. Student Login
const studentLoginForm = document.getElementById("studentLoginForm");
if (studentLoginForm) {
    studentLoginForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const email = document.getElementById("studentEmail").value.trim();
        const password = document.getElementById("studentPassword").value;

        try {
            const result = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            if (result.role !== "student") {
                throw new Error("This login is for Students only. Faculty/Admins please use Staff Login.");
            }

            token = result.token;
            currentUser = {
                id: result.id,
                name: result.name,
                role: result.role,
                email: result.email,
                registerNumber: result.registerNumber,
                department: result.department
            };
            localStorage.setItem("campus_token", token);
            localStorage.setItem("campus_user", JSON.stringify(currentUser));

            studentLoginForm.reset();
            showStudentDashboard();
        } catch (error) {
            showAlert("studentLoginAlert", error.message, "danger");
        }
    });
}

// 3. Staff Login (Admin / Coordinator)
const staffLoginForm = document.getElementById("staffLoginForm");
if (staffLoginForm) {
    staffLoginForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const email = document.getElementById("staffEmail").value.trim();
        const password = document.getElementById("staffPassword").value;

        try {
            const result = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            if (!["coordinator", "admin"].includes(result.role)) {
                throw new Error("This login is for Staff only. Students please use Student Login.");
            }

            token = result.token;
            currentUser = {
                id: result.id,
                name: result.name,
                role: result.role,
                email: result.email,
                registerNumber: result.registerNumber || "",
                department: result.department || ""
            };
            localStorage.setItem("campus_token", token);
            localStorage.setItem("campus_user", JSON.stringify(currentUser));

            staffLoginForm.reset();

            if (result.role === "admin") {
                showAdminDashboard();
            } else {
                showCoordinatorDashboard();
            }
        } catch (error) {
            showAlert("staffLoginAlert", error.message, "danger");
        }
    });
}

// --------------------------------------------------
// STUDENT DASHBOARD
// --------------------------------------------------
function showStudentDashboard() {
    showScreen("studentDashboard");

    const welcomeEl = document.getElementById("studentWelcome");
    const subEl = document.getElementById("studentSubtitle");
    if (welcomeEl && currentUser) {
        welcomeEl.textContent = `Welcome, ${currentUser.name}`;
        subEl.textContent = `${currentUser.department || "Department"} | Register No: ${currentUser.registerNumber || "N/A"}`;
    }

    switchStudentTab("events");
}

function switchStudentTab(tab) {
    currentStudentTab = tab;
    const tabEvents = document.getElementById("studentTabEvents");
    const tabRegs = document.getElementById("studentTabRegistrations");
    const contentEvents = document.getElementById("studentEventsTabContent");
    const contentRegs = document.getElementById("studentRegistrationsTabContent");
    const detailsView = document.getElementById("studentEventDetailsView");

    // Hide event details view whenever switching tabs
    detailsView.hidden = true;

    if (tab === "events") {
        tabEvents.classList.add("active");
        tabRegs.classList.remove("active");
        contentEvents.hidden = false;
        contentRegs.hidden = true;
        loadEvents();
    } else {
        tabEvents.classList.remove("active");
        tabRegs.classList.add("active");
        contentEvents.hidden = true;
        contentRegs.hidden = false;
        loadMyRegistrations();
    }
}

// Load and display events for students
async function loadEvents() {
    try {
        const events = await apiRequest("/events");
        allEvents = events;
        filterEvents();
    } catch (error) {
        const container = document.getElementById("studentEventList");
        if (container) {
            container.innerHTML = `<p class="form-hint">Unable to load events: ${escapeHTML(error.message)}</p>`;
        }
    }
}

function filterEvents() {
    const searchVal = (document.getElementById("eventSearchInput")?.value || "").toLowerCase().trim();
    const catVal = document.getElementById("eventCategoryFilter")?.value || "All";

    const filtered = allEvents.filter(ev => {
        const matchesCategory = (catVal === "All") || (ev.category === catVal);
        const matchesSearch = !searchVal ||
            (ev.name && ev.name.toLowerCase().includes(searchVal)) ||
            (ev.venue && ev.venue.toLowerCase().includes(searchVal)) ||
            (ev.description && ev.description.toLowerCase().includes(searchVal));

        return matchesCategory && matchesSearch;
    });

    renderStudentEventCards(filtered);
}

function renderStudentEventCards(events) {
    const container = document.getElementById("studentEventList");
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <h3>No Events Found</h3>
                <p style="margin-top: 6px;">Try adjusting your search criteria or category filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = events.map(ev => {
        const effectiveStatus = ev.effectiveStatus || "open";
        const statusClass = effectiveStatus === "open" ? "status-open" : (effectiveStatus === "completed" ? "status-completed" : "status-closed");
        const statusLabel = effectiveStatus === "open" ? "Registration Open" : (effectiveStatus === "completed" ? "Completed" : "Closed");

        const dayName = ev.eventDay || getDayOfWeek(ev.eventDate);
        const formattedDate = formatDateDisplay(ev.eventDate);

        // Fee display
        const feeAmount = ev.fee?.amount || 0;
        let feeLabel = "Free Entry";
        if (feeAmount > 0) {
            feeLabel = ev.fee?.feeType === "per_team" ? `₹${feeAmount} / Team` : `₹${feeAmount} / Person`;
        }

        const bannerMarkup = ev.bannerUrl
            ? `<img src="${escapeHTML(ev.bannerUrl)}" alt="${escapeHTML(ev.name)}" class="event-banner-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'event-banner-fallback\\'>${escapeHTML(ev.category)}</div>';">`
            : `<div class="event-banner-fallback">${escapeHTML(ev.category)}</div>`;

        return `
            <div class="event-card">
                <div class="event-banner-wrap">
                    ${bannerMarkup}
                    <span class="event-category-badge">${escapeHTML(ev.category)}</span>
                    <span class="event-status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="event-card-body">
                    <h3 class="event-card-title">${escapeHTML(ev.name)}</h3>
                    <p class="event-card-desc">${escapeHTML(ev.description)}</p>

                    <div class="event-meta-list">
                        <div class="event-meta-item">
                            <span class="meta-icon">📅</span>
                            <span><strong>${formattedDate}</strong> (${dayName})</span>
                        </div>
                        <div class="event-meta-item">
                            <span class="meta-icon">⏰</span>
                            <span>${escapeHTML(ev.startTime)} - ${escapeHTML(ev.endTime)}</span>
                        </div>
                        <div class="event-meta-item">
                            <span class="meta-icon">📍</span>
                            <span>${escapeHTML(ev.venue)}</span>
                        </div>
                    </div>

                    <div class="event-card-footer">
                        <span class="fee-pill">${feeLabel}</span>
                        <button type="button" class="primary-btn btn-sm" onclick="viewEventDetails('${ev._id}')">View Details</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// --------------------------------------------------
// COMPLETE EVENT DETAILS PAGE (SECTION 6)
// --------------------------------------------------
async function viewEventDetails(eventId) {
    try {
        const event = await apiRequest(`/events/${eventId}`);
        selectedEvent = event;

        // Hide events list, show details view
        document.getElementById("studentEventsTabContent").hidden = true;
        const detailsView = document.getElementById("studentEventDetailsView");
        detailsView.hidden = false;

        window.scrollTo({ top: 0, behavior: "smooth" });

        // Update top status badge
        const effectiveStatus = event.effectiveStatus || "open";
        const statusBadge = document.getElementById("detailsStatusBadge");
        statusBadge.className = `status-pill ${effectiveStatus === "open" ? "status-open" : (effectiveStatus === "completed" ? "status-completed" : "status-closed")}`;
        statusBadge.textContent = effectiveStatus === "open" ? "Registration Open" : (effectiveStatus === "completed" ? "Completed" : "Registration Closed");

        const dayName = event.eventDay || getDayOfWeek(event.eventDate);
        const formattedDate = formatDateDisplay(event.eventDate);

        // Participation rules
        const part = event.participation || {};
        let participationModeLabel = "Individual & Team Participation Allowed";
        if (part.participationType === "individual") {
            participationModeLabel = "Individual Participation Only";
        } else if (part.participationType === "team") {
            participationModeLabel = "Team Participation Only";
        }

        // Fee description
        const feeAmount = event.fee?.amount || 0;
        const feeType = event.fee?.feeType || "per_person";
        let feeExplanation = "Free Registration for all participants.";
        if (feeAmount > 0) {
            feeExplanation = feeType === "per_team"
                ? `Total fee is flat ₹${feeAmount} per team.`
                : `Fee is ₹${feeAmount} per person (multiplied by team member count for teams).`;
        }

        // Food descriptions
        const food = event.food || {};
        const foodNotes = food.details || "No special food notes provided.";

        // Schedule & breaks
        const sched = event.schedule || {};

        // Rules markup
        const rules = event.rules && event.rules.length > 0
            ? `<ol class="rules-ordered-list">${event.rules.map(r => `<li>${escapeHTML(r)}</li>`).join("")}</ol>`
            : `<p class="form-hint">Standard college code of conduct and event instructions apply.</p>`;

        // Banner markup
        const bannerMarkup = event.bannerUrl
            ? `<img src="${escapeHTML(event.bannerUrl)}" alt="${escapeHTML(event.name)}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'banner-placeholder\\'>${escapeHTML(event.name)}</div>';">`
            : `<div class="banner-placeholder">${escapeHTML(event.name)}</div>`;

        // Register button state
        const canRegister = effectiveStatus === "open";
        const registerButtonMarkup = canRegister
            ? `<button type="button" class="primary-btn btn-lg" onclick="openRegistrationModal('${event._id}')">Register Now</button>`
            : `<button type="button" class="secondary-btn btn-lg" disabled style="opacity: 0.6; cursor: not-allowed;">Registration Closed</button>`;

        const container = document.getElementById("eventDetailsContent");
        container.innerHTML = `
            <div class="details-hero">
                <div class="details-hero-banner">
                    ${bannerMarkup}
                </div>
                <div class="details-title-row">
                    <span class="role-pill">${escapeHTML(event.category)}</span>
                    <h1>${escapeHTML(event.name)}</h1>
                </div>
                <p class="details-description">${escapeHTML(event.description)}</p>
            </div>

            <div class="details-sections-grid">
                <!-- 1. BASIC INFORMATION -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>📌 Basic Event Information</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Event Date:</span>
                            <span class="details-row-value">${formattedDate}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Day of Week:</span>
                            <span class="details-row-value">${dayName}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Event Timing:</span>
                            <span class="details-row-value">${escapeHTML(event.startTime)} - ${escapeHTML(event.endTime)}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Reporting Time:</span>
                            <span class="details-row-value">${escapeHTML(event.reportingTime || "Not specified")}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Venue:</span>
                            <span class="details-row-value">${escapeHTML(event.venue)}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Registration Status:</span>
                            <span class="details-row-value">${effectiveStatus === "open" ? '<span class="badge-yes">OPEN</span>' : '<span class="badge-no">CLOSED</span>'}</span>
                        </div>
                    </div>
                </div>

                <!-- 2. EVENT SCHEDULE & BREAKS -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>⏱️ Event Schedule & Breaks</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Reporting Time:</span>
                            <span class="details-row-value">${escapeHTML(event.reportingTime || event.startTime)}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Morning Break:</span>
                            <span class="details-row-value">${escapeHTML(sched.morningBreak || "No break scheduled")}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Lunch Break:</span>
                            <span class="details-row-value">${escapeHTML(sched.lunchBreak || "No break scheduled")}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Evening Break:</span>
                            <span class="details-row-value">${escapeHTML(sched.eveningBreak || "No break scheduled")}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Other Breaks / Notes:</span>
                            <span class="details-row-value">${escapeHTML(sched.otherBreaks || "None")}</span>
                        </div>
                    </div>
                </div>

                <!-- 3. FOOD INFORMATION -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>🍽️ Food & Hospitality</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Breakfast Provided:</span>
                            <span class="details-row-value">${food.breakfast ? '<span class="badge-yes">YES</span>' : '<span class="badge-no">NO</span>'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Lunch Provided:</span>
                            <span class="details-row-value">${food.lunch ? '<span class="badge-yes">YES</span>' : '<span class="badge-no">NO</span>'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Snacks & Refreshments:</span>
                            <span class="details-row-value">${food.snacks ? '<span class="badge-yes">YES</span>' : '<span class="badge-no">NO</span>'}</span>
                        </div>
                        <div class="details-row" style="flex-direction: column; gap: 4px; padding-top: 6px;">
                            <span class="details-row-label">Food Details:</span>
                            <span style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(foodNotes)}</span>
                        </div>
                    </div>
                </div>

                <!-- 4. PARTICIPATION & TEAM RULES -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>👥 Participation & Team Rules</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Participation Allowed:</span>
                            <span class="details-row-value">${participationModeLabel}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Individual Participation:</span>
                            <span class="details-row-value">${part.allowIndividual !== false ? '<span class="badge-yes">ALLOWED</span>' : '<span class="badge-no">NOT ALLOWED</span>'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Team Participation:</span>
                            <span class="details-row-value">${part.allowTeam !== false ? '<span class="badge-yes">ALLOWED</span>' : '<span class="badge-no">NOT ALLOWED</span>'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Team Size Constraints:</span>
                            <span class="details-row-value">Minimum ${part.minTeamSize || 2} to Maximum ${part.maxTeamSize || 4} members</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Inter-Department Teams:</span>
                            <span class="details-row-value">${part.interDeptAllowed !== false ? '<span class="badge-yes">ALLOWED</span>' : '<span class="badge-no">NOT ALLOWED</span>'}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Inter-College Students:</span>
                            <span class="details-row-value">${part.interCollegeAllowed ? '<span class="badge-yes">ALLOWED</span>' : '<span class="badge-no">COLLEGE STUDENTS ONLY</span>'}</span>
                        </div>
                        ${part.restrictions ? `
                        <div class="details-row" style="flex-direction: column; gap: 4px; padding-top: 6px;">
                            <span class="details-row-label">Restrictions / Notes:</span>
                            <span style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(part.restrictions)}</span>
                        </div>` : ""}
                    </div>
                </div>

                <!-- 5. REGISTRATION FEE & PAYMENT -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>💳 Registration Fee & Payment</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Registration Amount:</span>
                            <span class="details-row-value" style="font-size: 16px; color: var(--secondary-blue);">${feeAmount > 0 ? `₹${feeAmount}` : "FREE"}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Fee Type:</span>
                            <span class="details-row-value">${feeType === "per_team" ? "Per Team" : "Per Person"}</span>
                        </div>
                        <div class="details-row" style="flex-direction: column; gap: 4px; padding-top: 6px;">
                            <span class="details-row-label">Total Payable Explanation:</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${feeExplanation}</span>
                        </div>
                        <div class="details-row" style="flex-direction: column; gap: 4px; padding-top: 6px;">
                            <span class="details-row-label">Payment Instructions:</span>
                            <span style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(event.fee?.instructions || "Payment details will be provided at the registration desk.")}</span>
                        </div>
                        ${event.fee?.deadline ? `
                        <div class="details-row">
                            <span class="details-row-label">Payment Deadline:</span>
                            <span class="details-row-value">${formatDateDisplay(event.fee.deadline)}</span>
                        </div>` : ""}
                    </div>
                </div>

                <!-- 6. REGISTRATION TIMELINE & INSTRUCTIONS -->
                <div class="details-card">
                    <div class="details-card-header">
                        <h3>📅 Registration Information</h3>
                    </div>
                    <div class="details-list">
                        <div class="details-row">
                            <span class="details-row-label">Registration Starts:</span>
                            <span class="details-row-value">${formatDateDisplay(event.registrationInfo?.startDate) || "Open Now"}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Registration Closes:</span>
                            <span class="details-row-value">${formatDateDisplay(event.registrationInfo?.lastDate) || "Open until event"}</span>
                        </div>
                        <div class="details-row">
                            <span class="details-row-label">Current Status:</span>
                            <span class="details-row-value">${effectiveStatus === "open" ? '<span class="badge-yes">ACCEPTING ENTRIES</span>' : '<span class="badge-no">REGISTRATION CLOSED</span>'}</span>
                        </div>
                        <div class="details-row" style="flex-direction: column; gap: 4px; padding-top: 6px;">
                            <span class="details-row-label">Instructions:</span>
                            <span style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(event.registrationInfo?.instructions || "Review rules and confirm details before registering.")}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 7. EVENT RULES -->
            <div class="content-card" style="margin-top: 24px;">
                <div class="details-card-header">
                    <h3>📜 Event Rules & Guidelines</h3>
                </div>
                ${rules}
            </div>

            <!-- 8. COORDINATOR CONTACT DETAILS -->
            <div class="content-card" style="margin-top: 24px;">
                <div class="details-card-header">
                    <h3>📞 Faculty & Student Coordinator Contact</h3>
                </div>
                <div class="details-list" style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
                    <div>
                        <span class="details-row-label">Coordinator Name:</span>
                        <div style="font-weight: 600; color: var(--primary-navy); margin-top: 4px;">${escapeHTML(event.coordinator?.name || "Event Committee")}</div>
                    </div>
                    <div>
                        <span class="details-row-label">Contact Phone:</span>
                        <div style="font-weight: 600; color: var(--primary-navy); margin-top: 4px;">${escapeHTML(event.coordinator?.phone || "Office Extension 204")}</div>
                    </div>
                    <div>
                        <span class="details-row-label">Contact Email:</span>
                        <div style="font-weight: 600; color: var(--primary-navy); margin-top: 4px;">${escapeHTML(event.coordinator?.email || "events@college.edu")}</div>
                    </div>
                </div>
            </div>

            <!-- 9. BOTTOM REGISTRATION CALL TO ACTION -->
            <div class="details-register-footer">
                <div class="register-footer-text">
                    <h3>Ready to Participate in ${escapeHTML(event.name)}?</h3>
                    <p>Review all schedule timings and team rules before proceeding.</p>
                </div>
                ${registerButtonMarkup}
            </div>
        `;
    } catch (error) {
        alert("Failed to load event details: " + error.message);
    }
}

function backToEventsList() {
    document.getElementById("studentEventDetailsView").hidden = true;
    document.getElementById("studentEventsTabContent").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// --------------------------------------------------
// EVENT REGISTRATION MODAL LOGIC (SECTION 8)
// --------------------------------------------------
function openRegistrationModal(eventId) {
    if (!selectedEvent || selectedEvent._id !== eventId) {
        selectedEvent = allEvents.find(e => e._id === eventId);
    }
    if (!selectedEvent) return;

    clearAlerts();

    document.getElementById("regEventId").value = selectedEvent._id;
    document.getElementById("regEventName").value = selectedEvent.name;
    document.getElementById("regModalEventTitle").textContent = `Register for ${selectedEvent.name}`;

    // Team leader info
    const leaderInfoEl = document.getElementById("regLeaderInfo");
    leaderInfoEl.textContent = `${currentUser.name} (${currentUser.registerNumber || "Reg No N/A"} - ${currentUser.department || "Dept"})`;

    // Fee structure note
    const feeAmount = selectedEvent.fee?.amount || 0;
    const feeType = selectedEvent.fee?.feeType || "per_person";
    const feeExplanationEl = document.getElementById("regFeeExplanation");
    if (feeAmount === 0) {
        feeExplanationEl.textContent = "Free Event (No payment required)";
    } else {
        feeExplanationEl.textContent = feeType === "per_team"
            ? `Flat ₹${feeAmount} per team`
            : `₹${feeAmount} per person`;
    }

    // Configure registration type dropdown based on event participation rules
    const part = selectedEvent.participation || {};
    const regTypeSelect = document.getElementById("regTypeSelect");
    regTypeSelect.innerHTML = "";

    const allowIndividual = part.allowIndividual !== false && part.participationType !== "team";
    const allowTeam = part.allowTeam !== false && part.participationType !== "individual";

    if (allowIndividual) {
        const opt = document.createElement("option");
        opt.value = "individual";
        opt.textContent = "Individual Registration";
        regTypeSelect.appendChild(opt);
    }

    if (allowTeam) {
        const opt = document.createElement("option");
        opt.value = "team";
        opt.textContent = "Team Registration";
        regTypeSelect.appendChild(opt);
    }

    if (!allowIndividual && !allowTeam) {
        const opt = document.createElement("option");
        opt.value = "individual";
        opt.textContent = "Individual Registration";
        regTypeSelect.appendChild(opt);
    }

    // Team size rule row
    const ruleRow = document.getElementById("regTeamSizeRuleRow");
    const ruleExp = document.getElementById("regTeamSizeExplanation");
    if (allowTeam) {
        ruleRow.hidden = false;
        ruleExp.textContent = `Minimum ${part.minTeamSize || 2} to Maximum ${part.maxTeamSize || 4} members (including you as leader).`;
    } else {
        ruleRow.hidden = true;
    }

    // Clear team members list
    const teamMembersList = document.getElementById("teamMembersList");
    teamMembersList.innerHTML = "";
    document.getElementById("regTeamName").value = "";

    // Show modal
    document.getElementById("registrationModalView").hidden = false;

    // Trigger reg type change to setup form state
    handleRegTypeChange();
}

function closeRegistrationModal() {
    document.getElementById("registrationModalView").hidden = true;
}

function handleRegTypeChange() {
    const regType = document.getElementById("regTypeSelect").value;
    const teamFields = document.getElementById("teamRegistrationFields");

    if (regType === "team") {
        teamFields.hidden = false;
        // Ensure at least 1 member field is present if minTeamSize > 1
        const list = document.getElementById("teamMembersList");
        const minTeamSize = selectedEvent?.participation?.minTeamSize || 2;
        const requiredAdditional = Math.max(1, minTeamSize - 1);

        if (list.children.length === 0) {
            for (let i = 0; i < requiredAdditional; i++) {
                addTeamMemberField();
            }
        }
    } else {
        teamFields.hidden = true;
    }

    updateTotalFeeCalculation();
}

function addTeamMemberField() {
    const list = document.getElementById("teamMembersList");
    const currentAdditional = list.children.length;
    const maxTeamSize = selectedEvent?.participation?.maxTeamSize || 4;

    // Leader is 1, so additional can be up to maxTeamSize - 1
    if (1 + currentAdditional >= maxTeamSize) {
        alert(`Maximum allowed team size for this event is ${maxTeamSize} members.`);
        return;
    }

    const memberNum = currentAdditional + 2; // Leader is 1

    const memberDiv = document.createElement("div");
    memberDiv.className = "team-member-item";
    memberDiv.innerHTML = `
        <div class="team-member-item-header">
            <span>Member #${memberNum}</span>
            <button type="button" class="btn-remove-member" onclick="removeTeamMemberField(this)">Remove</button>
        </div>
        <div class="form-row">
            <input type="text" class="member-name" placeholder="Full Name" required>
            <input type="text" class="member-reg" placeholder="Register Number" required>
        </div>
        <div style="margin-top: 8px;">
            <input type="text" class="member-dept" placeholder="Department" required>
        </div>
    `;

    list.appendChild(memberDiv);
    updateTotalFeeCalculation();
}

function removeTeamMemberField(btn) {
    const item = btn.closest(".team-member-item");
    if (item) {
        item.remove();
        // Renumber remaining items
        const list = document.getElementById("teamMembersList");
        Array.from(list.children).forEach((child, idx) => {
            const headerSpan = child.querySelector(".team-member-item-header span");
            if (headerSpan) headerSpan.textContent = `Member #${idx + 2}`;
        });
        updateTotalFeeCalculation();
    }
}

function updateTotalFeeCalculation() {
    if (!selectedEvent) return;

    const regType = document.getElementById("regTypeSelect").value;
    const list = document.getElementById("teamMembersList");
    const additionalCount = regType === "team" ? list.children.length : 0;
    const totalMembers = 1 + additionalCount;

    document.getElementById("teamSizeCounter").textContent = totalMembers;

    const feeAmount = selectedEvent.fee?.amount || 0;
    const feeType = selectedEvent.fee?.feeType || "per_person";
    let totalPayable = 0;

    if (feeAmount > 0) {
        if (feeType === "per_team") {
            totalPayable = feeAmount;
        } else {
            totalPayable = feeAmount * totalMembers;
        }
    }

    const totalFeeEl = document.getElementById("regCalculatedTotalFee");
    totalFeeEl.textContent = `₹${totalPayable}`;

    const instructionsEl = document.getElementById("regPaymentInstructionsText");
    if (feeAmount > 0) {
        instructionsEl.textContent = `Payment Instructions: ${selectedEvent.fee?.instructions || "Pay at reception desk during check-in."}`;
    } else {
        instructionsEl.textContent = "This is a free event sponsored by college. No fee is required.";
    }
}

// Submit Event Registration Form
const eventRegistrationForm = document.getElementById("eventRegistrationForm");
if (eventRegistrationForm) {
    eventRegistrationForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const submitBtn = document.getElementById("submitRegBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            const eventId = document.getElementById("regEventId").value;
            const eventName = document.getElementById("regEventName").value;
            const registrationType = document.getElementById("regTypeSelect").value;
            const teamName = document.getElementById("regTeamName").value.trim();

            let teamMembers = [];
            if (registrationType === "team") {
                if (!teamName) {
                    throw new Error("Please enter a Team Name");
                }

                const list = document.getElementById("teamMembersList");
                const memberItems = Array.from(list.children);

                teamMembers = memberItems.map(item => {
                    const name = item.querySelector(".member-name")?.value.trim() || "";
                    const registerNumber = item.querySelector(".member-reg")?.value.trim().toUpperCase() || "";
                    const department = item.querySelector(".member-dept")?.value.trim() || "";
                    return { name, registerNumber, department };
                });

                // Validation of team size
                const minTeamSize = selectedEvent?.participation?.minTeamSize || 2;
                const maxTeamSize = selectedEvent?.participation?.maxTeamSize || 4;
                const totalTeamCount = 1 + teamMembers.length;

                if (totalTeamCount < minTeamSize) {
                    throw new Error(`Team size must be at least ${minTeamSize} members (including leader). Please add more members.`);
                }
                if (totalTeamCount > maxTeamSize) {
                    throw new Error(`Team size cannot exceed ${maxTeamSize} members.`);
                }

                for (let i = 0; i < teamMembers.length; i++) {
                    if (!teamMembers[i].name || !teamMembers[i].registerNumber || !teamMembers[i].department) {
                        throw new Error(`Please complete all fields for Member #${i + 2}`);
                    }
                }
            }

            const payload = {
                eventId,
                eventName,
                registrationType,
                teamName,
                teamMembers
            };

            const result = await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            let successNotice = result.message || "Registration completed successfully!";
            if (result.emailPreviewUrl) {
                successNotice += ` | Test Email Preview: ${result.emailPreviewUrl}`;
            }

            showAlert("eventRegistrationAlert", successNotice, "success");

            setTimeout(() => {
                closeRegistrationModal();
                switchStudentTab("registrations");
            }, 2500);

        } catch (error) {
            showAlert("eventRegistrationAlert", error.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirm & Submit Registration";
        }
    });
}

// --------------------------------------------------
// MY REGISTRATIONS (SECTION 9)
// --------------------------------------------------
async function loadMyRegistrations() {
    const container = document.getElementById("myRegistrationsList");
    if (!container) return;

    container.innerHTML = `<p style="padding: 20px;">Loading your registrations...</p>`;

    try {
        const registrations = await apiRequest("/my-registrations");

        if (registrations.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                    <h3>No Registrations Yet</h3>
                    <p style="margin: 8px 0 16px;">You haven't registered for any events yet.</p>
                    <button class="primary-btn btn-sm" onclick="switchStudentTab('events')">Browse Available Events</button>
                </div>
            `;
            return;
        }

        container.innerHTML = registrations.map(reg => {
            const isTeam = reg.registrationType === "team";
            const regDate = new Date(reg.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
            const eventDate = reg.event?.eventDate ? formatDateDisplay(reg.event.eventDate) : "Event details scheduled";
            const venue = reg.event?.venue || "Main Campus";

            let membersListMarkup = "";
            if (isTeam && reg.teamMembers && reg.teamMembers.length > 0) {
                membersListMarkup = `
                    <div class="reg-members-box">
                        <strong>Team Members (${1 + reg.teamMembers.length} Total):</strong>
                        <ul>
                            <li><strong>Leader:</strong> ${escapeHTML(reg.name)} (${escapeHTML(reg.registerNumber)} - ${escapeHTML(reg.department)})</li>
                            ${reg.teamMembers.map(m => `<li>${escapeHTML(m.name)} (${escapeHTML(m.registerNumber)} - ${escapeHTML(m.department)})</li>`).join("")}
                        </ul>
                    </div>
                `;
            }

            const feeLabel = reg.totalFee > 0 ? `₹${reg.totalFee} (${reg.feeType || "Paid"})` : "Free Event";
            const paymentStatusLabel = reg.paymentStatus === "not_applicable" ? "Not Applicable (Free)" : (reg.paymentStatus === "completed" ? "Verified" : "Pending Verification");

            return `
                <div class="registration-card">
                    <div class="reg-card-header">
                        <div>
                            <span class="role-pill">${isTeam ? "Team Registration" : "Individual Registration"}</span>
                            <h3 class="reg-card-title">${escapeHTML(reg.eventName)}</h3>
                        </div>
                        <span class="status-pill status-open">Confirmed</span>
                    </div>

                    <table class="reg-meta-table">
                        <tr>
                            <td>Event Date:</td>
                            <td>${eventDate}</td>
                        </tr>
                        <tr>
                            <td>Venue:</td>
                            <td>${escapeHTML(venue)}</td>
                        </tr>
                        ${isTeam ? `<tr><td>Team Name:</td><td><strong>${escapeHTML(reg.teamName)}</strong></td></tr>` : ""}
                        <tr>
                            <td>Fee Amount:</td>
                            <td><strong>${feeLabel}</strong></td>
                        </tr>
                        <tr>
                            <td>Payment Status:</td>
                            <td>${paymentStatusLabel}</td>
                        </tr>
                        <tr>
                            <td>Registered On:</td>
                            <td>${regDate}</td>
                        </tr>
                    </table>

                    ${membersListMarkup}

                    ${reg.paymentInstructions ? `<p class="payment-instructions-text" style="margin-top: 10px;"><strong>Note:</strong> ${escapeHTML(reg.paymentInstructions)}</p>` : ""}
                </div>
            `;
        }).join("");

    } catch (error) {
        container.innerHTML = `<p class="alert-box alert-danger">Error loading registrations: ${escapeHTML(error.message)}</p>`;
    }
}

// --------------------------------------------------
// COORDINATOR DASHBOARD LOGIC (SECTION 7)
// --------------------------------------------------
function showCoordinatorDashboard() {
    showScreen("coordinatorDashboard");

    const welcomeEl = document.getElementById("coordWelcome");
    if (welcomeEl && currentUser) {
        welcomeEl.textContent = `Coordinator Portal - ${currentUser.name}`;
    }

    switchCoordTab("manage");
}

function switchCoordTab(tab) {
    currentCoordTab = tab;
    const tabManage = document.getElementById("coordTabManage");
    const tabCreate = document.getElementById("coordTabCreate");
    const tabRegs = document.getElementById("coordTabRegistrations");

    const contentManage = document.getElementById("coordManageTabContent");
    const contentCreate = document.getElementById("coordCreateTabContent");
    const contentRegs = document.getElementById("coordRegistrationsTabContent");

    [tabManage, tabCreate, tabRegs].forEach(t => t.classList.remove("active"));
    [contentManage, contentCreate, contentRegs].forEach(c => c.hidden = true);

    if (tab === "manage") {
        tabManage.classList.add("active");
        contentManage.hidden = false;
        loadCoordinatorEvents();
    } else if (tab === "create") {
        tabCreate.classList.add("active");
        contentCreate.hidden = false;
        // Pre-fill coordinator name/phone/email if creating
        if (!document.getElementById("editEventId").value && currentUser) {
            document.getElementById("cCoordName").value = currentUser.name || "";
            document.getElementById("cCoordEmail").value = currentUser.email || "";
        }
    } else {
        tabRegs.classList.add("active");
        contentRegs.hidden = false;
        loadCoordinatorRegistrations();
    }
}

// Date change handler to auto-calculate Day
function handleDateChange(dateValue) {
    const day = getDayOfWeek(dateValue);
    const dayInput = document.getElementById("cCalculatedDay");
    if (dayInput) {
        dayInput.value = day;
    }
}

// Rules field dynamic addition/removal in Coordinator Form
function addRuleField(initialValue = "") {
    const list = document.getElementById("cRulesList");
    const ruleCount = list.children.length + 1;

    const row = document.createElement("div");
    row.className = "rule-input-row";
    row.innerHTML = `
        <span class="rule-index-badge">${ruleCount}</span>
        <input type="text" class="rule-input" placeholder="Enter event rule description..." value="${escapeHTML(initialValue)}" required>
        <button type="button" class="btn-danger btn-sm" onclick="removeRuleField(this)">✕</button>
    `;
    list.appendChild(row);
}

function removeRuleField(btn) {
    const row = btn.closest(".rule-input-row");
    if (row) {
        row.remove();
        // Renumber remaining badges
        const list = document.getElementById("cRulesList");
        Array.from(list.children).forEach((child, idx) => {
            const badge = child.querySelector(".rule-index-badge");
            if (badge) badge.textContent = idx + 1;
        });
    }
}

function handleCoordParticipationChange(val) {
    const minInput = document.getElementById("cMinTeamSize");
    const maxInput = document.getElementById("cMaxTeamSize");

    if (val === "individual") {
        minInput.disabled = true;
        maxInput.disabled = true;
    } else {
        minInput.disabled = false;
        maxInput.disabled = false;
    }
}

// Coordinator Form Reset
function resetCoordinatorForm() {
    const form = document.getElementById("coordinatorEventForm");
    if (form) form.reset();
    document.getElementById("editEventId").value = "";
    document.getElementById("coordFormTitle").textContent = "Create New College Event";
    document.getElementById("cSubmitBtn").textContent = "Save Event in Database";
    document.getElementById("cancelEditBtn").hidden = true;
    document.getElementById("cCalculatedDay").value = "";
    document.getElementById("cRulesList").innerHTML = "";

    // Add 3 initial empty rule slots
    addRuleField();
    addRuleField();
    addRuleField();

    clearAlerts();
}

// Load Events for Coordinator Table
async function loadCoordinatorEvents() {
    const container = document.getElementById("coordEventsList");
    if (!container) return;

    container.innerHTML = `<p style="padding: 20px;">Loading events...</p>`;

    try {
        const events = await apiRequest("/events");
        allEvents = events;

        if (events.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                    <h3>No Events Created Yet</h3>
                    <p style="margin: 8px 0 16px;">Create your first event using the complete event form.</p>
                    <button class="primary-btn btn-sm" onclick="switchCoordTab('create')">+ Create First Event</button>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(ev => {
            const effectiveStatus = ev.effectiveStatus || "open";
            const statusClass = effectiveStatus === "open" ? "status-open" : (effectiveStatus === "completed" ? "status-completed" : "status-closed");
            const statusLabel = effectiveStatus === "open" ? "Registration Open" : (effectiveStatus === "completed" ? "Completed" : "Closed");

            const dayName = ev.eventDay || getDayOfWeek(ev.eventDate);
            const dateStr = formatDateDisplay(ev.eventDate);

            const isClosed = effectiveStatus === "closed";
            const toggleStatusAction = isClosed ? "open" : "closed";
            const toggleStatusBtnText = isClosed ? "Reopen Registration" : "Close Registration";

            return `
                <div class="manage-event-row">
                    <div class="manage-event-info">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span class="role-pill">${escapeHTML(ev.category)}</span>
                            <span class="status-pill ${statusClass}">${statusLabel}</span>
                        </div>
                        <h3>${escapeHTML(ev.name)}</h3>
                        <div class="manage-event-meta">
                            <span>📅 ${dateStr} (${dayName})</span>
                            <span>⏰ ${escapeHTML(ev.startTime)} - ${escapeHTML(ev.endTime)}</span>
                            <span>📍 ${escapeHTML(ev.venue)}</span>
                            <span>💳 ${ev.fee?.amount > 0 ? `₹${ev.fee.amount} (${ev.fee.feeType})` : "Free"}</span>
                        </div>
                    </div>
                    <div class="manage-event-actions">
                        <button class="secondary-btn btn-sm" onclick="editCoordinatorEvent('${ev._id}')">Edit Details</button>
                        <button class="secondary-btn btn-sm" onclick="setEventStatus('${ev._id}', '${toggleStatusAction}')">${toggleStatusBtnText}</button>
                        ${effectiveStatus !== "completed" ? `<button class="secondary-btn btn-sm" onclick="setEventStatus('${ev._id}', 'completed')">Mark Completed</button>` : ""}
                        <button class="btn-danger btn-sm" onclick="deleteCoordinatorEvent('${ev._id}', '${escapeHTML(ev.name)}')">Delete</button>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        container.innerHTML = `<p class="alert-box alert-danger">Error: ${escapeHTML(error.message)}</p>`;
    }
}

// Edit Event: Prefill Form
async function editCoordinatorEvent(eventId) {
    try {
        const event = await apiRequest(`/events/${eventId}`);

        switchCoordTab("create");

        document.getElementById("editEventId").value = event._id;
        document.getElementById("coordFormTitle").textContent = `Edit Event: ${event.name}`;
        document.getElementById("cSubmitBtn").textContent = "Update Event in Database";
        document.getElementById("cancelEditBtn").hidden = false;

        document.getElementById("cEventName").value = event.name || "";
        document.getElementById("cCategory").value = event.category || "Technical";
        document.getElementById("cDescription").value = event.description || "";
        document.getElementById("cBannerUrl").value = event.bannerUrl || "";

        document.getElementById("cEventDate").value = event.eventDate || "";
        document.getElementById("cCalculatedDay").value = event.eventDay || getDayOfWeek(event.eventDate);
        document.getElementById("cVenue").value = event.venue || "";
        document.getElementById("cReportingTime").value = event.reportingTime || "";
        document.getElementById("cStartTime").value = event.startTime || "";
        document.getElementById("cEndTime").value = event.endTime || "";

        // Schedule
        document.getElementById("cMorningBreak").value = event.schedule?.morningBreak || "";
        document.getElementById("cLunchBreak").value = event.schedule?.lunchBreak || "";
        document.getElementById("cEveningBreak").value = event.schedule?.eveningBreak || "";
        document.getElementById("cOtherBreaks").value = event.schedule?.otherBreaks || "";

        // Food
        document.getElementById("cFoodBreakfast").checked = Boolean(event.food?.breakfast);
        document.getElementById("cFoodLunch").checked = Boolean(event.food?.lunch);
        document.getElementById("cFoodSnacks").checked = Boolean(event.food?.snacks);
        document.getElementById("cFoodDetails").value = event.food?.details || "";

        // Participation
        document.getElementById("cParticipationType").value = event.participation?.participationType || "both";
        document.getElementById("cMinTeamSize").value = event.participation?.minTeamSize || 2;
        document.getElementById("cMaxTeamSize").value = event.participation?.maxTeamSize || 4;
        document.getElementById("cInterDeptAllowed").checked = event.participation?.interDeptAllowed !== false;
        document.getElementById("cInterCollegeAllowed").checked = Boolean(event.participation?.interCollegeAllowed);
        document.getElementById("cRestrictions").value = event.participation?.restrictions || "";

        // Fee
        document.getElementById("cFeeAmount").value = event.fee?.amount || 0;
        document.getElementById("cFeeType").value = event.fee?.feeType || "per_person";
        document.getElementById("cFeeDeadline").value = event.fee?.deadline || "";
        document.getElementById("cPaymentInstructions").value = event.fee?.instructions || "";

        // Registration timeline
        document.getElementById("cRegStartDate").value = event.registrationInfo?.startDate || "";
        document.getElementById("cRegLastDate").value = event.registrationInfo?.lastDate || "";
        document.getElementById("cRegStatus").value = event.registrationInfo?.status || "open";
        document.getElementById("cRegInstructions").value = event.registrationInfo?.instructions || "";

        // Rules
        const rulesList = document.getElementById("cRulesList");
        rulesList.innerHTML = "";
        if (event.rules && event.rules.length > 0) {
            event.rules.forEach(r => addRuleField(r));
        } else {
            addRuleField();
        }

        // Coordinator info
        document.getElementById("cCoordName").value = event.coordinator?.name || "";
        document.getElementById("cCoordPhone").value = event.coordinator?.phone || "";
        document.getElementById("cCoordEmail").value = event.coordinator?.email || "";

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        alert("Failed to load event data: " + error.message);
    }
}

// Coordinator Submit Event (Create or Update)
const coordinatorEventForm = document.getElementById("coordinatorEventForm");
if (coordinatorEventForm) {
    coordinatorEventForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const editId = document.getElementById("editEventId").value;
        const isEditing = Boolean(editId);

        // Collect rules
        const ruleInputs = document.querySelectorAll("#cRulesList .rule-input");
        const rules = Array.from(ruleInputs)
            .map(input => input.value.trim())
            .filter(Boolean);

        const eventData = {
            name: document.getElementById("cEventName").value.trim(),
            category: document.getElementById("cCategory").value,
            description: document.getElementById("cDescription").value.trim(),
            bannerUrl: document.getElementById("cBannerUrl").value.trim(),
            eventDate: document.getElementById("cEventDate").value,
            eventDay: document.getElementById("cCalculatedDay").value || getDayOfWeek(document.getElementById("cEventDate").value),
            venue: document.getElementById("cVenue").value.trim(),
            reportingTime: document.getElementById("cReportingTime").value.trim(),
            startTime: document.getElementById("cStartTime").value.trim(),
            endTime: document.getElementById("cEndTime").value.trim(),
            schedule: {
                morningBreak: document.getElementById("cMorningBreak").value.trim(),
                lunchBreak: document.getElementById("cLunchBreak").value.trim(),
                eveningBreak: document.getElementById("cEveningBreak").value.trim(),
                otherBreaks: document.getElementById("cOtherBreaks").value.trim()
            },
            food: {
                breakfast: document.getElementById("cFoodBreakfast").checked,
                lunch: document.getElementById("cFoodLunch").checked,
                snacks: document.getElementById("cFoodSnacks").checked,
                details: document.getElementById("cFoodDetails").value.trim()
            },
            participation: {
                participationType: document.getElementById("cParticipationType").value,
                minTeamSize: parseInt(document.getElementById("cMinTeamSize").value, 10) || 2,
                maxTeamSize: parseInt(document.getElementById("cMaxTeamSize").value, 10) || 4,
                interDeptAllowed: document.getElementById("cInterDeptAllowed").checked,
                interCollegeAllowed: document.getElementById("cInterCollegeAllowed").checked,
                restrictions: document.getElementById("cRestrictions").value.trim()
            },
            fee: {
                amount: parseFloat(document.getElementById("cFeeAmount").value) || 0,
                feeType: document.getElementById("cFeeType").value,
                deadline: document.getElementById("cFeeDeadline").value,
                instructions: document.getElementById("cPaymentInstructions").value.trim()
            },
            registrationInfo: {
                startDate: document.getElementById("cRegStartDate").value,
                lastDate: document.getElementById("cRegLastDate").value,
                status: document.getElementById("cRegStatus").value,
                instructions: document.getElementById("cRegInstructions").value.trim()
            },
            rules,
            coordinator: {
                name: document.getElementById("cCoordName").value.trim(),
                phone: document.getElementById("cCoordPhone").value.trim(),
                email: document.getElementById("cCoordEmail").value.trim()
            }
        };

        try {
            let result;
            if (isEditing) {
                result = await apiRequest(`/events/${editId}`, {
                    method: "PUT",
                    body: JSON.stringify(eventData)
                });
            } else {
                result = await apiRequest("/events", {
                    method: "POST",
                    body: JSON.stringify(eventData)
                });
            }

            showAlert("coordinatorFormAlert", result.message || "Event saved successfully!", "success");

            setTimeout(() => {
                resetCoordinatorForm();
                switchCoordTab("manage");
            }, 1000);

        } catch (error) {
            showAlert("coordinatorFormAlert", error.message, "danger");
        }
    });
}

// Update Event Status (Open/Closed/Completed)
async function setEventStatus(eventId, newStatus) {
    try {
        await apiRequest(`/events/${eventId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });
        loadCoordinatorEvents();
    } catch (error) {
        alert("Failed to update status: " + error.message);
    }
}

// Delete Event
async function deleteCoordinatorEvent(eventId, eventName) {
    if (!confirm(`Are you sure you want to permanently delete "${eventName}"? All participant registrations for this event will also be removed.`)) {
        return;
    }

    try {
        await apiRequest(`/events/${eventId}`, {
            method: "DELETE"
        });
        loadCoordinatorEvents();
    } catch (error) {
        alert("Failed to delete event: " + error.message);
    }
}

// Load Coordinator Registrations
async function loadCoordinatorRegistrations() {
    const tableBody = document.getElementById("coordRegistrationsTableBody");
    const eventFilter = document.getElementById("coordEventFilter");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="9">Loading registrations...</td></tr>`;

    try {
        const events = await apiRequest("/events");

        // Populate dropdown if needed
        if (eventFilter && eventFilter.children.length <= 1) {
            eventFilter.innerHTML = `<option value="">All Events</option>` +
                events.map(ev => `<option value="${escapeHTML(ev.name)}">${escapeHTML(ev.name)}</option>`).join("");
        }

        const selectedEventName = eventFilter?.value || "";
        const endpoint = selectedEventName ? `/registrations?eventName=${encodeURIComponent(selectedEventName)}` : "/registrations";

        const registrations = await apiRequest(endpoint);

        if (registrations.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px;">No student registrations found for this filter.</td></tr>`;
            return;
        }

        tableBody.innerHTML = registrations.map(reg => {
            const isTeam = reg.registrationType === "team";
            const dateStr = new Date(reg.createdAt).toLocaleDateString();

            let membersSummary = "-";
            if (isTeam && reg.teamMembers && reg.teamMembers.length > 0) {
                membersSummary = reg.teamMembers.map(m => `${escapeHTML(m.name)} (${escapeHTML(m.registerNumber)})`).join(", ");
            }

            const feeStr = reg.totalFee > 0 ? `₹${reg.totalFee}` : "Free";

            return `
                <tr>
                    <td><strong>${escapeHTML(reg.name)}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${escapeHTML(reg.email)}</span></td>
                    <td>${escapeHTML(reg.registerNumber || "-")}</td>
                    <td>${escapeHTML(reg.department || "-")}</td>
                    <td>${escapeHTML(reg.eventName)}</td>
                    <td><span class="role-pill">${isTeam ? "Team" : "Individual"}</span></td>
                    <td>${isTeam ? `<strong>${escapeHTML(reg.teamName)}</strong>` : "-"}</td>
                    <td style="max-width: 200px; font-size: 12px;">${membersSummary}</td>
                    <td><strong>${feeStr}</strong></td>
                    <td>${dateStr}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" style="color: var(--danger);">Error: ${escapeHTML(error.message)}</td></tr>`;
    }
}

// --------------------------------------------------
// ADMIN DASHBOARD LOGIC (SECTION 10 & 11)
// --------------------------------------------------
function showAdminDashboard() {
    showScreen("adminDashboard");

    const welcomeEl = document.getElementById("adminWelcome");
    if (welcomeEl && currentUser) {
        welcomeEl.textContent = `Administrator Dashboard - ${currentUser.name}`;
    }

    switchAdminTab("summary");
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    const tabSummary = document.getElementById("adminTabSummary");
    const tabRegs = document.getElementById("adminTabRegistrations");
    const tabStudents = document.getElementById("adminTabStudents");
    const tabEvents = document.getElementById("adminTabEvents");
    const tabCreate = document.getElementById("adminTabCreate");

    const contentSummary = document.getElementById("adminSummaryTabContent");
    const contentRegs = document.getElementById("adminRegistrationsTabContent");
    const contentStudents = document.getElementById("adminStudentsTabContent");
    const contentEvents = document.getElementById("adminEventsTabContent");
    const contentCreate = document.getElementById("adminCreateTabContent");

    [tabSummary, tabRegs, tabStudents, tabEvents, tabCreate].forEach(t => {
        if (t) t.classList.remove("active");
    });
    [contentSummary, contentRegs, contentStudents, contentEvents, contentCreate].forEach(c => {
        if (c) c.hidden = true;
    });

    if (tab === "summary") {
        tabSummary.classList.add("active");
        contentSummary.hidden = false;
        loadAdminDashboard();
    } else if (tab === "registrations") {
        tabRegs.classList.add("active");
        contentRegs.hidden = false;
        loadAdminRegistrations();
    } else if (tab === "students") {
        tabStudents.classList.add("active");
        contentStudents.hidden = false;
        loadAdminStudents();
    } else if (tab === "events") {
        tabEvents.classList.add("active");
        contentEvents.hidden = false;
        loadAdminEvents();
    } else if (tab === "create") {
        if (tabCreate) tabCreate.classList.add("active");
        if (contentCreate) contentCreate.hidden = false;
        // Pre-fill coordinator fields with admin contact if creating new
        if (!document.getElementById("adminEditEventId").value && currentUser) {
            const nameEl = document.getElementById("aCoordName");
            const emailEl = document.getElementById("aCoordEmail");
            if (nameEl && !nameEl.value) nameEl.value = currentUser.name || "Administrator";
            if (emailEl && !emailEl.value) emailEl.value = currentUser.email || "admin@college.com";

            const rulesList = document.getElementById("aRulesList");
            if (rulesList && rulesList.children.length === 0) {
                addAdminRuleField();
                addAdminRuleField();
                addAdminRuleField();
            }
        }
    }
}

// Load Summary Cards & Event-Wise Stats
async function loadAdminDashboard() {
    try {
        const data = await apiRequest("/admin/summary");

        // Update Stat Cards
        document.getElementById("adminStatStudents").textContent = data.totalStudents;
        document.getElementById("adminStatEvents").textContent = data.totalEvents;
        document.getElementById("adminStatTeams").textContent = data.totalTeams;
        document.getElementById("adminStatRegistrations").textContent = data.totalRegistrations;

        // Render Event-Wise Summary Table
        const tableBody = document.getElementById("adminEventSummaryTable");
        if (!tableBody) return;

        if (data.eventSummary.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No events in database.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.eventSummary.map(ev => {
            return `
                <tr>
                    <td><strong>${escapeHTML(ev.eventName)}</strong></td>
                    <td><span class="role-pill">${escapeHTML(ev.category)}</span></td>
                    <td>${formatDateDisplay(ev.eventDate)}</td>
                    <td>${ev.totalIndividual}</td>
                    <td><strong>${ev.totalTeams}</strong></td>
                    <td><strong style="color: var(--secondary-blue);">${ev.totalStudents}</strong></td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        alert("Failed to load admin summary: " + error.message);
    }
}

// Load All Registrations (Admin View with Delete)
async function loadAdminRegistrations() {
    const tableBody = document.getElementById("adminRegistrationsTable");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="9">Loading registrations...</td></tr>`;

    try {
        const registrations = await apiRequest("/registrations");

        if (registrations.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px;">No registrations found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = registrations.map(reg => {
            const isTeam = reg.registrationType === "team";
            const regDate = new Date(reg.createdAt).toLocaleDateString();

            let teamDetails = "-";
            if (isTeam) {
                const memberCount = 1 + (reg.teamMembers?.length || 0);
                teamDetails = `<strong>${escapeHTML(reg.teamName)}</strong> (${memberCount} members)`;
            }

            return `
                <tr>
                    <td><strong>${escapeHTML(reg.name)}</strong></td>
                    <td>${escapeHTML(reg.registerNumber || "-")}</td>
                    <td>${escapeHTML(reg.department || "-")}</td>
                    <td>${escapeHTML(reg.email)}</td>
                    <td>${escapeHTML(reg.eventName)}</td>
                    <td><span class="role-pill">${isTeam ? "Team" : "Individual"}</span></td>
                    <td>${teamDetails}</td>
                    <td>${regDate}</td>
                    <td>
                        <button class="btn-danger btn-sm" onclick="deleteAdminRegistration('${reg._id}')">Remove</button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="9" style="color: var(--danger);">Error: ${escapeHTML(error.message)}</td></tr>`;
    }
}

// Delete Registration (Admin)
async function deleteAdminRegistration(id) {
    if (!confirm("Are you sure you want to remove this registration record?")) {
        return;
    }

    try {
        await apiRequest(`/registrations/${id}`, { method: "DELETE" });
        loadAdminRegistrations();
        loadAdminDashboard();
    } catch (error) {
        alert("Failed to remove registration: " + error.message);
    }
}

// Manage Students Table (Admin)
async function loadAdminStudents() {
    const tableBody = document.getElementById("adminStudentsTable");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7">Loading students...</td></tr>`;

    try {
        const students = await apiRequest("/admin/students");

        if (students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">No student accounts registered yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = students.map(s => {
            const dateStr = new Date(s.createdAt).toLocaleDateString();
            const isActive = s.isActive !== false;
            const statusBadge = isActive ? `<span class="badge-yes">ACTIVE</span>` : `<span class="badge-no">INACTIVE</span>`;
            const toggleText = isActive ? "Deactivate" : "Activate";

            return `
                <tr>
                    <td><strong>${escapeHTML(s.name)}</strong></td>
                    <td>${escapeHTML(s.email)}</td>
                    <td>${escapeHTML(s.registerNumber || "-")}</td>
                    <td>${escapeHTML(s.department || "-")}</td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="secondary-btn btn-sm" onclick="toggleStudentStatus('${s._id}', ${!isActive})">${toggleText}</button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" style="color: var(--danger);">Error: ${escapeHTML(error.message)}</td></tr>`;
    }
}

async function toggleStudentStatus(studentId, newStatus) {
    try {
        await apiRequest(`/admin/students/${studentId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ isActive: newStatus })
        });
        loadAdminStudents();
    } catch (error) {
        alert("Failed to update student status: " + error.message);
    }
}

// Admin Events Overview
async function loadAdminEvents() {
    const container = document.getElementById("adminEventsList");
    if (!container) return;

    container.innerHTML = `<p style="padding: 20px;">Loading events...</p>`;

    try {
        const events = await apiRequest("/events");

        if (events.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 30px;">No events in database.</div>`;
            return;
        }

        container.innerHTML = events.map(ev => {
            const effectiveStatus = ev.effectiveStatus || "open";
            const statusClass = effectiveStatus === "open" ? "status-open" : (effectiveStatus === "completed" ? "status-completed" : "status-closed");
            const statusLabel = effectiveStatus === "open" ? "Open" : (effectiveStatus === "completed" ? "Completed" : "Closed");

            return `
                <div class="manage-event-row">
                    <div class="manage-event-info">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span class="role-pill">${escapeHTML(ev.category)}</span>
                            <span class="status-pill ${statusClass}">${statusLabel}</span>
                        </div>
                        <h3>${escapeHTML(ev.name)}</h3>
                        <div class="manage-event-meta">
                            <span>📅 ${formatDateDisplay(ev.eventDate)}</span>
                            <span>📍 ${escapeHTML(ev.venue)}</span>
                            <span>👥 Mode: ${escapeHTML(ev.participation?.participationType || "both")}</span>
                        </div>
                    </div>
                    <div class="manage-event-actions">
                        <button class="secondary-btn btn-sm" onclick="editAdminEvent('${ev._id}')">Edit Details</button>
                        <button class="secondary-btn btn-sm" onclick="setEventStatus('${ev._id}', '${effectiveStatus === "closed" ? "open" : "closed"}')">
                            ${effectiveStatus === "closed" ? "Reopen" : "Close"}
                        </button>
                        <button class="btn-danger btn-sm" onclick="deleteCoordinatorEvent('${ev._id}', '${escapeHTML(ev.name)}')">Delete</button>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        container.innerHTML = `<p class="alert-box alert-danger">Error: ${escapeHTML(error.message)}</p>`;
    }
}

// --------------------------------------------------
// ADMIN EVENT CREATION & EDITING LOGIC
// --------------------------------------------------

function handleAdminDateChange(dateValue) {
    const day = getDayOfWeek(dateValue);
    const dayInput = document.getElementById("aCalculatedDay");
    if (dayInput) {
        dayInput.value = day;
    }
}

function addAdminRuleField(initialValue = "") {
    const list = document.getElementById("aRulesList");
    if (!list) return;
    const ruleCount = list.children.length + 1;

    const row = document.createElement("div");
    row.className = "rule-input-row";
    row.innerHTML = `
        <span class="rule-index-badge">${ruleCount}</span>
        <input type="text" class="rule-input" placeholder="Enter event rule description..." value="${escapeHTML(initialValue)}" required>
        <button type="button" class="btn-danger btn-sm" onclick="removeAdminRuleField(this)">✕</button>
    `;
    list.appendChild(row);
}

function removeAdminRuleField(btn) {
    const row = btn.closest(".rule-input-row");
    if (row) {
        row.remove();
        const list = document.getElementById("aRulesList");
        if (list) {
            Array.from(list.children).forEach((child, idx) => {
                const badge = child.querySelector(".rule-index-badge");
                if (badge) badge.textContent = idx + 1;
            });
        }
    }
}

function handleAdminParticipationChange(val) {
    const minInput = document.getElementById("aMinTeamSize");
    const maxInput = document.getElementById("aMaxTeamSize");

    if (val === "individual") {
        if (minInput) minInput.disabled = true;
        if (maxInput) maxInput.disabled = true;
    } else {
        if (minInput) minInput.disabled = false;
        if (maxInput) maxInput.disabled = false;
    }
}

function resetAdminForm() {
    const form = document.getElementById("adminEventForm");
    if (form) form.reset();
    const editIdEl = document.getElementById("adminEditEventId");
    if (editIdEl) editIdEl.value = "";
    const titleEl = document.getElementById("adminFormTitle");
    if (titleEl) titleEl.textContent = "Add New College Event";
    const submitBtn = document.getElementById("aSubmitBtn");
    if (submitBtn) submitBtn.textContent = "Save Event in Database";
    const cancelBtn = document.getElementById("adminCancelEditBtn");
    if (cancelBtn) cancelBtn.hidden = true;
    const calcDayEl = document.getElementById("aCalculatedDay");
    if (calcDayEl) calcDayEl.value = "";
    const rulesList = document.getElementById("aRulesList");
    if (rulesList) {
        rulesList.innerHTML = "";
        addAdminRuleField();
        addAdminRuleField();
        addAdminRuleField();
    }
    clearAlerts();
}

async function editAdminEvent(eventId) {
    try {
        const event = await apiRequest(`/events/${eventId}`);

        switchAdminTab("create");

        document.getElementById("adminEditEventId").value = event._id;
        document.getElementById("adminFormTitle").textContent = `Edit Event: ${event.name}`;
        document.getElementById("aSubmitBtn").textContent = "Update Event in Database";
        document.getElementById("adminCancelEditBtn").hidden = false;

        document.getElementById("aEventName").value = event.name || "";
        document.getElementById("aCategory").value = event.category || "Technical";
        document.getElementById("aDescription").value = event.description || "";
        document.getElementById("aBannerUrl").value = event.bannerUrl || "";

        document.getElementById("aEventDate").value = event.eventDate || "";
        document.getElementById("aCalculatedDay").value = event.eventDay || getDayOfWeek(event.eventDate);
        document.getElementById("aVenue").value = event.venue || "";
        document.getElementById("aReportingTime").value = event.reportingTime || "";
        document.getElementById("aStartTime").value = event.startTime || "";
        document.getElementById("aEndTime").value = event.endTime || "";

        // Schedule
        document.getElementById("aMorningBreak").value = event.schedule?.morningBreak || "";
        document.getElementById("aLunchBreak").value = event.schedule?.lunchBreak || "";
        document.getElementById("aEveningBreak").value = event.schedule?.eveningBreak || "";
        document.getElementById("aOtherBreaks").value = event.schedule?.otherBreaks || "";

        // Food
        document.getElementById("aFoodBreakfast").checked = Boolean(event.food?.breakfast);
        document.getElementById("aFoodLunch").checked = Boolean(event.food?.lunch);
        document.getElementById("aFoodSnacks").checked = Boolean(event.food?.snacks);
        document.getElementById("aFoodDetails").value = event.food?.details || "";

        // Participation
        document.getElementById("aParticipationType").value = event.participation?.participationType || "both";
        document.getElementById("aMinTeamSize").value = event.participation?.minTeamSize || 2;
        document.getElementById("aMaxTeamSize").value = event.participation?.maxTeamSize || 4;
        document.getElementById("aInterDeptAllowed").checked = event.participation?.interDeptAllowed !== false;
        document.getElementById("aInterCollegeAllowed").checked = Boolean(event.participation?.interCollegeAllowed);
        document.getElementById("aRestrictions").value = event.participation?.restrictions || "";

        // Fee
        document.getElementById("aFeeAmount").value = event.fee?.amount || 0;
        document.getElementById("aFeeType").value = event.fee?.feeType || "per_person";
        document.getElementById("aFeeDeadline").value = event.fee?.deadline || "";
        document.getElementById("aPaymentInstructions").value = event.fee?.instructions || "";

        // Registration timeline
        document.getElementById("aRegStartDate").value = event.registrationInfo?.startDate || "";
        document.getElementById("aRegLastDate").value = event.registrationInfo?.lastDate || "";
        document.getElementById("aRegStatus").value = event.registrationInfo?.status || "open";
        document.getElementById("aRegInstructions").value = event.registrationInfo?.instructions || "";

        // Rules
        const rulesList = document.getElementById("aRulesList");
        if (rulesList) {
            rulesList.innerHTML = "";
            if (event.rules && event.rules.length > 0) {
                event.rules.forEach(r => addAdminRuleField(r));
            } else {
                addAdminRuleField();
            }
        }

        // Coordinator info
        document.getElementById("aCoordName").value = event.coordinator?.name || "";
        document.getElementById("aCoordPhone").value = event.coordinator?.phone || "";
        document.getElementById("aCoordEmail").value = event.coordinator?.email || "";

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        alert("Failed to load event data: " + error.message);
    }
}

// Admin Event Form Submission Handler
const adminEventForm = document.getElementById("adminEventForm");
if (adminEventForm) {
    adminEventForm.addEventListener("submit", async e => {
        e.preventDefault();
        clearAlerts();

        const editId = document.getElementById("adminEditEventId")?.value;
        const isEditing = Boolean(editId);

        // Collect rules
        const ruleInputs = document.querySelectorAll("#aRulesList .rule-input");
        const rules = Array.from(ruleInputs)
            .map(input => input.value.trim())
            .filter(Boolean);

        const eventData = {
            name: document.getElementById("aEventName").value.trim(),
            category: document.getElementById("aCategory").value,
            description: document.getElementById("aDescription").value.trim(),
            bannerUrl: document.getElementById("aBannerUrl").value.trim(),
            eventDate: document.getElementById("aEventDate").value,
            eventDay: document.getElementById("aCalculatedDay").value || getDayOfWeek(document.getElementById("aEventDate").value),
            venue: document.getElementById("aVenue").value.trim(),
            reportingTime: document.getElementById("aReportingTime").value.trim(),
            startTime: document.getElementById("aStartTime").value.trim(),
            endTime: document.getElementById("aEndTime").value.trim(),
            schedule: {
                morningBreak: document.getElementById("aMorningBreak").value.trim(),
                lunchBreak: document.getElementById("aLunchBreak").value.trim(),
                eveningBreak: document.getElementById("aEveningBreak").value.trim(),
                otherBreaks: document.getElementById("aOtherBreaks").value.trim()
            },
            food: {
                breakfast: document.getElementById("aFoodBreakfast").checked,
                lunch: document.getElementById("aFoodLunch").checked,
                snacks: document.getElementById("aFoodSnacks").checked,
                details: document.getElementById("aFoodDetails").value.trim()
            },
            participation: {
                participationType: document.getElementById("aParticipationType").value,
                minTeamSize: parseInt(document.getElementById("aMinTeamSize").value, 10) || 2,
                maxTeamSize: parseInt(document.getElementById("aMaxTeamSize").value, 10) || 4,
                interDeptAllowed: document.getElementById("aInterDeptAllowed").checked,
                interCollegeAllowed: document.getElementById("aInterCollegeAllowed").checked,
                restrictions: document.getElementById("aRestrictions").value.trim()
            },
            fee: {
                amount: parseFloat(document.getElementById("aFeeAmount").value) || 0,
                feeType: document.getElementById("aFeeType").value,
                deadline: document.getElementById("aFeeDeadline").value,
                instructions: document.getElementById("aPaymentInstructions").value.trim()
            },
            registrationInfo: {
                startDate: document.getElementById("aRegStartDate").value,
                lastDate: document.getElementById("aRegLastDate").value,
                status: document.getElementById("aRegStatus").value,
                instructions: document.getElementById("aRegInstructions").value.trim()
            },
            rules,
            coordinator: {
                name: document.getElementById("aCoordName").value.trim(),
                phone: document.getElementById("aCoordPhone").value.trim(),
                email: document.getElementById("aCoordEmail").value.trim()
            }
        };

        try {
            let result;
            if (isEditing) {
                result = await apiRequest(`/events/${editId}`, {
                    method: "PUT",
                    body: JSON.stringify(eventData)
                });
            } else {
                result = await apiRequest("/events", {
                    method: "POST",
                    body: JSON.stringify(eventData)
                });
            }

            showAlert("adminFormAlert", result.message || "Event saved successfully!", "success");

            setTimeout(() => {
                resetAdminForm();
                switchAdminTab("events");
            }, 1000);

        } catch (error) {
            showAlert("adminFormAlert", error.message, "danger");
        }
    });
}

// --------------------------------------------------
// HTML ESCAPING
// --------------------------------------------------
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[char];
    });
}

// --------------------------------------------------
// APP INITIALIZATION
// --------------------------------------------------
function initializeApp() {
    if (!token || !currentUser) {
        showScreen("loginSelection");
        return;
    }

    if (currentUser.role === "student") {
        showStudentDashboard();
    } else if (currentUser.role === "coordinator") {
        showCoordinatorDashboard();
    } else if (currentUser.role === "admin") {
        showAdminDashboard();
    } else {
        logout();
    }
}

// Run on page load
initializeApp();

// --------------------------------------------------
// GLOBAL WINDOW EXPORTS (For HTML onclick handlers & Bundled Mode)
// --------------------------------------------------
if (typeof window !== "undefined") {
    Object.assign(window, {
        showLogin,
        showRegister,
        backToSelection,
        logout,
        switchStudentTab,
        loadMyRegistrations,
        backToEventsList,
        viewEventDetails,
        openRegistrationModal,
        closeRegistrationModal,
        addTeamMemberField,
        removeTeamMemberField,
        switchCoordTab,
        loadCoordinatorRegistrations,
        editCoordinatorEvent,
        setEventStatus,
        deleteCoordinatorEvent,
        resetCoordinatorForm,
        addRuleField,
        removeRuleField,
        switchAdminTab,
        loadAdminDashboard,
        loadAdminRegistrations,
        loadAdminStudents,
        loadAdminEvents,
        resetAdminForm,
        addAdminRuleField,
        removeAdminRuleField,
        editAdminEvent,
        deleteAdminRegistration,
        toggleStudentStatus,
        escapeHTML,
        initializeApp
    });
}
