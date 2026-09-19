import { ExternalLink } from 'lucide-react';
import ModalWindow from './common/ModalWindow';

export default function AboutDialog({ 
  isOpen, 
  onClose,
  onCheckForUpdates,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCheckForUpdates?: () => void;
}) {
  return (
    <ModalWindow 
      isOpen={isOpen} 
      onClose={onClose} 
      title="About Recall" 
      maxWidth="max-w-[390px]"
      contentClassName="p-5"
      showMinMax={false}
    >
      <div className="flex flex-col items-center text-center space-y-3 mb-4">
        {/* Official Recall app icon */}
        <img 
          src="/app-icon.png" 
          alt="Recall Logo" 
          className="w-16 h-16 object-contain" 
        />

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recall</h2>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Version 1.0.1</span>
            {onCheckForUpdates && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckForUpdates();
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Check for Updates
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          <span>Copyright © 2026</span>
          <img src="/z-software-labs.png" alt="Z Software Labs" className="w-4 h-4 object-contain" />
          <span>Z Software Labs. All rights reserved.</span>
        </div>
        
        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 px-1">
          A powerful, offline desktop authoring tool and learning management system designed to convert presentations into interactive courses, build rich assessments, and generate certificates completely locally.
        </p>

        <p className="text-[11.5px] text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
          <span>This app is licensed under</span>
          <a 
            href="https://opensource.org/licenses/MIT" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>MIT</span>
            <ExternalLink size={10} className="inline" />
          </a>
        </p>
      </div>

      {/* MIT License Box */}
      <div className="text-[10px] text-slate-500 dark:text-slate-500 max-h-20 overflow-y-auto text-left bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2.5 mb-4 leading-normal select-text custom-scrollbar">
        <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:</p>
        <p className="mt-1.5">The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</p>
        <p className="mt-1.5">THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={onClose}
          className="px-6 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700/60 shadow-xs transition-colors cursor-pointer"
        >
          OK
        </button>
      </div>
    </ModalWindow>
  );
}

