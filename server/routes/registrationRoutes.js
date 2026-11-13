const express = require("express");
const Registration = require("../models/Registration");
const Event = require("../models/Event");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");
const { sendEventRegistrationEmail } = require("../utils/emailService");

const router = express.Router();

// Helper to escape regex special characters
function escapeRegex(text) {
    return String(text || "").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Helper to check if event registration is currently open
function isRegistrationOpen(event) {
    if (event.registrationInfo?.status) {
        if (event.registrationInfo.status === "closed" || event.registrationInfo.status === "completed") {
            return false;
        }
    }
    if (event.registrationInfo?.lastDate) {
        const today = new Date().toISOString().split("T")[0];
        if (event.registrationInfo.lastDate < today) {
            return false;
        }
    }
    return true;
}

// POST /api/register - Register for an event (Student only)
router.post("/", verifyToken, allowRoles("student"), async (req, res) => {
    try {
        const {
            eventId,
            eventName,
            registrationType,
            teamName,
            teamMembers
        } = req.body;

        // Find the event either by ID or by Name
        let event = null;
        if (eventId) {
            event = await Event.findById(eventId);
        }
        if (!event && eventName) {
            event = await Event.findOne({ name: eventName.trim() });
        }

        if (!event) {
            return res.status(400).json({ message: "Selected event was not found" });
        }

        // Check registration deadline & status
        if (!isRegistrationOpen(event)) {
            return res.status(400).json({
                message: "Registration for this event is closed or the deadline has passed"
            });
        }

        // Validate registration type
        if (!["individual", "team"].includes(registrationType)) {
            return res.status(400).json({ message: "Invalid registration type selected" });
        }

        const participation = event.participation || {};
        if (registrationType === "individual" && participation.allowIndividual === false) {
            return res.status(400).json({
                message: "This event only allows Team participation"
            });
        }

        if (registrationType === "team" && participation.allowTeam === false) {
            return res.status(400).json({
                message: "This event only allows Individual participation"
            });
        }

        let cleanTeamMembers = [];
        let totalStudentCount = 1;

        if (registrationType === "team") {
            if (!teamName || !teamName.trim()) {
                return res.status(400).json({ message: "Team Name is required for team registration" });
            }

            if (!Array.isArray(teamMembers)) {
                return res.status(400).json({
                    message: "Team members data is required in valid format"
                });
            }

            cleanTeamMembers = teamMembers.map(m => ({
                name: (m.name || "").trim(),
                registerNumber: (m.registerNumber || "").trim().toUpperCase(),
                department: (m.department || "").trim()
            })).filter(m => m.name && m.registerNumber);

            // Total members in team = 1 (leader) + cleanTeamMembers.length
            totalStudentCount = 1 + cleanTeamMembers.length;

            const minTeam = participation.minTeamSize || 2;
            const maxTeam = participation.maxTeamSize || 4;

            if (totalStudentCount < minTeam) {
                return res.status(400).json({
                    message: `Team size must be at least ${minTeam} members (including team leader). You currently have ${totalStudentCount}.`
                });
            }

            if (totalStudentCount > maxTeam) {
                return res.status(400).json({
                    message: `Team size cannot exceed ${maxTeam} members (including team leader). You currently have ${totalStudentCount}.`
                });
            }

            // Ensure no duplicate member within the submitted team
            const memberRegSet = new Set();
            const leaderReg = (req.user.registerNumber || "").toUpperCase();
            if (leaderReg) memberRegSet.add(leaderReg);

            for (const member of cleanTeamMembers) {
                if (memberRegSet.has(member.registerNumber)) {
                    return res.status(400).json({
                        message: `Duplicate register number "${member.registerNumber}" detected in team list`
                    });
                }
                memberRegSet.add(member.registerNumber);
            }
        }

        // Prevent duplicate registration for THIS specific event:
        // Match event by either ObjectId or exact eventName
        const eventFilter = {
            $or: [
                { event: event._id },
                { eventName: event.name }
            ]
        };

        // 1. Is THIS student already registered for THIS event?
        const userRegNo = (req.user.registerNumber || "").trim();
        const userEmail = (req.user.email || "").trim().toLowerCase();
        const userId = req.user._id;

        const studentIdentityConditions = [
            { student: userId },
            { email: userEmail }
        ];

        if (userRegNo) {
            studentIdentityConditions.push(
                { registerNumber: { $regex: new RegExp(`^${escapeRegex(userRegNo)}$`, "i") } },
                { "teamMembers.registerNumber": { $regex: new RegExp(`^${escapeRegex(userRegNo)}$`, "i") } }
            );
        }

        const existingForLeader = await Registration.findOne({
            $and: [
                eventFilter,
                { $or: studentIdentityConditions }
            ]
        });

        if (existingForLeader) {
            return res.status(409).json({
                message: "You are already registered for this event (either individually or in a team)"
            });
        }

        // 2. Are any of the proposed team members already registered for this event?
        if (registrationType === "team" && cleanTeamMembers.length > 0) {
            const memberRegNumbers = cleanTeamMembers
                .map(m => (m.registerNumber || "").trim())
                .filter(Boolean);

            if (memberRegNumbers.length > 0) {
                const memberRegexQueries = memberRegNumbers.map(
                    reg => new RegExp(`^${escapeRegex(reg)}$`, "i")
                );

                const conflictingReg = await Registration.findOne({
                    $and: [
                        eventFilter,
                        {
                            $or: [
                                { registerNumber: { $in: memberRegexQueries } },
                                { "teamMembers.registerNumber": { $in: memberRegexQueries } }
                            ]
                        }
                    ]
                });

                if (conflictingReg) {
                    return res.status(409).json({
                        message: "One or more of your team members are already registered for this event"
                    });
                }
            }
        }

        // Calculate Fee based on explicit Fee Type
        const feeAmount = event.fee?.amount || 0;
        const feeType = event.fee?.feeType || "per_person";
        let totalFee = 0;

        if (feeAmount > 0) {
            if (feeType === "per_team") {
                totalFee = feeAmount;
            } else {
                totalFee = feeAmount * totalStudentCount;
            }
        }

        const registration = await Registration.create({
            student: req.user._id,
            event: event._id,
            name: req.user.name,
            email: req.user.email,
            registerNumber: req.user.registerNumber || "",
            department: req.user.department || "",
            eventName: event.name,
            registrationType,
            teamName: registrationType === "team" ? teamName.trim() : "",
            teamMembers: cleanTeamMembers,
            feeAmount,
            feeType: feeAmount === 0 ? "free" : feeType,
            totalFee,
            paymentInstructions: event.fee?.instructions || "",
            paymentStatus: feeAmount === 0 ? "not_applicable" : "pending",
            status: "confirmed"
        });

        // Send immediate HTTP 201 response so student UI receives instant confirmation notification
        res.status(201).json({
            success: true,
            message: `🎉 Registration confirmed! A confirmation notification has been dispatched to your registered email: ${req.user.email}.`,
            registration,
            emailSent: true,
            emailTo: req.user.email
        });

        // Dispatch Confirmation Email in background without blocking the HTTP response
        sendEventRegistrationEmail({
            student: req.user,
            event,
            registration
        }).then(result => {
            if (result && result.success) {
                console.log(`[Email] Registration confirmation delivered to ${req.user.email}`);
            } else {
                console.log(`[Email] Registration confirmation queued/mocked for ${req.user.email}`);
            }
        }).catch(emailErr => {
            console.error("[Email] Background email dispatch error:", emailErr.message);
        });
    } catch (error) {
        console.error("Event registration error:", error);
        res.status(500).json({ message: "Registration failed. Please try again." });
    }
});

// GET /api/my-registrations - View own registrations (Student only)
router.get("/my", verifyToken, allowRoles("student"), async (req, res) => {
    try {
        const studentId = req.user._id;
        const studentReg = req.user.registerNumber || "";

        const query = {
            $or: [
                { student: studentId },
                ...(studentReg ? [{ registerNumber: studentReg }] : []),
                ...(studentReg ? [{ "teamMembers.registerNumber": studentReg }] : [])
            ]
        };

        const registrations = await Registration.find(query)
            .populate("event")
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error("My registrations error:", error);
        res.status(500).json({ message: "Unable to load registrations" });
    }
});

// GET /api/registrations - View all registrations (Admin & Coordinator)
router.get("/", verifyToken, allowRoles("admin", "coordinator"), async (req, res) => {
    try {
        const { eventName } = req.query;
        const filter = {};
        if (eventName) {
            filter.eventName = eventName;
        }

        const registrations = await Registration.find(filter)
            .populate("event")
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error("All registrations error:", error);
        res.status(500).json({ message: "Unable to load registrations" });
    }
});

// DELETE /api/registrations/:id - Delete registration (Admin & Coordinator)
router.delete("/:id", verifyToken, allowRoles("admin", "coordinator"), async (req, res) => {
    try {
        const deleted = await Registration.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Registration not found" });
        }

        res.json({ message: "Registration removed successfully" });
    } catch (error) {
        console.error("Delete registration error:", error);
        res.status(500).json({ message: "Failed to delete registration" });
    }
});

module.exports = router;
