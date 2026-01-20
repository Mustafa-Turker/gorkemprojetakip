import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authToken = request.cookies.get('auth_token');
    const { pathname } = request.nextUrl;

    // Paths that don't require authentication
    const publicPaths = ['/login', '/api/auth/login'];

    // Check if the current path is public
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    // If user is not authenticated and tries to access a protected route
    if (!authToken && !isPublicPath) {
        const loginUrl = new URL('/login', request.url);
        // Add return URL for redirect after login if needed
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If user is authenticated and tries to access login page
    if (authToken && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (except auth endpoints which we might want to protect selectively, but here we protect all API except login)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        {
            source: '/((?!_next/static|_next/image|favicon.ico).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};
