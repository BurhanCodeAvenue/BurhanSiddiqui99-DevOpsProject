// src/app/api/auth/signin/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/server/config/firebaseAdmin'; // db might be null
import { comparePassword, generateToken } from '@/server/utils/authUtils';
import type { User } from '@/types/user';

export async function POST(request: Request) {
    // Check if Firebase Admin SDK initialized properly
  if (!db) {
      console.error("Signin Error: Firestore database is not available. Firebase Admin SDK might not have initialized correctly.");
      return NextResponse.json({ message: 'Server configuration error: Database unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Unauthorized
    }

    // Get user data (should only be one document due to limit(1))
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const storedPassword = userData.password; // Assuming password hash is stored in the 'password' field

     if (!storedPassword) {
        console.error(`Signin Error: User ${email} found but has no password field in Firestore.`);
        return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
     }

    // Compare password
    const isPasswordValid = await comparePassword(password, storedPassword);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Unauthorized
    }

    // Prepare user object to return (exclude password)
    const userToReturn: User = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      profilePic: userData.profilePic,
      // Do NOT include the password hash
    };

    // Generate JWT token
    const token = generateToken(userToReturn);

    // Return user data and token
    return NextResponse.json({ user: userToReturn, token }, { status: 200 });

  } catch (error: any) {
    console.error('Signin Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message || 'Unknown error' }, { status: 500 });
  }
}
