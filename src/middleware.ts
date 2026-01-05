import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// Routes that require authentication
const protectedRoutes = ['/inbox', '/archive'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

    // Get session token from cookie
    const sessionToken = request.cookies.get('leo_session')?.value;
    const isAuthenticated = sessionToken ? await verifySession(sessionToken) : false;

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect to inbox if accessing login while authenticated
    if (isPublicRoute && isAuthenticated) {
        return NextResponse.redirect(new URL('/inbox', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/inbox/:path*', '/archive/:path*', '/login'],
};
