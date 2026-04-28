import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const EDITOR_USERNAME = "mustafa";

async function getUsername() {
    const store = await cookies();
    return store.get("auth_token")?.value || null;
}

export async function GET() {
    try {
        const result = await query(
            `SELECT id, date, description, amount, currency, currency_rate,
                    project, usd_equal, type, counter_party, category, is_exchange, source
             FROM public.cash_flow
             ORDER BY date DESC NULLS LAST, id ASC`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("cash_flow GET error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const username = await getUsername();
        if (username !== EDITOR_USERNAME) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
            `INSERT INTO public.cash_flow
                (date, description, amount, currency, currency_rate, project,
                 type, counter_party, category, is_exchange, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, date, description, amount, currency, currency_rate,
                       project, usd_equal, type, counter_party, category, is_exchange, source`,
            [
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

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error("cash_flow POST error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
