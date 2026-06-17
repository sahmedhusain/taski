import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTodos } from '../contexts/TodoContext';
import { 
  LogOut, Plus, Search, Check, Trash2, Edit2, 
  ListTodo, Clock, CheckSquare, Layers, X, Calendar, User,
  Flag, AlertTriangle, MapPin, Link, Undo2, ChevronRight, Info
} from 'lucide-react';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { todos, deletedTodos, addTodo, updateTodo, deleteTodo, restoreTodo, isLoading } = useTodos();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation states
  const [selectedView, setSelectedView] = useState('all'); // all, today, scheduled, flagged, urgent, completed, list, trash
  const [selectedList, setSelectedList] = useState('Todos'); // name of currently selected custom list
  
  // Dynamic Lists state
  const [listNames, setListNames] = useState(['Todos', 'To Buy', 'Work', 'Personal']);
  const dynamicListNames = Array.from(new Set([
    ...listNames,
    ...todos.map(t => t.list_name).filter(Boolean),
    ...deletedTodos.map(t => t.list_name).filter(Boolean),
  ]));
  const [newListName, setNewListName] = useState('');
  const [showAddListInput, setShowAddListInput] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  
  // New Reminder Form states
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoURL, setTodoURL] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [todoDate, setTodoDate] = useState('');
  const [hasTime, setHasTime] = useState(false);
  const [todoTime, setTodoTime] = useState('');
  const [todoUrgent, setTodoUrgent] = useState(false);
  const [todoList, setTodoList] = useState('Todos');
  const [todoTags, setTodoTags] = useState('');
  const [todoFlagged, setTodoFlagged] = useState(false);
  const [todoPriority, setTodoPriority] = useState('None');
  const [hasLocation, setHasLocation] = useState(false);
  const [todoLocation, setTodoLocation] = useState('');
  const [todoSection, setTodoSection] = useState('');
  
  const [modalError, setModalError] = useState('');

  // Date Check Helpers
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  // Counts for Stats Grid
  const countToday = todos.filter(t => !t.is_completed && isToday(t.due_date)).length;
  const countScheduled = todos.filter(t => !t.is_completed && t.due_date).length;
  const countAll = todos.length;
  const countFlagged = todos.filter(t => !t.is_completed && t.is_flagged).length;
  const countUrgent = todos.filter(t => !t.is_completed && t.is_urgent).length;
  const countCompleted = todos.filter(t => t.is_completed).length;
  const countTrash = deletedTodos.length;

  const statTiles = [
    { key: 'today', label: 'Today', icon: Calendar, count: countToday, color: '#0a84ff' },
    { key: 'scheduled', label: 'Scheduled', icon: Clock, count: countScheduled, color: '#ff453a' },
    { key: 'all', label: 'All', icon: Layers, count: countAll, color: '#8e8e93' },
    { key: 'flagged', label: 'Flagged', icon: Flag, count: countFlagged, color: '#ff9f0a' },
    { key: 'urgent', label: 'Urgent', icon: AlertTriangle, count: countUrgent, color: '#ff375f' },
    { key: 'completed', label: 'Completed', icon: CheckSquare, count: countCompleted, color: '#30d158' },
  ];

  // Handler for adding dynamic lists
  const handleCreateList = (e) => {
    e.preventDefault();
    const cleanName = newListName.trim();
    if (cleanName && !dynamicListNames.includes(cleanName)) {
      setListNames([...listNames, cleanName]);
      setSelectedView('list');
      setSelectedList(cleanName);
      setNewListName('');
      setShowAddListInput(false);
    }
  };

  // Filter Active View
  const getFilteredTodos = () => {
    let base = [...todos];
    
    if (selectedView === 'trash') {
      base = [...deletedTodos];
    } else if (selectedView === 'today') {
      base = base.filter(t => isToday(t.due_date));
    } else if (selectedView === 'scheduled') {
      base = base.filter(t => t.due_date);
    } else if (selectedView === 'flagged') {
      base = base.filter(t => t.is_flagged);
    } else if (selectedView === 'urgent') {
      base = base.filter(t => t.is_urgent);
    } else if (selectedView === 'completed') {
      base = base.filter(t => t.is_completed);
    } else if (selectedView === 'list') {
      base = base.filter(t => t.list_name === selectedList);
    }

    // Apply visibility filter for completed
    if (selectedView !== 'completed' && selectedView !== 'trash' && !showCompleted) {
      base = base.filter(t => !t.is_completed);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      base = base.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.toLowerCase().includes(q)) ||
        (t.location && t.location.toLowerCase().includes(q))
      );
    }

    return base;
  };

  const currentViewTodos = getFilteredTodos();

  // Group current view todos by section
  const getGroupedTodos = () => {
    const sections = {};
    currentViewTodos.forEach(todo => {
      const sec = (todo.section_name && todo.section_name.trim()) || 'Tasks';
      if (!sections[sec]) {
        sections[sec] = [];
      }
      sections[sec].push(todo);
    });
    return sections;
  };

  const groupedTodos = getGroupedTodos();

  const openAddModal = () => {
    setEditingTodo(null);
    setTodoTitle('');
    setTodoDescription('');
    setTodoURL('');
    setHasDate(false);
    setTodoDate('');
    setHasTime(false);
    setTodoTime('');
    setTodoUrgent(false);
    setTodoList(selectedView === 'list' ? selectedList : 'Todos');
    setTodoTags('');
    setTodoFlagged(selectedView === 'flagged' ? true : false);
    setTodoPriority('None');
    setHasLocation(false);
    setTodoLocation('');
    setTodoSection('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setTodoTitle(todo.title);
    setTodoDescription(todo.description || '');
    setTodoURL(todo.url || '');
    setHasDate(!!todo.due_date);
    setTodoDate(todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '');
    setHasTime(!!todo.due_time);
    setTodoTime(todo.due_time || '');
    setTodoUrgent(todo.is_urgent || false);
    setTodoList(todo.list_name || 'Todos');
    setTodoTags(todo.tags || '');
    setTodoFlagged(todo.is_flagged || false);
    setTodoPriority(todo.priority || 'None');
    setHasLocation(!!todo.location);
    setTodoLocation(todo.location || '');
    setTodoSection(todo.section_name || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!todoTitle.trim()) {
      setModalError('Title is required');
      return;
    }

    const payload = {
      title: todoTitle,
      description: todoDescription,
      url: todoURL,
      due_date: hasDate && todoDate ? todoDate : '',
      due_time: hasTime && todoTime ? todoTime : '',
      is_urgent: todoUrgent,
      list_name: todoList,
      tags: todoTags,
      is_flagged: todoFlagged,
      priority: todoPriority,
      location: hasLocation ? todoLocation : '',
      section_name: todoSection,
    };

    try {
      if (editingTodo) {
        await updateTodo(editingTodo.id, payload);
      } else {
        await addTodo(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Action failed');
    }
  };

  const handleToggleTodo = async (todo) => {
    if (selectedView === 'trash') return;
    try {
      await updateTodo(todo.id, {
        is_completed: !todo.is_completed,
      });
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
    }
  };

  const handleClearCompleted = async () => {
    const completedInView = currentViewTodos.filter(t => t.is_completed);
    for (const t of completedInView) {
      try {
        await deleteTodo(t.id, false); // Moves to trash
      } catch (err) {
        console.error('Failed to clear completed task:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getPriorityMarker = (priority) => {
    if (priority === 'Low') return <span className="text-[#30d158] font-bold text-xs mr-1">!</span>;
    if (priority === 'Medium') return <span className="text-[#ff9f0a] font-bold text-xs mr-1">!!</span>;
    if (priority === 'High') return <span className="text-[#ff453a] font-bold text-xs mr-1">!!!</span>;
    return null;
  };

  return (
    <div className="min-h-screen md:h-screen bg-[#08080a] text-slate-200 flex flex-col relative md:overflow-hidden">
      {/* Soft Apple circular blurs */}
      <div className="glow-blur-purple top-[-10%] right-[-10%]"></div>
      <div className="glow-blur-indigo bottom-[-10%] left-[-10%]"></div>

      {/* Header — floating glass pill, detached from the viewport edges */}
      <header className="sticky top-4 sm:top-6 z-40 mx-4 sm:mx-6 liquid-nav px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="liquid-orb w-10 h-10 rounded-2xl bg-gradient-to-br from-white/15 to-white/[0.02] border border-white/10 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white font-branding uppercase leading-none">
              Task<span className="text-[#ff453a]">I</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
              Secure Cloud
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/10 text-slate-400 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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

      {/* Main Panel with Sidebar and Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6 z-10 overflow-y-auto md:overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-80 flex flex-col gap-4 md:h-full md:overflow-hidden flex-shrink-0">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full liquid-input py-2.5 pl-10 pr-4 text-xs focus:outline-none"
            />
          </div>

          {/* Apple Grid Stats */}
          <section className="grid grid-cols-2 gap-3.5 flex-shrink-0">
            {statTiles.map((tile) => {
              const Icon = tile.icon;
              const isActive = selectedView === tile.key;
              return (
                <button
                  key={tile.key}
                  onClick={() => setSelectedView(tile.key)}
                  style={isActive ? { '--tile-accent': tile.color } : undefined}
                  className={`liquid-tile liquid-interactive p-3.5 rounded-[22px] flex flex-col justify-between items-start text-left ${
                    isActive ? 'liquid-tile-active' : ''
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <div
                      className="liquid-orb w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: tile.color, '--orb-shadow': `${tile.color}66` }}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">{tile.count}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-wider">{tile.label}</span>
                </button>
              );
            })}
          </section>

          {/* Lists Panel */}
          <div className="liquid-glass p-5 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">My Lists</span>
              <button 
                onClick={() => setShowAddListInput(!showAddListInput)}
                className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddListInput && (
              <form onSubmit={handleCreateList} className="flex gap-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="List Name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="flex-1 liquid-input py-1.5 px-3 text-xs focus:outline-none"
                  autoFocus
                />
                <button type="submit" className="liquid-btn-primary px-3 text-xs cursor-pointer">Add</button>
              </form>
            )}

            <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
              {dynamicListNames.map(name => {
                const listCount = todos.filter(t => !t.is_completed && t.list_name === name).length;
                const isActive = selectedView === 'list' && selectedList === name;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setSelectedView('list');
                      setSelectedList(name);
                    }}
                    className={`relative w-full pl-4 pr-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white/[0.07] text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-blue-500"></span>
                    )}
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{listCount}</span>
                  </button>
                );
              })}
            </div>

            <hr className="border-white/5 my-1" />

            {/* Trash Bin */}
            <button
              onClick={() => setSelectedView('trash')}
              className={`relative w-full pl-4 pr-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all duration-200 cursor-pointer ${
                selectedView === 'trash'
                  ? 'bg-white/[0.07] text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {selectedView === 'trash' && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-red-500"></span>
              )}
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Recently Deleted</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">{countTrash}</span>
            </button>
          </div>
        </aside>

        {/* Right Workspace */}
        <main className="flex-1 flex flex-col gap-6 md:h-full md:overflow-hidden">
          
          {/* Header Area */}
          <section className="liquid-glass flex flex-col sm:flex-row gap-4 items-center justify-between p-5">
            <div>
              <h2 className="text-2xl font-black text-white font-branding tracking-wide capitalize flex items-center gap-2">
                {selectedView === 'list' ? selectedList : selectedView}
                <span className="text-xs bg-white/5 border border-white/5 text-slate-400 px-2.5 py-1 rounded-full font-sans font-bold tracking-normal">
                  {currentViewTodos.length}
                </span>
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">
                {selectedView === 'trash' ? 'Items are auto-purged 30 days after deletion' : 'Reminders workspace'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {selectedView !== 'trash' && selectedView !== 'completed' && (
                <>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="liquid-btn-secondary px-3.5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {showCompleted ? 'Hide Completed' : 'Show Completed'}
                  </button>
                  <button
                    onClick={handleClearCompleted}
                    className="liquid-btn-secondary px-3.5 py-2 text-xs font-semibold text-[#ff453a] hover:bg-[#ff453a]/10 hover:border-[#ff453a]/10 cursor-pointer"
                    disabled={currentViewTodos.filter(t => t.is_completed).length === 0}
                  >
                    Clear Completed
                  </button>
                </>
              )}
              {selectedView !== 'trash' && (
                <button
                  onClick={openAddModal}
                  className="liquid-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Reminder
                </button>
              )}
            </div>
          </section>

          {/* Reminders List (Grouped by Sections) */}
          <section className="flex-1 overflow-y-auto space-y-6 pr-1">
            {isLoading ? (
              <div className="liquid-glass p-12 text-center text-slate-400">
                <span className="inline-block animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></span>
                <p className="mt-4 text-xs text-slate-500">Retrieving encrypted reminders...</p>
              </div>
            ) : currentViewTodos.length === 0 ? (
              <div className="liquid-glass p-16 text-center text-slate-500">
                <ListTodo className="w-12 h-12 mx-auto mb-3.5 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-300">No Reminders</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchTerm ? 'No results matched your search keywords.' : 'All clear! Add a new reminder to begin.'}
                </p>
              </div>
            ) : (
              Object.keys(groupedTodos).map(section => (
                <div key={section} className="space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center gap-2.5 px-1 py-1">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section}</h4>
                    <span className="text-[10px] text-slate-600 font-bold">({groupedTodos[section].length})</span>
                  </div>

                  {/* Todos inside section */}
                  <div className="space-y-2.5">
                    {groupedTodos[section].map((todo) => (
                      <div 
                        key={todo.id}
                        className={`liquid-glass liquid-interactive p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          todo.is_completed ? 'opacity-50 border-emerald-950/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Circular iOS-Style Checklist Checkbox */}
                          <button 
                            onClick={() => handleToggleTodo(todo)}
                            disabled={selectedView === 'trash'}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              todo.is_completed 
                                ? 'bg-white border-white text-black' 
                                : selectedView === 'trash'
                                  ? 'border-white/10 bg-transparent text-transparent cursor-not-allowed'
                                  : 'border-white/20 bg-transparent hover:border-white/50'
                            }`}
                            aria-label={todo.is_completed ? 'Mark pending' : 'Mark completed'}
                          >
                            {todo.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="space-y-1 min-w-0 flex-1">
                            <h5 className={`text-sm font-bold text-white transition-all truncate flex items-center gap-1.5 ${
                              todo.is_completed ? 'line-through text-slate-500' : ''
                            }`}>
                              {getPriorityMarker(todo.priority)}
                              {todo.title}
                              {todo.is_urgent && (
                                <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                  Urgent
                                </span>
                              )}
                              {todo.list_name && selectedView !== 'list' && (
                                <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                  {todo.list_name}
                                </span>
                              )}
                            </h5>
                            
                            {todo.description && (
                              <p className={`text-xs text-slate-400 leading-relaxed break-words max-w-2xl ${
                                todo.is_completed ? 'line-through text-slate-500/70' : ''
                              }`}>
                                {todo.description}
                              </p>
                            )}

                            {/* URL, Tags, Location, Due Date */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[10px] text-slate-500">
                              {todo.url && (
                                <a 
                                  href={todo.url.startsWith('http') ? todo.url : `https://${todo.url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-1 text-blue-400 hover:underline cursor-pointer"
                                >
                                  <Link className="w-3 h-3" />
                                  <span>{todo.url}</span>
                                </a>
                              )}
                              {todo.due_date && (
                                <span className="flex items-center gap-1 text-red-400/80 font-semibold">
                                  <Calendar className="w-3 h-3" />
                                  <span>Due {formatDate(todo.due_date)}{todo.due_time ? ` at ${todo.due_time}` : ''}</span>
                                </span>
                              )}
                              {todo.location && (
                                <span className="flex items-center gap-1 text-[#30d158]/80">
                                  <MapPin className="w-3 h-3" />
                                  <span>{todo.location}</span>
                                </span>
                              )}
                              {todo.tags && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  {todo.tags.split(',').map(tag => (
                                    <span key={tag} className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md">
                                      #{tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 border-white/5 pt-2.5 sm:pt-0">
                          {selectedView === 'trash' ? (
                            <>
                              <button
                                onClick={() => restoreTodo(todo.id)}
                                className="p-2 text-slate-400 hover:text-emerald-400 rounded-full bg-white/0 hover:bg-emerald-400/10 border border-transparent hover:border-emerald-400/10 transition-all duration-200 cursor-pointer"
                                title="Restore reminder"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id, true)}
                                className="p-2 text-slate-400 hover:text-[#ff453a] rounded-full bg-white/0 hover:bg-[#ff453a]/10 border border-transparent hover:border-[#ff453a]/10 transition-all duration-200 cursor-pointer"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(todo)}
                                className="p-2 text-slate-400 hover:text-white rounded-full bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer"
                                aria-label="Edit reminder"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id, false)}
                                className="p-2 text-slate-400 hover:text-[#ff453a] rounded-full bg-white/0 hover:bg-[#ff453a]/10 border border-transparent hover:border-[#ff453a]/10 transition-all duration-200 cursor-pointer"
                                aria-label="Delete reminder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>

      {/* New Reminder dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 cursor-pointer rounded-full hover:bg-white/5 transition-all"
              aria-label="Close dialog"
            >
              <X className="w-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-blue-400" />
              {editingTodo ? 'Edit Reminder Details' : 'New Reminder'}
            </h3>

            {modalError && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              
              {/* Title & Notes Card */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3 shadow-inner">
                <input
                  type="text"
                  required
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none py-1 border-b border-white/5"
                />
                <textarea
                  rows="3"
                  value={todoDescription}
                  onChange={(e) => setTodoDescription(e.target.value)}
                  placeholder="Notes"
                  className="w-full bg-transparent text-slate-300 placeholder-slate-500 text-xs focus:outline-none resize-none pt-1"
                ></textarea>
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">URL</span>
                  <input
                    type="text"
                    value={todoURL}
                    onChange={(e) => setTodoURL(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 bg-transparent text-slate-300 placeholder-slate-500 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Time Card */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Date & Time</span>
                
                {/* Date Row */}
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#8e8e93]" />
                    <span>Date</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasDate(!hasDate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hasDate ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        hasDate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {hasDate && (
                  <input
                    type="date"
                    value={todoDate}
                    onChange={(e) => setTodoDate(e.target.value)}
                    className="w-full liquid-input py-2 px-3.5 text-xs text-white focus:outline-none"
                  />
                )}

                {/* Time Row */}
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff453a]" />
                    <span>Time</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasTime(!hasTime)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hasTime ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        hasTime ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {hasTime && (
                  <input
                    type="time"
                    value={todoTime}
                    onChange={(e) => setTodoTime(e.target.value)}
                    className="w-full liquid-input py-2 px-3.5 text-xs text-white focus:outline-none"
                  />
                )}

                {/* Urgent Row */}
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#ff375f]" />
                    <span>Urgent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTodoUrgent(!todoUrgent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      todoUrgent ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        todoUrgent ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Organization Card */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Organization</span>

                {/* List Dropdown */}
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>List</span>
                  <select
                    value={todoList}
                    onChange={(e) => setTodoList(e.target.value)}
                    className="bg-white/5 border border-white/5 text-white rounded-xl py-1.5 px-3 focus:outline-none text-xs"
                  >
                    {dynamicListNames.map(name => (
                      <option key={name} value={name} className="bg-[#1c1c1e]">{name}</option>
                    ))}
                  </select>
                </div>

                {/* Section Input */}
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Section</span>
                  <input
                    type="text"
                    value={todoSection}
                    onChange={(e) => setTodoSection(e.target.value)}
                    placeholder="New Section"
                    className="w-40 liquid-input py-1.5 px-3 text-xs focus:outline-none"
                  />
                </div>

                {/* Tags input */}
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Tags</span>
                  <input
                    type="text"
                    value={todoTags}
                    onChange={(e) => setTodoTags(e.target.value)}
                    placeholder="tag1, tag2 (comma separated)"
                    className="w-48 liquid-input py-1.5 px-3 text-xs focus:outline-none"
                  />
                </div>

                {/* Priority Selection */}
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Priority</span>
                  <select
                    value={todoPriority}
                    onChange={(e) => setTodoPriority(e.target.value)}
                    className="bg-white/5 border border-white/5 text-white rounded-xl py-1.5 px-3 focus:outline-none text-xs"
                  >
                    <option value="None" className="bg-[#1c1c1e]">None</option>
                    <option value="Low" className="bg-[#1c1c1e]">Low</option>
                    <option value="Medium" className="bg-[#1c1c1e]">Medium</option>
                    <option value="High" className="bg-[#1c1c1e]">High</option>
                  </select>
                </div>

                {/* Flag toggle */}
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-[#ff9f0a]" />
                    <span>Flag</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTodoFlagged(!todoFlagged)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      todoFlagged ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        todoFlagged ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Places & People</span>
                
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#30d158]" />
                    <span>Location</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasLocation(!hasLocation)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hasLocation ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        hasLocation ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {hasLocation && (
                  <input
                    type="text"
                    value={todoLocation}
                    onChange={(e) => setTodoLocation(e.target.value)}
                    placeholder="Workplace / Home..."
                    className="w-full liquid-input py-2.5 px-3.5 text-xs focus:outline-none"
                  />
                )}
              </div>

              {/* Form buttons */}
              <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
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
                  {editingTodo ? 'Save Details' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
