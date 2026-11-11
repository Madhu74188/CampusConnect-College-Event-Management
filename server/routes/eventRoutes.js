const express = require("express");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// Helper to determine if registration is active
function getEffectiveStatus(event) {
    if (event.registrationInfo && event.registrationInfo.status) {
        if (event.registrationInfo.status === "closed" || event.registrationInfo.status === "completed") {
            return event.registrationInfo.status;
        }
    }
    if (event.registrationInfo && event.registrationInfo.lastDate) {
        const today = new Date().toISOString().split("T")[0];
        if (event.registrationInfo.lastDate < today) {
            return "closed";
        }
    }
    return "open";
}

// GET /api/events - List all events (public / authenticated)
router.get("/", async (req, res) => {
    try {
        const { category, search, status } = req.query;
        const query = {};

        if (category && category !== "All") {
            query.category = category;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [{ name: regex }, { venue: regex }, { description: regex }];
        }

        if (status) {
            query["registrationInfo.status"] = status;
        }

        const events = await Event.find(query).sort({ eventDate: 1, createdAt: -1 });

        // Add effective registration status and ensure eventDay is present
        const eventsWithStatus = events.map(ev => {
            const doc = ev.toObject();
            doc.effectiveStatus = getEffectiveStatus(ev);
            if (!doc.eventDay && doc.eventDate) {
                doc.eventDay = Event.calculateDayOfWeek(doc.eventDate);
            }
            return doc;
        });

        res.json(eventsWithStatus);
    } catch (error) {
        console.error("Fetch events error:", error);
        res.status(500).json({ message: "Unable to load events" });
    }
});

// GET /api/events/:id - Get complete details of a single event
router.get("/:id", async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const doc = event.toObject();
        doc.effectiveStatus = getEffectiveStatus(event);
        if (!doc.eventDay && doc.eventDate) {
            doc.eventDay = Event.calculateDayOfWeek(doc.eventDate);
        }

        res.json(doc);
    } catch (error) {
        console.error("Fetch event details error:", error);
        res.status(500).json({ message: "Unable to load event details" });
    }
});

