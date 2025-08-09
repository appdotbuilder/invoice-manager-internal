import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User, LoginInput, RegisterInput } from '../../../server/src/schema';

interface AuthFormProps {
  onLogin: (user: User) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState<RegisterInput>({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await trpc.auth.login.mutate(loginData);
      onLogin(response.user);
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await trpc.auth.register.mutate(registerData);
      onLogin(response.user);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📧</span>
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Invoice Generator</h1>
          <p className="text-blue-600">Internal Business Management System</p>
        </div>

        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-blue-900">Welcome</CardTitle>
            <CardDescription className="text-center text-blue-600">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-blue-50">
                <TabsTrigger 
                  value="login"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">Email</label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                      }
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                      }
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">Email</label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, email: e.target.value }))
                      }
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-900">Password</label>
                    <Input
                      type="password"
                      placeholder="Create a password (min. 6 characters)"
                      value={registerData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, password: e.target.value }))
                      }
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-blue-600 mt-6">
          Built with ❤️ for internal business management
        </p>
      </div>
    </div>
  );
}