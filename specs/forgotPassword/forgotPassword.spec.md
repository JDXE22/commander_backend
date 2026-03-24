# Specification: Forgot Password Service

## Business Vision
As a user, I want a secure and easy way to regain access to my account when I forget my password, so that I can continue using the application without losing my data.

## Functional Requirements
- **FR1: Request Password Reset**
  - Users must be able to request a password reset by providing their registered email address.
  - The system must verify if the email exists in the database.
  - If the email exists, the system must generate a unique, time-limited reset token.
  - The system must send an email to the user with a reset link containing the token.
  - Security: To prevent account enumeration, the system should respond with a generic message like "If an account exists for this email, you will receive a reset link shortly."

- **FR2: Reset Password**
  - Users must be able to reset their password by providing the reset token and a new password.
  - The system must validate the token (existence, expiration, and if it has been used).
  - The new password must meet existing security requirements (minimum length).
  - Upon success, the reset token must be invalidated, and the user's `passwordHash` must be updated.

## Security Constraints
- Reset tokens must have a short expiration period (e.g., 1 hour).
- Tokens should be cryptographically secure and hard to guess.
- Each token must be single-use.
- Passwords must be hashed using the existing hashing mechanism (bcrypt).

## Acceptance Criteria
- [ ] User can request a reset email.
- [ ] User receives an email with a unique token.
- [ ] User can reset their password using the token.
- [ ] Reset link fails if the token is expired or invalid.
- [ ] Reset link fails if it has already been used.
- [ ] Account enumeration is mitigated.