// POST /api/events - Create new event (Coordinator or Admin)
router.post("/", verifyToken, allowRoles("coordinator", "admin"), async (req, res) => {
    try {
        const data = req.body;

        if (!data.name || !data.name.trim()) {
            return res.status(400).json({ message: "Event Name is required" });
        }
        if (!data.description || !data.description.trim()) {
            return res.status(400).json({ message: "Event Description is required" });
        }
        if (!data.eventDate) {
            return res.status(400).json({ message: "Event Date is required" });
        }
        if (!data.startTime) {
            return res.status(400).json({ message: "Start Time is required" });
        }
        if (!data.endTime) {
            return res.status(400).json({ message: "End Time is required" });
        }
        if (!data.venue || !data.venue.trim()) {
            return res.status(400).json({ message: "Venue is required" });
        }

        // Auto-calculate event day from date
        const calculatedDay = Event.calculateDayOfWeek(data.eventDate);

        // Normalize participation settings
        const participation = data.participation || {};
        const participationType = participation.participationType || "both";
        const allowIndividual =
            participationType === "individual" || participationType === "both";
        const allowTeam =
            participationType === "team" || participationType === "both";

        const minTeamSize = Math.max(2, parseInt(participation.minTeamSize, 10) || 2);
        const maxTeamSize = Math.max(minTeamSize, parseInt(participation.maxTeamSize, 10) || 4);

        // Normalize fee
        const fee = data.fee || {};
        const feeAmount = Math.max(0, parseFloat(fee.amount) || 0);
        const feeType = fee.feeType === "per_team" ? "per_team" : "per_person";

        // Clean rules array
        let rules = [];
        if (Array.isArray(data.rules)) {
            rules = data.rules.map(r => String(r).trim()).filter(Boolean);
        } else if (typeof data.rules === "string") {
            rules = data.rules.split("\n").map(r => r.trim()).filter(Boolean);
        }

        const newEvent = await Event.create({
            name: data.name.trim(),
            description: data.description.trim(),
            category: data.category || "Technical",
            bannerUrl: data.bannerUrl || "",
            eventDate: data.eventDate,
            eventDay: calculatedDay,
            startTime: data.startTime,
            endTime: data.endTime,
            reportingTime: data.reportingTime || "",
            venue: data.venue.trim(),
            schedule: {
                morningBreak: data.schedule?.morningBreak || "",
                lunchBreak: data.schedule?.lunchBreak || "",
                eveningBreak: data.schedule?.eveningBreak || "",
                otherBreaks: data.schedule?.otherBreaks || ""
            },
            food: {
                breakfast: Boolean(data.food?.breakfast),
                lunch: Boolean(data.food?.lunch),
                snacks: Boolean(data.food?.snacks),
                details: data.food?.details || ""
            },
            participation: {
                participationType,
                allowIndividual,
                allowTeam,
                minTeamSize,
                maxTeamSize,
                interDeptAllowed: data.participation?.interDeptAllowed !== false,
                interCollegeAllowed: Boolean(data.participation?.interCollegeAllowed),
                restrictions: data.participation?.restrictions || ""
            },
            fee: {
                amount: feeAmount,
                feeType,
                instructions: fee.instructions || "",
                deadline: fee.deadline || ""
            },
            registrationInfo: {
                startDate: data.registrationInfo?.startDate || "",
                lastDate: data.registrationInfo?.lastDate || "",
                instructions: data.registrationInfo?.instructions || "",
                status: data.registrationInfo?.status || "open"
            },
            rules,
            coordinator: {
                name: data.coordinator?.name || req.user.name,
                phone: data.coordinator?.phone || "",
                email: data.coordinator?.email || req.user.email
            },
            createdBy: req.user._id
        });

        res.status(201).json({
            message: "Event created successfully!",
            event: newEvent
        });
    } catch (error) {
        console.error("Create event error:", error);
        res.status(500).json({ message: "Failed to create event" });
    }
});

