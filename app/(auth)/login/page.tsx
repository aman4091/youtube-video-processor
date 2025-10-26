'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAllUsers, verifyUserPin, renameUser } from '@/lib/db/users';
import { User as LucideUser, Edit2, Check, X } from 'lucide-react';
import type { User } from '@/types';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, router]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setPin(['', '', '', '']);
    // Focus first PIN input
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  };

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-submit when 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      handleLogin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleLogin = async (pinValue: string) => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (pinValue.length !== 4) {
      toast.error('Please enter 4-digit PIN');
      return;
    }

    setLoggingIn(true);

    try {
      const verifiedUser = await verifyUserPin(selectedUser.username, pinValue);

      if (verifiedUser) {
        login(verifiedUser);
        toast.success(`Welcome ${verifiedUser.username}!`);
        router.push('/dashboard');
      } else {
        toast.error('Invalid PIN');
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } catch (error) {
      toast.error('Login failed');
      console.error('Login error:', error);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRename = async (userId: string) => {
    if (!newUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    const success = await renameUser(userId, newUsername.trim());

    if (success) {
      toast.success('User renamed successfully');
      // Refresh users
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
      setEditingUser(null);
      setNewUsername('');
    } else {
      toast.error('Failed to rename user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-indigo-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl"></div>
          </div>
          <p className="mt-6 text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-10 w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-3">
            Welcome Back!
          </h1>
          <p className="text-gray-400 text-lg">Select user and enter PIN</p>
        </div>

        <div className="space-y-6">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Select User
            </label>
            <div className="grid grid-cols-2 gap-3">
              {users.map((u) => (
                <div key={u.id} className="relative">
                  <button
                    onClick={() => handleUserSelect(u)}
                    className={`w-full p-4 rounded-xl border transition-all ${
                      selectedUser?.id === u.id
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-slate-700/30 border-slate-600/30 text-gray-300 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <LucideUser className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        {editingUser === u.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white w-full"
                              placeholder="New name"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(u.id)}
                              className="p-1 bg-green-600 rounded hover:bg-green-500"
                            >
                              <Check className="h-4 w-4 text-white" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setNewUsername('');
                              }}
                              className="p-1 bg-red-600 rounded hover:bg-red-500"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-xs text-gray-500">PIN: ****</p>
                          </>
                        )}
                      </div>
                      {editingUser !== u.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUser(u.id);
                            setNewUsername(u.username);
                          }}
                          className="p-2 hover:bg-slate-600/50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PIN Input */}
          {selectedUser && (
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Enter 4-Digit PIN for {selectedUser.username}
              </label>
              <div className="flex gap-3 justify-center">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loggingIn}
                    className="w-16 h-16 text-center text-2xl font-bold bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                  />
                ))}
              </div>
              <p className="text-center text-gray-500 text-sm mt-3">
                Default PIN: 0000
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            4 users • PIN-based authentication
          </p>
        </div>
      </div>
    </div>
  );
}
