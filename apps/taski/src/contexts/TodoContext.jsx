import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TodoContext = createContext(null);

export const useTodos = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
};

export const TodoProvider = ({ children }) => {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTodos = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
      setTodos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTodos();
    } else {
      setTodos([]);
    }
  }, [user]);

  const addTodo = async (title, description) => {
    setError(null);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }
      setTodos((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTodo = async (id, updates) => {
    setError(null);
    try {
      const response = await fetch(`/api/todo?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task');
      }
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      );
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTodo = async (id) => {
    setError(null);
    try {
      const response = await fetch(`/api/todo?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task');
      }
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    todos,
    isLoading,
    error,
    fetchTodos,
    addTodo,
    updateTodo,
    deleteTodo,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
