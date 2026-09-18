import { useEffect, useRef } from 'react';
import { 
  Plus, Eye, Edit3, Copy, Link, Trash2, 
  Presentation, Image as ImageIcon, Video, Tags, 
  FolderPlus, Layers
} from 'lucide-react';
import { MediaItem } from '../MediaOrganizer';
import { QuizActivity } from '../../types/quiz';

export type ContextMenuTarget = 
  | { type: 'media'; item: MediaItem }
  | { type: 'quiz'; quiz: QuizActivity }
  | { type: 'background' };

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  target: ContextMenuTarget;
}

interface MediaLibraryContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onAddToTimeline: (target: ContextMenuTarget) => void;
  onPreviewMedia: (item: MediaItem) => void;
  onRenameMedia: (item: MediaItem) => void;
  onDuplicateMedia: (item: MediaItem) => void;
  onCopyMediaLink: (item: MediaItem) => void;
  onDeleteMedia: (item: MediaItem) => void;
  onEditQuiz: (quiz: QuizActivity) => void;
  onDuplicateQuiz: (quiz: QuizActivity) => void;
  onDeleteQuiz: (quiz: QuizActivity) => void;
  onNavigateToMedia?: () => void;
  onFilterChange?: (filter: 'all' | 'slide' | 'photo' | 'video' | 'quiz') => void;
}

export default function MediaLibraryContextMenu({
  state,
  onClose,
  onAddToTimeline,
  onPreviewMedia,
  onRenameMedia,
  onDuplicateMedia,
  onCopyMediaLink,
  onDeleteMedia,
  onEditQuiz,
  onDuplicateQuiz,
  onDeleteQuiz,
  onNavigateToMedia,
  onFilterChange,
}: MediaLibraryContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  // Calculate bounded coordinates so the menu never flows outside the window
  const menuWidth = 230;
  const menuHeight = state.target.type === 'media' ? 290 : state.target.type === 'quiz' ? 210 : 190;

  const posX = Math.min(Math.max(10, state.x), window.innerWidth - menuWidth - 12);
  const posY = Math.min(Math.max(10, state.y), window.innerHeight - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Media Item Context Menu */}
      {state.target.type === 'media' && (
        <>
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              {state.target.item.type === 'slide' && <Presentation size={13} />}
              {state.target.item.type === 'photo' && <ImageIcon size={13} />}
              {state.target.item.type === 'video' && <Video size={13} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[11px] text-slate-900 dark:text-white truncate">
                {state.target.item.name}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {state.target.item.type} Asset
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onAddToTimeline(state.target);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Add to Timeline</span>
            </div>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
              +Step
            </span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'media') onPreviewMedia(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Eye size={14} className="text-slate-400" />
            <span>Preview Asset</span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'media') onRenameMedia(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit3 size={14} className="text-slate-400" />
            <span>Rename Item</span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'media') onDuplicateMedia(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Copy size={14} className="text-slate-400" />
            <span>Duplicate Asset</span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'media') onCopyMediaLink(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Link size={14} className="text-slate-400" />
            <span>Copy Media Link / URL</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            onClick={() => {
              if (state.target.type === 'media') onDeleteMedia(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Remove from Library</span>
          </button>
        </>
      )}

      {/* Quiz Activity Context Menu */}
      {state.target.type === 'quiz' && (
        <>
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Tags size={13} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[11px] text-slate-900 dark:text-white truncate">
                {state.target.quiz.name}
              </p>
              <p className="text-[10px] text-indigo-500 font-medium">
                {state.target.quiz.type} Activity ({state.target.quiz.totalPoints} pts)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onAddToTimeline(state.target);
              onClose();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Add to Timeline</span>
            </div>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
              +Step
            </span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'quiz') onEditQuiz(state.target.quiz);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium transition-colors cursor-pointer"
          >
            <Edit3 size={14} />
            <span>Edit in Quiz Builder</span>
          </button>

          <button
            onClick={() => {
              if (state.target.type === 'quiz') onDuplicateQuiz(state.target.quiz);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Copy size={14} className="text-slate-400" />
            <span>Duplicate Quiz</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            onClick={() => {
              if (state.target.type === 'quiz') onDeleteQuiz(state.target.quiz);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Remove Quiz</span>
          </button>
        </>
      )}

      {/* Library Canvas / Background Context Menu */}
      {state.target.type === 'background' && (
        <>
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80">
            <p className="font-semibold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers size={13} className="text-blue-500" /> Media Library
            </p>
          </div>

          {onNavigateToMedia && (
            <button
              onClick={() => {
                onNavigateToMedia();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              <FolderPlus size={14} />
              <span>Import / Manage Media</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <p className="px-2.5 py-1 text-[10px] text-slate-400 font-medium">Filter View</p>
          <button
            onClick={() => {
              onFilterChange?.('all');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <Layers size={13} className="text-slate-400" />
            <span>Show All Assets</span>
          </button>
          <button
            onClick={() => {
              onFilterChange?.('slide');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <Presentation size={13} className="text-blue-500" />
            <span>Show Slides Only</span>
          </button>
          <button
            onClick={() => {
              onFilterChange?.('photo');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <ImageIcon size={13} className="text-emerald-500" />
            <span>Show Photos Only</span>
          </button>
          <button
            onClick={() => {
              onFilterChange?.('video');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <Video size={13} className="text-purple-500" />
            <span>Show Videos Only</span>
          </button>
          <button
            onClick={() => {
              onFilterChange?.('quiz');
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
          >
            <Tags size={13} className="text-amber-500" />
            <span>Show Quizzes Only</span>
          </button>
        </>
      )}
    </div>
  );
}
