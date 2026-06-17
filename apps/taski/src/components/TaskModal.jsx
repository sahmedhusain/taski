import React, { useState, useEffect } from 'react';
import { useTodos } from '../contexts/TodoContext';
import { 
  X, ListTodo, Calendar, Clock, AlertTriangle, MapPin, Flag 
} from 'lucide-react';

export const TaskModal = ({ 
  isOpen, 
  onClose, 
  todo, 
  initialSection = '', 
  defaultList = 'Todos', 
  dynamicListNames = [] 
}) => {
  const { todos, addTodo, updateTodo } = useTodos();

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
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);
  const [modalError, setModalError] = useState('');

  const userSections = Array.from(
    new Set(
      todos
        .map(t => t.section_name && t.section_name.trim())
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTodoTitle(todo.title || '');
        setTodoDescription(todo.description || '');
        setTodoURL(todo.url || '');
        setHasDate(!!todo.due_date);
        setTodoDate(todo.due_date ? todo.due_date.substring(0, 10) : '');
        setHasTime(!!todo.due_time);
        setTodoTime(todo.due_time || '');
        setTodoUrgent(!!todo.is_urgent);
        setTodoList(todo.list_name || 'Todos');
        setTodoTags(todo.tags || '');
        setTodoFlagged(!!todo.is_flagged);
        setTodoPriority(todo.priority || 'None');
        setHasLocation(!!todo.location);
        setTodoLocation(todo.location || '');
        setTodoSection(todo.section_name || '');
        setIsCreatingNewSection(false);
      } else {
        setTodoTitle('');
        setTodoDescription('');
        setTodoURL('');
        setHasDate(false);
        setTodoDate('');
        setHasTime(false);
        setTodoTime('');
        setTodoUrgent(false);
        setTodoList(defaultList || 'Todos');
        setTodoTags('');
        setTodoFlagged(false);
        setTodoPriority('None');
        setHasLocation(false);
        setTodoLocation('');
        const sectionName = typeof initialSection === 'string' ? initialSection : '';
        setTodoSection(sectionName);
        setIsCreatingNewSection(sectionName !== '' && !userSections.includes(sectionName));
      }
      setModalError('');
    }
  }, [isOpen, todo, initialSection, defaultList]);

  if (!isOpen) return null;

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!todoTitle.trim()) {
      setModalError('Title is required');
      return;
    }

    // Front-end date validation
    if (hasDate && todoDate) {
      const selectedDateTimeStr = hasTime && todoTime ? `${todoDate}T${todoTime}` : `${todoDate}T23:59:59`;
      const selectedTime = new Date(selectedDateTimeStr);
      const now = new Date();
      if (selectedTime < now) {
        setModalError('Due date and time cannot be in the past');
        return;
      }
    }

    const payload = {
      title: todoTitle.trim(),
      description: todoDescription,
      url: todoURL,
      due_date: hasDate && todoDate ? todoDate : null,
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
      if (todo) {
        await updateTodo(todo.id, payload);
      } else {
        await addTodo(payload);
      }
      onClose();
    } catch (err) {
      setModalError(err.message || 'Action failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 cursor-pointer rounded-full hover:bg-white/5 transition-all"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-blue-400" />
          {todo ? 'Edit Task Details' : 'New Task'}
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
            <div className="flex flex-col gap-2 text-xs text-slate-400">
              {userSections.length === 0 ? (
                !isCreatingNewSection ? (
                  <div className="flex justify-between items-center">
                    <span>Section</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewSection(true);
                        setTodoSection('');
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white rounded-xl py-1.5 px-3.5 text-xs transition-colors cursor-pointer"
                    >
                      + Add Section
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center animate-fadeIn">
                    <span>Section</span>
                    <div className="flex items-center gap-1.5 w-40">
                      <input
                        type="text"
                        value={todoSection}
                        onChange={(e) => setTodoSection(e.target.value)}
                        placeholder="Section Name"
                        className="flex-1 bg-white/5 border border-white/5 text-white rounded-xl py-1.5 px-3 focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewSection(false);
                          setTodoSection('');
                        }}
                        className="text-slate-500 hover:text-white p-1 cursor-pointer"
                        title="Cancel section"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Section</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={isCreatingNewSection ? 'new' : (todoSection || '')}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setIsCreatingNewSection(true);
                            setTodoSection('');
                          } else {
                            setIsCreatingNewSection(false);
                            setTodoSection(e.target.value);
                          }
                        }}
                        className="bg-white/5 border border-white/5 text-white rounded-xl py-1.5 px-3 focus:outline-none text-xs w-28"
                      >
                        <option value="" className="bg-[#1c1c1e]">No Section</option>
                        {userSections.map(sec => (
                          <option key={sec} value={sec} className="bg-[#1c1c1e]">{sec}</option>
                        ))}
                        <option value="new" className="bg-[#1c1c1e]">+ New...</option>
                      </select>
                      
                      {!isCreatingNewSection && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewSection(true);
                            setTodoSection('');
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white rounded-xl py-1.5 px-2.5 text-[10px] transition-colors cursor-pointer font-semibold"
                          title="Create new section"
                        >
                          + New
                        </button>
                      )}
                    </div>
                  </div>
                  {isCreatingNewSection && (
                    <div className="flex justify-between items-center animate-fadeIn">
                      <span>Section</span>
                      <div className="flex items-center gap-1.5 w-40">
                        <input
                          type="text"
                          value={todoSection}
                          onChange={(e) => setTodoSection(e.target.value)}
                          placeholder="Section Name"
                          className="flex-1 bg-white/5 border border-white/5 text-white rounded-xl py-1.5 px-3 focus:outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewSection(false);
                            setTodoSection('');
                          }}
                          className="text-slate-500 hover:text-white p-1 cursor-pointer"
                          title="Cancel new section"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              onClick={onClose}
              className="liquid-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="liquid-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer"
            >
              {todo ? 'Save Details' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
