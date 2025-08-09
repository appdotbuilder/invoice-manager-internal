import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  registerInputSchema,
  createClientInputSchema,
  updateClientInputSchema,
  createItemInputSchema,
  updateItemInputSchema,
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  updateInvoiceStatusInputSchema,
  invoiceFilterSchema,
  exportPdfInputSchema
} from './schema';

// Import handlers
import { loginUser, registerUser, logoutUser } from './handlers/auth';
import { createClient, getClients, getClientById, updateClient, deleteClient } from './handlers/clients';
import { createItem, getItems, getItemById, updateItem, deleteItem } from './handlers/items';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoice, 
  updateInvoiceStatus,
  deleteInvoice, 
  getInvoiceItems,
  exportInvoiceToPdf 
} from './handlers/invoices';
import { getDashboardSummary } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => loginUser(input)),
    register: publicProcedure
      .input(registerInputSchema)
      .mutation(({ input }) => registerUser(input)),
    logout: publicProcedure
      .mutation(() => logoutUser()),
  }),

  // Dashboard routes
  dashboard: router({
    summary: publicProcedure
      .query(() => getDashboardSummary()),
  }),

  // Client management routes
  clients: router({
    create: publicProcedure
      .input(createClientInputSchema)
      .mutation(({ input }) => createClient(input)),
    getAll: publicProcedure
      .query(() => getClients()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getClientById(input.id)),
    update: publicProcedure
      .input(updateClientInputSchema)
      .mutation(({ input }) => updateClient(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteClient(input.id)),
  }),

  // Item management routes
  items: router({
    create: publicProcedure
      .input(createItemInputSchema)
      .mutation(({ input }) => createItem(input)),
    getAll: publicProcedure
      .query(() => getItems()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getItemById(input.id)),
    update: publicProcedure
      .input(updateItemInputSchema)
      .mutation(({ input }) => updateItem(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteItem(input.id)),
  }),

  // Invoice management routes
  invoices: router({
    create: publicProcedure
      .input(createInvoiceInputSchema)
      .mutation(({ input }) => createInvoice(input)),
    getAll: publicProcedure
      .input(invoiceFilterSchema.optional())
      .query(({ input }) => getInvoices(input)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getInvoiceById(input.id)),
    update: publicProcedure
      .input(updateInvoiceInputSchema)
      .mutation(({ input }) => updateInvoice(input)),
    updateStatus: publicProcedure
      .input(updateInvoiceStatusInputSchema)
      .mutation(({ input }) => updateInvoiceStatus(input)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteInvoice(input.id)),
    getItems: publicProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(({ input }) => getInvoiceItems(input.invoiceId)),
    exportPdf: publicProcedure
      .input(exportPdfInputSchema)
      .mutation(({ input }) => exportInvoiceToPdf(input)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();