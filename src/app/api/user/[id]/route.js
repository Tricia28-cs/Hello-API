import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function OPTIONS() {
    return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
    });
}

// GET /api/user/:id  -> single user (without password)
export async function GET(req, { params }) {
    const { id } = await params;

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const user = await db.collection("user").findOne({ 
            _id: new ObjectId(id) 
        }, { 
            projection: { password: 0 

            } });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json(user, { 
            headers: corsHeaders 
        });
    } 
    catch (exception) {
        return NextResponse.json(
            { message: exception.toString() },
            { status: 400, headers: corsHeaders }
        );
    }
}

// PUT /api/user/:id  -> update user (password optional)
export async function PUT(req, { params }) {
    const { id } = await params;
    const data = await req.json();

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const existed = await db.collection("user").findOne({ 
            _id: new ObjectId(id) 
        });
        if (!existed) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        const update = {
            username: String(data.username ?? existed.username).trim(),
            email: String(data.email ?? existed.email).trim(),
            firstname: data.firstname ?? existed.firstname ?? null,
            lastname: data.lastname ?? existed.lastname ?? null,
            status: String(data.status ?? existed.status ?? "ACTIVE").trim(),
        };

        if (typeof data.password === "string" && data.password.trim().length > 0) {
            update.password = await bcrypt.hash(data.password, 10);
        }

        const merged = { ...existed, ...update };
        delete merged._id;

        const result = await db.collection("user").updateOne({ 
            _id: new ObjectId(id) 
        }, { 
            $set: merged 
        });

        return NextResponse.json(result, { 
            status: 200, 
            headers: corsHeaders 
        });
    } 
    catch (exception) {
        const errorMsg = exception.toString();
        let displayErrorMsg = "";
        if (errorMsg.toLowerCase().includes("duplicate")) {
            if (errorMsg.toLowerCase().includes("username")) {
                displayErrorMsg = "Duplicate Username!!"
            }
            else if (errorMsg.toLowerCase().includes("email")) {
                displayErrorMsg = "Duplicate Email!!"
            }
            else {
                displayErrorMsg = "Duplicate value!!";
            }
        }
        return NextResponse.json(
            { message: displayErrorMsg || errorMsg },
            { status: 400, headers: corsHeaders }
        );
    }
}

// PATCH /api/user/:id -> partial update (optional, but matches CRUD style)
export async function PATCH(req, { params }) {
    const { id } = await params;
    const data = await req.json();

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const existed = await db.collection("user").findOne({ 
            _id: new ObjectId(id) 
        });
        if (!existed) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        const partial = {};
        if (data.username != null) partial.username = String(data.username).trim();
        if (data.email != null) partial.email = String(data.email).trim();
        if (data.firstname != null) partial.firstname = data.firstname;
        if (data.lastname != null) partial.lastname = data.lastname;
        if (data.status != null) partial.status = String(data.status).trim();
        if (typeof data.password === "string" && data.password.trim().length > 0) {
            partial.password = await bcrypt.hash(data.password, 10);
        }

        const merged = { ...existed, ...partial };
        delete merged._id;

        const result = await db.collection("user").updateOne({ 
            _id: new ObjectId(id) 
        }, { 
            $set: merged 
        });

        return NextResponse.json(result, { 
            status: 200, 
            headers: corsHeaders 
        });
    } 
    catch (exception) {
        const errorMsg = exception.toString();
        let displayErrorMsg = "";
        if (errorMsg.toLowerCase().includes("duplicate")) {
            if (errorMsg.toLowerCase().includes("username")) {
                displayErrorMsg = "Duplicate Username!!"
            }
            else if (errorMsg.toLowerCase().includes("email")) {
                displayErrorMsg = "Duplicate Email!!"
            }
            else {
                displayErrorMsg = "Duplicate value!!";
            }
        }
        return NextResponse.json(
            { message: displayErrorMsg || errorMsg },
            { status: 400, headers: corsHeaders }
        );
    }
}

// DELETE /api/user/:id -> soft delete (status = DELETED)
export async function DELETE(req, { params }) {
    const { id } = await params;

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const result = await db.collection("user").deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
        return NextResponse.json(
            { message: "User not found" },
            { status: 404, headers: corsHeaders }
        );
        }

        return NextResponse.json({ 
            ok: true, 
            deletedCount: result.deletedCount 
        },{ 
            status: 200, 
            headers: corsHeaders 
        });
    } 
    catch (e) {
        return NextResponse.json(
            { message: e.toString() },
            { status: 400, headers: corsHeaders }
        );
    }
}