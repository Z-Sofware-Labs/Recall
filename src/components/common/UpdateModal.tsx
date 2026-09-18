import { useState, useEffect } from 'react';
import { 
  Sparkles, Download, RefreshCw, AlertCircle, CheckCircle2, 
  ArrowRight, ShieldCheck, X 
} from 'lucide-react';
import ModalWindow from './ModalWindow';
import { UpdateCheckResult, downloadAndInstallUpdate, formatBytes } from '../../services/updateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateCheckResult | null;
  onCheckAgain?: () => void;
}

export default function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
}: UpdateModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number;
    total: number | null;
    percent: number;
  }>({
    downloaded: 0,
    total: null,
    percent: 0,
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);

  // Automatically start download and installation if an update is found
  useEffect(() => {
    if (isOpen && updateInfo?.available && updateInfo?.updateInstance && !isDownloading && !isReadyToRestart && !downloadError) {
      handleStartUpdate();
    }
  }, [isOpen, updateInfo]);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    if (!updateInfo?.updateInstance) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress({ downloaded: 0, total: null, percent: 0 });

    try {
      await downloadAndInstallUpdate(
        updateInfo.updateInstance,
        (downloaded, total, percent) => {
          setDownloadProgress({ downloaded, total, percent });
          if (percent === 100) {
            setIsReadyToRestart(true);
          }
        }
      );
    } catch (err: any) {
      console.error('Update download or install failed:', err);
      setDownloadError(err?.message || 'Failed to download and install update.');
      setIsDownloading(false);
    }
  };

  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={isDownloading ? () => {} : onClose}
      title="Software Update"
      maxWidth="max-w-[480px]"
      contentClassName="p-6"
      showMinMax={false}
    >
      <div className="space-y-5">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            {isDownloading ? (
              <RefreshCw size={24} className="animate-spin" />
            ) : updateInfo?.available ? (
              <Sparkles size={24} />
            ) : updateInfo?.error ? (
              <AlertCircle size={24} className="text-amber-300" />
            ) : (
              <CheckCircle2 size={24} className="text-emerald-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {updateInfo?.available ? (
              <>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  New Version Available!
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    Current: v{updateInfo.currentVersion || '1.0.0'}
                  </span>
                  <ArrowRight size={12} className="text-slate-400" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono font-bold">
                    v{updateInfo.version}
                  </span>
                </div>
              </>
            ) : updateInfo?.error ? (
              <>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Update Check Failed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Could not connect to the update server.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  You're Up to Date!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recall {updateInfo?.currentVersion ? `v${updateInfo.currentVersion}` : 'v1.0.0'} is the latest version available.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Release Notes or Info Box */}
        {updateInfo?.available && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Release Notes</span>
              {updateInfo.date && (
                <span className="text-[11px] font-normal text-slate-400">
                  Released {updateInfo.date}
                </span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 max-h-40 overflow-y-auto custom-scrollbar text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
              {updateInfo.body ? (
                updateInfo.body
              ) : (
                <span className="italic text-slate-400">
                  This release contains stability improvements, bug fixes, and authoring enhancements for Recall.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error message display if check failed or download failed */}
        {(updateInfo?.error || downloadError) && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle size={14} />
              <span>Notice</span>
            </div>
            <p className="leading-relaxed opacity-90 break-words font-mono text-[11px]">
              {downloadError || updateInfo?.error}
            </p>
          </div>
        )}

        {/* Progress Bar while downloading */}
        {isDownloading && (
          <div className="space-y-2 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {isReadyToRestart ? 'Installing & Restarting...' : 'Downloading package...'}
              </span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                {downloadProgress.percent}%
              </span>
            </div>

            {/* Visual Progress Track */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>
                {formatBytes(downloadProgress.downloaded)}
                {downloadProgress.total ? ` of ${formatBytes(downloadProgress.total)}` : ''}
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                Verified package
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {!isDownloading && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}

          {updateInfo?.available && downloadError && !isDownloading && (
            <button
              type="button"
              onClick={handleStartUpdate}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Retry Update</span>
            </button>
          )}

          {(!updateInfo?.available && onCheckAgain && !isDownloading) && (
            <button
              type="button"
              onClick={onCheckAgain}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Check Again</span>
            </button>
          )}
        </div>
      </div>
    </ModalWindow>
  );
}
