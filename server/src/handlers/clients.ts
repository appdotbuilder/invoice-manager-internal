import { db } from '../db';
import { clientsTable, invoicesTable } from '../db/schema';
import { type Client, type CreateClientInput, type UpdateClientInput } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function createClient(input: CreateClientInput): Promise<Client> {
  try {
    const result = await db.insert(clientsTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Client creation failed:', error);
    throw error;
  }
}

export async function getClients(): Promise<Client[]> {
  try {
    const clients = await db.select()
      .from(clientsTable)
      .execute();

    return clients;
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

export async function getClientById(id: number): Promise<Client | null> {
  try {
    const clients = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, id))
      .execute();

    return clients[0] || null;
  } catch (error) {
    console.error('Failed to fetch client by ID:', error);
    throw error;
  }
}

export async function updateClient(input: UpdateClientInput): Promise<Client> {
  try {
    // Build the update values object dynamically
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateValues.name = input.name;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.phone !== undefined) updateValues.phone = input.phone;
    if (input.address !== undefined) updateValues.address = input.address;

    const result = await db.update(clientsTable)
      .set(updateValues)
      .where(eq(clientsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Client with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Client update failed:', error);
    throw error;
  }
}

export async function deleteClient(id: number): Promise<{ success: boolean }> {
  try {
    // Check if client has associated invoices
    const invoiceCount = await db.select({ count: count() })
      .from(invoicesTable)
      .where(eq(invoicesTable.client_id, id))
      .execute();

    if (invoiceCount[0].count > 0) {
      throw new Error('Cannot delete client with existing invoices');
    }

    const result = await db.delete(clientsTable)
      .where(eq(clientsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Client with ID ${id} not found`);
    }

    return { success: true };
  } catch (error) {
    console.error('Client deletion failed:', error);
    throw error;
  }
}