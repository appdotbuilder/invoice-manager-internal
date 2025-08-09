import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, invoicesTable } from '../db/schema';
import { getDashboardSummary } from '../handlers/dashboard';

// Test data
const testClient = {
  name: 'Test Client',
  email: 'client@test.com',
  phone: '123-456-7890',
  address: '123 Test St'
};

const createTestInvoice = (clientId: number, overrides: any = {}) => ({
  invoice_number: `INV-${Date.now()}-${Math.random()}`,
  client_id: clientId,
  invoice_date: new Date(),
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  subtotal: '100.00',
  discount: '0.00',
  tax_rate: '0.1100',
  tax_amount: '11.00',
  total_amount: '111.00',
  status: 'draft' as const,
  notes: 'Test invoice',
  ...overrides
});

describe('getDashboardSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty dashboard when no invoices exist', async () => {
    const result = await getDashboardSummary();

    expect(result.total_invoices).toEqual(0);
    expect(result.total_amount).toEqual(0);
    expect(result.paid_amount).toEqual(0);
    expect(result.overdue_count).toEqual(0);
    expect(result.recent_invoices).toHaveLength(0);
  });

  it('should calculate correct statistics with multiple invoices', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create invoices with different statuses and amounts
    await db.insert(invoicesTable).values([
      createTestInvoice(clientId, { 
        status: 'paid', 
        total_amount: '100.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'paid', 
        total_amount: '200.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'overdue', 
        total_amount: '300.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'draft', 
        total_amount: '150.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'sent', 
        total_amount: '250.00' 
      })
    ]).execute();

    const result = await getDashboardSummary();

    expect(result.total_invoices).toEqual(5);
    expect(result.total_amount).toEqual(1000); // 100 + 200 + 300 + 150 + 250
    expect(result.paid_amount).toEqual(300); // 100 + 200
    expect(result.overdue_count).toEqual(1);
    expect(result.recent_invoices).toHaveLength(5);
  });

  it('should return recent invoices in correct order', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create invoices with different creation times
    const oldDate = new Date('2023-01-01');
    const recentDate = new Date();

    await db.insert(invoicesTable).values([
      createTestInvoice(clientId, { 
        invoice_number: 'OLD-001',
        created_at: oldDate 
      }),
      createTestInvoice(clientId, { 
        invoice_number: 'NEW-001',
        created_at: recentDate 
      })
    ]).execute();

    const result = await getDashboardSummary();

    expect(result.recent_invoices).toHaveLength(2);
    expect(result.recent_invoices[0].invoice_number).toEqual('NEW-001');
    expect(result.recent_invoices[1].invoice_number).toEqual('OLD-001');
  });

  it('should limit recent invoices to 10 items', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create 15 invoices
    const invoices = Array.from({ length: 15 }, (_, i) => 
      createTestInvoice(clientId, { 
        invoice_number: `INV-${i.toString().padStart(3, '0')}` 
      })
    );

    await db.insert(invoicesTable).values(invoices).execute();

    const result = await getDashboardSummary();

    expect(result.total_invoices).toEqual(15);
    expect(result.recent_invoices).toHaveLength(10);
  });

  it('should convert numeric fields correctly', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create invoice with specific numeric values
    await db.insert(invoicesTable).values(
      createTestInvoice(clientId, {
        subtotal: '99.99',
        discount: '5.50',
        tax_rate: '0.1100',
        tax_amount: '10.39',
        total_amount: '104.88',
        status: 'paid'
      })
    ).execute();

    const result = await getDashboardSummary();

    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.paid_amount).toBe('number');
    expect(result.total_amount).toEqual(104.88);
    expect(result.paid_amount).toEqual(104.88);

    // Check invoice numeric fields
    const invoice = result.recent_invoices[0];
    expect(typeof invoice.subtotal).toBe('number');
    expect(typeof invoice.discount).toBe('number');
    expect(typeof invoice.tax_rate).toBe('number');
    expect(typeof invoice.tax_amount).toBe('number');
    expect(typeof invoice.total_amount).toBe('number');
    
    expect(invoice.subtotal).toEqual(99.99);
    expect(invoice.discount).toEqual(5.5);
    expect(invoice.tax_rate).toEqual(0.11);
    expect(invoice.tax_amount).toEqual(10.39);
    expect(invoice.total_amount).toEqual(104.88);
  });

  it('should handle different invoice statuses correctly', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create invoices with all possible statuses
    await db.insert(invoicesTable).values([
      createTestInvoice(clientId, { 
        status: 'draft', 
        total_amount: '100.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'sent', 
        total_amount: '200.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'paid', 
        total_amount: '300.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'overdue', 
        total_amount: '400.00' 
      }),
      createTestInvoice(clientId, { 
        status: 'overdue', 
        total_amount: '500.00' 
      })
    ]).execute();

    const result = await getDashboardSummary();

    expect(result.total_invoices).toEqual(5);
    expect(result.total_amount).toEqual(1500);
    expect(result.paid_amount).toEqual(300); // Only paid invoices
    expect(result.overdue_count).toEqual(2); // Two overdue invoices
  });

  it('should include client information in recent invoices', async () => {
    // Create test client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    
    const clientId = clientResult[0].id;

    // Create test invoice
    await db.insert(invoicesTable).values(
      createTestInvoice(clientId)
    ).execute();

    const result = await getDashboardSummary();

    expect(result.recent_invoices).toHaveLength(1);
    const invoice = result.recent_invoices[0];
    
    expect(invoice.client_id).toEqual(clientId);
    expect(invoice.invoice_number).toBeDefined();
    expect(invoice.invoice_date).toBeInstanceOf(Date);
    expect(invoice.due_date).toBeInstanceOf(Date);
    expect(invoice.created_at).toBeInstanceOf(Date);
    expect(invoice.updated_at).toBeInstanceOf(Date);
    expect(invoice.status).toEqual('draft');
  });
});