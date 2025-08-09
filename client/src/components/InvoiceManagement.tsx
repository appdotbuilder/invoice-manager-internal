import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import type { Invoice, Client, Item, CreateInvoiceInput, UpdateInvoiceStatusInput } from '../../../server/src/schema';

interface InvoiceItem {
  item_id: number;
  quantity: number;
  unit_price: number;
}

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState<CreateInvoiceInput>({
    client_id: 0,
    invoice_date: new Date(),
    due_date: new Date(),
    discount: 0,
    notes: null,
    items: []
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { item_id: 0, quantity: 1, unit_price: 0 }
  ]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoicesData, clientsData, itemsData] = await Promise.all([
        trpc.invoices.getAll.query(),
        trpc.clients.getAll.query(),
        trpc.items.getAll.query()
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load invoice data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getClientName = (clientId: number): string => {
    const client = clients.find((c: Client) => c.id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getItemName = (itemId: number): string => {
    const item = items.find((i: Item) => i.id === itemId);
    return item ? item.name : 'Select Item';
  };

  const getItemPrice = (itemId: number): number => {
    const item = items.find((i: Item) => i.id === itemId);
    return item ? item.price : 0;
  };

  const calculateSubtotal = (): number => {
    return invoiceItems.reduce((sum: number, item: InvoiceItem) => {
      if (item.item_id > 0) {
        return sum + (item.quantity * item.unit_price);
      }
      return sum;
    }, 0);
  };

  const calculateTax = (subtotal: number, discount: number): number => {
    return (subtotal - discount) * 0.11; // 11% tax
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discount = formData.discount || 0;
    const tax = calculateTax(subtotal, discount);
    return subtotal - discount + tax;
  };

  const resetForm = () => {
    setFormData({
      client_id: 0,
      invoice_date: new Date(),
      due_date: new Date(),
      discount: 0,
      notes: null,
      items: []
    });
    setInvoiceItems([{ item_id: 0, quantity: 1, unit_price: 0 }]);
    setEditingInvoice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validItems = invoiceItems.filter((item: InvoiceItem) => item.item_id > 0);
      const invoiceData = {
        ...formData,
        items: validItems
      };

      if (editingInvoice) {
        await trpc.invoices.update.mutate({
          id: editingInvoice.id,
          ...invoiceData
        });
      } else {
        await trpc.invoices.create.mutate(invoiceData);
      }

      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (invoiceId: number, status: string) => {
    try {
      const input: UpdateInvoiceStatusInput = {
        id: invoiceId,
        status: status as any
      };
      await trpc.invoices.updateStatus.mutate(input);
      await loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (invoiceId: number) => {
    try {
      await trpc.invoices.delete.mutate({ id: invoiceId });
      await loadData();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleExportPdf = async (invoiceId: number) => {
    try {
      await trpc.invoices.exportPdf.mutate({ invoice_id: invoiceId });
      // In a real app, this would trigger a PDF download
      alert('PDF export functionality would be implemented here');
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceItems((prev: InvoiceItem[]) => [
      ...prev,
      { item_id: 0, quantity: 1, unit_price: 0 }
    ]);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems((prev: InvoiceItem[]) => prev.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: number) => {
    setInvoiceItems((prev: InvoiceItem[]) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-update unit price when item is selected
      if (field === 'item_id' && value > 0) {
        updated[index].unit_price = getItemPrice(value);
      }
      
      return updated;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { className: 'bg-gray-100 text-gray-700', label: '📝 Draft' },
      sent: { className: 'bg-blue-100 text-blue-700', label: '📤 Sent' },
      paid: { className: 'bg-green-100 text-green-700', label: '✅ Paid' },
      overdue: { className: 'bg-red-100 text-red-700', label: '⏰ Overdue' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
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

  if (isLoading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200">
          <CardHeader className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold text-blue-900">📄 Invoice Management</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => resetForm()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-blue-900">
                    {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                  </DialogTitle>
                  <DialogDescription>
                    Fill in the details below to {editingInvoice ? 'update' : 'create'} an invoice.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Client</label>
                      <Select
                        value={formData.client_id.toString()}
                        onValueChange={(value: string) => 
                          setFormData((prev: CreateInvoiceInput) => ({ ...prev, client_id: parseInt(value) }))
                        }
                      >
                        <SelectTrigger className="border-blue-200">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name} - {client.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Invoice Date</label>
                      <Input
                        type="date"
                        value={formData.invoice_date.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateInvoiceInput) => ({
                            ...prev,
                            invoice_date: new Date(e.target.value)
                          }))
                        }
                        className="border-blue-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateInvoiceInput) => ({
                            ...prev,
                            due_date: new Date(e.target.value)
                          }))
                        }
                        className="border-blue-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Discount ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateInvoiceInput) => ({
                            ...prev,
                            discount: parseFloat(e.target.value) || 0
                          }))
                        }
                        className="border-blue-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any additional notes for this invoice..."
                      value={formData.notes || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateInvoiceInput) => ({
                          ...prev,
                          notes: e.target.value || null
                        }))
                      }
                      className="border-blue-200"
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-blue-900">Invoice Items</h3>
                      <Button
                        type="button"
                        onClick={addInvoiceItem}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {invoiceItems.map((invoiceItem: InvoiceItem, index: number) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-blue-200 rounded-lg">
                          <div className="md:col-span-2">
                            <Select
                              value={invoiceItem.item_id.toString()}
                              onValueChange={(value: string) =>
                                updateInvoiceItem(index, 'item_id', parseInt(value))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item: Item) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name} - {formatCurrency(item.price)}/{item.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="Qty"
                              value={invoiceItem.quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)
                              }
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Price"
                              value={invoiceItem.unit_price}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-900">
                              {formatCurrency(invoiceItem.quantity * invoiceItem.unit_price)}
                            </span>
                            {invoiceItems.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeInvoiceItem(index)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Invoice Totals */}
                  <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between text-blue-700">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>Discount:</span>
                      <span>-{formatCurrency(formData.discount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>Tax (11%):</span>
                      <span>{formatCurrency(calculateTax(calculateSubtotal(), formData.discount || 0))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold text-blue-900">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="border-blue-200 text-blue-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading || formData.client_id === 0 || invoiceItems.filter(item => item.item_id > 0).length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isLoading ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">No invoices yet</h3>
              <p className="text-blue-600 mb-6">Create your first invoice to get started</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create First Invoice
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-blue-700">Invoice #</TableHead>
                    <TableHead className="text-blue-700">Client</TableHead>
                    <TableHead className="text-blue-700">Date</TableHead>
                    <TableHead className="text-blue-700">Due Date</TableHead>
                    <TableHead className="text-blue-700">Amount</TableHead>
                    <TableHead className="text-blue-700">Status</TableHead>
                    <TableHead className="text-blue-700">Actions</TableHead>
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
                        <Select
                          value={invoice.status}
                          onValueChange={(status: string) => handleStatusUpdate(invoice.id, status)}
                        >
                          <SelectTrigger className="w-32 h-8 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">📝 Draft</SelectItem>
                            <SelectItem value="sent">📤 Sent</SelectItem>
                            <SelectItem value="paid">✅ Paid</SelectItem>
                            <SelectItem value="overdue">⏰ Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportPdf(invoice.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            📄 PDF
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoice_number}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(invoice.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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