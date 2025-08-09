import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing utility (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  // Using Bun's built-in password hashing
  return await Bun.password.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Simple token generation (in production, use proper JWT)
function generateToken(): string {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token?: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    const isValid = await verifyPassword(input.password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken();

    return {
      user: {
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function registerUser(input: RegisterInput): Promise<{ user: User; token?: string }> {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate token
    const token = generateToken();

    return {
      user: {
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<{ success: boolean }> {
  // In a real application, this would invalidate the token in a token store
  // For now, we just return success since we're not maintaining a session store
  try {
    // Here you would typically:
    // - Remove token from active token store
    // - Update user's session status in database
    // - Clear any cached user data
    
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}