const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendWelcomeEmail } = require("../utils/emailService");

const router = express.Router();

// Helper to generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// Student Registration
// Supports both /student/register and /register
const handleStudentRegister = async (req, res) => {
    try {
        const { name, email, password, registerNumber, department } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Full Name is required" });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: "Email is required" });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }
        if (!registerNumber || !registerNumber.trim()) {
            return res.status(400).json({ message: "Register Number is required" });
        }
        if (!department || !department.trim()) {
            return res.status(400).json({ message: "Department is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRegNo = registerNumber.trim();

        // Check duplicate email
        const existingUserByEmail = await User.findOne({ email: normalizedEmail });
        if (existingUserByEmail) {
            return res.status(409).json({
                message: "An account with this email address already exists"
            });
        }

        // Check duplicate register number among students
        const existingUserByReg = await User.findOne({
            registerNumber: { $regex: new RegExp(`^${normalizedRegNo}$`, "i") },
            role: "student"
        });
        if (existingUserByReg) {
            return res.status(409).json({
                message: "An account with this register number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            registerNumber: normalizedRegNo,
            department: department.trim(),
            isActive: true
        });

        const token = generateToken(newStudent);

        // Non-blocking welcome email dispatch
        sendWelcomeEmail({ student: newStudent }).catch(err => {
            console.error("Non-blocking welcome email error:", err.message);
        });

        res.status(201).json({
            message: `Account created successfully! A confirmation message has been dispatched to ${newStudent.email}.`,
            token,
            role: newStudent.role,
            name: newStudent.name,
            email: newStudent.email,
            registerNumber: newStudent.registerNumber,
            department: newStudent.department
        });
    } catch (error) {
        console.error("Student registration error:", error);
        res.status(500).json({
            message: "Server error during registration. Please try again."
        });
    }
};

router.post("/student/register", handleStudentRegister);
router.post("/register", handleStudentRegister);

// Login for all roles (Student, Coordinator, Admin)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ message: "Email is required" });
        }
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account has been deactivated. Please contact administrator."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        res.json({
            message: "Login successful!",
            token,
            role: user.role,
            name: user.name,
            email: user.email,
            registerNumber: user.registerNumber || "",
            department: user.department || ""
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Server error during login. Please try again."
        });
    }
});

// Get current logged-in user profile
router.get("/me", verifyToken, async (req, res) => {
    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        registerNumber: req.user.registerNumber,
        department: req.user.department
    });
});

module.exports = router;
