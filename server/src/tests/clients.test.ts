import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, invoicesTable } from '../db/schema';
import { type CreateClientInput, type UpdateClientInput } from '../schema';
import { createClient, getClients, getClientById, updateClient, deleteClient } from '../handlers/clients';
import { eq } from 'drizzle-orm';

// Test input data
const testClientInput: CreateClientInput = {
  name: 'Test Client',
  email: 'test@client.com',
  phone: '123-456-7890',
  address: '123 Test Street, Test City'
};

const minimalClientInput: CreateClientInput = {
  name: 'Minimal Client',
  email: 'minimal@client.com',
  phone: null,
  address: null
};

describe('Client Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createClient', () => {
    it('should create a client with all fields', async () => {
      const result = await createClient(testClientInput);

      expect(result.name).toEqual('Test Client');
      expect(result.email).toEqual('test@client.com');
      expect(result.phone).toEqual('123-456-7890');
      expect(result.address).toEqual('123 Test Street, Test City');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a client with minimal fields', async () => {
      const result = await createClient(minimalClientInput);

      expect(result.name).toEqual('Minimal Client');
      expect(result.email).toEqual('minimal@client.com');
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save client to database', async () => {
      const result = await createClient(testClientInput);

      const clients = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, result.id))
        .execute();

      expect(clients).toHaveLength(1);
      expect(clients[0].name).toEqual('Test Client');
      expect(clients[0].email).toEqual('test@client.com');
      expect(clients[0].phone).toEqual('123-456-7890');
      expect(clients[0].address).toEqual('123 Test Street, Test City');
    });

    it('should allow multiple clients with same email', async () => {
      await createClient(testClientInput);
      
      // Should be able to create another client with same email
      const secondClient = await createClient({
        ...testClientInput,
        name: 'Another Client'
      });

      expect(secondClient.name).toEqual('Another Client');
      expect(secondClient.email).toEqual(testClientInput.email);
      expect(secondClient.id).not.toEqual(testClientInput);
    });
  });

  describe('getClients', () => {
    it('should return empty array when no clients exist', async () => {
      const clients = await getClients();

      expect(clients).toEqual([]);
    });

    it('should return all clients', async () => {
      await createClient(testClientInput);
      await createClient(minimalClientInput);

      const clients = await getClients();

      expect(clients).toHaveLength(2);
      expect(clients.some(c => c.name === 'Test Client')).toBe(true);
      expect(clients.some(c => c.name === 'Minimal Client')).toBe(true);
    });

    it('should return clients with all fields', async () => {
      await createClient(testClientInput);

      const clients = await getClients();

      expect(clients).toHaveLength(1);
      const client = clients[0];
      expect(client.id).toBeDefined();
      expect(client.name).toEqual('Test Client');
      expect(client.email).toEqual('test@client.com');
      expect(client.phone).toEqual('123-456-7890');
      expect(client.address).toEqual('123 Test Street, Test City');
      expect(client.created_at).toBeInstanceOf(Date);
      expect(client.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getClientById', () => {
    it('should return null for non-existent client', async () => {
      const client = await getClientById(999);

      expect(client).toBeNull();
    });

    it('should return client when found', async () => {
      const created = await createClient(testClientInput);

      const client = await getClientById(created.id);

      expect(client).not.toBeNull();
      expect(client!.id).toEqual(created.id);
      expect(client!.name).toEqual('Test Client');
      expect(client!.email).toEqual('test@client.com');
      expect(client!.phone).toEqual('123-456-7890');
      expect(client!.address).toEqual('123 Test Street, Test City');
    });

    it('should return client with null fields', async () => {
      const created = await createClient(minimalClientInput);

      const client = await getClientById(created.id);

      expect(client).not.toBeNull();
      expect(client!.phone).toBeNull();
      expect(client!.address).toBeNull();
    });
  });

  describe('updateClient', () => {
    it('should update all client fields', async () => {
      const created = await createClient(testClientInput);

      const updateInput: UpdateClientInput = {
        id: created.id,
        name: 'Updated Client',
        email: 'updated@client.com',
        phone: '987-654-3210',
        address: '456 Updated Street'
      };

      const updated = await updateClient(updateInput);

      expect(updated.id).toEqual(created.id);
      expect(updated.name).toEqual('Updated Client');
      expect(updated.email).toEqual('updated@client.com');
      expect(updated.phone).toEqual('987-654-3210');
      expect(updated.address).toEqual('456 Updated Street');
      expect(updated.updated_at.getTime()).toBeGreaterThan(updated.created_at.getTime());
    });

    it('should update partial client fields', async () => {
      const created = await createClient(testClientInput);

      const updateInput: UpdateClientInput = {
        id: created.id,
        name: 'Partially Updated Client'
      };

      const updated = await updateClient(updateInput);

      expect(updated.name).toEqual('Partially Updated Client');
      expect(updated.email).toEqual(testClientInput.email); // Should remain unchanged
      expect(updated.phone).toEqual(testClientInput.phone); // Should remain unchanged
      expect(updated.address).toEqual(testClientInput.address); // Should remain unchanged
    });

    it('should update client with null values', async () => {
      const created = await createClient(testClientInput);

      const updateInput: UpdateClientInput = {
        id: created.id,
        phone: null,
        address: null
      };

      const updated = await updateClient(updateInput);

      expect(updated.phone).toBeNull();
      expect(updated.address).toBeNull();
      expect(updated.name).toEqual(testClientInput.name); // Should remain unchanged
      expect(updated.email).toEqual(testClientInput.email); // Should remain unchanged
    });

    it('should persist changes to database', async () => {
      const created = await createClient(testClientInput);

      const updateInput: UpdateClientInput = {
        id: created.id,
        name: 'Database Updated Client'
      };

      await updateClient(updateInput);

      const clients = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, created.id))
        .execute();

      expect(clients).toHaveLength(1);
      expect(clients[0].name).toEqual('Database Updated Client');
    });

    it('should throw error for non-existent client', async () => {
      const updateInput: UpdateClientInput = {
        id: 999,
        name: 'Non-existent Client'
      };

      await expect(updateClient(updateInput))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteClient', () => {
    it('should delete existing client', async () => {
      const created = await createClient(testClientInput);

      const result = await deleteClient(created.id);

      expect(result.success).toBe(true);

      // Verify client is deleted from database
      const clients = await db.select()
        .from(clientsTable)
        .where(eq(clientsTable.id, created.id))
        .execute();

      expect(clients).toHaveLength(0);
    });

    it('should throw error for non-existent client', async () => {
      await expect(deleteClient(999))
        .rejects.toThrow(/not found/i);
    });

    it('should prevent deletion when client has invoices', async () => {
      const client = await createClient(testClientInput);

      // Create an invoice associated with this client
      await db.insert(invoicesTable)
        .values({
          invoice_number: 'INV-001',
          client_id: client.id,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: '100.00',
          discount: '0.00',
          tax_rate: '0.11',
          tax_amount: '11.00',
          total_amount: '111.00',
          status: 'draft'
        })
        .execute();

      await expect(deleteClient(client.id))
        .rejects.toThrow(/cannot delete client with existing invoices/i);
    });

    it('should allow deletion when client has no invoices', async () => {
      const client1 = await createClient(testClientInput);
      const client2 = await createClient(minimalClientInput);

      // Create an invoice for client2 only
      await db.insert(invoicesTable)
        .values({
          invoice_number: 'INV-001',
          client_id: client2.id,
          invoice_date: new Date(),
          due_date: new Date(),
          subtotal: '100.00',
          discount: '0.00',
          tax_rate: '0.11',
          tax_amount: '11.00',
          total_amount: '111.00',
          status: 'draft'
        })
        .execute();

      // Should be able to delete client1 (no invoices)
      const result = await deleteClient(client1.id);
      expect(result.success).toBe(true);

      // But not client2 (has invoices)
      await expect(deleteClient(client2.id))
        .rejects.toThrow(/cannot delete client with existing invoices/i);
    });
  });
});