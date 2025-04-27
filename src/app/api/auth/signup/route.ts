// src/app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/server/config/firebaseAdmin'; // db might be null
import { hashPassword, generateToken } from '@/server/utils/authUtils';
import type { User } from '@/types/user';

export async function POST(request: Request) {
  console.log('Checking if Firebase Admin SDK is initialized...',request);
  // Check if Firebase Admin SDK initialized properly
  if (!db) {
      console.error("Signup Error: Firestore database is not available. Firebase Admin SDK might not have initialized correctly.");
      return NextResponse.json({ message: 'Server configuration error: Database unavailable' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, email, password, profilePic } = body;

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields (name, email, password)' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (!snapshot.empty) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 }); // 409 Conflict
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user object
    const newUser: Omit<User, 'id'> = {
      name,
      email,
      profilePic: profilePic || `https://picsum.photos/seed/${encodeURIComponent(email)}/200/200`, // Use provided pic or generate placeholder, ensure email is encoded for URL
      // We don't store the password hash directly in the user object returned to client
    };

    // Add user to Firestore (Firestore generates the ID)
    const userDocRef = await usersRef.add({
        ...newUser,
        password: hashedPassword, // Store hashed password in DB
        createdAt: new Date().toISOString(), // Add timestamp
    });

    const createdUser: User = {
        id: userDocRef.id,
        ...newUser,
    };

    // Generate JWT token
    const token = generateToken(createdUser);

    // Return user data (without password) and token
    return NextResponse.json({ user: createdUser, token }, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error('Signup Error:', error);
     // Check for specific Firebase errors if needed
    return NextResponse.json({ message: 'Internal Server Error', error: error.message || 'Unknown error' }, { status: 500 });
  }
}
