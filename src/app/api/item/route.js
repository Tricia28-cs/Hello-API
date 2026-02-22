import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, { 
    status: 200, 
    headers: corsHeaders 
  });
}

export async function GET(req) {

  try {
    // pagination params: /api/item?skip=0&limit=10
    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    const client = await getClientPromise();
    const db = client.db("wad-01");

    // apply pagination (same Mongo pattern as lecture)
    const result = await db
      .collection("item")
      .find({})
      .skip(Number.isNaN(skip) ? 0 : skip)
      .limit(Number.isNaN(limit) ? 10 : limit)
      .toArray();
    console.log("==> result", result);
    return NextResponse.json(result, {
      headers: corsHeaders
    });
  }
  catch (exception) {
    console.log("exception", exception.toString());
    const errorMsg = exception.toString();
    return NextResponse.json({
      message: errorMsg
    }, {
      status: 400,
      headers: corsHeaders
    })
  }
}

export async function POST (req) {
  const data = await req.json();
  const itemName = data.name;
  const itemPrice = data.price;
  const itemCategory = data.category;

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const result = await db.collection("item").insertOne({
      itemName: itemName,
      itemCategory: itemCategory,
      itemPrice: itemPrice,
      status: "ACTIVE"
    });
    return NextResponse.json({
      id: result.insertedId
    }, {
      status: 200,
      headers: corsHeaders
    })
  }
  catch (exception) {
    console.log("exception", exception.toString());
    const errorMsg = exception.toString();
    return NextResponse.json({
      message: errorMsg
    }, {
      status: 400,
      headers: corsHeaders
    })
  }
}