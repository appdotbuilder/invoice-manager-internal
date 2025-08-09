import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Client, CreateClientInput, UpdateClientInput } from '../../../server/src/schema';

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    email: '',
    phone: null,
    address: null
  });

  const loadClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const clientsData = await trpc.clients.getAll.query();
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: null,
      address: null
    });
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingClient) {
        const updateInput: UpdateClientInput = {
          id: editingClient.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        };
        await trpc.clients.update.mutate(updateInput);
      } else {
        await trpc.clients.create.mutate(formData);
      }

      await loadClients();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (clientId: number) => {
    try {
      await trpc.clients.delete.mutate({ id: clientId });
      await loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (isLoading && clients.length === 0) {
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-semibold text-blue-900">👥 Client Management</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="border-blue-200 focus:border-blue-500 w-full sm:w-64"
              />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => resetForm()}
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    Add New Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-blue-900">
                      {editingClient ? 'Edit Client' : 'Add New Client'}
                    </DialogTitle>
                    <DialogDescription>
                      Fill in the client information below. All fields except phone and address are required.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Name *</label>
                      <Input
                        placeholder="Client name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClientInput) => ({ ...prev, name: e.target.value }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Email *</label>
                      <Input
                        type="email"
                        placeholder="client@example.com"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClientInput) => ({ ...prev, email: e.target.value }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Phone</label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClientInput) => ({
                            ...prev,
                            phone: e.target.value || null
                          }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Address</label>
                      <Input
                        placeholder="Client address"
                        value={formData.address || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClientInput) => ({
                            ...prev,
                            address: e.target.value || null
                          }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </div>

                    <DialogFooter className="gap-2">
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
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? 'Saving...' : (editingClient ? 'Update Client' : 'Add Client')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                {searchTerm ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-blue-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Add your first client to get started with invoicing'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add First Client
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-blue-700">Name</TableHead>
                    <TableHead className="text-blue-700">Email</TableHead>
                    <TableHead className="text-blue-700">Phone</TableHead>
                    <TableHead className="text-blue-700">Address</TableHead>
                    <TableHead className="text-blue-700">Created</TableHead>
                    <TableHead className="text-blue-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: Client) => (
                    <TableRow key={client.id} className="hover:bg-blue-50">
                      <TableCell className="font-medium text-blue-900">
                        {client.name}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        <a 
                          href={`mailto:${client.email}`} 
                          className="hover:underline text-blue-600"
                        >
                          {client.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {client.phone ? (
                          <a 
                            href={`tel:${client.phone}`} 
                            className="hover:underline text-blue-600"
                          >
                            {client.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </TableCell>
                      <TableCell className="text-blue-700 max-w-xs">
                        {client.address ? (
                          <span className="truncate block" title={client.address}>
                            {client.address}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No address</span>
                        )}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {formatDate(client.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(client)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Edit
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
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {client.name}? This action cannot be undone and may affect existing invoices.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client.id)}
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