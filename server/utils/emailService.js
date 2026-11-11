const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer Transporter
 * Prioritizes custom SMTP / Gmail credentials from environment variables.
 * Falls back to an automatic Ethereal test account or local console logger for development.
 */
let transporter = null;
let isEthereal = false;

async function getTransporter() {
    if (transporter) return transporter;

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = parseInt(process.env.EMAIL_PORT, 10) || 587;

    // 1. If explicit SMTP credentials are provided in .env
    if (emailUser && emailPass && emailUser !== "your_email@gmail.com") {
        if (emailHost) {
            transporter = nodemailer.createTransport({
                host: emailHost,
                port: emailPort,
                secure: emailPort === 465,
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });
        } else {
            // Default to Gmail service
            transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: emailUser,
                    pass: emailPass
                }
            });
        }
        console.log(`[Email] Configured SMTP transporter with user: ${emailUser}`);
        return transporter;
    }

    // 2. Fallback: Create Ethereal test account for local testing
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        isEthereal = true;
        console.log(`[Email] Using Ethereal Test SMTP (${testAccount.user}). Emails can be previewed via generated links.`);
        return transporter;
    } catch (etherealErr) {
        console.warn(`[Email] Could not create Ethereal account: ${etherealErr.message}. Falling back to console logger.`);
        transporter = {
            sendMail: async (mailOptions) => {
                console.log("\n================ [EMAIL CONSOLE PREVIEW] ================");
                console.log(`To: ${mailOptions.to}`);
                console.log(`Subject: ${mailOptions.subject}`);
                console.log(`Text Preview:\n${mailOptions.text ? mailOptions.text.substring(0, 300) : "No text"}...`);
                console.log("=========================================================\n");
                return { messageId: `mock-${Date.now()}` };
            }
        };
        return transporter;
    }
}

/**
 * Send Event Registration Confirmation Email
 */
