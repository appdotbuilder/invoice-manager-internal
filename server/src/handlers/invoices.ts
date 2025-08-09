import { db } from '../db';
import { 
    invoicesTable, 
    invoiceItemsTable, 
    clientsTable, 
    itemsTable 
} from '../db/schema';
import { 
    type Invoice, 
    type InvoiceItem,
    type CreateInvoiceInput, 
    type UpdateInvoiceInput,
    type UpdateInvoiceStatusInput,
    type InvoiceFilter,
    type ExportPdfInput
} from '../schema';
import { eq, desc, and, or, like, sql, SQL, inArray } from 'drizzle-orm';

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    try {
        // Verify client exists
        const client = await db.select()
            .from(clientsTable)
            .where(eq(clientsTable.id, input.client_id))
            .execute();
        
        if (client.length === 0) {
            throw new Error('Client not found');
        }

        // Verify all items exist
        const itemIds = input.items.map(item => item.item_id);
        const items = await db.select()
            .from(itemsTable)
            .where(inArray(itemsTable.id, itemIds))
            .execute();
        
        if (items.length !== itemIds.length) {
            throw new Error('One or more items not found');
        }

        // Generate invoice number in format INV-YYYYMM-#### (reset monthly)
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const prefix = `INV-${yearMonth}-`;
        
        // Find the next number for this month
        const existingInvoices = await db.select({ invoice_number: invoicesTable.invoice_number })
            .from(invoicesTable)
            .where(like(invoicesTable.invoice_number, `${prefix}%`))
            .orderBy(desc(invoicesTable.invoice_number))
            .limit(1)
            .execute();
        
        let nextNumber = 1;
        if (existingInvoices.length > 0) {
            const lastNumber = existingInvoices[0].invoice_number.split('-')[2];
            nextNumber = parseInt(lastNumber, 10) + 1;
        }
        
        const invoiceNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        // Calculate totals
        const subtotal = input.items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_price);
        }, 0);

        const discountedSubtotal = subtotal - input.discount;
        const taxAmount = discountedSubtotal * 0.11; // 11% tax rate
        const totalAmount = discountedSubtotal + taxAmount;

        // Create invoice
        const invoiceResult = await db.insert(invoicesTable)
            .values({
                invoice_number: invoiceNumber,
                client_id: input.client_id,
                invoice_date: input.invoice_date,
                due_date: input.due_date,
                subtotal: subtotal.toString(),
                discount: input.discount.toString(),
                tax_rate: '0.11',
                tax_amount: taxAmount.toString(),
                total_amount: totalAmount.toString(),
                status: 'draft',
                notes: input.notes
            })
            .returning()
            .execute();

        const invoice = invoiceResult[0];

        // Create invoice items
        const invoiceItemsData = input.items.map(item => ({
            invoice_id: invoice.id,
            item_id: item.item_id,
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString(),
            line_total: (item.quantity * item.unit_price).toString()
        }));

        await db.insert(invoiceItemsTable)
            .values(invoiceItemsData)
            .execute();

        // Return the created invoice with numeric conversions
        return {
            ...invoice,
            subtotal: parseFloat(invoice.subtotal),
            discount: parseFloat(invoice.discount),
            tax_rate: parseFloat(invoice.tax_rate),
            tax_amount: parseFloat(invoice.tax_amount),
            total_amount: parseFloat(invoice.total_amount)
        };
    } catch (error) {
        console.error('Invoice creation failed:', error);
        throw error;
    }
}

