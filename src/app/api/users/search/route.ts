// src/app/api/users/search/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/server/config/firebaseAdmin';
import type { User } from '@/types/user';
import { verifyToken } from '@/server/utils/authUtils';

// Explicitly set the runtime to Node.js
export const runtime = 'nodejs';
// Force dynamic rendering (optional, but good practice for auth-protected routes)
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  // Ensure db is available
  if (!db) {
    console.error("[API /users/search] User Search Error: Firestore database is not available.");
    return NextResponse.json({ message: 'Server configuration error: Database unavailable' }, { status: 500 });
  }

  // Get token from the header set by middleware (or directly if middleware logic changed)
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!authToken) {
     console.warn("[API /users/search] Unauthorized: Missing or invalid Authorization header.");
    // Use x-auth-token as fallback if middleware sets that instead
     const fallbackToken = request.headers.get('x-auth-token');
     if (!fallbackToken) {
        return NextResponse.json({ message: 'Unauthorized: Missing authentication token' }, { status: 401 });
     }
     // If fallback exists, proceed with it (though Authorization header is standard)
     // verifyToken below will use the available token
     console.warn("[API /users/search] Using x-auth-token as fallback.");
  }

  const tokenToVerify = authToken || request.headers.get('x-auth-token');

  if (!tokenToVerify) {
      console.error("[API /users/search] Token is definitively missing after checking headers.");
      return NextResponse.json({ message: 'Unauthorized: Authentication token not found' }, { status: 401 });
  }


  try {
    // Verify token IN the API route (Node.js environment)
    console.log("[API /users/search] Verifying token...");
    const decodedUser = verifyToken(tokenToVerify);
    const userId = decodedUser.id; // Get user ID from the verified token
    console.log(`[API /users/search] Token verified for user ID: ${userId}`);

    const { searchParams } = new URL(request.url);
    const nameQuery = searchParams.get('name');

    if (!nameQuery || nameQuery.trim().length === 0) {
       console.warn("[API /users/search] Bad Request: Missing 'name' query parameter.");
      return NextResponse.json({ message: 'Search query "name" is required' }, { status: 400 });
    }
     console.log(`[API /users/search] Searching for name: "${nameQuery}" (User: ${userId})`);

    const usersRef = db.collection('users');
    const queryLower = nameQuery.toLowerCase();

    // Firestore prefix search
    const querySnapshot = await usersRef
      .where('name', '>=', nameQuery)
      .where('name', '<=', nameQuery + '\uf8ff')
      .limit(10)
      .get();

    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Exclude the current user from the search results
      if (doc.id !== userId) {
        users.push({
          id: doc.id,
          name: data.name,
          email: data.email, // Include email if needed, but often sensitive
          profilePic: data.profilePic,
          // DO NOT include password hash
        });
      }
    });

    // Secondary client-side like filtering (case-insensitive) on the limited results
    const filteredUsers = users.filter(user =>
      user.name.toLowerCase().includes(queryLower)
    );
    console.log(`[API /users/search] Found ${filteredUsers.length} users matching query.`);

    return NextResponse.json(filteredUsers, { status: 200 });

  } catch (error: any) {
     // Catch errors specifically from verifyToken (expired, invalid signature etc.)
    console.error(`[API /users/search] Token verification or search error: ${error.message}`, error);
     // Return the specific error message from verifyToken or a generic one
     // The message thrown by verifyToken is usually informative (e.g., "Token expired...")
    return NextResponse.json({ message: error.message || 'An error occurred during user search.' }, { status: 401 }); // Use 401 for auth errors
  }
}
