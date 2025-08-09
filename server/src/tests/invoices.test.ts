import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    clientsTable, 
    itemsTable, 
    invoicesTable, 
    invoiceItemsTable 
} from '../db/schema';
import { 
    type CreateInvoiceInput,
    type UpdateInvoiceInput,
    type UpdateInvoiceStatusInput,
    type InvoiceFilter,
    type ExportPdfInput
} from '../schema';
import {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    getInvoiceItems,
    exportInvoiceToPdf
} from '../handlers/invoices';
import { eq } from 'drizzle-orm';

// Test data setup helpers
async function createTestClient() {
    const result = await db.insert(clientsTable)
        .values({
            name: 'Test Client',
            email: 'client@test.com',
            phone: '123-456-7890',
            address: '123 Test St'
        })
        .returning()
        .execute();
    return result[0];
}

async function createTestItem(name: string = 'Test Item', price: number = 10.99) {
    const result = await db.insert(itemsTable)
        .values({
            name,
            price: price.toString(),
            unit: 'each'
        })
        .returning()
        .execute();
    return result[0];
}

describe('Invoice Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('createInvoice', () => {
        it('should create an invoice with calculated totals', async () => {
            const client = await createTestClient();
            const item1 = await createTestItem('Item 1', 10.00);
            const item2 = await createTestItem('Item 2', 15.00);

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date('2024-01-15'),
                due_date: new Date('2024-02-15'),
                discount: 5.00,
                notes: 'Test invoice',
                items: [
                    { item_id: item1.id, quantity: 2, unit_price: 10.00 },
                    { item_id: item2.id, quantity: 1, unit_price: 15.00 }
                ]
            };

            const result = await createInvoice(input);

            // Check basic fields
            expect(result.client_id).toEqual(client.id);
            expect(result.invoice_date).toEqual(input.invoice_date);
            expect(result.due_date).toEqual(input.due_date);
            expect(result.discount).toEqual(5.00);
            expect(result.notes).toEqual('Test invoice');
            expect(result.status).toEqual('draft');

            // Check calculated totals
            // Subtotal: (2 * 10.00) + (1 * 15.00) = 35.00
            expect(result.subtotal).toEqual(35.00);
            // Tax amount: (35.00 - 5.00) * 0.11 = 3.30
            expect(result.tax_amount).toEqual(3.30);
            // Total: 30.00 + 3.30 = 33.30
            expect(result.total_amount).toEqual(33.30);
            expect(result.tax_rate).toEqual(0.11);

            // Check invoice number format
            expect(result.invoice_number).toMatch(/^INV-\d{6}-\d{4}$/);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should generate sequential invoice numbers for same month', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [
                    { item_id: item.id, quantity: 1, unit_price: 10.00 }
                ]
            };

            const invoice1 = await createInvoice(input);
            const invoice2 = await createInvoice(input);

            const number1 = invoice1.invoice_number.split('-')[2];
            const number2 = invoice2.invoice_number.split('-')[2];

            expect(parseInt(number2, 10)).toEqual(parseInt(number1, 10) + 1);
        });

        it('should save invoice items to database', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [
                    { item_id: item.id, quantity: 2, unit_price: 12.50 }
                ]
            };

            const invoice = await createInvoice(input);

            const invoiceItems = await db.select()
                .from(invoiceItemsTable)
                .where(eq(invoiceItemsTable.invoice_id, invoice.id))
                .execute();

            expect(invoiceItems).toHaveLength(1);
            expect(invoiceItems[0].item_id).toEqual(item.id);
            expect(parseFloat(invoiceItems[0].quantity)).toEqual(2);
            expect(parseFloat(invoiceItems[0].unit_price)).toEqual(12.50);
            expect(parseFloat(invoiceItems[0].line_total)).toEqual(25.00);
        });

        it('should throw error for non-existent client', async () => {
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: 999,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [
                    { item_id: item.id, quantity: 1, unit_price: 10.00 }
                ]
            };

            await expect(createInvoice(input)).rejects.toThrow(/client not found/i);
        });

        it('should throw error for non-existent items', async () => {
            const client = await createTestClient();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [
                    { item_id: 999, quantity: 1, unit_price: 10.00 }
                ]
            };

            await expect(createInvoice(input)).rejects.toThrow(/items not found/i);
        });
    });

    describe('getInvoices', () => {
        it('should return all invoices when no filter provided', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            };

            await createInvoice(input);
            await createInvoice(input);

            const results = await getInvoices();

            expect(results).toHaveLength(2);
            results.forEach(invoice => {
                expect(typeof invoice.subtotal).toBe('number');
                expect(typeof invoice.total_amount).toBe('number');
                expect(invoice.created_at).toBeInstanceOf(Date);
            });
        });

        it('should filter invoices by status', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            };

            const invoice1 = await createInvoice(input);
            const invoice2 = await createInvoice(input);

            // Update one invoice status
            await updateInvoiceStatus({ id: invoice2.id, status: 'sent' });

            const draftInvoices = await getInvoices({ status: 'draft' });
            const sentInvoices = await getInvoices({ status: 'sent' });

            expect(draftInvoices).toHaveLength(1);
            expect(sentInvoices).toHaveLength(1);
            expect(draftInvoices[0].id).toEqual(invoice1.id);
            expect(sentInvoices[0].id).toEqual(invoice2.id);
        });

        it('should filter invoices by client_id', async () => {
            const client1 = await createTestClient();
            const client2 = await db.insert(clientsTable)
                .values({
                    name: 'Client 2',
                    email: 'client2@test.com',
                    phone: null,
                    address: null
                })
                .returning()
                .execute()
                .then(result => result[0]);

            const item = await createTestItem();

            await createInvoice({
                client_id: client1.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            await createInvoice({
                client_id: client2.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            const client1Invoices = await getInvoices({ client_id: client1.id });
            const client2Invoices = await getInvoices({ client_id: client2.id });

            expect(client1Invoices).toHaveLength(1);
            expect(client2Invoices).toHaveLength(1);
            expect(client1Invoices[0].client_id).toEqual(client1.id);
            expect(client2Invoices[0].client_id).toEqual(client2.id);
        });

        it('should search invoices by invoice number and client name', async () => {
            const client1 = await db.insert(clientsTable)
                .values({
                    name: 'ABC Company',
                    email: 'abc@test.com',
                    phone: null,
                    address: null
                })
                .returning()
                .execute()
                .then(result => result[0]);

            const client2 = await db.insert(clientsTable)
                .values({
                    name: 'XYZ Corp',
                    email: 'xyz@test.com',
                    phone: null,
                    address: null
                })
                .returning()
                .execute()
                .then(result => result[0]);

            const item = await createTestItem();

            const invoice1 = await createInvoice({
                client_id: client1.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            await createInvoice({
                client_id: client2.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            // Search by client name
            const abcResults = await getInvoices({ search: 'ABC' });
            expect(abcResults).toHaveLength(1);
            expect(abcResults[0].client_id).toEqual(client1.id);

            // Search by invoice number
            const invoiceNumberResults = await getInvoices({ search: invoice1.invoice_number });
            expect(invoiceNumberResults).toHaveLength(1);
            expect(invoiceNumberResults[0].id).toEqual(invoice1.id);
        });
    });

    describe('getInvoiceById', () => {
        it('should return invoice by ID', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const input: CreateInvoiceInput = {
                client_id: client.id,
                invoice_date: new Date('2024-01-15'),
                due_date: new Date('2024-02-15'),
                discount: 5.00,
                notes: 'Test invoice',
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            };

            const created = await createInvoice(input);
            const retrieved = await getInvoiceById(created.id);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toEqual(created.id);
            expect(retrieved!.invoice_number).toEqual(created.invoice_number);
            expect(typeof retrieved!.subtotal).toBe('number');
            expect(typeof retrieved!.total_amount).toBe('number');
        });

        it('should return null for non-existent invoice', async () => {
            const result = await getInvoiceById(999);
            expect(result).toBeNull();
        });
    });

    describe('updateInvoice', () => {
        it('should update invoice fields', async () => {
            const client1 = await createTestClient();
            const client2 = await db.insert(clientsTable)
                .values({
                    name: 'Client 2',
                    email: 'client2@test.com',
                    phone: null,
                    address: null
                })
                .returning()
                .execute()
                .then(result => result[0]);

            const item = await createTestItem();

            const created = await createInvoice({
                client_id: client1.id,
                invoice_date: new Date('2024-01-15'),
                due_date: new Date('2024-02-15'),
                discount: 0,
                notes: 'Original notes',
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            const updateInput: UpdateInvoiceInput = {
                id: created.id,
                client_id: client2.id,
                discount: 2.00,
                notes: 'Updated notes'
            };

            const updated = await updateInvoice(updateInput);

            expect(updated.client_id).toEqual(client2.id);
            expect(updated.discount).toEqual(2.00);
            expect(updated.notes).toEqual('Updated notes');
            expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
        });

        it('should update invoice items and recalculate totals', async () => {
            const client = await createTestClient();
            const item1 = await createTestItem('Item 1', 10.00);
            const item2 = await createTestItem('Item 2', 15.00);

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item1.id, quantity: 1, unit_price: 10.00 }]
            });

            expect(created.subtotal).toEqual(10.00);

            const updateInput: UpdateInvoiceInput = {
                id: created.id,
                items: [
                    { item_id: item1.id, quantity: 2, unit_price: 10.00 },
                    { item_id: item2.id, quantity: 1, unit_price: 15.00 }
                ]
            };

            const updated = await updateInvoice(updateInput);

            // New subtotal: (2 * 10.00) + (1 * 15.00) = 35.00
            expect(updated.subtotal).toEqual(35.00);
            // Tax: 35.00 * 0.11 = 3.85
            expect(updated.tax_amount).toEqual(3.85);
            // Total: 35.00 + 3.85 = 38.85
            expect(updated.total_amount).toEqual(38.85);

            // Check invoice items were updated
            const invoiceItems = await getInvoiceItems(created.id);
            expect(invoiceItems).toHaveLength(2);
        });

        it('should throw error for non-existent invoice', async () => {
            const updateInput: UpdateInvoiceInput = {
                id: 999,
                notes: 'Updated notes'
            };

            await expect(updateInvoice(updateInput)).rejects.toThrow(/invoice not found/i);
        });

        it('should throw error for non-existent client', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            const updateInput: UpdateInvoiceInput = {
                id: created.id,
                client_id: 999
            };

            await expect(updateInvoice(updateInput)).rejects.toThrow(/client not found/i);
        });
    });

    describe('updateInvoiceStatus', () => {
        it('should update invoice status', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            expect(created.status).toEqual('draft');

            const input: UpdateInvoiceStatusInput = {
                id: created.id,
                status: 'sent'
            };

            const updated = await updateInvoiceStatus(input);

            expect(updated.status).toEqual('sent');
            expect(updated.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
        });

        it('should throw error for non-existent invoice', async () => {
            const input: UpdateInvoiceStatusInput = {
                id: 999,
                status: 'sent'
            };

            await expect(updateInvoiceStatus(input)).rejects.toThrow(/invoice not found/i);
        });
    });

    describe('deleteInvoice', () => {
        it('should delete invoice and its items', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            const result = await deleteInvoice(created.id);

            expect(result.success).toBe(true);

            // Verify invoice is deleted
            const deletedInvoice = await getInvoiceById(created.id);
            expect(deletedInvoice).toBeNull();

            // Verify invoice items are deleted
            const invoiceItems = await getInvoiceItems(created.id);
            expect(invoiceItems).toHaveLength(0);
        });

        it('should return false for non-existent invoice', async () => {
            const result = await deleteInvoice(999);
            expect(result.success).toBe(false);
        });
    });

    describe('getInvoiceItems', () => {
        it('should return invoice items', async () => {
            const client = await createTestClient();
            const item1 = await createTestItem('Item 1', 10.00);
            const item2 = await createTestItem('Item 2', 15.00);

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [
                    { item_id: item1.id, quantity: 2, unit_price: 10.00 },
                    { item_id: item2.id, quantity: 1, unit_price: 15.00 }
                ]
            });

            const invoiceItems = await getInvoiceItems(created.id);

            expect(invoiceItems).toHaveLength(2);
            
            const firstItem = invoiceItems.find(item => item.item_id === item1.id);
            expect(firstItem).toBeDefined();
            expect(firstItem!.quantity).toEqual(2);
            expect(firstItem!.unit_price).toEqual(10.00);
            expect(firstItem!.line_total).toEqual(20.00);
            
            expect(typeof invoiceItems[0].quantity).toBe('number');
            expect(typeof invoiceItems[0].unit_price).toBe('number');
            expect(invoiceItems[0].created_at).toBeInstanceOf(Date);
        });

        it('should return empty array for non-existent invoice', async () => {
            const items = await getInvoiceItems(999);
            expect(items).toHaveLength(0);
        });
    });

    describe('exportInvoiceToPdf', () => {
        it('should export invoice to PDF', async () => {
            const client = await createTestClient();
            const item = await createTestItem();

            const created = await createInvoice({
                client_id: client.id,
                invoice_date: new Date(),
                due_date: new Date(),
                discount: 0,
                notes: null,
                items: [{ item_id: item.id, quantity: 1, unit_price: 10.00 }]
            });

            const input: ExportPdfInput = {
                invoice_id: created.id
            };

            const result = await exportInvoiceToPdf(input);

            expect(result.pdfBuffer).toBeInstanceOf(Buffer);
            expect(result.filename).toMatch(/^invoice-.*\.pdf$/);
            expect(result.filename.toLowerCase()).toContain(created.invoice_number.toLowerCase());
        });

        it('should throw error for non-existent invoice', async () => {
            const input: ExportPdfInput = {
                invoice_id: 999
            };

            await expect(exportInvoiceToPdf(input)).rejects.toThrow(/invoice not found/i);
        });
    });
});