export async function getInvoices(filter?: InvoiceFilter): Promise<Invoice[]> {
    try {
        const conditions: SQL<unknown>[] = [];

        if (filter?.status) {
            conditions.push(eq(invoicesTable.status, filter.status));
        }

        if (filter?.client_id) {
            conditions.push(eq(invoicesTable.client_id, filter.client_id));
        }

        // Handle search with or without join
        if (filter?.search) {
            // Add search condition
            conditions.push(
                or(
                    like(invoicesTable.invoice_number, `%${filter.search}%`),
                    like(clientsTable.name, `%${filter.search}%`)
                )!
            );

            // Build complete query with join in one go
            const results = conditions.length > 0
                ? await db.select()
                    .from(invoicesTable)
                    .leftJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
                    .where(and(...conditions))
                    .orderBy(desc(invoicesTable.created_at))
                    .execute()
                : await db.select()
                    .from(invoicesTable)
                    .leftJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
                    .orderBy(desc(invoicesTable.created_at))
                    .execute();

            // Convert results with join structure
            return results.map(result => {
                const invoiceData = (result as any).invoices;
                return {
                    ...invoiceData,
                    subtotal: parseFloat(invoiceData.subtotal),
                    discount: parseFloat(invoiceData.discount),
                    tax_rate: parseFloat(invoiceData.tax_rate),
                    tax_amount: parseFloat(invoiceData.tax_amount),
                    total_amount: parseFloat(invoiceData.total_amount)
                };
            });
        } else {
            // Build complete query without join in one go
            const results = conditions.length > 0
                ? await db.select()
                    .from(invoicesTable)
                    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
                    .orderBy(desc(invoicesTable.created_at))
                    .execute()
                : await db.select()
                    .from(invoicesTable)
                    .orderBy(desc(invoicesTable.created_at))
                    .execute();

            // Convert results without join structure
            return results.map(result => ({
                ...result,
                subtotal: parseFloat(result.subtotal),
                discount: parseFloat(result.discount),
                tax_rate: parseFloat(result.tax_rate),
                tax_amount: parseFloat(result.tax_amount),
                total_amount: parseFloat(result.total_amount)
            }));
        }
    } catch (error) {
        console.error('Get invoices failed:', error);
        throw error;
    }
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
    try {
        const invoices = await db.select()
            .from(invoicesTable)
            .where(eq(invoicesTable.id, id))
            .execute();

        if (invoices.length === 0) {
            return null;
        }

        const invoice = invoices[0];

        // Convert numeric fields back to numbers
        return {
            ...invoice,
            subtotal: parseFloat(invoice.subtotal),
            discount: parseFloat(invoice.discount),
            tax_rate: parseFloat(invoice.tax_rate),
            tax_amount: parseFloat(invoice.tax_amount),
            total_amount: parseFloat(invoice.total_amount)
        };
    } catch (error) {
        console.error('Get invoice by ID failed:', error);
        throw error;
    }
}

export async function updateInvoice(input: UpdateInvoiceInput): Promise<Invoice> {
    try {
        // Verify invoice exists
        const existingInvoices = await db.select()
            .from(invoicesTable)
            .where(eq(invoicesTable.id, input.id))
            .execute();
        
        if (existingInvoices.length === 0) {
            throw new Error('Invoice not found');
        }

        const existingInvoice = existingInvoices[0];

        // If client_id is being updated, verify the new client exists
        if (input.client_id && input.client_id !== existingInvoice.client_id) {
            const client = await db.select()
                .from(clientsTable)
                .where(eq(clientsTable.id, input.client_id))
                .execute();
            
            if (client.length === 0) {
                throw new Error('Client not found');
            }
        }

        // Prepare update data
        const updateData: any = {
            updated_at: new Date()
        };

        if (input.client_id !== undefined) updateData.client_id = input.client_id;
        if (input.invoice_date !== undefined) updateData.invoice_date = input.invoice_date;
        if (input.due_date !== undefined) updateData.due_date = input.due_date;
        if (input.discount !== undefined) updateData.discount = input.discount.toString();
        if (input.notes !== undefined) updateData.notes = input.notes;

        // If items are provided, recalculate totals
        if (input.items) {
            // Verify all items exist
            const itemIds = input.items.map(item => item.item_id);
            const items = await db.select()
                .from(itemsTable)
                .where(inArray(itemsTable.id, itemIds))
                .execute();
            
            if (items.length !== itemIds.length) {
                throw new Error('One or more items not found');
            }

            // Calculate new totals
            const subtotal = input.items.reduce((sum, item) => {
                return sum + (item.quantity * item.unit_price);
            }, 0);

            const discount = input.discount !== undefined ? input.discount : parseFloat(existingInvoice.discount);
            const discountedSubtotal = subtotal - discount;
            const taxAmount = discountedSubtotal * 0.11;
            const totalAmount = discountedSubtotal + taxAmount;

            updateData.subtotal = subtotal.toString();
            updateData.discount = discount.toString();
            updateData.tax_amount = taxAmount.toString();
            updateData.total_amount = totalAmount.toString();

            // Delete existing invoice items and create new ones
            await db.delete(invoiceItemsTable)
                .where(eq(invoiceItemsTable.invoice_id, input.id))
                .execute();

            const invoiceItemsData = input.items.map(item => ({
                invoice_id: input.id,
                item_id: item.item_id,
                quantity: item.quantity.toString(),
                unit_price: item.unit_price.toString(),
                line_total: (item.quantity * item.unit_price).toString()
            }));

            await db.insert(invoiceItemsTable)
                .values(invoiceItemsData)
                .execute();
        }

        // Update invoice
        const result = await db.update(invoicesTable)
            .set(updateData)
            .where(eq(invoicesTable.id, input.id))
            .returning()
            .execute();

        const invoice = result[0];

        // Convert numeric fields back to numbers
        return {
            ...invoice,
            subtotal: parseFloat(invoice.subtotal),
            discount: parseFloat(invoice.discount),
            tax_rate: parseFloat(invoice.tax_rate),
            tax_amount: parseFloat(invoice.tax_amount),
            total_amount: parseFloat(invoice.total_amount)
        };
    } catch (error) {
        console.error('Update invoice failed:', error);
        throw error;
    }
}

