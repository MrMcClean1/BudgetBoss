import { SignJWT, jwtVerify } from "jose";

const MOBILE_TOKEN_SECRET =
  process.env.MOBILE_TOKEN_SECRET || process.env.AUTH_SECRET || "mobile-dev-secret";

const secret = new TextEncoder().encode(MOBILE_TOKEN_SECRET);

export interface MobileTokenPayload {
  sub: string; // user id
  email: string;
  name: string | null;
}

export async function createMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}
