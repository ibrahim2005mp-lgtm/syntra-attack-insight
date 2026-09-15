import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Email + password credentials provider.
 *
 * Secrets are hashed server-side with Scrypt by the provider itself — the
 * plaintext password never leaves the sign-in/sign-up request context, is
 * never stored, and is never sent back to the client. Password policy is
 * enforced here on the server (the real security boundary); the frontend
 * `credentialsValidation` module only mirrors it for fast feedback.
 */
export const passwordAuth = Password({
  validatePasswordRequirements(password: string) {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    if (password.length > 128) {
      throw new Error("Password must be at most 128 characters long.");
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error(
        "Password must contain an uppercase letter, a lowercase letter and a digit.",
      );
    }
  },
});
