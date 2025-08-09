import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer,
  varchar,
  pgEnum,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Invoice status enum
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue']);

// Users table for authentication
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Clients table
export const clientsTable = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }), // Nullable by default
  address: text('address'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Items table
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values
  unit: varchar('unit', { length: 50 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoice_number: varchar('invoice_number', { length: 50 }).notNull().unique(),
  client_id: integer('client_id').notNull(),
  invoice_date: timestamp('invoice_date').notNull(),
  due_date: timestamp('due_date').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  tax_rate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.11'), // 11% tax rate
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Invoice items table (junction table for invoice-item relationship)
export const invoiceItemsTable = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id').notNull(),
  item_id: integer('item_id').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  line_total: numeric('line_total', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  // Users don't directly relate to other entities in this app
  // but we could add user_id to invoices if needed for multi-user support
}));

export const clientsRelations = relations(clientsTable, ({ many }) => ({
  invoices: many(invoicesTable),
}));

export const itemsRelations = relations(itemsTable, ({ many }) => ({
  invoice_items: many(invoiceItemsTable),
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [invoicesTable.client_id],
    references: [clientsTable.id],
  }),
  invoice_items: many(invoiceItemsTable),
}));

export const invoiceItemsRelations = relations(invoiceItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [invoiceItemsTable.invoice_id],
    references: [invoicesTable.id],
  }),
  item: one(itemsTable, {
    fields: [invoiceItemsTable.item_id],
    references: [itemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

export type Invoice = typeof invoicesTable.$inferSelect;
export type NewInvoice = typeof invoicesTable.$inferInsert;

export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;
export type NewInvoiceItem = typeof invoiceItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  clients: clientsTable,
  items: itemsTable,
  invoices: invoicesTable,
  invoice_items: invoiceItemsTable,
};