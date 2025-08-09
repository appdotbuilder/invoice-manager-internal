import { db } from '../db';
import { itemsTable, invoiceItemsTable } from '../db/schema';
import { type Item, type CreateItemInput, type UpdateItemInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function createItem(input: CreateItemInput): Promise<Item> {
  try {
    // Insert item record
    const result = await db.insert(itemsTable)
      .values({
        name: input.name,
        price: input.price.toString(), // Convert number to string for numeric column
        unit: input.unit
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Item creation failed:', error);
    throw error;
  }
}

export async function getItems(): Promise<Item[]> {
  try {
    const results = await db.select()
      .from(itemsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(item => ({
      ...item,
      price: parseFloat(item.price)
    }));
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
}

export async function getItemById(id: number): Promise<Item | null> {
  try {
    const results = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const item = results[0];
    return {
      ...item,
      price: parseFloat(item.price)
    };
  } catch (error) {
    console.error('Failed to fetch item by ID:', error);
    throw error;
  }
}

export async function updateItem(input: UpdateItemInput): Promise<Item> {
  try {
    // Prepare update values, only including defined fields
    const updateValues: any = {};
    
    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.price !== undefined) {
      updateValues.price = input.price.toString(); // Convert number to string for numeric column
    }
    if (input.unit !== undefined) {
      updateValues.unit = input.unit;
    }
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();

    const result = await db.update(itemsTable)
      .set(updateValues)
      .where(eq(itemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Item with ID ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      price: parseFloat(item.price)
    };
  } catch (error) {
    console.error('Item update failed:', error);
    throw error;
  }
}

export async function deleteItem(id: number): Promise<{ success: boolean }> {
  try {
    // Check if item is used in any invoice items
    const invoiceItemsUsingItem = await db.select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.item_id, id))
      .execute();

    if (invoiceItemsUsingItem.length > 0) {
      throw new Error('Cannot delete item that is used in invoices');
    }

    // Delete the item
    const result = await db.delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Item with ID ${id} not found`);
    }

    return { success: true };
  } catch (error) {
    console.error('Item deletion failed:', error);
    throw error;
  }
}