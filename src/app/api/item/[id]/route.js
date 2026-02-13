import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

export async function GET(req, { params }) {
  try {
    // Next 15 can treat params as async in some setups
    const { id } = await params;
    const oid = toObjectId(id);
    if (!oid) {
      return NextResponse.json({ message: "Invalid item id" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "wad-01");

    const item = await db.collection("item").findOne({ _id: oid });

    if (!item) {
      return NextResponse.json({ message: "Item not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(item, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 400, headers: corsHeaders });
  }
}

// PATCH /api/item/:id
// Accept BOTH formats:
//  - { name, category, price, status }
//  - { itemName, itemCategory, itemPrice, status }
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const oid = toObjectId(id);
    if (!oid) {
      return NextResponse.json({ message: "Invalid item id" }, { status: 400, headers: corsHeaders });
    }

    const body = await req.json();
    const update = {};

    if (body.name !== undefined) update.itemName = body.name;
    if (body.category !== undefined) update.itemCategory = body.category;
    if (body.price !== undefined) update.itemPrice = body.price;

    if (body.itemName !== undefined) update.itemName = body.itemName;
    if (body.itemCategory !== undefined) update.itemCategory = body.itemCategory;
    if (body.itemPrice !== undefined) update.itemPrice = body.itemPrice;

    if (body.status !== undefined) update.status = body.status;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "wad-01");

    const result = await db.collection("item").updateOne({ _id: oid }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Item not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 400, headers: corsHeaders });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const oid = toObjectId(id);
    if (!oid) {
      return NextResponse.json({ message: "Invalid item id" }, { status: 400, headers: corsHeaders });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "wad-01");

    const result = await db.collection("item").deleteOne({ _id: oid });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Item not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 400, headers: corsHeaders });
  }
}