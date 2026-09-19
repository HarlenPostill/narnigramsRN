import { authErrorCode } from "./auth-errors";
export function onlineErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  if (code === "functions/unauthenticated" || code.startsWith("auth/"))
    return "Your connection could not be authenticated. Retry, or open Account settings to sign in again. If this continues, the online service needs attention.";
  if (code === "functions/permission-denied" || code === "permission-denied")
    return "Your account cannot access the online service right now. Please try again later.";
  if (
    [
      "functions/unavailable",
      "functions/deadline-exceeded",
      "unavailable",
    ].includes(code)
  )
    return "The online service is taking too long to respond. Check your connection and retry.";
  return "We couldn’t connect to the online service. Please retry. You can leave this screen and play Solo or Practice.";
}
