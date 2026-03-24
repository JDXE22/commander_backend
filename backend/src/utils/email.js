import nodemailer from 'nodemailer';
import {
  SMTP_CONFIG,
  EMAIL_FROM,
  validateSmtpConfig,
} from '../config/config.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    validateSmtpConfig();
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
  };

  const currentTransporter = getTransporter();
  return currentTransporter.sendMail(mailOptions);
};

export const sendResetPasswordEmail = async (email, token, frontendUrl) => {
  const baseUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Please click the link below to reset your password:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request - Commander',
    html,
  });
};
