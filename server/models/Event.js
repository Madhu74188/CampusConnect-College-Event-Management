const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            trim: true,
            enum: [
                "Technical",
                "Cultural",
                "Sports",
                "Workshop",
                "Seminar",
                "Hackathon",
                "Management",
                "Other"
            ],
            default: "Technical"
        },
        bannerUrl: {
            type: String,
            default: ""
        },
        eventDate: {
            type: String,
            required: true,
            trim: true
        },
        eventDay: {
            type: String,
            required: true,
            trim: true
        },
        startTime: {
            type: String,
            required: true,
            trim: true
        },
        endTime: {
            type: String,
            required: true,
            trim: true
        },
        reportingTime: {
            type: String,
            default: "",
            trim: true
        },
        venue: {
            type: String,
            required: true,
            trim: true
        },
        schedule: {
            morningBreak: { type: String, default: "" },
            lunchBreak: { type: String, default: "" },
            eveningBreak: { type: String, default: "" },
            otherBreaks: { type: String, default: "" }
        },
        food: {
            breakfast: { type: Boolean, default: false },
            lunch: { type: Boolean, default: false },
            snacks: { type: Boolean, default: false },
            details: { type: String, default: "" }
        },
        participation: {
            participationType: {
                type: String,
                enum: ["both", "individual", "team"],
                default: "both"
            },
            allowIndividual: { type: Boolean, default: true },
            allowTeam: { type: Boolean, default: true },
            minTeamSize: { type: Number, default: 2, min: 2 },
            maxTeamSize: { type: Number, default: 4, min: 2 },
            interDeptAllowed: { type: Boolean, default: true },
            interCollegeAllowed: { type: Boolean, default: false },
            restrictions: { type: String, default: "" }
        },
        fee: {
            amount: { type: Number, default: 0, min: 0 },
            feeType: {
                type: String,
                enum: ["per_person", "per_team"],
                default: "per_person"
            },
            instructions: { type: String, default: "" },
            deadline: { type: String, default: "" }
        },
        registrationInfo: {
            startDate: { type: String, default: "" },
            lastDate: { type: String, default: "" },
            instructions: { type: String, default: "" },
            status: {
                type: String,
                enum: ["open", "closed", "completed"],
                default: "open"
            }
        },
        rules: [
            {
                type: String,
                trim: true
            }
        ],
        coordinator: {
            name: { type: String, default: "" },
            phone: { type: String, default: "" },
            email: { type: String, default: "" }
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Helper function to calculate day of week from date string (YYYY-MM-DD)
eventSchema.statics.calculateDayOfWeek = function (dateString) {
    if (!dateString) return "";
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];
    // Splitting to avoid timezone shift
    const parts = dateString.split("-");
    if (parts.length === 3) {
        const dateObj = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );
        if (!isNaN(dateObj.getTime())) {
            return days[dateObj.getDay()];
        }
    }
    const d = new Date(dateString);
    return !isNaN(d.getTime()) ? days[d.getDay()] : "";
};

module.exports = mongoose.model("Event", eventSchema);
