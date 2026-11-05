import { NextResponse } from "next/server";
import { AuthStoreError, registerUser } from "@/lib/auth-store";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await registerUser({
      name: String(body.name || ""),
      email: String(body.email || ""),
      password: String(body.password || ""),
    });
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Account registration failed:", error);
    return NextResponse.json(
      { error: "We couldn't create your account. Please try again." },
      { status: 500 }
    );
  }
}
