import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkMe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const lockoutUntil = Number(localStorage.getItem('lockout_until') || '0');
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      if (Date.now() < lockoutUntil) {
        if (url.includes('/api/auth') || url.includes('/api/todo')) {
          const remainingMs = lockoutUntil - Date.now();
          const timeString = remainingMs > 60000 
            ? `${Math.ceil(remainingMs / 60000)} minute(s)` 
            : `${Math.ceil(remainingMs / 1000)} second(s)`;

          return new Response(JSON.stringify({ 
            error: `Too many requests. You have been locked out. Please try again in ${timeString}.` 
          }), {
            status: 429,
            statusText: 'Too Many Requests',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const response = await originalFetch(...args);
      if (response.status === 429) {
        localStorage.setItem('lockout_until', (Date.now() + 5 * 60 * 1000).toString());
        setUser(null);
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    checkMe();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setUser(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (email, fullName, password) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    checkMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