// PUT /api/events/:id - Update complete event details (Coordinator or Admin)
router.put("/:id", verifyToken, allowRoles("coordinator", "admin"), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        const data = req.body;
        const calculatedDay = data.eventDate
            ? Event.calculateDayOfWeek(data.eventDate)
            : event.eventDay;

        const participation = data.participation || {};
        const participationType = participation.participationType || event.participation.participationType;
        const allowIndividual =
            participationType === "individual" || participationType === "both";
        const allowTeam =
            participationType === "team" || participationType === "both";

        const minTeamSize = Math.max(2, parseInt(participation.minTeamSize, 10) || event.participation.minTeamSize);
        const maxTeamSize = Math.max(minTeamSize, parseInt(participation.maxTeamSize, 10) || event.participation.maxTeamSize);

        const fee = data.fee || {};
        const feeAmount = fee.amount !== undefined ? Math.max(0, parseFloat(fee.amount) || 0) : event.fee.amount;
        const feeType = fee.feeType === "per_team" ? "per_team" : (fee.feeType === "per_person" ? "per_person" : event.fee.feeType);

        let rules = event.rules;
        if (Array.isArray(data.rules)) {
            rules = data.rules.map(r => String(r).trim()).filter(Boolean);
        } else if (typeof data.rules === "string") {
            rules = data.rules.split("\n").map(r => r.trim()).filter(Boolean);
        }

        event.name = data.name !== undefined ? data.name.trim() : event.name;
        event.description = data.description !== undefined ? data.description.trim() : event.description;
        event.category = data.category || event.category;
        event.bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl : event.bannerUrl;
        event.eventDate = data.eventDate || event.eventDate;
        event.eventDay = calculatedDay;
        event.startTime = data.startTime || event.startTime;
        event.endTime = data.endTime || event.endTime;
        event.reportingTime = data.reportingTime !== undefined ? data.reportingTime : event.reportingTime;
        event.venue = data.venue !== undefined ? data.venue.trim() : event.venue;

        event.schedule = {
            morningBreak: data.schedule?.morningBreak !== undefined ? data.schedule.morningBreak : event.schedule?.morningBreak,
            lunchBreak: data.schedule?.lunchBreak !== undefined ? data.schedule.lunchBreak : event.schedule?.lunchBreak,
            eveningBreak: data.schedule?.eveningBreak !== undefined ? data.schedule.eveningBreak : event.schedule?.eveningBreak,
            otherBreaks: data.schedule?.otherBreaks !== undefined ? data.schedule.otherBreaks : event.schedule?.otherBreaks
        };

        event.food = {
            breakfast: data.food?.breakfast !== undefined ? Boolean(data.food.breakfast) : event.food?.breakfast,
            lunch: data.food?.lunch !== undefined ? Boolean(data.food.lunch) : event.food?.lunch,
            snacks: data.food?.snacks !== undefined ? Boolean(data.food.snacks) : event.food?.snacks,
            details: data.food?.details !== undefined ? data.food.details : event.food?.details
        };

        event.participation = {
            participationType,
            allowIndividual,
            allowTeam,
            minTeamSize,
            maxTeamSize,
            interDeptAllowed: data.participation?.interDeptAllowed !== undefined ? Boolean(data.participation.interDeptAllowed) : event.participation?.interDeptAllowed,
            interCollegeAllowed: data.participation?.interCollegeAllowed !== undefined ? Boolean(data.participation.interCollegeAllowed) : event.participation?.interCollegeAllowed,
            restrictions: data.participation?.restrictions !== undefined ? data.participation.restrictions : event.participation?.restrictions
        };

        event.fee = {
            amount: feeAmount,
            feeType,
            instructions: fee.instructions !== undefined ? fee.instructions : event.fee?.instructions,
            deadline: fee.deadline !== undefined ? fee.deadline : event.fee?.deadline
        };

        event.registrationInfo = {
            startDate: data.registrationInfo?.startDate !== undefined ? data.registrationInfo.startDate : event.registrationInfo?.startDate,
            lastDate: data.registrationInfo?.lastDate !== undefined ? data.registrationInfo.lastDate : event.registrationInfo?.lastDate,
            instructions: data.registrationInfo?.instructions !== undefined ? data.registrationInfo.instructions : event.registrationInfo?.instructions,
            status: data.registrationInfo?.status || event.registrationInfo?.status || "open"
        };

        event.rules = rules;

        if (data.coordinator) {
            event.coordinator = {
                name: data.coordinator.name || event.coordinator.name,
                phone: data.coordinator.phone || event.coordinator.phone,
                email: data.coordinator.email || event.coordinator.email
            };
        }

        await event.save();

        res.json({
            message: "Event updated successfully!",
            event
        });
    } catch (error) {
        console.error("Update event error:", error);
        res.status(500).json({ message: "Failed to update event" });
    }
});

// PATCH /api/events/:id/status - Update registration status (open/closed/completed)
router.patch("/:id/status", verifyToken, allowRoles("coordinator", "admin"), async (req, res) => {
    try {
        const { status } = req.body;
        if (!["open", "closed", "completed"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (!event.registrationInfo) {
            event.registrationInfo = {};
        }
        event.registrationInfo.status = status;
        await event.save();

        res.json({
            message: `Event status updated to ${status}`,
            status: event.registrationInfo.status
        });
    } catch (error) {
        console.error("Change status error:", error);
        res.status(500).json({ message: "Failed to update event status" });
    }
});

// DELETE /api/events/:id - Delete event (Coordinator or Admin)
router.delete("/:id", verifyToken, allowRoles("coordinator", "admin"), async (req, res) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Also delete registrations associated with this event
        await Registration.deleteMany({
            $or: [
                { event: deleted._id },
                { eventName: deleted.name }
            ]
        });

        res.json({ message: "Event and associated registrations deleted successfully" });
    } catch (error) {
        console.error("Delete event error:", error);
        res.status(500).json({ message: "Failed to delete event" });
    }
});

module.exports = router;
