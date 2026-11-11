
const dns = require("dns");

// MongoDB Atlas DNS fix
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const User = require("./models/User");
const Event = require("./models/Event");
const Registration = require("./models/Registration");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { verifyToken, allowRoles } = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
const clientPath = path.join(__dirname, "../client");
app.use(express.static(clientPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/register", registrationRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);

// My Registrations Route
app.get(
    "/api/my-registrations",
    verifyToken,
    allowRoles("student"),
    async (req, res) => {
        try {
            const studentId = req.user._id;
            const studentReg = req.user.registerNumber || "";

            const query = {
                $or: [
                    { student: studentId },
                    ...(studentReg
                        ? [{ registerNumber: studentReg }]
                        : []),
                    ...(studentReg
                        ? [{ "teamMembers.registerNumber": studentReg }]
                        : [])
                ]
            };

            const registrations = await Registration.find(query)
                .populate("event")
                .sort({ createdAt: -1 });

            res.json(registrations);

        } catch (error) {
            console.error("My registrations error:", error);

            res.status(500).json({
                message: "Unable to load registrations"
            });
        }
    }
);

// API Health Check
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        service: "CampusConnect College Event Management API",
        timestamp: new Date().toISOString()
    });
});

// Initial Database Seeder
async function seedInitialData() {
    try {

        // 1. Seed Default Admin
        const adminEmail =
            process.env.DEFAULT_ADMIN_EMAIL || "admin@college.com";

        const existingAdmin = await User.findOne({
            email: adminEmail
        });

        if (!existingAdmin) {
            const adminPassword =
                process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

            const hashedPassword = await bcrypt.hash(
                adminPassword,
                10
            );

            await User.create({
                name: "CampusConnect Administrator",
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
                department: "Administration",
                isActive: true
            });

            console.log(
                `[Seed] Default Admin account created (${adminEmail})`
            );
        }

        // 2. Seed Default Coordinator
        const coordEmail =
            process.env.DEFAULT_COORD_EMAIL ||
            "coordinator@college.com";

        const existingCoord = await User.findOne({
            email: coordEmail
        });

        if (!existingCoord) {
            const coordPassword =
                process.env.DEFAULT_COORD_PASSWORD ||
                "Coordinator@123";

            const hashedPassword = await bcrypt.hash(
                coordPassword,
                10
            );

            await User.create({
                name: "Prof. Rajesh Kumar",
                email: coordEmail,
                password: hashedPassword,
                role: "coordinator",
                department: "Information Technology",
                isActive: true
            });

            console.log(
                `[Seed] Default Coordinator account created (${coordEmail})`
            );
        }

        // 3. Seed Sample Events
        const eventCount = await Event.countDocuments();

        if (eventCount === 0) {
            console.log(
                "[Seed] Populating MongoDB with initial college events..."
            );

            const sampleEvents = [
                {
                    name: "InnovateX Technical Symposium",
                    description:
                        "Annual national level technical symposium showcasing student innovations, technical paper presentations, circuit debugging, and tech quizzes.",
                    category: "Technical",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-11-15",
                    eventDay: "Sunday",
                    startTime: "09:30 AM",
                    endTime: "04:30 PM",
                    reportingTime: "08:45 AM",
                    venue: "APJ Abdul Kalam Auditorium, Main Block",
                    schedule: {
                        morningBreak: "11:00 AM - 11:15 AM",
                        lunchBreak: "01:00 PM - 02:00 PM",
                        eveningBreak: "03:30 PM - 03:45 PM",
                        otherBreaks: "Valedictory from 04:00 PM"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details:
                            "Welcome breakfast (Idli/Vada, Coffee), South Indian Vegetarian Feast for Lunch, and Tea with snacks in the evening."
                    },
                    participation: {
                        participationType: "both",
                        allowIndividual: true,
                        allowTeam: true,
                        minTeamSize: 2,
                        maxTeamSize: 4,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions:
                            "All participants must wear their valid College ID card and formal attire."
                    },
                    fee: {
                        amount: 150,
                        feeType: "per_person",
                        instructions:
                            "Pay online via GPay/PhonePe to 9876543210@upi or pay in cash at the registration desk on arrival.",
                        deadline: "2026-11-14"
                    },
                    registrationInfo: {
                        startDate: "2026-10-01",
                        lastDate: "2026-11-14",
                        instructions:
                            "Early registrations receive symposium kits. Certificates will be awarded to all participants.",
                        status: "open"
                    },
                    rules: [
                        "Participants must report at the reception desk before 08:45 AM for verification.",
                        "Teams can comprise 2 to 4 members from any department.",
                        "Participants should bring their own laptops with necessary presentation files.",
                        "Plagiarism or misconduct will lead to immediate disqualification.",
                        "Judges' decision will be final and binding."
                    ],
                    coordinator: {
                        name: "Dr. K. Senthil Nathan",
                        phone: "+91 98765 43210",
                        email: "senthilnathan@college.edu"
                    }
                },

                {
                    name: "HackSprint 24H Hackathon",
                    description:
                        "An intensive 24-hour hackathon where student developers solve real-world industry challenges in AI, Web3, and HealthTech.",
                    category: "Hackathon",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-11-20",
                    eventDay: "Friday",
                    startTime: "10:00 AM",
                    endTime: "10:00 AM (Next Day)",
                    reportingTime: "09:00 AM",
                    venue: "High Performance Computing Lab, CS Block",
                    schedule: {
                        morningBreak: "11:30 AM - 11:45 AM",
                        lunchBreak: "01:30 PM - 02:30 PM",
                        eveningBreak: "06:00 PM - 06:30 PM",
                        otherBreaks:
                            "Midnight Snacks & Mentorship round at 12:00 AM"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details:
                            "Full catering provided: Breakfast, Lunch, Dinner, Midnight Refreshments and Next-day Breakfast."
                    },
                    participation: {
                        participationType: "team",
                        allowIndividual: false,
                        allowTeam: true,
                        minTeamSize: 3,
                        maxTeamSize: 4,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions:
                            "Team members must be undergraduate or postgraduate engineering students."
                    },
                    fee: {
                        amount: 600,
                        feeType: "per_team",
                        instructions:
                            "Flat ₹600 per team. Payment link will be verified upon entry at the venue.",
                        deadline: "2026-11-18"
                    },
                    registrationInfo: {
                        startDate: "2026-10-15",
                        lastDate: "2026-11-18",
                        instructions:
                            "Submit your team Github handle and project theme idea during check-in.",
                        status: "open"
                    },
                    rules: [
                        "All code must be written during the hackathon hours. Pre-built code is strictly prohibited.",
                        "Open-source libraries and public APIs are permitted.",
                        "Teams must commit work regularly to the designated GitHub repository.",
                        "Mentors will conduct 3 evaluation checkpoints throughout the 24 hours.",
                        "Top 3 teams will receive cash prizes of ₹25,000, ₹15,000, and ₹10,000 respectively."
                    ],
                    coordinator: {
                        name: "Prof. Priya Ramachandran",
                        phone: "+91 94432 11223",
                        email: "priya.cs@college.edu"
                    }
                },

                {
                    name: "Full-Stack Web Dev Workshop",
                    description:
                        "Hands-on masterclass covering modern web development with Node.js, Express, MongoDB, and modern frontend architecture.",
                    category: "Workshop",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-11-25",
                    eventDay: "Wednesday",
                    startTime: "09:00 AM",
                    endTime: "04:00 PM",
                    reportingTime: "08:30 AM",
                    venue: "Seminar Hall 2, IT Block",
                    schedule: {
                        morningBreak: "11:00 AM - 11:15 AM",
                        lunchBreak: "12:45 PM - 01:45 PM",
                        eveningBreak: "03:15 PM - 03:30 PM",
                        otherBreaks: "Q&A and Networking from 03:30 PM"
                    },
                    food: {
                        breakfast: false,
                        lunch: true,
                        snacks: true,
                        details:
                            "Complimentary lunch and evening tea with snacks included."
                    },
                    participation: {
                        participationType: "individual",
                        allowIndividual: true,
                        allowTeam: false,
                        minTeamSize: 2,
                        maxTeamSize: 2,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions:
                            "Open to students of all departments. Basic JavaScript knowledge recommended."
                    },
                    fee: {
                        amount: 100,
                        feeType: "per_person",
                        instructions:
                            "UPI payment to workshop coordinator on arrival or pre-registration desk.",
                        deadline: "2026-11-24"
                    },
                    registrationInfo: {
                        startDate: "2026-10-20",
                        lastDate: "2026-11-24",
                        instructions:
                            "Bring your laptop with Node.js and VS Code installed.",
                        status: "open"
                    },
                    rules: [
                        "Seats are strictly limited to 60 students on first-come, first-served basis.",
                        "Bring your laptop with charger and required tools installed.",
                        "Course materials and Github repository access will be shared during the session.",
                        "E-Certificates will be issued to participants who complete the final mini-project."
                    ],
                    coordinator: {
                        name: "Mr. Vignesh Anand",
                        phone: "+91 97890 55443",
                        email: "vignesh.it@college.edu"
                    }
                },

                {
                    name: "Tarangini Cultural Fest",
                    description:
                        "The grand annual cultural extravaganza featuring group dance, solo singing, battle of the bands, and theatrical drama.",
                    category: "Cultural",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-12-05",
                    eventDay: "Saturday",
                    startTime: "10:00 AM",
                    endTime: "07:00 PM",
                    reportingTime: "09:00 AM",
                    venue: "Open Air Theatre & College Ground",
                    schedule: {
                        morningBreak: "11:30 AM - 11:45 AM",
                        lunchBreak: "01:00 PM - 02:00 PM",
                        eveningBreak: "04:30 PM - 04:45 PM",
                        otherBreaks:
                            "Celebrity Performance from 05:00 PM"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details:
                            "Food coupons provided for festival food stalls, beverage counters, and lunch."
                    },
                    participation: {
                        participationType: "both",
                        allowIndividual: true,
                        allowTeam: true,
                        minTeamSize: 2,
                        maxTeamSize: 8,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions:
                            "Performance audio tracks must be submitted in MP3 format 1 day in advance."
                    },
                    fee: {
                        amount: 0,
                        feeType: "per_person",
                        instructions:
                            "Free entry for all registered college students.",
                        deadline: "2026-12-03"
                    },
                    registrationInfo: {
                        startDate: "2026-11-01",
                        lastDate: "2026-12-03",
                        instructions:
                            "Carry your college ID card for free entry badge.",
                        status: "open"
                    },
                    rules: [
                        "Vulgarity, offensive lyrics, or provocative gestures will result in immediate disqualification.",
                        "Performance time limit: Solo 4 minutes, Group 8 minutes.",
                        "Props must be arranged and cleared by the participating team.",
                        "Judges' scoring criteria includes stage presence, rhythm, costume, and synchronization."
                    ],
                    coordinator: {
                        name: "Mrs. Revathi Sundaram",
                        phone: "+91 98410 77889",
                        email: "cultural@college.edu"
                    }
                },

                {
                    name: "RoboCombat & Line Follower Championship",
                    description:
                        "Battle bots arena and autonomous line follower robotics competition challenging engineering students in mechanical design and embedded control.",
                    category: "Technical",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-12-12",
                    eventDay: "Saturday",
                    startTime: "09:30 AM",
                    endTime: "04:30 PM",
                    reportingTime: "08:30 AM",
                    venue: "Mechanical Arena, Workshop Complex",
                    schedule: {
                        morningBreak: "11:00 AM - 11:15 AM",
                        lunchBreak: "01:00 PM - 02:00 PM",
                        eveningBreak: "03:30 PM - 03:45 PM",
                        otherBreaks: "Final Battle at 03:45 PM"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details:
                            "Breakfast, Lunch, and Evening Snacks provided for all registered participants."
                    },
                    participation: {
                        participationType: "team",
                        allowIndividual: false,
                        allowTeam: true,
                        minTeamSize: 2,
                        maxTeamSize: 4,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions:
                            "Bot weight must not exceed 15 kg for RoboCombat. Wireless controllers only."
                    },
                    fee: {
                        amount: 400,
                        feeType: "per_team",
                        instructions:
                            "Pay ₹400 per team at the arena registration desk during safety inspection.",
                        deadline: "2026-12-10"
                    },
                    registrationInfo: {
                        startDate: "2026-11-05",
                        lastDate: "2026-12-10",
                        instructions:
                            "Bot safety verification and dimension check takes place at 08:30 AM.",
                        status: "open"
                    },
                    rules: [
                        "Bot dimensions must adhere strictly to 45cm x 45cm x 45cm max bounds.",
                        "Dangerous chemicals, liquid fuels, or electrical jamming devices are strictly prohibited.",
                        "Match duration is 3 minutes in standard arena.",
                        "Points awarded for aggression, damage, and control."
                    ],
                    coordinator: {
                        name: "Dr. A. Murugesan",
                        phone: "+91 94441 23456",
                        email: "robotics@college.edu"
                    }
                },

                {
                    name: "Inter-Department Sports League",
                    description:
                        "Annual intra-collegiate tournament featuring Cricket, Football, Volleyball, Badminton, and Table Tennis competitions.",
                    category: "Sports",
                    bannerUrl:
                        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80",
                    eventDate: "2026-12-18",
                    eventDay: "Friday",
                    startTime: "08:00 AM",
                    endTime: "05:00 PM",
                    reportingTime: "07:30 AM",
                    venue: "Main Athletic Stadium & Indoor Sports Complex",
                    schedule: {
                        morningBreak: "10:30 AM - 10:45 AM",
                        lunchBreak: "12:30 PM - 01:30 PM",
                        eveningBreak: "03:30 PM - 03:45 PM",
                        otherBreaks: "Trophy Ceremony at 04:30 PM"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details:
                            "Energy drinks, glucose, healthy lunch and refreshments provided for athletes."
                    },
                    participation: {
                        participationType: "both",
                        allowIndividual: true,
                        allowTeam: true,
                        minTeamSize: 2,
                        maxTeamSize: 6,
                        interDeptAllowed: false,
                        interCollegeAllowed: false,
                        restrictions:
                            "Students can represent only their respective academic department."
                    },
                    fee: {
                        amount: 0,
                        feeType: "per_person",
                        instructions:
                            "Free participation sponsored by College Sports Council.",
                        deadline: "2026-12-15"
                    },
                    registrationInfo: {
                        startDate: "2026-11-10",
                        lastDate: "2026-12-15",
                        instructions:
                            "Team list must be endorsed by the respective Department Sports Representative.",
                        status: "open"
                    },
                    rules: [
                        "Players must wear proper departmental sports jerseys and non-marking shoes for indoor games.",
                        "Referee / umpire decisions are absolute and final.",
                        "Unsportsmanlike conduct will result in match forfeiture.",
                        "First-aid medical team and ambulance available on standby."
                    ],
                    coordinator: {
                        name: "Mr. S. Daniel",
                        phone: "+91 98400 99887",
                        email: "sports@college.edu"
                    }
                }
            ];

            for (const item of sampleEvents) {
                item.eventDay = Event.calculateDayOfWeek(
                    item.eventDate
                );

                await Event.create(item);
            }

            console.log(
                `[Seed] Seeded ${sampleEvents.length} events into MongoDB.`
            );
        }

    } catch (seedErr) {
        console.error(
            "[Seed] Error during seeding:",
            seedErr.message
        );
    }
}

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/collegeEvents";

async function startServer() {
    try {
        console.log("Connecting to MongoDB...");

        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000
        });

        console.log("MongoDB Connected Successfully!");

        await seedInitialData();

        app.listen(PORT, () => {
            console.log("====================================================");
            console.log(" CampusConnect Server Started Successfully");
            console.log(` Server URL: http://localhost:${PORT}`);
            console.log(` API URL: http://localhost:${PORT}/api`);
            console.log("====================================================");
        });

    } catch (error) {
        console.error("MongoDB connection failed!");
        console.error("Error Code:", error.code || "Unknown");
        console.error("Error Message:", error.message);

        process.exit(1);
    }
}

startServer();
