import { NextRequest, NextResponse } from "next/server";

const username = process.env.DASHBOARD_AUTH_USER;
const passwordHash = process.env.DASHBOARD_AUTH_PASSWORD_SHA256?.toLowerCase();
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

function unauthorized() {
  return new NextResponse("Acesso restrito.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Painel Dev Murbi", charset="UTF-8"'
    }
  });
}

function authNotConfigured() {
  return new NextResponse("Autenticação não configurada.", {
    status: 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      user: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let result = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    result |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return result === 0;
}

export async function middleware(request: NextRequest) {
  if (!username || !passwordHash) {
    return isProduction ? authNotConfigured() : NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));

  if (!credentials || credentials.user !== username) {
    return unauthorized();
  }

  const receivedPasswordHash = await sha256Hex(credentials.password);

  if (!constantTimeEqual(receivedPasswordHash, passwordHash)) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
