import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTodos } from '../contexts/TodoContext';
import { 
  LogOut, Plus, Search, ListTodo, Clock, CheckSquare, Layers, X, Calendar, User,
  Flag, AlertTriangle, ChevronRight, ChevronDown, Trash2
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ProfileModal } from './ProfileModal';
import { ConfirmationModal } from './ConfirmationModal';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const { todos, deletedTodos, deleteTodo, isLoading } = useTodos();

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

  // Collapsible list sections state
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // Dropdown menu state
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Confirmation Alert Modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmBtnText, setConfirmBtnText] = useState('');
  const [confirmIsDangerous, setConfirmIsDangerous] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const triggerConfirmModal = (title, message, btnText, isDangerous, onConfirm) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmBtnText(btnText);
    setConfirmIsDangerous(isDangerous);
    setConfirmAction(() => onConfirm);
    setConfirmModalOpen(true);
  };

  // User Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Task Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [initialSection, setInitialSection] = useState('');

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

  const openAddModal = (sectionName = '') => {
    const sec = typeof sectionName === 'string' ? sectionName : '';
    setEditingTodo(null);
    setInitialSection(sec);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen md:h-screen bg-[#08080a] text-slate-200 flex flex-col relative md:overflow-hidden">
      {/* Soft Apple circular blurs */}
      <div className="glow-blur-purple top-[-10%] right-[-10%]"></div>
      <div className="glow-blur-indigo bottom-[-10%] left-[-10%]"></div>

      {/* Header — floating glass pill, aligned with the main content width */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-4 sm:pt-6 mb-1 sticky top-0 z-40">
        <header className="liquid-nav px-5 py-3 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="liquid-orb w-10 h-10 rounded-2xl bg-gradient-to-br from-white/15 to-white/[0.02] border border-white/10 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest text-white font-branding uppercase leading-none">
                Task<span className="text-[#ff453a]">I</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/10 text-slate-400 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
              title="Edit profile info"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">
                {user?.full_name && user.full_name.trim() ? user.full_name : user?.email}
              </span>
            </button>
            <button
              onClick={() => {
                triggerConfirmModal(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  "Sign Out",
                  false,
                  () => logout()
                );
              }}
              className="liquid-btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Panel with Sidebar and Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6 z-10 overflow-y-auto md:overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-80 flex flex-col gap-4 md:h-full md:overflow-hidden flex-shrink-0">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks..."
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
                {selectedView === 'trash' ? 'Items are auto-purged 30 days after deletion' : 'Tasks workspace'}
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
                  onClick={() => openAddModal()}
                  className="liquid-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Task
                </button>
              )}
            </div>
          </section>

          {/* Tasks List (Grouped by Sections) */}
          <section className="flex-1 overflow-y-auto space-y-6 pr-1">
            {isLoading ? (
              <div className="liquid-glass p-12 text-center text-slate-400">
                <span className="inline-block animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></span>
                <p className="mt-4 text-xs text-slate-500">Retrieving encrypted tasks...</p>
              </div>
            ) : currentViewTodos.length === 0 ? (
              <div className="liquid-glass p-16 text-center text-slate-500">
                <ListTodo className="w-12 h-12 mx-auto mb-3.5 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-300">No Tasks</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchTerm ? 'No results matched your search keywords.' : 'All clear! Add a new task to begin.'}
                </p>
              </div>
            ) : (
              Object.keys(groupedTodos).map(section => (
                <div key={section} className="space-y-3">
                  {/* Section Header */}
                  <div className="flex items-center justify-between group/sec border-b border-white/5 pb-1 px-1">
                    <button
                      onClick={() => toggleSection(section)}
                      className="flex items-center gap-2 py-1 cursor-pointer select-none group hover:opacity-80 transition-all text-left focus:outline-none"
                    >
                      <ChevronRight 
                        className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                          !collapsedSections[section] ? 'rotate-90' : ''
                        }`} 
                      />
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      <h4 className="text-sm font-bold text-slate-300 tracking-wide group-hover:text-white transition-colors">{section}</h4>
                      <span className="text-xs text-slate-500 font-bold">({groupedTodos[section].length})</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModal(section);
                      }}
                      className="opacity-0 group-hover/sec:opacity-100 p-1 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                      title={`Add task to ${section}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Todos inside section */}
                  {!collapsedSections[section] && (
                    <div className="space-y-2.5 animate-fadeIn">
                      {groupedTodos[section].map((todo) => (
                        <TaskCard
                          key={todo.id}
                          todo={todo}
                          selectedView={selectedView}
                          activeDropdownId={activeDropdownId}
                          setActiveDropdownId={setActiveDropdownId}
                          onEdit={(t) => {
                            setEditingTodo(t);
                            setIsModalOpen(true);
                          }}
                          triggerConfirmModal={triggerConfirmModal}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </main>
      </div>

      {/* New/Edit Task Dialog */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        todo={editingTodo}
        initialSection={initialSection}
        defaultList={selectedView === 'list' ? selectedList : 'Todos'}
        dynamicListNames={dynamicListNames}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          if (confirmAction) confirmAction();
          setConfirmModalOpen(false);
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmBtnText}
        isDangerous={confirmIsDangerous}
      />
    </div>
  );
};
