import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTodos } from '../contexts/TodoContext';
import { 
  LogOut, Plus, Search, CheckCircle, Trash2, Edit2, 
  ListTodo, Clock, CheckSquare, Layers, X, Calendar, User
} from 'lucide-react';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { todos, addTodo, updateTodo, deleteTodo, isLoading } = useTodos();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [modalError, setModalError] = useState('');

  // Math Metrics
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.is_completed).length;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter & Search logic
  const filteredTodos = todos.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'completed') return matchesSearch && t.is_completed;
    if (filterStatus === 'active') return matchesSearch && !t.is_completed;
    return matchesSearch;
  });

  const openAddModal = () => {
    setEditingTodo(null);
    setTodoTitle('');
    setTodoDescription('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setTodoTitle(todo.title);
    setTodoDescription(todo.description);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!todoTitle.trim()) {
      setModalError('Title is required');
      return;
    }

    try {
      if (editingTodo) {
        await updateTodo(editingTodo.id, {
          title: todoTitle,
          description: todoDescription,
        });
      } else {
        await addTodo(todoTitle, todoDescription);
      }
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Action failed');
    }
  };

  const handleToggleTodo = async (todo) => {
    try {
      const isCompleted = !todo.is_completed;
      await updateTodo(todo.id, {
        is_completed: isCompleted,
      });
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Accent Background Highlights */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-950/40">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Task<span className="text-red-500">I</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Secure Node
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
            <User className="w-3.5 h-3.5 text-violet-400" />
            <span>{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900/40 hover:bg-red-950/20 border border-slate-900 hover:border-red-900/30 transition-all duration-200"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Dashboard container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 z-10">
        
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Tasks</p>
              <h3 className="text-3xl font-extrabold text-white">{totalCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-400" />
            </div>
          </div>

          {/* Pending */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending</p>
              <h3 className="text-3xl font-extrabold text-amber-400">{pendingCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          {/* Completed */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completed</p>
              <h3 className="text-3xl font-extrabold text-emerald-400">{completedCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Completion Rate */}
          <div className="glass rounded-xl p-5 flex flex-col justify-center gap-3">
            <div className="flex justify-between items-center">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completion Rate</p>
              <span className="text-xs font-bold text-violet-400">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
              <div 
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <section className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/30 border border-slate-900 p-4 rounded-xl">
          {/* Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-900 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                filterStatus === 'all' 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-950/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                filterStatus === 'active' 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-950/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                filterStatus === 'completed' 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-950/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search and Add */}
          <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <button
              onClick={openAddModal}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-violet-950/40 flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </section>

        {/* Task List */}
        <section className="space-y-3">
          {isLoading ? (
            <div className="glass rounded-xl p-12 text-center text-slate-400">
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></span>
              <p className="mt-4 text-sm font-medium">Fetching secure task record...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-slate-500 border-dashed border-slate-800">
              <ListTodo className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-slate-400">No Tasks Found</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                {searchTerm ? 'Try tweaking your search keywords.' : 'Add your first task to get started.'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div 
                key={todo.id}
                className={`glass glass-hover rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${
                  todo.is_completed ? 'opacity-65 border-emerald-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <button 
                    onClick={() => handleToggleTodo(todo)}
                    className={`mt-1 flex-shrink-0 w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                      todo.is_completed 
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                        : 'border-slate-700 hover:border-violet-500'
                    }`}
                    aria-label={todo.is_completed ? 'Mark task pending' : 'Mark task completed'}
                  >
                    {todo.is_completed && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold text-white transition-all ${
                      todo.is_completed ? 'line-through text-slate-450 opacity-70' : ''
                    }`}>
                      {todo.title}
                    </h4>
                    {todo.description && (
                      <p className={`text-xs text-slate-400 leading-relaxed max-w-2xl ${
                        todo.is_completed ? 'line-through opacity-70' : ''
                      }`}>
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-700" />
                        Created {formatDate(todo.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-900 pt-3 sm:pt-0">
                  <button
                    onClick={() => openEditModal(todo)}
                    className="p-2 text-slate-400 hover:text-violet-400 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-200"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all duration-200"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350 p-1"
              aria-label="Close dialog"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-5">
              {editingTodo ? 'Edit Task Specification' : 'Establish New Task'}
            </h3>

            {modalError && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-2.5 text-red-400 text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-5">
              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="todoTitle" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  id="todoTitle"
                  required
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="Review security protocols"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
                />
                <div className="error-message text-red-400 text-xs mt-1">
                  Title is required.
                </div>
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="todoDescription" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="todoDescription"
                  rows="4"
                  value={todoDescription}
                  onChange={(e) => setTodoDescription(e.target.value)}
                  placeholder="Detail the tasks that need review..."
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-violet-950/40 transition-colors cursor-pointer"
                >
                  {editingTodo ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
