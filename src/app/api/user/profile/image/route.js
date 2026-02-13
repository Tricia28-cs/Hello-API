import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// POST /api/user/profile/image
// multipart/form-data with field "file"
export async function POST(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid form data" },
      { status: 400, headers: corsHeaders }
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { message: "No file uploaded" },
      { status: 400, headers: corsHeaders }
    );
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      { message: "Only image files allowed" },
      { status: 400, headers: corsHeaders }
    );
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const safeExt = ext && ext.length <= 6 ? ext : "bin";
  const filename = `${crypto.randomUUID()}.${safeExt}`;

  const publicDir = path.join(process.cwd(), "public", "profile-images");
  const savePath = path.join(publicDir, filename);

  try {
    await fs.mkdir(publicDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await fs.writeFile(savePath, Buffer.from(bytes));

    const imageUrl = `/profile-images/${filename}`;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    await db.collection("user").updateOne(
      { email: user.email },
      { $set: { profileImage: imageUrl } }
    );

    return NextResponse.json({ imageUrl }, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.log("Upload image error:", err?.toString?.() ?? err);
    return NextResponse.json(
      { message: "Failed to upload image" },
      { status: 500, headers: corsHeaders }
    );
  }
}