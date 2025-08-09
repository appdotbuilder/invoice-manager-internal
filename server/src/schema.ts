import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

// Client schemas
export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Client = z.infer<typeof clientSchema>;

export const createClientInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable()
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

export const updateClientInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;

// Item schemas
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().positive(),
  unit: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Item = z.infer<typeof itemSchema>;

export const createItemInputSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
  unit: z.string()
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

export const updateItemInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  price: z.number().positive().optional(),
  unit: z.string().optional()
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

// Invoice status enum
export const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid', 'overdue']);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

// Invoice schemas
export const invoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  client_id: z.number(),
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date(),
  subtotal: z.number(),
  discount: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  status: invoiceStatusEnum,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceInputSchema = z.object({
  client_id: z.number(),
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date(),
  discount: z.number().default(0),
  notes: z.string().nullable(),
  items: z.array(z.object({
    item_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive()
  }))
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export const updateInvoiceInputSchema = z.object({
  id: z.number(),
  client_id: z.number().optional(),
  invoice_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  discount: z.number().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(z.object({
    item_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive()
  })).optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

export const updateInvoiceStatusInputSchema = z.object({
  id: z.number(),
  status: invoiceStatusEnum
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusInputSchema>;

// Invoice item schemas
export const invoiceItemSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  item_id: z.number(),
  quantity: z.number(),
  unit_price: z.number(),
  line_total: z.number(),
  created_at: z.coerce.date()
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// Filter and search schemas
export const invoiceFilterSchema = z.object({
  status: invoiceStatusEnum.optional(),
  client_id: z.number().optional(),
  search: z.string().optional()
});

export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;

// PDF export schema
export const exportPdfInputSchema = z.object({
  invoice_id: z.number()
});

export type ExportPdfInput = z.infer<typeof exportPdfInputSchema>;

// Dashboard summary schema
export const dashboardSummarySchema = z.object({
  total_invoices: z.number(),
  total_amount: z.number(),
  paid_amount: z.number(),
  overdue_count: z.number(),
  recent_invoices: z.array(invoiceSchema)
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;