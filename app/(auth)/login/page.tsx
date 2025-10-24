'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllUsers } from '@/lib/db/users';
import type { User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard');
      return;
    }

    // Fetch users from database
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getAllUsers();

        if (fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
          setSelectedUser(fetchedUsers[0].username);
        } else {
          // Fallback: Use default users if database is empty
          const defaultUsers = [
            { id: '1', username: 'User1', created_at: new Date().toISOString() },
            { id: '2', username: 'User2', created_at: new Date().toISOString() },
          ];
          setUsers(defaultUsers);
          setSelectedUser(defaultUsers[0].username);
          setError('Using default users. Please configure Supabase properly.');
        }
      } catch (err) {
        // Fallback: Use default users if database connection fails
        const defaultUsers = [
          { id: '1', username: 'User1', created_at: new Date().toISOString() },
          { id: '2', username: 'User2', created_at: new Date().toISOString() },
        ];
        setUsers(defaultUsers);
        setSelectedUser(defaultUsers[0].username);
        setError('Database connection failed. Using default users. Please check Supabase settings.');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, router]);

  const handleLogin = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    const userToLogin = users.find((u) => u.username === selectedUser);
    if (!userToLogin) {
      setError('User not found');
      return;
    }

    login(userToLogin);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back!
          </h1>
          <p className="text-gray-600">YouTube Video Processor</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label
              htmlFor="user-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Aap kaun hain?
            </label>
            <select
              id="user-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              {users.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.username}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
          >
            Enter
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Simple authentication for 2 users</p>
        </div>
      </div>
    </div>
  );
}
