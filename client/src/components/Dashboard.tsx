import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Invoice, Client, InvoiceFilter, DashboardSummary } from '../../../server/src/schema';

export function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create filter object for API call
  const filter: InvoiceFilter = {
    ...(statusFilter !== 'all' && { status: statusFilter as any }),
    ...(searchTerm && { search: searchTerm })
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoicesData, clientsData, summaryData] = await Promise.all([
        trpc.invoices.getAll.query(filter),
        trpc.clients.getAll.query(),
        trpc.dashboard.summary.query()
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter.status, filter.search]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getClientName = (clientId: number): string => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { className: 'bg-gray-100 text-gray-700 hover:bg-gray-200', label: '📝 Draft' },
      sent: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-200', label: '📤 Sent' },
      paid: { className: 'bg-green-100 text-green-700 hover:bg-green-200', label: '✅ Paid' },
      overdue: { className: 'bg-red-100 text-red-700 hover:bg-red-200', label: '⏰ Overdue' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-blue-200">
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Invoices</CardTitle>
              <span className="text-2xl">📄</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{summary.total_invoices}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Amount</CardTitle>
              <span className="text-2xl">💰</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(summary.total_amount)}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Paid Amount</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(summary.paid_amount)}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Overdue</CardTitle>
              <span className="text-2xl">⚠️</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{summary.overdue_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-blue-900">📊 Invoice Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search invoices by number or client..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">📝 Draft</SelectItem>
                  <SelectItem value="sent">📤 Sent</SelectItem>
                  <SelectItem value="paid">✅ Paid</SelectItem>
                  <SelectItem value="overdue">⏰ Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice List */}
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">No invoices found</h3>
              <p className="text-blue-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first invoice to get started'
                }
              </p>
              {(!searchTerm && statusFilter === 'all') && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create First Invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-blue-700">Invoice Number</TableHead>
                    <TableHead className="text-blue-700">Client</TableHead>
                    <TableHead className="text-blue-700">Invoice Date</TableHead>
                    <TableHead className="text-blue-700">Due Date</TableHead>
                    <TableHead className="text-blue-700">Amount</TableHead>
                    <TableHead className="text-blue-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: Invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-blue-50">
                      <TableCell className="font-medium text-blue-900">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {getClientName(invoice.client_id)}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {formatDate(invoice.invoice_date)}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {formatDate(invoice.due_date)}
                      </TableCell>
                      <TableCell className="font-medium text-blue-900">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}