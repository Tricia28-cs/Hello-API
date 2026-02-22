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

// GET /api/user/:id  (hide password)
export async function GET(req, { params }) {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
        return NextResponse.json({ 
            message: "Invalid user id" 
        }, { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const user = await db.collection("user").findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
        );

        if (!user) {
            return NextResponse.json({ 
                message: "User not found" 
            }, { 
                status: 404, 
                headers: corsHeaders 
            });
        }

        return NextResponse.json(user, { 
            status: 200, 
            headers: corsHeaders 
        });
    } catch (e) {
        return NextResponse.json({ 
            message: String(e) 
        }, { 
                status: 400, 
                headers: corsHeaders });
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

// PATCH /api/user/:id  (update fields; if password provided, hash it)
export async function PATCH(req, { params }) {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
        return NextResponse.json({ 
            message: "Invalid user id" 
        }, { 
            status: 400, headers: corsHeaders 
        });
    }

    const data = await req.json();

    // allowed updates (lecture user fields)
    const updateDoc = {};

    if (data.username !== undefined) updateDoc.username = data.username;
    if (data.email !== undefined) updateDoc.email = data.email;
    if (data.firstname !== undefined) updateDoc.firstname = data.firstname;
    if (data.lastname !== undefined) updateDoc.lastname = data.lastname;

    // status must be one of ACTIVE/SUSPENDED/DELETED (from PDF)
    if (data.status !== undefined) {
        updateDoc.status = String(data.status).trim();
    }

    if (data.password) {
        updateDoc.password = await bcrypt.hash(String(data.password), 10);
    }

    if (Object.keys(updateDoc).length === 0) {
        return NextResponse.json({ 
            message: "No update fields provided" 
        }, { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const result = await db.collection("user").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateDoc }
        );

        return NextResponse.json(result, { 
            status: 200, 
            headers: corsHeaders 
        });
    } catch (e) {
        const msg = String(e);
        let display = msg;

        // same duplicate handling idea as POST in lecture
        if (msg.includes("duplicate")) {
            if (msg.includes("username")) display = "Duplicate Username!!";
            else if (msg.includes("email")) display = "Duplicate Email!!";
            else display = "Duplicate value!!";
        }

        return NextResponse.json({ 
            message: display 
        }, { 
            status: 400, 
            headers: corsHeaders 
        });
    }
}

// DELETE /api/user/:id
// Lecture includes status "DELETED", so we do a "soft delete"
export async function DELETE(req, { params }) {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
        return NextResponse.json({
            message: "Invalid user id" 
        }, { 
            status: 400, 
            headers: corsHeaders 
        });
    }

    try {
        const client = await getClientPromise();
        const db = client.db(process.env.DB_NAME);

        const result = await db.collection("user").deleteOne({ _id: new ObjectId(id) }, { $set: { status: "DELETED" } }
        );

        if (result.matchedCount === 0) {
        return NextResponse.json({ 
            message: "User not found" 
        }, { 
            status: 404, 
            headers: corsHeaders 
        });
        }

        return NextResponse.json({ 
            ok: true 
        }, { 
            status: 200, 
            headers: corsHeaders 
        });
    } catch (e) {
        return NextResponse.json({ 
            message: String(e) 
        }, { 
            status: 400, 
            headers: corsHeaders });
    }
}