export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput): Promise<Invoice> {
    try {
        const result = await db.update(invoicesTable)
            .set({ 
                status: input.status,
                updated_at: new Date()
            })
            .where(eq(invoicesTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error('Invoice not found');
        }

        const invoice = result[0];

        // Convert numeric fields back to numbers
        return {
            ...invoice,
            subtotal: parseFloat(invoice.subtotal),
            discount: parseFloat(invoice.discount),
            tax_rate: parseFloat(invoice.tax_rate),
            tax_amount: parseFloat(invoice.tax_amount),
            total_amount: parseFloat(invoice.total_amount)
        };
    } catch (error) {
        console.error('Update invoice status failed:', error);
        throw error;
    }
}

export async function deleteInvoice(id: number): Promise<{ success: boolean }> {
    try {
        // Delete invoice items first (foreign key constraint)
        await db.delete(invoiceItemsTable)
            .where(eq(invoiceItemsTable.invoice_id, id))
            .execute();

        // Delete invoice
        const result = await db.delete(invoicesTable)
            .where(eq(invoicesTable.id, id))
            .returning()
            .execute();

        return { success: result.length > 0 };
    } catch (error) {
        console.error('Delete invoice failed:', error);
        throw error;
    }
}

export async function getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    try {
        const results = await db.select()
            .from(invoiceItemsTable)
            .where(eq(invoiceItemsTable.invoice_id, invoiceId))
            .orderBy(invoiceItemsTable.created_at)
            .execute();

        // Convert numeric fields back to numbers
        return results.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            line_total: parseFloat(item.line_total)
        }));
    } catch (error) {
        console.error('Get invoice items failed:', error);
        throw error;
    }
}

export async function exportInvoiceToPdf(input: ExportPdfInput): Promise<{ pdfBuffer: Buffer; filename: string }> {
    try {
        // Fetch invoice with client and items data
        const invoice = await getInvoiceById(input.invoice_id);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // For now, return a placeholder PDF buffer
        // In a real implementation, you would use a PDF library like puppeteer or jsPDF
        const pdfContent = `Invoice PDF for ${invoice.invoice_number}`;
        const pdfBuffer = Buffer.from(pdfContent);
        
        const filename = `invoice-${invoice.invoice_number.toLowerCase()}.pdf`;
        
        return {
            pdfBuffer,
            filename
        };
    } catch (error) {
        console.error('Export invoice to PDF failed:', error);
        throw error;
    }
}