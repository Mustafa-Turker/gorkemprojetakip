import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const EDITOR_USERNAME = "mustafa";

async function getUsername() {
    const store = await cookies();
    return store.get("auth_token")?.value || null;
}

export async function PUT(request, { params }) {
    try {
        const username = await getUsername();
        if (username !== EDITOR_USERNAME) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const body = await request.json();
        const {
            date,
            description,
            amount,
            currency,
            currency_rate,
            project,
            type,
            counter_party,
            category,
            is_exchange,
            source,
        } = body;

        if (!date || amount == null || !currency || currency_rate == null || !type) {
            return NextResponse.json(
                { error: "Required: date, amount, currency, currency_rate, type" },
                { status: 400 }
            );
        }

        const result = await query(
            `UPDATE public.cash_flow SET
                date = $2,
                description = $3,
                amount = $4,
                currency = $5,
                currency_rate = $6,
                project = $7,
                type = $8,
                counter_party = $9,
                category = $10,
                is_exchange = $11,
                source = $12
             WHERE id = $1
             RETURNING id, date, description, amount, currency, currency_rate,
                       project, usd_equal, type, counter_party, category, is_exchange, source`,
            [
                id,
                date,
                description ?? "",
                amount,
                currency,
                currency_rate,
                project ?? "",
                type,
                counter_party ?? "",
                category ?? "",
                is_exchange ?? false,
                source ?? "",
            ]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error("cash_flow PUT error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_request, { params }) {
    try {
        const username = await getUsername();
        if (username !== EDITOR_USERNAME) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const result = await query(
            `DELETE FROM public.cash_flow WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error("cash_flow DELETE error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
