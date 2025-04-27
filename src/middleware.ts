// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  /*
   * Match all API routes except for:
   * - api/auth/... (authentication routes)
   * - api/public/... (explicitly public routes)
   * - api/socket/... (socket handler - auth handled internally)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: [
    '/api/((?!auth|public|socket).*)',
    // Exclude static assets explicitly if needed, although the negative lookahead might cover them
    // '/((?!_next/static|_next/image|favicon.ico).*)', // Example exclusion if needed
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers); // Clone headers

  console.log(`[Middleware] Request received for: ${pathname}`);

  // Only operate on API routes defined in the matcher
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Checking API route: ${pathname}`);

    const authHeader = requestHeaders.get('authorization');
    console.log(`[Middleware - ${pathname}] Authorization Header: ${authHeader ? 'Present' : 'Missing'}`);

    // Forward the request with existing headers.
    // The API route (`/api/users/search` in this case) will handle:
    // 1. Checking for the Authorization header.
    // 2. Extracting the token.
    // 3. Verifying the token using `verifyToken` (which runs in Node.js).
    // 4. Returning 401 if the header is missing, malformed, or the token is invalid/expired.

    // No need to check for token existence or format here.
    // No need to add extra headers like 'x-auth-token'.
    // Let the actual API endpoint handle the full auth logic.

    return NextResponse.next({
      request: {
        // Pass original headers (including Authorization)
        headers: requestHeaders,
      },
    });
  }

  // Allow request to proceed if it doesn't match the API protection pattern
  console.log(`[Middleware] Allowing non-protected or explicitly excluded route: ${pathname}`);
  return NextResponse.next();
}
