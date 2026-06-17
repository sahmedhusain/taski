import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTodos } from '../contexts/TodoContext';
import { 
  LogOut, Plus, Search, Check, Trash2, Edit2, 
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
    <div className="min-h-screen bg-[#08080a] text-slate-250 flex flex-col relative overflow-hidden">
      {/* Soft Apple circular blurs */}
      <div className="glow-blur-purple top-[-10%] right-[-10%]"></div>
      <div className="glow-blur-indigo bottom-[-10%] left-[-10%]"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#08080a]/70 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white font-branding uppercase">
              Task<span className="text-[#ff453a]">I</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
              Secure Cloud
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/5 text-slate-400 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {user?.full_name && <span className="font-semibold text-slate-200">{user.full_name} •</span>}
            <span>{user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="liquid-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 z-10">
        
        {/* Statistics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total */}
          <div className="liquid-glass p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Tasks</p>
              <h3 className="text-3xl font-bold text-white">{totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-slate-350" />
            </div>
          </div>

          {/* Pending */}
          <div className="liquid-glass p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pending</p>
              <h3 className="text-3xl font-bold text-[#ff9f0a]">{pendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ff9f0a]/5 border border-[#ff9f0a]/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#ff9f0a]" />
            </div>
          </div>

          {/* Completed */}
          <div className="liquid-glass p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Completed</p>
              <h3 className="text-3xl font-bold text-[#30d158]">{completedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#30d158]/5 border border-[#30d158]/20 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-[#30d158]" />
            </div>
          </div>

          {/* Completion Rate */}
          <div className="liquid-glass p-5 flex flex-col justify-center gap-3.5">
            <div className="flex justify-between items-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Completion</p>
              <span className="text-xs font-semibold text-white">{completionRate}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* Action Controls Bar */}
        <section className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
          {/* Pill Navigation Filters */}
          <div className="liquid-pill-nav flex items-center gap-1.5 p-1 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                filterStatus === 'all' 
                  ? 'liquid-tab-active' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                filterStatus === 'active' 
                  ? 'liquid-tab-active' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                filterStatus === 'completed' 
                  ? 'liquid-tab-active' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Input and Add Button */}
          <div className="flex gap-3 w-full sm:w-auto flex-col sm:flex-row">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full liquid-input py-2.5 pl-10 pr-4 text-xs focus:outline-none"
              />
            </div>
            <button
              onClick={openAddModal}
              className="liquid-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </section>

        {/* Task Cards List */}
        <section className="space-y-3">
          {isLoading ? (
            <div className="liquid-glass p-12 text-center text-slate-400">
              <span className="inline-block animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></span>
              <p className="mt-4 text-xs text-slate-500">Fetching secure task records...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="liquid-glass p-16 text-center text-slate-500">
              <ListTodo className="w-12 h-12 mx-auto mb-3.5 text-slate-650" />
              <h3 className="text-sm font-semibold text-slate-300">No Tasks Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {searchTerm ? 'No results matched your search keywords.' : 'All clear! Add a task to start organizing.'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div 
                key={todo.id}
                className={`liquid-glass p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 ${
                  todo.is_completed ? 'opacity-50 border-emerald-950/10' : ''
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Apple Circle Checklist Checkbox */}
                  <button 
                    onClick={() => handleToggleTodo(todo)}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-250 cursor-pointer ${
                      todo.is_completed 
                        ? 'bg-white border-white text-black' 
                        : 'border-white/20 bg-transparent hover:border-white/50'
                    }`}
                    aria-label={todo.is_completed ? 'Mark pending' : 'Mark completed'}
                  >
                    {todo.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold text-white transition-all ${
                      todo.is_completed ? 'line-through text-slate-500' : ''
                    }`}>
                      {todo.title}
                    </h4>
                    {todo.description && (
                      <p className={`text-xs text-slate-400 leading-relaxed max-w-2xl ${
                        todo.is_completed ? 'line-through text-slate-500/70' : ''
                      }`}>
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-650" />
                        Created {formatDate(todo.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                  <button
                    onClick={() => openEditModal(todo)}
                    className="p-2 text-slate-400 hover:text-white rounded-full bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer"
                    aria-label="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 text-slate-400 hover:text-[#ff453a] rounded-full bg-white/0 hover:bg-[#ff453a]/10 border border-transparent hover:border-[#ff453a]/10 transition-all duration-200 cursor-pointer"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Add/Edit Liquid Glass Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg liquid-glass p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h3 className="text-base font-semibold text-white mb-5">
              {editingTodo ? 'Edit Task Specification' : 'New Task'}
            </h3>

            {modalError && (
              <div className="bg-red-955/20 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-5">
              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="todoTitle" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Task Title
                </label>
                <input
                  type="text"
                  id="todoTitle"
                  required
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="Review security protocols"
                  className="w-full liquid-input py-2.5 px-4 text-sm focus:outline-none"
                />
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="todoDescription" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Description
                </label>
                <textarea
                  id="todoDescription"
                  rows="4"
                  value={todoDescription}
                  onChange={(e) => setTodoDescription(e.target.value)}
                  placeholder="Detail the tasks that need review..."
                  className="w-full liquid-input py-2.5 px-4 text-sm focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="liquid-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="liquid-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
                >
                  {editingTodo ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
