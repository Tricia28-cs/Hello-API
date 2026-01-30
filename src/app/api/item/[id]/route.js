import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const DB_NAME = "sample_mflix";
const COLLECTION = "item";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req, { params }) {
  const { id } = await params;

  console.log("Fetch", id);

  try {
    const client = await getClientPromise();
    const db = client.db("sample_mflix");

    const result = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}

// PATCH (partial update)
export async function PATCH(req, { params }) {
  const { id } = await params;
  const data = await req.json();

  const partialUpdate = {};
  if (data.itemName != null) partialUpdate.itemName = String(data.itemName).trim();
  if (data.itemCategory != null) partialUpdate.itemCategory = String(data.itemCategory).trim();
  if (data.itemPrice != null) partialUpdate.itemPrice = String(data.itemPrice).trim();
  if (data.status != null) partialUpdate.status = String(data.status).trim();

  try {
    const client = await getClientPromise();
    const db = client.db("sample_mflix");

    const existed = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!existed) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const updateData = { ...existed, ...partialUpdate };
    const updatedResult = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    return NextResponse.json(updatedResult, { status: 200, headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}

// PUT (replace)
export async function PUT(req, { params }) {
  const { id } = params;
  const data = await req.json();

  try {
    const client = await getClientPromise();
    const db = client.db("sample_mflix");

    const updatedResult = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: data });

    return NextResponse.json(updatedResult, { status: 200, headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}

// DELETE
export async function DELETE(req, { params }) {
  const { id } = await params;

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);

    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (exception) {
    return NextResponse.json(
      { message: exception.toString() },
      { status: 400, headers: corsHeaders }
    );
  }
}