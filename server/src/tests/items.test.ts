import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, invoicesTable, invoiceItemsTable, clientsTable } from '../db/schema';
import { type CreateItemInput, type UpdateItemInput } from '../schema';
import { createItem, getItems, getItemById, updateItem, deleteItem } from '../handlers/items';
import { eq } from 'drizzle-orm';

// Test inputs
const testCreateInput: CreateItemInput = {
  name: 'Test Item',
  price: 25.99,
  unit: 'hours'
};

const testCreateInput2: CreateItemInput = {
  name: 'Another Item',
  price: 100.00,
  unit: 'pieces'
};

describe('Item Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createItem', () => {
    it('should create an item', async () => {
      const result = await createItem(testCreateInput);

      // Basic field validation
      expect(result.name).toEqual('Test Item');
      expect(result.price).toEqual(25.99);
      expect(result.unit).toEqual('hours');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(typeof result.price).toBe('number');
    });

    it('should save item to database', async () => {
      const result = await createItem(testCreateInput);

      // Query database directly to verify
      const items = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, result.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].name).toEqual('Test Item');
      expect(parseFloat(items[0].price)).toEqual(25.99); // Database stores as string
      expect(items[0].unit).toEqual('hours');
      expect(items[0].created_at).toBeInstanceOf(Date);
      expect(items[0].updated_at).toBeInstanceOf(Date);
    });

    it('should handle decimal prices correctly', async () => {
      const decimalInput: CreateItemInput = {
        name: 'Decimal Item',
        price: 19.45,
        unit: 'units'
      };

      const result = await createItem(decimalInput);

      expect(result.price).toEqual(19.45);
      expect(typeof result.price).toBe('number');

      // Verify in database
      const items = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, result.id))
        .execute();

      expect(parseFloat(items[0].price)).toEqual(19.45);
    });
  });

  describe('getItems', () => {
    it('should return empty array when no items exist', async () => {
      const result = await getItems();

      expect(result).toEqual([]);
    });

    it('should return all items', async () => {
      // Create test items
      await createItem(testCreateInput);
      await createItem(testCreateInput2);

      const result = await getItems();

      expect(result).toHaveLength(2);
      
      // Check that numeric fields are properly converted
      result.forEach(item => {
        expect(typeof item.price).toBe('number');
        expect(item.created_at).toBeInstanceOf(Date);
        expect(item.updated_at).toBeInstanceOf(Date);
      });

      // Check specific items
      const item1 = result.find(item => item.name === 'Test Item');
      const item2 = result.find(item => item.name === 'Another Item');

      expect(item1).toBeDefined();
      expect(item1!.price).toEqual(25.99);
      expect(item1!.unit).toEqual('hours');

      expect(item2).toBeDefined();
      expect(item2!.price).toEqual(100.00);
      expect(item2!.unit).toEqual('pieces');
    });
  });

  describe('getItemById', () => {
    it('should return null when item does not exist', async () => {
      const result = await getItemById(999);

      expect(result).toBeNull();
    });

    it('should return item when it exists', async () => {
      const createdItem = await createItem(testCreateInput);

      const result = await getItemById(createdItem.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(createdItem.id);
      expect(result!.name).toEqual('Test Item');
      expect(result!.price).toEqual(25.99);
      expect(result!.unit).toEqual('hours');
      expect(typeof result!.price).toBe('number');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('updateItem', () => {
    it('should update all fields', async () => {
      const createdItem = await createItem(testCreateInput);

      const updateInput: UpdateItemInput = {
        id: createdItem.id,
        name: 'Updated Item',
        price: 50.75,
        unit: 'days'
      };

      const result = await updateItem(updateInput);

      expect(result.id).toEqual(createdItem.id);
      expect(result.name).toEqual('Updated Item');
      expect(result.price).toEqual(50.75);
      expect(result.unit).toEqual('days');
      expect(typeof result.price).toBe('number');
      expect(result.updated_at.getTime()).toBeGreaterThan(createdItem.updated_at.getTime());
    });

    it('should update only specified fields', async () => {
      const createdItem = await createItem(testCreateInput);

      const updateInput: UpdateItemInput = {
        id: createdItem.id,
        price: 35.50
      };

      const result = await updateItem(updateInput);

      expect(result.id).toEqual(createdItem.id);
      expect(result.name).toEqual('Test Item'); // Unchanged
      expect(result.price).toEqual(35.50); // Changed
      expect(result.unit).toEqual('hours'); // Unchanged
      expect(typeof result.price).toBe('number');
    });

    it('should handle partial updates with undefined values', async () => {
      const createdItem = await createItem(testCreateInput);

      const updateInput: UpdateItemInput = {
        id: createdItem.id,
        name: 'New Name',
        price: undefined, // Should not update
        unit: undefined  // Should not update
      };

      const result = await updateItem(updateInput);

      expect(result.name).toEqual('New Name');
      expect(result.price).toEqual(25.99); // Original value
      expect(result.unit).toEqual('hours'); // Original value
    });

    it('should throw error when item does not exist', async () => {
      const updateInput: UpdateItemInput = {
        id: 999,
        name: 'Non-existent Item'
      };

      await expect(updateItem(updateInput)).rejects.toThrow(/Item with ID 999 not found/i);
    });

    it('should verify database update', async () => {
      const createdItem = await createItem(testCreateInput);

      const updateInput: UpdateItemInput = {
        id: createdItem.id,
        name: 'Database Test Item',
        price: 99.99
      };

      await updateItem(updateInput);

      // Verify in database
      const items = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, createdItem.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].name).toEqual('Database Test Item');
      expect(parseFloat(items[0].price)).toEqual(99.99);
      expect(items[0].unit).toEqual('hours'); // Unchanged
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      const createdItem = await createItem(testCreateInput);

      const result = await deleteItem(createdItem.id);

      expect(result.success).toBe(true);

      // Verify item is deleted from database
      const items = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, createdItem.id))
        .execute();

      expect(items).toHaveLength(0);
    });

    it('should throw error when item does not exist', async () => {
      await expect(deleteItem(999)).rejects.toThrow(/Item with ID 999 not found/i);
    });

    it('should prevent deletion of item used in invoices', async () => {
      // Create prerequisite data
      const client = await db.insert(clientsTable)
        .values({
          name: 'Test Client',
          email: 'test@example.com'
        })
        .returning()
        .execute();

      const createdItem = await createItem(testCreateInput);

      // Create an invoice
      const invoice = await db.insert(invoicesTable)
        .values({
          invoice_number: 'INV-001',
          client_id: client[0].id,
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          subtotal: '100.00',
          discount: '0.00',
          tax_rate: '0.11',
          tax_amount: '11.00',
          total_amount: '111.00'
        })
        .returning()
        .execute();

      // Create invoice item using our test item
      await db.insert(invoiceItemsTable)
        .values({
          invoice_id: invoice[0].id,
          item_id: createdItem.id,
          quantity: '2.00',
          unit_price: '50.00',
          line_total: '100.00'
        })
        .execute();

      // Try to delete item - should fail
      await expect(deleteItem(createdItem.id)).rejects.toThrow(/Cannot delete item that is used in invoices/i);

      // Verify item still exists in database
      const items = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, createdItem.id))
        .execute();

      expect(items).toHaveLength(1);
    });

    it('should allow deletion of unused item even when other items are used in invoices', async () => {
      // Create prerequisite data
      const client = await db.insert(clientsTable)
        .values({
          name: 'Test Client',
          email: 'test@example.com'
        })
        .returning()
        .execute();

      const usedItem = await createItem(testCreateInput);
      const unusedItem = await createItem(testCreateInput2);

      // Create invoice using only the first item
      const invoice = await db.insert(invoicesTable)
        .values({
          invoice_number: 'INV-002',
          client_id: client[0].id,
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: '100.00',
          discount: '0.00',
          tax_rate: '0.11',
          tax_amount: '11.00',
          total_amount: '111.00'
        })
        .returning()
        .execute();

      await db.insert(invoiceItemsTable)
        .values({
          invoice_id: invoice[0].id,
          item_id: usedItem.id,
          quantity: '1.00',
          unit_price: '100.00',
          line_total: '100.00'
        })
        .execute();

      // Delete the unused item - should succeed
      const result = await deleteItem(unusedItem.id);

      expect(result.success).toBe(true);

      // Verify unused item is deleted
      const unusedItems = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, unusedItem.id))
        .execute();

      expect(unusedItems).toHaveLength(0);

      // Verify used item still exists
      const usedItems = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, usedItem.id))
        .execute();

      expect(usedItems).toHaveLength(1);
    });
  });
});