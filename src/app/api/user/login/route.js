import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "myjwtsecret";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// POST /api/user/login
// Body: { email, password }
export async function POST(req) {
  try {
    const data = await req.json();
    const email = String(data.email ?? "").trim();
    const password = String(data.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing email or password" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const user = await db.collection("user").findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      { email: user.email, id: user._id?.toString?.() ?? String(user._id) },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    const res = NextResponse.json(
      { message: "OK" },
      { status: 200, headers: corsHeaders }
    );

    // HttpOnly cookie so frontend JS can’t steal it
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true if using https
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return res;
  } catch (err) {
    console.log("Login error:", err?.toString?.() ?? err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}