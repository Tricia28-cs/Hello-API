import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET /api/item?page=1&limit=10
// Returns: { page, limit, totalItems, totalPages, items: [...] }
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "wad-01");

    const [items, totalItems] = await Promise.all([
      db.collection("item").find({}).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("item").countDocuments({}),
    ]);

    return NextResponse.json(
      {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        items,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 400, headers: corsHeaders });
  }
}

// POST /api/item
// Accept BOTH formats:
//  - { name, category, price, status }
//  - { itemName, itemCategory, itemPrice, status }
export async function POST(req) {
  try {
    const data = await req.json();

    const name = (data.name ?? data.itemName ?? "").toString().trim();
    const category = (data.category ?? data.itemCategory ?? "").toString().trim();
    const price = data.price ?? data.itemPrice;
    const status = (data.status ?? "ACTIVE").toString().trim();

    if (!name || !category || price === undefined || price === null || price === "") {
      return NextResponse.json(
        { message: "Missing mandatory data (name, category, price)" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "wad-01");

    const result = await db.collection("item").insertOne({
      itemName: name,
      itemCategory: category,
      itemPrice: price,
      status,
    });

    return NextResponse.json({ id: result.insertedId }, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 400, headers: corsHeaders });
  }
}