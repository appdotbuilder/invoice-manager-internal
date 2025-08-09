import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Item, CreateItemInput, UpdateItemInput } from '../../../server/src/schema';

export function ItemManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateItemInput>({
    name: '',
    price: 0,
    unit: ''
  });

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const itemsData = await trpc.items.getAll.query();
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = items.filter((item: Item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      unit: ''
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      unit: item.unit
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        const updateInput: UpdateItemInput = {
          id: editingItem.id,
          name: formData.name,
          price: formData.price,
          unit: formData.unit
        };
        await trpc.items.update.mutate(updateInput);
      } else {
        await trpc.items.create.mutate(formData);
      }

      await loadItems();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      await trpc.items.delete.mutate({ id: itemId });
      await loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const formatCurrency = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  // Common units for items
  const commonUnits = [
    'piece', 'pcs', 'unit', 'each',
    'hour', 'hr', 'hours',
    'kilogram', 'kg', 'gram', 'g',
    'meter', 'm', 'centimeter', 'cm',
    'liter', 'L', 'milliliter', 'ml',
    'box', 'pack', 'set',
    'square meter', 'sq m', 'square foot', 'sq ft'
  ];

  if (isLoading && items.length === 0) {
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
            <CardTitle className="text-xl font-semibold text-blue-900">📦 Item Management</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Search items..."
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
                    Add New Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-blue-900">
                      {editingItem ? 'Edit Item' : 'Add New Item'}
                    </DialogTitle>
                    <DialogDescription>
                      Fill in the item information below. All fields are required.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Item Name *</label>
                      <Input
                        placeholder="e.g., Website Design, Consulting Hour, Product Name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Price *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateItemInput) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0
                          }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-900">Unit *</label>
                      <Input
                        placeholder="e.g., hour, piece, kg, sq m"
                        value={formData.unit}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateItemInput) => ({ ...prev, unit: e.target.value }))
                        }
                        className="border-blue-200 focus:border-blue-500"
                        list="units-list"
                        required
                      />
                      <datalist id="units-list">
                        {commonUnits.map((unit: string) => (
                          <option key={unit} value={unit} />
                        ))}
                      </datalist>
                      <p className="text-xs text-blue-600">
                        Common units: piece, hour, kg, meter, liter, box, etc.
                      </p>
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
                        {isLoading ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                {searchTerm ? 'No items found' : 'No items yet'}
              </h3>
              <p className="text-blue-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Add your first item to start creating invoices'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-blue-700">Item Name</TableHead>
                    <TableHead className="text-blue-700">Price</TableHead>
                    <TableHead className="text-blue-700">Unit</TableHead>
                    <TableHead className="text-blue-700">Price per Unit</TableHead>
                    <TableHead className="text-blue-700">Created</TableHead>
                    <TableHead className="text-blue-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: Item) => (
                    <TableRow key={item.id} className="hover:bg-blue-50">
                      <TableCell className="font-medium text-blue-900">
                        {item.name}
                      </TableCell>
                      <TableCell className="font-medium text-blue-900">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {formatCurrency(item.price)} / {item.unit}
                      </TableCell>
                      <TableCell className="text-blue-700">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
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
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{item.name}"? This action cannot be undone and may affect existing invoices.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(item.id)}
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

      {/* Quick Stats */}
      {items.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Items</CardTitle>
              <span className="text-2xl">📦</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{items.length}</div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Highest Price</CardTitle>
              <span className="text-2xl">💎</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(Math.max(...items.map((item: Item) => item.price)))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Average Price</CardTitle>
              <span className="text-2xl">📊</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(
                  items.reduce((sum: number, item: Item) => sum + item.price, 0) / items.length
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}