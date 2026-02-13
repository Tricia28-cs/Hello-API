import corsHeaders from "@/lib/cors";
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// POST /api/user/logout
export async function POST() {
  const res = NextResponse.json(
    { message: "OK" },
    { status: 200, headers: corsHeaders }
  );

  // Clear cookie
  res.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return res;
}