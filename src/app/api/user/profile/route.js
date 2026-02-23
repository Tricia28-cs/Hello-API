import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

function toPublicProfile(doc) {
  return {
    id: doc._id?.toString?.() ?? String(doc._id),
    firstname: doc.firstname ?? "",
    lastname: doc.lastname ?? "",
    email: doc.email ?? "",
    profileImage: doc.profileImage ?? null,
  };
}

export async function GET (req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized"
      },
      {
        status: 401,
        headers: corsHeaders
      }
    );
  }
  try {
    const client = await getClientPromise();

    const db = client.db("wad-01");
    const email = user.email;
    const profile = await db.collection("user").findOne({ email });
    console.log("profile: ", profile);
    return NextResponse.json(profile, {
      headers: corsHeaders
    })
  }
  catch(error) {
    console.log("Get Profile Exception: ", error.toString());
    return NextResponse.json(error.toString(), {
      headers: corsHeaders
    })
  }
}

// PUT /api/user/profile
// Body: { firstname, lastname, email }
export async function PUT(req) {
  const user = verifyJWT(req);
  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  const firstname = String(data.firstname ?? "").trim();
  const lastname = String(data.lastname ?? "").trim();
  const email = String(data.email ?? "").trim();

  if (!email) {
    return NextResponse.json(
      { message: "Email is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    // prevent duplicate email if changed
    if (email !== user.email) {
      const exists = await db.collection("user").findOne({ email }, { projection: { _id: 1 } });
      if (exists) {
        return NextResponse.json(
          { message: "Email already in use" },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    await db.collection("user").updateOne(
      { email: user.email },
      { $set: { firstname, lastname, email } }
    );

    const updated = await db.collection("user").findOne(
      { email },
      { projection: { password: 0 } }
    );

    return NextResponse.json(toPublicProfile(updated), { headers: corsHeaders });
  } catch (err) {
    console.log("Profile PUT error:", err?.toString?.() ?? err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}