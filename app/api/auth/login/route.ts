import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        // Get users from environment variable
        const usersEnv = process.env.USERS;

        if (!usersEnv) {
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        // Parse the USERS JSON object
        let users: Record<string, string>;
        try {
            users = JSON.parse(usersEnv);
        } catch {
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        // Validate credentials
        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Check if user exists and password matches
        if (users[username] && users[username] === password) {
            // Create response with success
            const response = NextResponse.json(
                { success: true, username },
                { status: 200 }
            );

            // Set auth cookie (expires in 24 hours)
            response.cookies.set("auth_token", username, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 24 hours
                path: "/",
            });

            return response;
        }

        // Invalid credentials
        return NextResponse.json(
            { success: false, error: "Invalid username or password" },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "An error occurred" },
            { status: 500 }
        );
    }
}
