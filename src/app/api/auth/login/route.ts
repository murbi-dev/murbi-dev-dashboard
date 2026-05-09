import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE,
  constantTimeEqual,
  createSessionValue,
  sha256Hex
} from "@/lib/auth";

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

export async function POST(request: NextRequest) {
  const username = process.env.DASHBOARD_AUTH_USER;
  const passwordHash = process.env.DASHBOARD_AUTH_PASSWORD_SHA256?.toLowerCase();
  const sessionSecret = process.env.DASHBOARD_AUTH_SECRET;

  if (!username || !passwordHash || !sessionSecret) {
    return NextResponse.json(
      { error: "Autenticação não configurada." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;

  if (typeof body?.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Informe usuário e senha." },
      { status: 400 }
    );
  }

  const receivedPasswordHash = await sha256Hex(body.password);
  const isValid =
    body.username === username && constantTimeEqual(receivedPasswordHash, passwordHash);

  if (!isValid) {
    return NextResponse.json(
      { error: "Usuário ou senha inválidos." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  const session = await createSessionValue(username, sessionSecret);

  response.cookies.set(AUTH_COOKIE_NAME, session, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE
  });

  return response;
}
