const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            default: null
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        registerNumber: {
            type: String,
            default: "",
            trim: true
        },
        department: {
            type: String,
            default: "",
            trim: true
        },
        eventName: {
            type: String,
            required: true,
            trim: true
        },
        registrationType: {
            type: String,
            enum: ["individual", "team"],
            default: "individual"
        },
        teamName: {
            type: String,
            default: "",
            trim: true
        },
        teamMembers: [
            {
                name: { type: String, trim: true },
                registerNumber: { type: String, trim: true },
                department: { type: String, trim: true }
            }
        ],
        feeAmount: {
            type: Number,
            default: 0
        },
        feeType: {
            type: String,
            enum: ["per_person", "per_team", "free"],
            default: "per_person"
        },
        totalFee: {
            type: Number,
            default: 0
        },
        paymentInstructions: {
            type: String,
            default: ""
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "not_applicable"],
            default: "pending"
        },
        status: {
            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Registration", registrationSchema);
