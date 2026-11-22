/**
 * Email Service using Nodemailer
 * Handles all email notifications for NigerianDirectory
 */

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@nigeriandirectory.com';
        this.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
    }

    /**
     * Get or create the transporter (lazy init)
     */
    getTransporter() {
        if (!this.transporter) {
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '587');
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;

            if (!host || !user) {
                console.warn('⚠ Email not configured (SMTP_HOST/SMTP_USER missing). Emails will be logged only.');
                return null;
            }

            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
        }
        return this.transporter;
    }

    /**
     * Send an email (or log it if SMTP is not configured)
     */
    async send({ to, subject, html, text, replyTo }) {
        const transporter = this.getTransporter();

        const mailOptions = {
            from: `"NigerianDirectory" <${this.from}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''),
            ...(replyTo ? { replyTo } : {}),
        };

        if (!transporter) {
            console.log('[EMAIL] (SMTP not configured, logging only)');
            console.log(`  To: ${to}`);
            console.log(`  Subject: ${subject}`);
            console.log(`  Body: ${mailOptions.text.substring(0, 200)}...`);
            return { messageId: 'logged-only', logged: true };
        }

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
            throw error;
        }
    }

    // ============================================
    // CLAIM NOTIFICATIONS
    // ============================================

    async sendClaimSubmitted({ userEmail, userName, schoolName, claimId }) {
        return this.send({
            to: userEmail,
            subject: `Claim Submitted: ${schoolName} — NigerianDirectory`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1D4ED8; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 20px;">🇳🇬 NigerianDirectory</h1>
                    </div>
                    <div style="padding: 20px; background: #f9fafb;">
                        <h2 style="color: #1D4ED8;">Claim Submitted Successfully</h2>
                        <p>Hi ${userName},</p>
                        <p>Your claim for <strong>${schoolName}</strong> has been submitted successfully.</p>
                        <p>Our team will review your claim and get back to you within 3-5 business days.</p>
                        <p style="color: #6B7280; font-size: 14px;">Claim reference: ${claimId}</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #9CA3AF; font-size: 12px;">
                            This is an automated message from NigerianDirectory.com
                        </p>
                    </div>
                </div>
            `,
        });
    }

    async sendClaimApproved({ userEmail, userName, schoolName, schoolSlug }) {
        return this.send({
            to: userEmail,
            subject: `🎉 Claim Approved: ${schoolName} — NigerianDirectory`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #10B981; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 20px;">🇳🇬 NigerianDirectory</h1>
                    </div>
                    <div style="padding: 20px; background: #f9fafb;">
                        <h2 style="color: #10B981;">Your Claim Has Been Approved! 🎉</h2>
                        <p>Hi ${userName},</p>
                        <p>Great news! Your claim for <strong>${schoolName}</strong> has been approved.</p>
                        <p>You can now manage your school's listing, update information, and add photos.</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${this.siteUrl}/schools/${schoolSlug}"
                               style="background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                Manage Your Listing
                            </a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #9CA3AF; font-size: 12px;">
                            This is an automated message from NigerianDirectory.com
                        </p>
                    </div>
                </div>
            `,
        });
    }

    async sendClaimRejected({ userEmail, userName, schoolName, reason }) {
        return this.send({
            to: userEmail,
            subject: `Claim Update: ${schoolName} — NigerianDirectory`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1D4ED8; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 20px;">🇳🇬 NigerianDirectory</h1>
                    </div>
                    <div style="padding: 20px; background: #f9fafb;">
                        <h2 style="color: #EF4444;">Claim Not Approved</h2>
                        <p>Hi ${userName},</p>
                        <p>Unfortunately, your claim for <strong>${schoolName}</strong> could not be approved at this time.</p>
                        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                        <p>If you believe this is an error, please contact us at
                           <a href="mailto:info@nigeriandirectory.com">info@nigeriandirectory.com</a>
                           with additional documentation.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #9CA3AF; font-size: 12px;">
                            This is an automated message from NigerianDirectory.com
                        </p>
                    </div>
                </div>
            `,
        });
    }

    // ============================================
    // ADMIN NOTIFICATIONS
    // ============================================

    async sendNewClaimNotification({ adminEmail, schoolName, userName, userEmail, claimId }) {
        return this.send({
            to: adminEmail,
            subject: `[Admin] New Claim: ${schoolName} by ${userName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>New Claim Submitted</h2>
                    <p><strong>School:</strong> ${schoolName}</p>
                    <p><strong>Claimed by:</strong> ${userName} (${userEmail})</p>
                    <p><strong>Claim ID:</strong> ${claimId}</p>
                    <p>
                        <a href="${this.siteUrl}/admin/claims" style="color: #1D4ED8;">
                            Review in Admin Panel →
                        </a>
                    </p>
                </div>
            `,
        });
    }

    // ============================================
    // CONTACT FORM
    // ============================================

    async sendContactForm({ name, email, subject, message }) {
        const adminEmail = process.env.ADMIN_EMAIL || 'info@nigeriandirectory.com';
        return this.send({
            to: adminEmail,
            subject: `[Contact Form] ${subject || 'New Message'} from ${name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Contact Form Submission</h2>
                    <p><strong>From:</strong> ${name} (${email})</p>
                    <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
                    <hr>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
            `,
        });
    }
}

// Export singleton instance
module.exports = new EmailService();
