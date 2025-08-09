import { useState, useEffect } from 'react';
import { trpc } from './utils/trpc';
import type { User } from '../../server/src/schema';

// Components
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { InvoiceManagement } from './components/InvoiceManagement';
import { ClientManagement } from './components/ClientManagement';
import { ItemManagement } from './components/ItemManagement';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check for existing session on app load
  useEffect(() => {
    // For this demo, we'll simulate checking for an existing session
    // In a real app, you'd check for stored auth tokens or session cookies
    const checkSession = async () => {
      try {
        // Simulated session check - in practice you'd verify JWT tokens
        const storedUser = localStorage.getItem('invoice_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    // Store user in localStorage for session persistence
    localStorage.setItem('invoice_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    try {
      await trpc.auth.logout.mutate();
      setUser(null);
      localStorage.removeItem('invoice_user');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if server logout fails
      setUser(null);
      localStorage.removeItem('invoice_user');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <AuthForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📧</span>
              </div>
              <h1 className="text-xl font-semibold text-blue-900">Invoice Generator Internal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-700">Welcome, {user.email}</span>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white border border-blue-200">
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-700 font-medium"
            >
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-700 font-medium"
            >
              📄 Invoices
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-700 font-medium"
            >
              👥 Clients
            </TabsTrigger>
            <TabsTrigger 
              value="items"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-blue-700 font-medium"
            >
              📦 Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <InvoiceManagement />
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <ClientManagement />
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <ItemManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;