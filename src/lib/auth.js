import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaultjwtsecret";

export function verifyJWT(req) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const { token } = cookie.parse(cookieHeader);
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}