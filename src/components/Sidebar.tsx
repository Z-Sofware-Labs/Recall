import { navItems } from './navConfig';
import { Sun, Moon, Info, Lock, X } from 'lucide-react';

const PROJECT_REQUIRED_TABS = new Set([
  'Media Organizer',
  'Quiz Builder',
  'Certificate Builder',
  'Course Editor',
  'Course Organizer',
]);

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onOpenAbout: () => void;
  hasActiveProject?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isDarkMode, 
  toggleTheme, 
  onOpenAbout,
  hasActiveProject = false,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between pb-3 mb-2 md:hidden border-b border-slate-200 dark:border-slate-800">
        <span className="font-bold text-slate-800 dark:text-slate-100 text-base">Recall Navigation</span>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isRequiresProject = PROJECT_REQUIRED_TABS.has(item.name);
          const isDisabled = isRequiresProject && !hasActiveProject;
          const isActive = activeTab === item.name || (item.name === 'Course Editor' && activeTab === 'Course Organizer');

          return (
            <button
              key={item.name}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  setActiveTab(item.name);
                  if (onCloseMobile) onCloseMobile();
                }
              }}
              title={isDisabled ? 'Start or open a project to access' : undefined}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isDisabled
                  ? 'opacity-35 text-slate-400 dark:text-slate-600 cursor-not-allowed select-none'
                  : isActive
                  ? 'bg-blue-600 text-white dark:bg-blue-700 cursor-pointer shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span>{item.name}</span>
              </div>
              {isDisabled && <Lock size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenAbout();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Info size={20} />
          <span>About</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen p-4 flex-col shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop & Slide-out */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        >
          <aside 
            className="w-72 max-w-[85vw] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full p-4 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

