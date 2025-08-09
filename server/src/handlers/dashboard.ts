import { db } from '../db';
import { invoicesTable, clientsTable } from '../db/schema';
import { type DashboardSummary } from '../schema';
import { eq, desc, count, sum, and } from 'drizzle-orm';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    // Get total invoices count
    const totalInvoicesResult = await db
      .select({ count: count() })
      .from(invoicesTable)
      .execute();
    
    const total_invoices = totalInvoicesResult[0]?.count || 0;

    // Get total amount across all invoices
    const totalAmountResult = await db
      .select({ 
        total: sum(invoicesTable.total_amount)
      })
      .from(invoicesTable)
      .execute();
    
    const total_amount = totalAmountResult[0]?.total 
      ? parseFloat(totalAmountResult[0].total) 
      : 0;

    // Get paid amount (sum of invoices with 'paid' status)
    const paidAmountResult = await db
      .select({ 
        paid: sum(invoicesTable.total_amount)
      })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, 'paid'))
      .execute();
    
    const paid_amount = paidAmountResult[0]?.paid 
      ? parseFloat(paidAmountResult[0].paid) 
      : 0;

    // Get overdue invoices count
    const overdueCountResult = await db
      .select({ count: count() })
      .from(invoicesTable)
      .where(eq(invoicesTable.status, 'overdue'))
      .execute();
    
    const overdue_count = overdueCountResult[0]?.count || 0;

    // Get recent invoices (last 10) with client info
    const recentInvoicesResult = await db
      .select()
      .from(invoicesTable)
      .innerJoin(clientsTable, eq(invoicesTable.client_id, clientsTable.id))
      .orderBy(desc(invoicesTable.created_at))
      .limit(10)
      .execute();

    // Transform the joined results and convert numeric fields
    const recent_invoices = recentInvoicesResult.map(result => ({
      id: result.invoices.id,
      invoice_number: result.invoices.invoice_number,
      client_id: result.invoices.client_id,
      invoice_date: result.invoices.invoice_date,
      due_date: result.invoices.due_date,
      subtotal: parseFloat(result.invoices.subtotal),
      discount: parseFloat(result.invoices.discount),
      tax_rate: parseFloat(result.invoices.tax_rate),
      tax_amount: parseFloat(result.invoices.tax_amount),
      total_amount: parseFloat(result.invoices.total_amount),
      status: result.invoices.status,
      notes: result.invoices.notes,
      created_at: result.invoices.created_at,
      updated_at: result.invoices.updated_at
    }));

    return {
      total_invoices,
      total_amount,
      paid_amount,
      overdue_count,
      recent_invoices
    };
  } catch (error) {
    console.error('Dashboard summary retrieval failed:', error);
    throw error;
  }
}