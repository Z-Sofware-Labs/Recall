import { useState, useEffect, useRef, ChangeEvent, DragEvent, Dispatch, SetStateAction, FormEvent, MouseEvent } from 'react';
import { 
  Upload, Trash2, GripVertical, CheckSquare, Square, 
  CheckCircle2, AlertCircle, Loader2, Presentation, Eye, X,
  Image as ImageIcon, Video, Film, Filter, Play, Edit3, Copy, Link
} from 'lucide-react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { getOfficeSuiteInfo, OfficeSuiteInfo } from '../services/officeService';
import MediaOrganizerContextMenu, { 
  MediaOrganizerContextMenuState, 
  MediaOrganizerContextTarget 
} from './media/MediaOrganizerContextMenu';

export interface MediaItem {
  id: string;
  name: string;
  type: 'slide' | 'photo' | 'video';
  mimeType?: string;
  url: string;
  size?: number;
  isSelected: boolean;
  filePath?: string;
}

export interface MediaOrganizerProps {
  mediaItems?: MediaItem[];
  setMediaItems?: Dispatch<SetStateAction<MediaItem[]>>;
}

const defaultInitialMedia: MediaItem[] = [];

export default function MediaOrganizer({ 
  mediaItems: propMediaItems, 
  setMediaItems: propSetMediaItems 
}: MediaOrganizerProps = {}) {
  const [internalMediaItems, setInternalMediaItems] = useState<MediaItem[]>(defaultInitialMedia);

  const mediaItems = propMediaItems !== undefined ? propMediaItems : internalMediaItems;
  const setMediaItems = propSetMediaItems || setInternalMediaItems;

  const [activeFilter, setActiveFilter] = useState<'all' | 'slide' | 'photo' | 'video'>('all');
  const [officeInfo, setOfficeInfo] = useState<OfficeSuiteInfo | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<MediaOrganizerContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    target: { type: 'background' },
  });

  // Rename modal state
  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    getOfficeSuiteInfo().then((info) => {
      if (isMounted) setOfficeInfo(info);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-heal any stale or dead blob: URLs from previous sessions
  useEffect(() => {
    let isMounted = true;
    const healStaleItems = async () => {
      let hasChanges = false;
      const healed = await Promise.all(
        mediaItems.map(async (item) => {
          if (item.filePath && (!item.url || item.url.startsWith('blob:') || item.url.startsWith('undefined'))) {
            try {
              try {
                const dataUrl = await invoke<string>('load_media_data_url', { filePath: item.filePath });
                if (dataUrl && dataUrl.startsWith('data:')) {
                  hasChanges = true;
                  return { ...item, url: dataUrl };
                }
              } catch {
                hasChanges = true;
                return { ...item, url: convertFileSrc(item.filePath) };
              }
            } catch (e) {
              console.warn('Could not heal media item from path:', item.filePath, e);
            }
          }
          return item;
        })
      );

      if (hasChanges && isMounted) {
        setMediaItems(healed);
      }
    };

    healStaleItems();
    return () => { isMounted = false; };
  }, [mediaItems.length]);

  // 1. Native PowerPoint Import via Office Suite (Supports Multiple Presentations)
  const handlePptImport = async () => {
    setErrorMessage(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'PowerPoint Presentations',
            extensions: ['pptx', 'ppt'],
          },
        ],
      });

      if (!selected) return;

      const filePaths: string[] = Array.isArray(selected)
        ? selected.map(s => typeof s === 'string' ? s : (s as any).path || s)
        : [typeof selected === 'string' ? selected : (selected as any).path || selected];

      const validPaths = filePaths.filter(Boolean);
      if (validPaths.length === 0) return;

      setIsConverting(true);
      const engineName = officeInfo?.preferred === 'ms_office' 
        ? 'Microsoft Office' 
        : officeInfo?.preferred === 'libreoffice' 
          ? 'LibreOffice' 
          : 'Office Suite';

      const allNewSlides: MediaItem[] = [];

      for (let i = 0; i < validPaths.length; i++) {
        const filePath = validPaths[i];
        const fileName = filePath.split(/[\\/]/).pop() || `Presentation ${i + 1}`;
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        
        setConversionStatus(`Extracting slides from "${fileName}" (${i + 1}/${validPaths.length}) using ${engineName}...`);

        const result = await invoke<Array<{ index: number; name: string; file_path: string; data_url: string }>>(
          'convert_pptx_to_slides',
          {
            pptxPath: filePath,
            engine: officeInfo?.preferred || null,
          }
        );

        const presentationSlides: MediaItem[] = result.map((s) => ({
          id: `slide_${Date.now()}_${i}_${s.index}`,
          name: validPaths.length > 1 ? `${baseName} - Slide ${s.index}` : s.name,
          type: 'slide',
          url: s.data_url,
          isSelected: true,
          filePath: s.file_path,
        }));

        allNewSlides.push(...presentationSlides);
      }

      setMediaItems((prev) => [...prev, ...allNewSlides]);
      setConversionStatus(`Successfully imported ${allNewSlides.length} PowerPoint slides from ${validPaths.length} file${validPaths.length === 1 ? '' : 's'}!`);
      setTimeout(() => setConversionStatus(null), 4000);
    } catch (err: any) {
      console.error('Failed to convert PowerPoint:', err);
      setErrorMessage(typeof err === 'string' ? err : err.message || 'Failed to import PowerPoint presentation.');
    } finally {
      setIsConverting(false);
    }
  };

  // 2. Native Photo Import with permanent local paths and Data URL generation
  const handlePhotoImport = async () => {
    setErrorMessage(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Image Files',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'],
          },
        ],
      });

      if (!selected) return;

      const filePaths: string[] = Array.isArray(selected)
        ? selected.map(s => typeof s === 'string' ? s : (s as any).path || s)
        : [typeof selected === 'string' ? selected : (selected as any).path || selected];

      const validPaths = filePaths.filter(Boolean);
      if (validPaths.length === 0) return;

      const newPhotos: MediaItem[] = [];
      for (const filePath of validPaths) {
        const fileName = filePath.split(/[\\/]/).pop() || 'Photo';
        let url = '';
        try {
          url = await invoke<string>('load_media_data_url', { filePath });
        } catch {
          url = convertFileSrc(filePath);
        }
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: fileName,
          type: 'photo',
          url: url || convertFileSrc(filePath),
          filePath: filePath,
          isSelected: true,
        });
      }

      setMediaItems((prev) => [...prev, ...newPhotos]);
      setConversionStatus(`Imported ${newPhotos.length} photo${newPhotos.length === 1 ? '' : 's'}!`);
      setTimeout(() => setConversionStatus(null), 3000);
    } catch (err: any) {
      console.warn('Native photo picker fallback:', err);
      fileInputRef.current?.click();
    }
  };

  // 3. Native Video Import with permanent local paths
  const handleVideoImport = async () => {
    setErrorMessage(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Video Files',
            extensions: ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'av1'],
          },
        ],
      });

      if (!selected) return;

      const filePaths: string[] = Array.isArray(selected)
        ? selected.map(s => typeof s === 'string' ? s : (s as any).path || s)
        : [typeof selected === 'string' ? selected : (selected as any).path || selected];

      const validPaths = filePaths.filter(Boolean);
      if (validPaths.length === 0) return;

      const newVideos: MediaItem[] = [];
      for (const filePath of validPaths) {
        const fileName = filePath.split(/[\\/]/).pop() || 'Video';
        let url = '';
        try {
          url = await invoke<string>('load_media_data_url', { filePath });
        } catch {
          url = convertFileSrc(filePath);
        }
        newVideos.push({
          id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: fileName,
          type: 'video',
          url: url || convertFileSrc(filePath),
          filePath: filePath,
          isSelected: true,
        });
      }

      setMediaItems((prev) => [...prev, ...newVideos]);
      setConversionStatus(`Imported ${newVideos.length} video${newVideos.length === 1 ? '' : 's'}!`);
      setTimeout(() => setConversionStatus(null), 3000);
    } catch (err: any) {
      console.warn('Native video picker fallback:', err);
      videoInputRef.current?.click();
    }
  };

  // 4. Drag and drop / fallback file input handler with permanent base64 encoding
  const handleNativeFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const fileArray = Array.from(files);
    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.av1') || file.name.endsWith('.webm');
      const isPhoto = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(file.name);

      if (isPhoto || isVideo) {
        const nativePath = (file as any).path as string | undefined;
        let url = '';
        if (nativePath) {
          try {
            url = await invoke<string>('load_media_data_url', { filePath: nativePath });
          } catch {
            url = convertFileSrc(nativePath);
          }
        }
        if (!url) {
          try {
            url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } catch {
            url = URL.createObjectURL(file);
          }
        }

        newItems.push({
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: isVideo ? 'video' : 'photo',
          mimeType: file.type,
          url: url,
          filePath: nativePath,
          size: file.size,
          isSelected: true,
        });
      }
    }

    if (newItems.length > 0) {
      setMediaItems((prev) => [...prev, ...newItems]);
      setConversionStatus(`Imported ${newItems.length} media ${newItems.length === 1 ? 'file' : 'files'}!`);
      setTimeout(() => setConversionStatus(null), 3000);
    } else {
      setErrorMessage('Please select valid photos (PNG, JPG, GIF) or videos (MP4, AV1, WebM).');
    }
  };

  const handlePhotoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleNativeFiles(e.target.files);
    e.target.value = '';
  };

  const handleVideoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleNativeFiles(e.target.files);
    e.target.value = '';
  };

  // Drag and Drop Handling
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      handleNativeFiles(e.dataTransfer.files);
    }
  };

  const toggleSelect = (id: string) => {
    setMediaItems(items => items.map(item => 
      item.id === id ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const removeItem = (id: string) => {
    setMediaItems(items => items.filter(item => item.id !== id));
  };

  const selectAll = () => {
    const allSelected = filteredItems.length > 0 && filteredItems.every(s => s.isSelected);
    setMediaItems(items => items.map(s => 
      filteredItems.some(f => f.id === s.id) ? { ...s, isSelected: !allSelected } : s
    ));
  };

  const filteredItems = mediaItems.filter(item => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const slideCount = mediaItems.filter(i => i.type === 'slide').length;
  const photoCount = mediaItems.filter(i => i.type === 'photo').length;
  const videoCount = mediaItems.filter(i => i.type === 'video').length;
  const selectedCount = mediaItems.filter(i => i.isSelected).length;
  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(s => s.isSelected);

  const handleDeleteSelected = () => {
    if (selectedCount === 0) return;
    setMediaItems(items => items.filter(item => !item.isSelected));
    showToast(`Removed ${selectedCount} selected asset${selectedCount === 1 ? '' : 's'} from library`);
  };

  const handleDuplicateSelected = () => {
    if (selectedCount === 0) return;
    const selected = mediaItems.filter(i => i.isSelected);
    const duplicates: MediaItem[] = selected.map(item => ({
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${item.name} (Copy)`,
      isSelected: false,
    }));
    setMediaItems(prev => [...prev, ...duplicates]);
    showToast(`Duplicated ${selected.length} asset${selected.length === 1 ? '' : 's'}`);
  };

  const handleDeselectAll = () => {
    setMediaItems(items => items.map(item => ({ ...item, isSelected: false })));
  };

  // Context menu event handlers
  const handleItemContextMenu = (e: MouseEvent, item: MediaItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target: { type: 'media', item },
    });
  };

  const handleBackgroundContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target: { type: 'background' },
    });
  };

  const handleRenameMedia = (item: MediaItem) => {
    setRenamingItem(item);
    setRenameValue(item.name);
  };

  const handleSaveRename = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;

    const trimmed = renameValue.trim();
    setMediaItems(prev => prev.map(m => m.id === renamingItem.id ? { ...m, name: trimmed } : m));
    showToast(`Renamed asset to "${trimmed}"`);
    setRenamingItem(null);
  };

  const handleDuplicateMedia = (item: MediaItem) => {
    const newItem: MediaItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${item.name} (Copy)`,
    };
    setMediaItems(prev => [...prev, newItem]);
    showToast(`Duplicated "${item.name}"`);
  };

  const handleCopyMediaLink = async (item: MediaItem) => {
    const textToCopy = item.filePath || item.url || item.name;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
      showToast(`Copied ${item.type} link/path to clipboard`);
    } catch {
      showToast(`Path: ${textToCopy}`);
    }
  };

  const handleDeleteMedia = (item: MediaItem) => {
    removeItem(item.id);
    showToast(`Removed "${item.name}" from library`);
  };

  return (
    <div 
      onContextMenu={handleBackgroundContextMenu}
      className="space-y-6 relative"
    >
      {/* Hidden Native File Inputs for Photos and Videos */}
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        accept="image/png, image/jpeg, image/gif, image/webp" 
        onChange={handlePhotoInputChange}
        className="hidden" 
      />
      <input 
        ref={videoInputRef}
        type="file" 
        multiple 
        accept="video/mp4, video/webm, video/ogg, video/av01, .av1, .mp4" 
        onChange={handleVideoInputChange}
        className="hidden" 
      />

      {/* Warning Statement: Only displayed when no supported Office suite (PowerPoint / LibreOffice) is detected */}
      {officeInfo && !officeInfo.has_ms_office && !officeInfo.has_libreoffice && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200">
          <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-semibold text-sm text-amber-950 dark:text-amber-100">
              No supported Office suite detected
            </h4>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Microsoft PowerPoint or LibreOffice is required to automatically convert and import slides from PowerPoint (<code className="font-mono text-amber-900 dark:text-amber-200">.pptx</code>) presentations. You can still import images and videos directly.
            </p>
          </div>
        </div>
      )}

      {/* Import Action Cards / Dropzone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 transition-all ${
          isDraggingOver 
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-4 ring-blue-500/20' 
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: PowerPoint Import */}
          <button
            onClick={handlePptImport}
            disabled={isConverting}
            className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-all text-center cursor-pointer group"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
              <Presentation size={28} />
            </div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Import PowerPoint</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Extract slides via Office COM (.pptx, .ppt)
            </p>
          </button>

          {/* Option 2: Photos Import (Native Picker & Local Path) */}
          <button
            onClick={handlePhotoImport}
            className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm transition-all text-center cursor-pointer group"
          >
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
              <ImageIcon size={28} />
            </div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Import Photos</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              PNG, JPG, JPEG, GIF, WebP
            </p>
          </button>

          {/* Option 3: Video Import (Native Picker & Local Path) */}
          <button
            onClick={handleVideoImport}
            className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 shadow-sm transition-all text-center cursor-pointer group"
          >
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
              <Video size={28} />
            </div>
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Import Video</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              MP4, AV1, WebM video files
            </p>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Tip: You can drag and drop your files directly here, or right-click any item for quick options.
          </p>
        </div>
      </div>

      {/* Loading state during PPT extraction */}
      {isConverting && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={20} />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">{conversionStatus}</span>
        </div>
      )}

      {/* Feedback Messages */}
      {conversionStatus && !isConverting && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{conversionStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-xs rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Header Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({mediaItems.length})
            </button>
            <button
              onClick={() => setActiveFilter('slide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'slide'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Presentation size={13} /> Slides ({slideCount})
            </button>
            <button
              onClick={() => setActiveFilter('photo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'photo'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ImageIcon size={13} /> Photos ({photoCount})
            </button>
            <button
              onClick={() => setActiveFilter('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'video'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Video size={13} /> Videos ({videoCount})
            </button>
          </div>

          {filteredItems.length > 0 && (
            <button 
              onClick={selectAll}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {allFilteredSelected ? 'Deselect All in View' : 'Select All in View'}
            </button>
          )}
        </div>

        {/* Batch Operations Bar */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs">
                {selectedCount} Selected
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Batch operations across all selected media assets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDuplicateSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Copy size={13} /> Duplicate ({selectedCount})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Trash2 size={13} /> Delete Selected ({selectedCount})
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Media Grid */}
        {filteredItems.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 dark:text-slate-500">
            <Film size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No media items found in this category.</p>
            <p className="text-xs mt-1">Import PowerPoint slides, photos, or video files to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((item, idx) => {
              const isContextMenuActive = 
                contextMenu.isOpen && 
                contextMenu.target.type === 'media' && 
                contextMenu.target.item.id === item.id;

              return (
                <div 
                  key={item.id} 
                  onContextMenu={(e) => handleItemContextMenu(e, item)}
                  className={`group relative flex flex-col border rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-all ${
                    isContextMenuActive
                      ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-md'
                      : item.isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {/* Media Preview Thumbnail */}
                  <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                    {item.type === 'video' ? (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                        className="relative w-full h-full flex items-center justify-center bg-slate-900 cursor-pointer"
                        title="Click to play video"
                      >
                        <video 
                          src={item.url || (item.filePath ? convertFileSrc(item.filePath) : '')} 
                          className="w-full h-full object-cover opacity-80 pointer-events-none"
                          preload="metadata"
                          muted
                          onError={(e) => {
                            if (item.filePath) {
                              (e.target as HTMLVideoElement).src = convertFileSrc(item.filePath);
                            }
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors">
                          <div className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                            <Play size={18} className="translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={item.name} 
                        className="w-full h-full object-cover cursor-pointer" 
                        onClick={() => setPreviewItem(item)}
                        onError={async (e) => {
                          if (item.filePath) {
                            try {
                              const dataUrl = await invoke<string>('load_media_data_url', { filePath: item.filePath });
                              (e.target as HTMLImageElement).src = dataUrl;
                            } catch {
                              (e.target as HTMLImageElement).src = convertFileSrc(item.filePath);
                            }
                          }
                        }}
                      />
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                      {item.type === 'slide' && <Presentation size={10} className="text-blue-400" />}
                      {item.type === 'photo' && <ImageIcon size={10} className="text-emerald-400" />}
                      {item.type === 'video' && <Video size={10} className="text-purple-400" />}
                      <span>#{idx + 1}</span>
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setPreviewItem(item)}
                        className="p-1 bg-black/70 hover:bg-black backdrop-blur-sm text-white rounded cursor-pointer"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Card Footer */}
                  <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => toggleSelect(item.id)}
                      className="flex items-center gap-2 flex-1 text-left truncate cursor-pointer"
                    >
                      {item.isSelected ? (
                        <CheckSquare size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                    </button>
                    <GripVertical size={14} className="text-slate-400 cursor-grab shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <MediaOrganizerContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onPreviewMedia={(item) => setPreviewItem(item)}
        onToggleSelect={(item) => toggleSelect(item.id)}
        onRenameMedia={handleRenameMedia}
        onDuplicateMedia={handleDuplicateMedia}
        onCopyMediaLink={handleCopyMediaLink}
        onDeleteMedia={handleDeleteMedia}
        onImportPpt={handlePptImport}
        onImportPhotos={() => fileInputRef.current?.click()}
        onImportVideo={() => videoInputRef.current?.click()}
        onSelectAll={selectAll}
        allSelected={allFilteredSelected}
        onFilterChange={(filter) => setActiveFilter(filter)}
      />

      {/* Rename Asset Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">Rename Asset</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update display title for this {renamingItem.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenamingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRename}>
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter new name..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox / Fullscreen Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {previewItem.type === 'slide' && <Presentation className="text-blue-400" size={16} />}
                {previewItem.type === 'photo' && <ImageIcon className="text-emerald-400" size={16} />}
                {previewItem.type === 'video' && <Video className="text-purple-400" size={16} />}
                <h4 className="text-sm font-semibold text-white truncate max-w-md">{previewItem.name}</h4>
              </div>
              <button 
                onClick={() => setPreviewItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 min-h-[300px]">
              {previewItem.type === 'video' ? (
                <video 
                  key={previewItem.id}
                  src={previewItem.url || (previewItem.filePath ? convertFileSrc(previewItem.filePath) : '')} 
                  controls 
                  autoPlay 
                  playsInline
                  className="max-h-[70vh] w-full rounded-lg shadow-lg"
                />
              ) : (
                <img 
                  key={previewItem.id}
                  src={previewItem.url} 
                  alt={previewItem.name} 
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg" 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
