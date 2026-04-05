import { Resend } from 'resend';
import { EMAIL_FROM } from '../config/config.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  return resend.emails.send({ from: EMAIL_FROM, to, subject, html });
};

export const sendResetPasswordEmail = async (email, token, frontendUrl) => {
  if (typeof frontendUrl !== 'string' || frontendUrl.trim() === '') {
    throw new Error(
      'frontendUrl must be a non-empty string when sending a reset password email',
    );
  }

  const normalizedFrontendUrl = frontendUrl.trim();

  const baseUrl = normalizedFrontendUrl.endsWith('/')
    ? normalizedFrontendUrl.slice(0, -1)
    : normalizedFrontendUrl;
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
