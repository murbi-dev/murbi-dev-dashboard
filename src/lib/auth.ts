export const AUTH_COOKIE_NAME = "murbi_dashboard_session";
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

type SessionPayload = {
  user: string;
  expiresAt: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodePayload(payload: SessionPayload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(value));
    const payload = JSON.parse(decoded) as Partial<SessionPayload>;

    if (typeof payload.user !== "string" || typeof payload.expiresAt !== "number") {
      return null;
    }

    return {
      user: payload.user,
      expiresAt: payload.expiresAt
    };
  } catch {
    return null;
  }
}

export function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let result = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    result |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return result === 0;
}

export async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionValue(user: string, secret: string) {
  const payload = encodePayload({
    user,
    expiresAt: Math.floor(Date.now() / 1000) + AUTH_SESSION_MAX_AGE
  });
  const signature = await hmacSha256(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifySessionValue(value: string | undefined, secret: string, expectedUser: string) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return false;
  }

  const decodedPayload = decodePayload(payload);

  if (!decodedPayload || decodedPayload.user !== expectedUser || decodedPayload.expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = await hmacSha256(payload, secret);

  return constantTimeEqual(signature, expectedSignature);
}
