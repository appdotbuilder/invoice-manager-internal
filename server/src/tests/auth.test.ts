import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type RegisterInput } from '../schema';
import { loginUser, registerUser, logoutUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testRegisterInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('Authentication Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should register a new user', async () => {
      const result = await registerUser(testRegisterInput);

      // Basic field validation
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
      expect(result.user.password_hash).toBeDefined();
      expect(result.user.password_hash).not.toEqual('password123'); // Should be hashed
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should save user to database', async () => {
      const result = await registerUser(testRegisterInput);

      // Query database to verify user was created
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].password_hash).toBeDefined();
      expect(users[0].created_at).toBeInstanceOf(Date);
      expect(users[0].updated_at).toBeInstanceOf(Date);
    });

    it('should hash password before storing', async () => {
      const result = await registerUser(testRegisterInput);

      // Password hash should not match original password
      expect(result.user.password_hash).not.toEqual('password123');
      expect(result.user.password_hash.length).toBeGreaterThan(10);

      // Verify in database too
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(users[0].password_hash).not.toEqual('password123');
      expect(users[0].password_hash).toEqual(result.user.password_hash);
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await registerUser(testRegisterInput);

      // Try to register with same email
      await expect(registerUser(testRegisterInput))
        .rejects.toThrow(/user already exists/i);
    });

    it('should handle edge case inputs gracefully', async () => {
      // Test with minimal valid input
      const minimalInput: RegisterInput = {
        email: 'minimal@test.com',
        password: '123456' // Minimum 6 characters as per schema
      };

      const result = await registerUser(minimalInput);
      expect(result.user.email).toEqual('minimal@test.com');
      expect(result.user.id).toBeDefined();
      expect(result.token).toBeDefined();

      // Verify it was saved to database
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('minimal@test.com');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Register a user first for login tests
      await registerUser(testRegisterInput);
    });

    it('should login with correct credentials', async () => {
      const result = await loginUser(testLoginInput);

      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
      expect(result.user.password_hash).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should reject invalid email', async () => {
      const invalidInput = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await expect(loginUser(invalidInput))
        .rejects.toThrow(/invalid credentials/i);
    });

    it('should reject incorrect password', async () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(loginUser(invalidInput))
        .rejects.toThrow(/invalid credentials/i);
    });

    it('should verify password against hash', async () => {
      // First login should work
      const result1 = await loginUser(testLoginInput);
      expect(result1.user.email).toEqual('test@example.com');

      // Wrong password should fail
      const wrongPasswordInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(loginUser(wrongPasswordInput))
        .rejects.toThrow(/invalid credentials/i);
    });

    it('should generate unique tokens', async () => {
      const result1 = await loginUser(testLoginInput);
      const result2 = await loginUser(testLoginInput);

      expect(result1.token).toBeDefined();
      expect(result2.token).toBeDefined();
      expect(result1.token).not.toEqual(result2.token);
    });
  });

  describe('logoutUser', () => {
    it('should logout successfully', async () => {
      const result = await logoutUser();

      expect(result.success).toBe(true);
    });

    it('should always return success', async () => {
      // Multiple logout calls should all succeed
      const result1 = await logoutUser();
      const result2 = await logoutUser();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should complete full auth workflow', async () => {
      // Register user
      const registerResult = await registerUser(testRegisterInput);
      expect(registerResult.user.email).toEqual('test@example.com');
      expect(registerResult.token).toBeDefined();

      // Login with same credentials
      const loginResult = await loginUser(testLoginInput);
      expect(loginResult.user.email).toEqual('test@example.com');
      expect(loginResult.user.id).toEqual(registerResult.user.id);
      expect(loginResult.token).toBeDefined();

      // Logout
      const logoutResult = await logoutUser();
      expect(logoutResult.success).toBe(true);
    });

    it('should handle multiple user registrations', async () => {
      const user1Input: RegisterInput = {
        email: 'user1@example.com',
        password: 'password123'
      };

      const user2Input: RegisterInput = {
        email: 'user2@example.com',
        password: 'password456'
      };

      // Register both users
      const result1 = await registerUser(user1Input);
      const result2 = await registerUser(user2Input);

      expect(result1.user.id).not.toEqual(result2.user.id);
      expect(result1.user.email).toEqual('user1@example.com');
      expect(result2.user.email).toEqual('user2@example.com');

      // Both should be able to login
      const login1 = await loginUser({ email: 'user1@example.com', password: 'password123' });
      const login2 = await loginUser({ email: 'user2@example.com', password: 'password456' });

      expect(login1.user.id).toEqual(result1.user.id);
      expect(login2.user.id).toEqual(result2.user.id);
    });

    it('should maintain data consistency', async () => {
      const result = await registerUser(testRegisterInput);

      // Verify database state matches returned data
      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.user.id))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].id).toEqual(result.user.id);
      expect(dbUsers[0].email).toEqual(result.user.email);
      expect(dbUsers[0].password_hash).toEqual(result.user.password_hash);
      expect(dbUsers[0].created_at.getTime()).toEqual(result.user.created_at.getTime());
      expect(dbUsers[0].updated_at.getTime()).toEqual(result.user.updated_at.getTime());
    });
  });
});