import { useEffect, useRef } from 'react';
import { 
  Eye, Edit3, Copy, Link, Trash2, 
  Presentation, Image as ImageIcon, Video, 
  Layers, CheckSquare, Square, Upload
} from 'lucide-react';
import { MediaItem } from '../MediaOrganizer';

export type MediaOrganizerContextTarget = 
  | { type: 'media'; item: MediaItem }
  | { type: 'background' };

export interface MediaOrganizerContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  target: MediaOrganizerContextTarget;
}

interface MediaOrganizerContextMenuProps {
  state: MediaOrganizerContextMenuState;
  onClose: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  onToggleSelect: (item: MediaItem) => void;
  onRenameMedia: (item: MediaItem) => void;
  onDuplicateMedia: (item: MediaItem) => void;
  onCopyMediaLink: (item: MediaItem) => void;
  onDeleteMedia: (item: MediaItem) => void;
  onImportPpt?: () => void;
  onImportPhotos?: () => void;
  onImportVideo?: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
  onFilterChange?: (filter: 'all' | 'slide' | 'photo' | 'video') => void;
}

export default function MediaOrganizerContextMenu({
  state,
  onClose,
  onPreviewMedia,
  onToggleSelect,
  onRenameMedia,
  onDuplicateMedia,
  onCopyMediaLink,
  onDeleteMedia,
  onImportPpt,
  onImportPhotos,
  onImportVideo,
  onSelectAll,
  allSelected = false,
  onFilterChange,
}: MediaOrganizerContextMenuProps) {
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

  const menuWidth = 230;
  const menuHeight = state.target.type === 'media' ? 260 : 300;

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
              if (state.target.type === 'media') onToggleSelect(state.target.item);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {state.target.item.isSelected ? (
              <>
                <Square size={14} className="text-slate-400" />
                <span>Deselect Asset</span>
              </>
            ) : (
              <>
                <CheckSquare size={14} className="text-blue-500" />
                <span>Select Asset</span>
              </>
            )}
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
            <span>Delete Asset</span>
          </button>
        </>
      )}

      {/* Organizer Background Context Menu */}
      {state.target.type === 'background' && (
        <>
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800/80">
            <p className="font-semibold text-[11px] text-slate-900 dark:text-white flex items-center gap-1.5">
              <Upload size={13} className="text-blue-500" /> Import & Actions
            </p>
          </div>

          {onImportPpt && (
            <button
              onClick={() => {
                onImportPpt();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer"
            >
              <Presentation size={14} />
              <span>Import PowerPoint (.pptx)</span>
            </button>
          )}

          {onImportPhotos && (
            <button
              onClick={() => {
                onImportPhotos();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium transition-colors cursor-pointer"
            >
              <ImageIcon size={14} />
              <span>Import Photos</span>
            </button>
          )}

          {onImportVideo && (
            <button
              onClick={() => {
                onImportVideo();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium transition-colors cursor-pointer"
            >
              <Video size={14} />
              <span>Import Video</span>
            </button>
          )}

          {onSelectAll && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={() => {
                  onSelectAll();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              >
                {allSelected ? (
                  <>
                    <Square size={14} className="text-slate-400" />
                    <span>Deselect All in View</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} className="text-blue-500" />
                    <span>Select All in View</span>
                  </>
                )}
              </button>
            </>
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
        </>
      )}
    </div>
  );
}
