import { useState, useEffect } from 'react';
import { 
  Save, HardDrive, Moon, Sun, CheckCircle2, AlertCircle, 
  RefreshCw, Sparkles
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getDefaultProjectDirectory, setDefaultProjectDirectory } from '../services/projectService';

interface SystemSettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onCheckForUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export default function SystemSettings({ 
  isDarkMode, 
  toggleTheme,
  onCheckForUpdates,
  isCheckingUpdates = false,
}: SystemSettingsProps) {
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5);
  const [defaultProjectDir, setDefaultProjectDir] = useState<string>('');

  // File Association State
  const [isRecallAssociated, setIsRecallAssociated] = useState<boolean | null>(null);
  const [isAssociating, setIsAssociating] = useState(false);
  const [assocStatusMsg, setAssocStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function initSettings() {
      try {
        const dir = await getDefaultProjectDirectory();
        setDefaultProjectDir(dir);
      } catch (e) {
        console.warn('Could not load default project dir:', e);
      }
    }
    initSettings();
  }, []);

  useEffect(() => {
    async function checkAssoc() {
      try {
        const associated = await invoke<boolean>('check_recall_file_association');
        setIsRecallAssociated(associated);
      } catch (e) {
        console.warn('Could not check file association:', e);
        setIsRecallAssociated(false);
      }
    }
    checkAssoc();
  }, []);

  const handleRegisterAssociation = async () => {
    setIsAssociating(true);
    setAssocStatusMsg(null);
    try {
      await invoke<boolean>('register_recall_file_association');
      setIsRecallAssociated(true);
      setAssocStatusMsg({
        type: 'success',
        text: 'Successfully associated .recall files with Recall application with custom icon!',
      });
    } catch (err: any) {
      console.error('Failed to associate .recall files:', err);
      setAssocStatusMsg({
        type: 'error',
        text: `Failed to associate file type: ${err?.message || err}`,
      });
    } finally {
      setIsAssociating(false);
    }
  };

  const handleUnregisterAssociation = async () => {
    setIsAssociating(true);
    setAssocStatusMsg(null);
    try {
      await invoke<boolean>('unregister_recall_file_association');
      setIsRecallAssociated(false);
      setAssocStatusMsg({
        type: 'success',
        text: 'Removed .recall file association default handler.',
      });
    } catch (err: any) {
      console.error('Failed to unregister association:', err);
      setAssocStatusMsg({
        type: 'error',
        text: `Failed to remove association: ${err?.message || err}`,
      });
    } finally {
      setIsAssociating(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Appearance Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
           <div className="flex items-center gap-3">
             {isDarkMode ? <Moon className="text-slate-500" /> : <Sun className="text-slate-500" />}
             <span className="text-sm text-slate-700 dark:text-slate-300">Theme</span>
           </div>
           <button
             onClick={toggleTheme}
             className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-900 dark:text-white transition-colors cursor-pointer"
           >
             {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
           </button>
        </div>
      </section>

      {/* General Preferences */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">General Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Save className="text-slate-500" />
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">Auto-save</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Save projects automatically while working.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center cursor-pointer ${isAutoSaveEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAutoSaveEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className={`flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 ${!isAutoSaveEnabled ? 'opacity-50' : ''}`}>
              <span>Auto-save every</span>
              <input
                type="number"
                min="1"
                max="60"
                disabled={!isAutoSaveEnabled}
                value={autoSaveInterval}
                onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <span>minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification for Settings */}
      {assocStatusMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all animate-in fade-in ${
          assocStatusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {assocStatusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{assocStatusMsg.text}</span>
          </div>
        </div>
      )}

      {/* File Associations Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">File Associations</h3>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                    .recall Project Files
                  </h4>
                  {isRecallAssociated ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 size={12} /> Associated (Default App)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                      Not Associated
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                  Associate <code className="text-blue-600 dark:text-blue-400 font-mono font-semibold">.recall</code> course files with this application. Double-clicking any saved Recall project in File Explorer will automatically open it directly in the app.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:self-center">
              {isRecallAssociated ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegisterAssociation}
                    disabled={isAssociating}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    title="Re-register file association and icon"
                  >
                    <RefreshCw size={13} className={isAssociating ? 'animate-spin' : ''} />
                    <span>Re-apply Association</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUnregisterAssociation}
                    disabled={isAssociating}
                    className="px-3.5 py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs font-semibold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterAssociation}
                  disabled={isAssociating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md cursor-pointer transition-all"
                >
                  <Sparkles size={14} />
                  <span>{isAssociating ? 'Associating...' : 'Associate .recall Files'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Storage & Sync */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Storage & Sync</h3>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <HardDrive size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default project location</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">
                {defaultProjectDir || 'Loading path...'}
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={async () => {
              try {
                const selected = await open({
                  directory: true,
                  multiple: false,
                  defaultPath: defaultProjectDir || undefined,
                  title: 'Select Default Projects Folder',
                });
                if (selected) {
                  const newPath = typeof selected === 'string' ? selected : (selected as any).path || selected;
                  if (newPath) {
                    setDefaultProjectDirectory(newPath);
                    setDefaultProjectDir(newPath);
                  }
                }
              } catch (err) {
                console.warn('Error selecting project folder:', err);
              }
            }}
            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
          >
            Change path
          </button>
        </div>
      </section>

      {/* Software Updates Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Software Updates</h3>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                  Recall Desktop Application
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Check for updates on demand. When an update is available, you can review the release notes and choose when to download and install.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onCheckForUpdates}
                disabled={isCheckingUpdates}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md cursor-pointer transition-all"
              >
                <RefreshCw size={13} className={isCheckingUpdates ? 'animate-spin' : ''} />
                <span>{isCheckingUpdates ? 'Checking for Updates...' : 'Check for Updates'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
