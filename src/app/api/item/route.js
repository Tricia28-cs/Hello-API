import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

const DB_NAME = "sample_mflix";
const COLLECTION = "item";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET /api/item?page=1&limit=10
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
    const db = client.db("sample_mflix");

    const [items, total] = await Promise.all([
      db.collection(COLLECTION).find({}).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
      db.collection(COLLECTION).countDocuments({}),
    ]);

    return NextResponse.json(
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        items,
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

// POST /api/item
// Body: { "itemName": "...", "itemCategory": "...", "itemPrice": "...", "status": "ACTIVE" }
export async function POST(req) {
  try {
    const data = await req.json();

    const itemName = String(data.itemName ?? "").trim();
    const itemCategory = String(data.itemCategory ?? "").trim();
    const itemPrice = String(data.itemPrice ?? "").trim();
    const status = String(data.status ?? "ACTIVE").trim();

    if (!itemName || !itemCategory || !itemPrice || !status) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("sample_mflix");

    const result = await db.collection(COLLECTION).insertOne({
      itemName,
      itemCategory,
      itemPrice,
      status,
    });

    return NextResponse.json(
      { id: result.insertedId },
      { status: 200, headers: corsHeaders }
    );
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}