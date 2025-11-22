import { getDb } from '../mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId | string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword {
  _id?: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createUser(email: string, password: string, name: string): Promise<UserWithoutPassword> {
  const db = await getDb();
  const usersCollection = db.collection<User>('users');

  // Check if user already exists
  const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser: User = {
    email: email.toLowerCase(),
    name,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser);

  // Return user without password
  const { password: _, _id: __, ...userWithoutPassword } = newUser;
  return {
    _id: result.insertedId.toString(),
    ...userWithoutPassword,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const usersCollection = db.collection<User>('users');
  return usersCollection.findOne({ email: email.toLowerCase() });
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}

export async function findUserById(id: string): Promise<UserWithoutPassword | null> {
  const db = await getDb();
  const usersCollection = db.collection<User>('users');
  
  let user: User | null;
  try {
    // Try to find by ObjectId
    user = await usersCollection.findOne({ _id: new ObjectId(id) });
  } catch {
    // If ObjectId conversion fails, return null
    return null;
  }
  
  if (!user) {
    return null;
  }

  // Return user without password
  const { password: _, _id: __, ...userWithoutPassword } = user;
  return {
    _id: user._id ? (typeof user._id === 'string' ? user._id : user._id.toString()) : undefined,
    ...userWithoutPassword,
  };
}

