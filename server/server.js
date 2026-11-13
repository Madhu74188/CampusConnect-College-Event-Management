require("dotenv").config();

const dns = require("dns");

// MongoDB Atlas DNS fix
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

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
                    startTime: "09:00 AM",
                    endTime: "09:00 AM",
                    reportingTime: "08:30 AM",
                    venue: "Computer Science Lab",
                    schedule: {
                        morningBreak: "11:00 AM - 11:15 AM",
                        lunchBreak: "01:00 PM - 02:00 PM",
                        eveningBreak: "05:00 PM - 05:15 PM",
                        otherBreaks: "Dinner and overnight refreshments"
                    },
                    food: {
                        breakfast: true,
                        lunch: true,
                        snacks: true,
                        details: "Meals and refreshments will be provided."
                    },
                    participation: {
                        participationType: "team",
                        allowIndividual: false,
                        allowTeam: true,
                        minTeamSize: 2,
                        maxTeamSize: 4,
                        interDeptAllowed: true,
                        interCollegeAllowed: true,
                        restrictions: "Bring your own laptop."
                    },
                    fee: {
                        amount: 600,
                        feeType: "per_team",
                        instructions: "Payment through UPI.",
                        deadline: "2026-11-19"
                    },
                    registrationInfo: {
                        startDate: "2026-10-01",
                        lastDate: "2026-11-19",
                        instructions: "Limited team slots available.",
                        status: "open"
                    },
                    rules: [
                        "Teams must have 2 to 4 members.",
                        "All teams must submit their project before the deadline.",
                        "Plagiarism is strictly prohibited.",
                        "Judges' decision is final."
                    ],
                    coordinator: {
                        name: "Prof. Rajesh Kumar",
                        phone: "+91 98765 43210",
                        email: "coordinator@college.com"
                    }
                }
            ];

            await Event.insertMany(sampleEvents);

            console.log("[Seed] Sample events inserted successfully.");
        }

    } catch (error) {
        console.error("[Seed] Error:", error.message);
    }
}

// Server Configuration
const PORT = process.env.PORT || 5000;

const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/collegeEvents";

// Start Server
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