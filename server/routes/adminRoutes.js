const express = require("express");
const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes here require Admin role
router.use(verifyToken, allowRoles("admin"));

// GET /api/admin/summary - Accurate summary counts & event-wise stats
router.get("/summary", async (req, res) => {
    try {
        const [registrations, events, registeredStudentsCount] = await Promise.all([
            Registration.find(),
            Event.find().sort({ eventDate: 1 }),
            User.countDocuments({ role: "student" })
        ]);

        // 1. Calculate unique students across all registrations (leaders + team members)
        const globalUniqueStudents = new Set();

        registrations.forEach(reg => {
            const leaderKey = (reg.registerNumber || reg.email || reg._id.toString()).trim().toLowerCase();
            if (leaderKey) globalUniqueStudents.add(leaderKey);

            if (reg.registrationType === "team" && Array.isArray(reg.teamMembers)) {
                reg.teamMembers.forEach(member => {
                    const memberKey = (member.registerNumber || member.name || "").trim().toLowerCase();
                    if (memberKey) globalUniqueStudents.add(memberKey);
                });
            }
        });

        // Total Students: Max of registered student accounts and unique participant count
        const totalStudents = Math.max(registeredStudentsCount, globalUniqueStudents.size);

        // Total Teams: strictly count registrations with registrationType === "team"
        const totalTeams = registrations.filter(
            reg => reg.registrationType === "team"
        ).length;

        // Total Registrations count
        const totalRegistrations = registrations.length;

        // Total Events count
        const totalEvents = events.length;

        // Event-wise summary calculation
        const eventSummary = events.map(event => {
            const eventRegistrations = registrations.filter(
                reg =>
                    (reg.event && reg.event.toString() === event._id.toString()) ||
                    reg.eventName.trim().toLowerCase() === event.name.trim().toLowerCase()
            );

            let individualCount = 0;
            let teamCount = 0;
            const uniqueEventStudents = new Set();

            eventRegistrations.forEach(reg => {
                if (reg.registrationType === "team") {
                    teamCount += 1;
                } else {
                    individualCount += 1;
                }

                // Add team leader or individual student
                const leaderIdentifier = (reg.registerNumber || reg.email || reg._id.toString()).trim().toLowerCase();
                if (leaderIdentifier) {
                    uniqueEventStudents.add(leaderIdentifier);
                }

                // Add all team members if team registration
                if (reg.registrationType === "team" && Array.isArray(reg.teamMembers)) {
                    reg.teamMembers.forEach(member => {
                        const memberIdentifier = (member.registerNumber || member.name || "").trim().toLowerCase();
                        if (memberIdentifier) {
                            uniqueEventStudents.add(memberIdentifier);
                        }
                    });
                }
            });

            return {
                eventId: event._id,
                eventName: event.name,
                category: event.category,
                eventDate: event.eventDate,
                totalIndividual: individualCount,
                totalTeams: teamCount,
                totalStudents: uniqueEventStudents.size
            };
        });

        res.json({
            totalStudents,
            totalTeams,
            totalEvents,
            totalRegistrations,
            eventSummary
        });
    } catch (error) {
        console.error("Admin summary error:", error);
        res.status(500).json({ message: "Unable to load dashboard summary" });
    }
});

// GET /api/admin/students - List all student accounts
router.get("/students", async (req, res) => {
    try {
        const students = await User.find({ role: "student" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(students);
    } catch (error) {
        console.error("Get students error:", error);
        res.status(500).json({ message: "Unable to load students list" });
    }
});

// PATCH /api/admin/students/:id/status - Toggle student account active state
router.patch("/students/:id/status", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== "student") {
            return res.status(404).json({ message: "Student account not found" });
        }

        user.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;
        await user.save();

        res.json({
            message: `Account has been ${user.isActive ? "activated" : "deactivated"}`,
            isActive: user.isActive
        });
    } catch (error) {
        console.error("Toggle student status error:", error);
        res.status(500).json({ message: "Unable to update student status" });
    }
});

module.exports = router;
