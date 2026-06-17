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
  const [deletedTodos, setDeletedTodos] = useState([]);
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

  const fetchDeletedTodos = async () => {
    if (!user) return;
    setError(null);
    try {
      const response = await fetch('/api/todos?deleted=true');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deleted tasks');
      }
      setDeletedTodos(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshAll = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await Promise.all([fetchTodos(), fetchDeletedTodos()]);
    } catch (err) {
      console.error('Failed to refresh task lists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    } else {
      setTodos([]);
      setDeletedTodos([]);
    }
  }, [user]);

  const addTodo = async (todoData) => {
    setError(null);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData),
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
      // If it was modified, it might also have changed lists/stats, so a refresh is safe
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTodo = async (id, permanent = false) => {
    setError(null);
    try {
      const url = `/api/todo?id=${id}${permanent ? '&permanent=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task');
      }
      if (permanent) {
        setDeletedTodos((prev) => prev.filter((t) => t.id !== id));
      } else {
        // Move to soft-deleted list local state
        const deletedItem = todos.find((t) => t.id === id);
        setTodos((prev) => prev.filter((t) => t.id !== id));
        if (deletedItem) {
          setDeletedTodos((prev) => [deletedItem, ...prev]);
        }
      }
      // Trigger refresh to keep sync
      refreshAll();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const restoreTodo = async (id) => {
    setError(null);
    try {
      const response = await fetch(`/api/todo?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore task');
      }
      setDeletedTodos((prev) => prev.filter((t) => t.id !== id));
      setTodos((prev) => [data, ...prev]);
      refreshAll();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    todos,
    deletedTodos,
    isLoading,
    error,
    fetchTodos,
    fetchDeletedTodos,
    refreshAll,
    addTodo,
    updateTodo,
    deleteTodo,
    restoreTodo,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};
