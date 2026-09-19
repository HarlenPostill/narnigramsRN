import { createPrivateKey, sign } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";

export interface AppleConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
}
/** Exchange a fresh native Apple code and revoke its grant. No tokens are retained. */
export async function revokeAppleAuthorization(
  code: string,
  subject: string,
  config: AppleConfig,
  request: typeof fetch = fetch,
) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "ES256", kid: config.keyId })}.${encode({ iss: config.teamId, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: config.clientId })}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  const credentials = {
    client_id: config.clientId,
    client_secret: `${unsigned}.${signature}`,
  };
  const response = await request("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...credentials,
      code,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpsError(
      "failed-precondition",
      "Please authenticate with Apple again to delete your account.",
    );
  const tokens = (await response.json()) as {
    id_token?: string;
    refresh_token?: string;
    access_token?: string;
  };
  // This ID token comes directly from Apple's HTTPS token exchange, not from the client.
  let claims: { sub?: string; aud?: string };
  try {
    claims = JSON.parse(
      Buffer.from(tokens.id_token?.split(".")[1] ?? "", "base64url").toString(),
    );
  } catch {
    throw new HttpsError("internal", "Apple returned an invalid response.");
  }
  if (claims.sub !== subject || claims.aud !== config.clientId)
    throw new HttpsError(
      "permission-denied",
      "Use the Apple account linked to this player.",
    );
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token)
    throw new HttpsError("internal", "Apple did not return a revocable token.");
  const revoked = await request("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...credentials,
      token,
      token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!revoked.ok)
    throw new HttpsError(
      "unavailable",
      "Could not revoke Apple access. Please retry account deletion.",
    );
}
