import { ReactNode, useState, useEffect } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { detectPlatform, Platform } from '../../utils/platform';

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  forcePlatform?: Platform;
  contentClassName?: string;
  showMinMax?: boolean;
}

export default function ModalWindow({
  isOpen,
  onClose,
  title = '',
  icon,
  children,
  maxWidth = 'max-w-lg',
  forcePlatform,
  contentClassName = 'p-6',
  showMinMax = true,
}: ModalWindowProps) {
  const [platform, setPlatform] = useState<Platform>('windows');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    setPlatform(forcePlatform || detectPlatform());
  }, [forcePlatform]);

  if (!isOpen) return null;

  const isMac = platform === 'macos';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 transition-all duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-200 ${
          isMaximized ? 'w-full h-full max-w-none rounded-none m-0' : `w-full ${maxWidth}`
        }`}
      >
        {/* Window Title Bar */}
        <div className="h-10 px-3 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between select-none shrink-0">
          {isMac ? (
            /* macOS Traffic Lights on the upper left */
            <>
              <div className={`flex items-center gap-2 ${showMinMax ? 'w-16' : 'w-6'}`}>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 active:opacity-60 flex items-center justify-center text-[8px] text-black/60 group cursor-pointer"
                >
                  <span className="opacity-0 group-hover:opacity-100 leading-none">✕</span>
                </button>
                {showMinMax && (
                  <>
                    <button
                      onClick={() => {}}
                      aria-label="Minimize"
                      className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 active:opacity-60 flex items-center justify-center text-[8px] text-black/60 group cursor-pointer"
                    >
                      <span className="opacity-0 group-hover:opacity-100 leading-none">−</span>
                    </button>
                    <button
                      onClick={() => setIsMaximized(!isMaximized)}
                      aria-label="Maximize"
                      className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 active:opacity-60 flex items-center justify-center text-[8px] text-black/60 group cursor-pointer"
                    >
                      <span className="opacity-0 group-hover:opacity-100 leading-none">+</span>
                    </button>
                  </>
                )}
              </div>

              {/* macOS Centered Title */}
              <div className="flex-1 text-center font-medium text-xs text-slate-700 dark:text-slate-300 truncate px-2">
                {title}
              </div>

              {/* Spacer for symmetry */}
              <div className={showMinMax ? 'w-16' : 'w-6'} />
            </>
          ) : (
            /* Windows & Linux Layout (Controls on upper right) */
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {icon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</span>}
                <span className="font-medium text-xs text-slate-700 dark:text-slate-300 truncate">
                  {title}
                </span>
              </div>

              {/* Windows Window Controls */}
              <div className="flex items-center -mr-3 h-full">
                {showMinMax && (
                  <>
                    <button
                      onClick={() => {}}
                      aria-label="Minimize"
                      className="h-10 w-11 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      onClick={() => setIsMaximized(!isMaximized)}
                      aria-label="Maximize"
                      className="h-10 w-11 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Square size={11} />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="h-10 w-11 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Window Content */}
        <div className={`${contentClassName} overflow-y-auto max-h-[80vh] flex-1`}>
          {children}
        </div>
      </div>
    </div>
  );
}
