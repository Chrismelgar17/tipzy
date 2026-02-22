import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type SupportedProvider = "google" | "apple";

export interface ProviderIdentity {
  provider: SupportedProvider;
  subject: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function payloadString(payload: JWTPayload, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function verifyGoogleIdentity(params: {
  idToken?: string;
  accessToken?: string;
}): Promise<ProviderIdentity> {
  const audiences = envList("GOOGLE_CLIENT_IDS");
  if (!audiences.length) {
    throw new Error("GOOGLE_CLIENT_IDS is not configured on the backend");
  }

  if (params.idToken) {
    const { payload } = await jwtVerify(params.idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: audiences,
    });
    const subject = payloadString(payload, "sub");
    if (!subject) throw new Error("Google token does not contain sub");
    const email = payloadString(payload, "email");
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    const name = payloadString(payload, "name");
    return { provider: "google", subject, email, emailVerified, name };
  }

  if (params.accessToken) {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to validate Google access token");
    const profile = await res.json() as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!profile.sub) throw new Error("Google user info does not contain sub");
    return {
      provider: "google",
      subject: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified === true,
      name: profile.name,
    };
  }

  throw new Error("Google provider requires idToken or accessToken");
}

export async function verifyAppleIdentity(params: {
  idToken?: string;
}): Promise<ProviderIdentity> {
  if (!params.idToken) {
    throw new Error("Apple provider requires idToken");
  }

  const audiences = envList("APPLE_AUDIENCES");
  if (!audiences.length) {
    throw new Error("APPLE_AUDIENCES is not configured on the backend");
  }

  const { payload } = await jwtVerify(params.idToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: audiences,
  });

  const subject = payloadString(payload, "sub");
  if (!subject) throw new Error("Apple token does not contain sub");
  const email = payloadString(payload, "email");
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return { provider: "apple", subject, email, emailVerified };
}
