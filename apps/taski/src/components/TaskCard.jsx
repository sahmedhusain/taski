import React from 'react';
import { useTodos } from '../contexts/TodoContext';
import { 
  Check, Calendar, Clock, AlertTriangle, MapPin, Link, Undo2, Trash2, Edit2, MoreVertical 
} from 'lucide-react';

export const TaskCard = ({ 
  todo, 
  selectedView, 
  activeDropdownId, 
  setActiveDropdownId, 
  onEdit, 
  triggerConfirmModal 
}) => {
  const { updateTodo, deleteTodo, restoreTodo } = useTodos();

  const handleToggleTodo = async (t) => {
    if (selectedView === 'trash') return;
    try {
      await updateTodo(t.id, {
        is_completed: !t.is_completed,
      });
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
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
    <div 
      className={`liquid-glass liquid-interactive p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        todo.is_completed ? 'opacity-50 border-emerald-950/10' : ''
      } ${activeDropdownId === todo.id ? 'z-20' : 'z-10'}`}
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

      {/* Actions Dropdown */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 border-white/5 pt-2.5 sm:pt-0 relative">
        <button
          onClick={() => setActiveDropdownId(activeDropdownId === todo.id ? null : todo.id)}
          className="p-2 text-slate-400 hover:text-white rounded-full bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer"
          aria-label="Actions menu"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {activeDropdownId === todo.id && (
          <>
            {/* Backdrop for click-away */}
            <div 
              className="fixed inset-0 z-30 cursor-default" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownId(null);
              }}
            />
            <div className="absolute right-0 top-10 z-40 w-36 py-1.5 rounded-xl bg-[#1c1c1e] border border-white/10 shadow-2xl animate-fadeIn">
              {selectedView === 'trash' ? (
                <>
                  <button
                    onClick={() => {
                      setActiveDropdownId(null);
                      triggerConfirmModal(
                        "Restore Task",
                        "Are you sure you want to restore this task to its active lists?",
                        "Restore",
                        false,
                        () => restoreTodo(todo.id)
                      );
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setActiveDropdownId(null);
                      triggerConfirmModal(
                        "Permanently Delete",
                        "Are you sure you want to permanently delete this task? This action cannot be undone.",
                        "Delete Permanently",
                        true,
                        () => deleteTodo(todo.id, true)
                      );
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Forever
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setActiveDropdownId(null);
                      onEdit(todo);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      setActiveDropdownId(null);
                      triggerConfirmModal(
                        "Delete Task",
                        "Are you sure you want to move this task to the Trash?",
                        "Delete",
                        true,
                        () => deleteTodo(todo.id, false)
                      );
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
