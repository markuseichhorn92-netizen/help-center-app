import { NextRequest, NextResponse } from "next/server";
import { verifyPortalToken, createPortalSession } from "@/lib/portal";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    // Redirect to portal login with error
    const url = new URL("/portal", req.url);
    url.searchParams.set("error", "missing_token");
    return NextResponse.redirect(url);
  }

  try {
    // Verify the token
    const tokenData = await verifyPortalToken(token);

    if (!tokenData) {
      // Token invalid or expired
      const url = new URL("/portal", req.url);
      url.searchParams.set("error", "invalid_token");
      return NextResponse.redirect(url);
    }

    // Create session
    const session = await createPortalSession(tokenData.email);

    // Determine redirect URL
    let redirectUrl: URL;

    if (tokenData.ticketId) {
      // Direct to specific ticket
      redirectUrl = new URL(`/portal/ticket/${tokenData.ticketId}`, req.url);
    } else {
      // Direct to tickets list
      redirectUrl = new URL("/portal/tickets", req.url);
    }

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl);

    // Set session cookie
    response.cookies.set("portal_session", session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Portal token verification error:", error);

    const url = new URL("/portal", req.url);
    url.searchParams.set("error", "verification_failed");
    return NextResponse.redirect(url);
  }
}
