import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/driver_session=([^;]+)/);
    const token = cookieMatch ? cookieMatch[1] : null;

    if (token) {
      await driverDb.deleteSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: "Driver logged out successfully",
    });

    response.cookies.set("driver_session", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to log out" },
      { status: 500 }
    );
  }
}
