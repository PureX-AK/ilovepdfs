import { getDb } from '../mongodb';
import { ObjectId } from 'mongodb';

export interface ContactSubmission {
  _id?: ObjectId | string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  newsletter: boolean;
  status: 'new' | 'read' | 'replied' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export async function createContactSubmission(
  firstName: string,
  lastName: string,
  email: string,
  subject: string,
  message: string,
  priority: 'low' | 'medium' | 'high',
  newsletter: boolean
): Promise<ContactSubmission> {
  const db = await getDb();
  const contactsCollection = db.collection<ContactSubmission>('contacts');

  const newSubmission: ContactSubmission = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    subject,
    message,
    priority,
    newsletter,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await contactsCollection.insertOne(newSubmission);
  
  return {
    _id: result.insertedId.toString(),
    ...newSubmission,
  };
}

export async function getContactSubmissions(limit: number = 50): Promise<ContactSubmission[]> {
  const db = await getDb();
  const contactsCollection = db.collection<ContactSubmission>('contacts');
  
  return contactsCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

