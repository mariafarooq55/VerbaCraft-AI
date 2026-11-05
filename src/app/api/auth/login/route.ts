import { NextResponse } from "next/server";
import { AuthStoreError, loginUser } from "@/lib/auth-store";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginUser(
      String(body.email || ""),
      String(body.password || "")
    );
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Sign-in failed:", error);
    return NextResponse.json(
      { error: "We couldn't sign you in. Please try again." },
      { status: 500 }
    );
  }
}