async function sendEventRegistrationEmail({ student, event, registration }) {
    try {
        const mailClient = await getTransporter();
        const fromAddress = process.env.EMAIL_FROM || `"CampusConnect Events" <${process.env.EMAIL_USER || "events@campusconnect.edu"}>`;
        const toAddress = student.email;

        const isTeam = registration.registrationType === "team";
        const feeAmount = registration.totalFee || 0;
        const feeDisplay = feeAmount > 0 ? `₹${feeAmount} (${registration.feeType || "Standard"})` : "FREE";

        // Team members markup
        let teamMembersHtml = "";
        let teamMembersText = "";
        if (isTeam && registration.teamMembers && registration.teamMembers.length > 0) {
            teamMembersHtml = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-top:12px;">
                    <strong style="color:#0f2b48;">Team Members (${1 + registration.teamMembers.length} Total):</strong>
                    <ul style="margin:8px 0 0; padding-left:20px; color:#334155;">
                        <li><strong>Leader:</strong> ${student.name} (${student.registerNumber || "Reg No N/A"} - ${student.department || "Dept"})</li>
                        ${registration.teamMembers.map(m => `<li>${m.name} (${m.registerNumber} - ${m.department})</li>`).join("")}
                    </ul>
                </div>
            `;
            teamMembersText = `Team Name: ${registration.teamName}\nTeam Members:\n- Leader: ${student.name} (${student.registerNumber})\n` +
                registration.teamMembers.map(m => `- ${m.name} (${m.registerNumber} - ${m.department})`).join("\n") + "\n";
        }

        // Rules markup
        let rulesHtml = "";
        let rulesText = "";
        if (event.rules && event.rules.length > 0) {
            rulesHtml = `
                <div style="margin-top:16px;">
                    <strong style="color:#0f2b48;">Event Rules & Guidelines:</strong>
                    <ol style="margin:8px 0 0; padding-left:20px; color:#475569; font-size:13px; line-height:1.5;">
                        ${event.rules.map(r => `<li style="margin-bottom:4px;">${r}</li>`).join("")}
                    </ol>
                </div>
            `;
            rulesText = "\nEvent Rules:\n" + event.rules.map((r, i) => `${i + 1}. ${r}`).join("\n") + "\n";
        }

        // Food markup
        const food = event.food || {};
        const foodList = [];
        if (food.breakfast) foodList.push("Breakfast");
        if (food.lunch) foodList.push("Lunch");
        if (food.snacks) foodList.push("Snacks & Refreshments");
        const foodTextDisplay = foodList.length > 0 ? foodList.join(", ") : "No meals provided";

        const subject = `Registration Confirmed: ${event.name} | CampusConnect`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background-color:#f8fafc; margin:0; padding:20px; color:#1e293b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:650px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 14px rgba(15,43,72,0.08);">
        
        <!-- HEADER -->
        <tr>
            <td style="background-color:#0f2b48; padding:24px 30px; text-align:left;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td>
                            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px;">CampusConnect</h1>
                            <p style="color:#94a3b8; margin:4px 0 0; font-size:12px;">College Event Management System</p>
                        </td>
                        <td align="right">
                            <span style="background-color:#1a56db; color:#ffffff; font-size:11px; font-weight:700; text-transform:uppercase; padding:4px 10px; border-radius:20px; letter-spacing:0.8px;">CONFIRMED</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- BODY CONTENT -->
        <tr>
            <td style="padding:30px;">
                <p style="font-size:16px; margin:0 0 16px; color:#0f2b48;">Dear <strong>${student.name}</strong>,</p>
                <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px;">
                    Congratulations! Your registration for <strong style="color:#0f2b48;">${event.name}</strong> has been successfully received and recorded in our college event management system.
                </p>

                <!-- EVENT CARD -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:20px;">
                    <tr>
                        <td style="padding:18px;">
                            <h2 style="color:#0f2b48; font-size:18px; margin:0 0 12px; font-weight:700;">${event.name}</h2>
                            <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size:13px; color:#334155;">
                                <tr>
                                    <td width="35%" style="color:#64748b;">Category:</td>
                                    <td><strong>${event.category}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Event Date:</td>
                                    <td><strong>${event.eventDate}</strong> (${event.eventDay || "Scheduled Day"})</td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Timings:</td>
                                    <td><strong>${event.startTime} - ${event.endTime}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Reporting Time:</td>
                                    <td><strong>${event.reportingTime || event.startTime}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Venue:</td>
                                    <td><strong>${event.venue}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Registration Type:</td>
                                    <td><strong>${isTeam ? `Team (${registration.teamName})` : "Individual"}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Registration Fee:</td>
                                    <td><strong style="color:#1a56db;">${feeDisplay}</strong></td>
                                </tr>
                                <tr>
                                    <td style="color:#64748b;">Food Provisions:</td>
                                    <td>${foodTextDisplay}</td>
                                </tr>
                            </table>

                            ${teamMembersHtml}
                        </td>
                    </tr>
                </table>

                <!-- SCHEDULE & BREAKS -->
                <div style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px;">
                    <h3 style="color:#0f2b48; font-size:14px; margin:0 0 10px; text-transform:uppercase; letter-spacing:0.5px;">Schedule & Breaks</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="3" style="font-size:13px; color:#475569;">
                        <tr>
                            <td width="35%">Morning Break:</td>
                            <td><strong>${event.schedule?.morningBreak || "No break"}</strong></td>
                        </tr>
                        <tr>
                            <td>Lunch Break:</td>
                            <td><strong>${event.schedule?.lunchBreak || "No break"}</strong></td>
                        </tr>
                        <tr>
                            <td>Evening Break:</td>
                            <td><strong>${event.schedule?.eveningBreak || "No break"}</strong></td>
                        </tr>
                    </table>
                </div>

                <!-- PAYMENT INSTRUCTIONS -->
                ${registration.totalFee > 0 ? `
                <div style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px; margin-bottom:20px; font-size:13px; color:#1e40af;">
                    <strong>Payment Information:</strong><br>
                    ${registration.paymentInstructions || event.fee?.instructions || "Please complete payment at the event registration desk on arrival."}
                </div>` : ""}

                ${rulesHtml}

                <!-- CONTACT INFO -->
                <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:13px; color:#475569;">
                    <strong style="color:#0f2b48;">Event Coordinator Contact:</strong><br>
                    ${event.coordinator?.name || "College Event Committee"}<br>
                    Phone: ${event.coordinator?.phone || "Office Ext"}<br>
                    Email: <a href="mailto:${event.coordinator?.email || ""}" style="color:#1a56db; text-decoration:none;">${event.coordinator?.email || "events@college.edu"}</a>
                </div>

                <!-- ADMISSION NOTE -->
                <div style="margin-top:20px; padding:12px 14px; background-color:#f8fafc; border-left:4px solid #1a56db; font-size:12px; color:#64748b;">
                    <strong>Important:</strong> Please show this confirmation email along with your valid College ID Card at the verification desk upon arrival.
                </div>
            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color:#0f2b48; padding:18px 30px; text-align:center; color:#94a3b8; font-size:12px;">
                <p style="margin:0;">© 2026 CampusConnect | Professional College Event Management System</p>
                <p style="margin:4px 0 0; color:#64748b;">This is an automated confirmation message sent to ${student.email}.</p>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const textContent = `
CampusConnect - Event Registration Confirmation
===================================================

Dear ${student.name},

Your registration for "${event.name}" has been confirmed!

Event Details:
- Name: ${event.name} (${event.category})
- Date: ${event.eventDate} (${event.eventDay || ""})
- Timings: ${event.startTime} - ${event.endTime}
- Reporting Time: ${event.reportingTime || event.startTime}
- Venue: ${event.venue}
- Registration Type: ${isTeam ? `Team (${registration.teamName})` : "Individual"}
- Fee: ${feeDisplay}
- Food: ${foodTextDisplay}

${teamMembersText}
${rulesText}
Payment Instructions:
${registration.paymentInstructions || event.fee?.instructions || "Spot payment / Free"}

Coordinator:
${event.coordinator?.name || "Event Team"} (${event.coordinator?.phone || ""}, ${event.coordinator?.email || ""})

Please show this confirmation email and your College ID at the entrance.
Thank you for participating!
CampusConnect Team
        `;

        const info = await mailClient.sendMail({
            from: fromAddress,
            to: toAddress,
            subject,
            text: textContent,
            html: htmlContent
        });

        console.log(`[Email] Registration confirmation sent to ${toAddress}. MessageId: ${info.messageId}`);
        if (isEthereal) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[Email Preview URL]: ${previewUrl}`);
            return { success: true, messageId: info.messageId, previewUrl };
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email Error] Failed to send registration email to ${student.email}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send Student Welcome Account Email
 */
async function sendWelcomeEmail({ student }) {
    try {
        const mailClient = await getTransporter();
        const fromAddress = process.env.EMAIL_FROM || `"CampusConnect Portal" <${process.env.EMAIL_USER || "noreply@campusconnect.edu"}>`;
        const toAddress = student.email;

        const subject = `Welcome to CampusConnect, ${student.name}!`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background-color:#f8fafc; margin:0; padding:20px; color:#1e293b;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 14px rgba(15,43,72,0.08);">
        <tr>
            <td style="background-color:#0f2b48; padding:22px 30px;">
                <h1 style="color:#ffffff; margin:0; font-size:22px;">CampusConnect</h1>
                <p style="color:#94a3b8; margin:4px 0 0; font-size:12px;">Student Portal Account Created</p>
            </td>
        </tr>
        <tr>
            <td style="padding:28px 30px;">
                <p style="font-size:16px; margin:0 0 14px; color:#0f2b48;">Hello <strong>${student.name}</strong>,</p>
                <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 16px;">
                    Welcome to <strong>CampusConnect</strong>, your official college event management portal. Your student account has been successfully created.
                </p>
                <div style="background-color:#f1f5f9; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px; color:#334155;">
                    <p style="margin:0 0 6px;"><strong>Registered Email:</strong> ${student.email}</p>
                    <p style="margin:0 0 6px;"><strong>Register Number:</strong> ${student.registerNumber || "N/A"}</p>
                    <p style="margin:0;"><strong>Department:</strong> ${student.department || "N/A"}</p>
                </div>
                <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px;">
                    You can now log in anytime to browse symposiums, hackathons, workshops, and sports meets, view complete schedules, and manage your registrations.
                </p>
                <a href="http://localhost:5000" style="display:inline-block; background-color:#0f2b48; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:10px 22px; border-radius:6px;">Access Student Portal</a>
            </td>
        </tr>
        <tr>
            <td style="background-color:#0f2b48; padding:16px 30px; text-align:center; color:#94a3b8; font-size:12px;">
                © 2026 CampusConnect | College Event Management System
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const info = await mailClient.sendMail({
            from: fromAddress,
            to: toAddress,
            subject,
            text: `Welcome to CampusConnect, ${student.name}!\n\nYour student account has been created with email: ${student.email}.\nRegister Number: ${student.registerNumber}\nDepartment: ${student.department}\n\nVisit: http://localhost:5000`,
            html: htmlContent
        });

        console.log(`[Email] Welcome email sent to ${toAddress}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email Error] Failed to send welcome email to ${student.email}:`, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendEventRegistrationEmail,
    sendWelcomeEmail
};
