import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, { 
    status: 200, 
    headers: corsHeaders, 
  });
}

export async function GET(req) {
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...corsHeaders,
  };

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const projection = { password: 0 };

    const [users, totalItems] = await Promise.all([
      db
        .collection("user")
        .find({}, { projection })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("user").countDocuments({}),
    ]);

    return NextResponse.json(
      {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        users,
      },
      { headers }
    );
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}

// POST /api/user
// Body: { username, email, password, firstname?, lastname?, status? }
export async function POST (req) {
  const data = await req.json();
  const username = data.username;
  const email = data.email;
  const password = data.password;
  const firstname = data.firstname;
  const lastname = data.lastname;
  const status = String(data.status ?? "ACTIVE").trim();

  
  if (!username || !email || !password) {
    return NextResponse.json({
      message: "Missing mandatory data"
    }, {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const client = await getClientPromise();

    const db = client.db(process.env.DB_NAME);
    const result = await db.collection("user").insertOne({
      username: username,
      email: email,
      password: await bcrypt.hash(password, 10),
      firstname: firstname,
      lastname: lastname,
      status: "ACTIVE"
    });
    console.log("result", result);
    return NextResponse.json({
      id: result.insertedId
    }, {
      status: 200,
      headers: corsHeaders
    });
  }
  catch (exception) {
    console.log("exception", exception.toString());
    const errorMsg = exception.toString();
    let displayErrorMsg = "";
    if (errorMsg.includes("duplicate")) {
      if (errorMsg.includes("username")) {
        displayErrorMsg = "Duplicate Username!!"
      }
      else if (errorMsg.includes("email")) {
        displayErrorMsg = "Duplicate Email!!"
      }
      else {
        displayErrorMsg = "Duplicate value!!";
      }
    }
    return NextResponse.json({
      message: displayErrorMsg
    }, {
      status: 400,
      headers: corsHeaders
    });
  }
}