export type SignInMethod = "email" | "apple";

// Never stringify Firebase errors: customData can contain OAuth credentials.
export function authErrorCode(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  return typeof code === "string" && /^[a-zA-Z0-9_/-]{1,100}$/.test(code)
    ? code
    : "unknown";
}

export function authErrorMessage(
  error: unknown,
  method: SignInMethod,
): string | null {
  const code = authErrorCode(error);
  if (code === "ERR_REQUEST_CANCELED" || code === "auth/popup-closed-by-user")
    return null;
  if (method === "apple") {
    if (code === "auth/invalid-credential")
      return "Apple sign-in could not be verified. Please try again, or sign in with email.";
    if (code === "auth/missing-or-invalid-nonce")
      return "Apple sign-in verification failed. Please try again.";
    if (code === "auth/operation-not-allowed")
      return "Apple sign-in is currently unavailable. Please use email sign-in.";
    if (code === "auth/account-exists-with-different-credential")
      return "An account already uses this email with another sign-in method. Sign in using that method.";
    return `Apple sign-in could not finish. Please try again. (${code})`;
  }
  if (code === "auth/invalid-credential")
    return "Email or password is incorrect.";
  if (code === "auth/email-already-in-use")
    return "An account already uses this email. Sign in or reset your password.";
  if (code === "auth/weak-password")
    return "Choose a password with at least 6 characters.";
  return error instanceof Error
    ? error.message
    : "Unable to sign in. Please retry.";
}
