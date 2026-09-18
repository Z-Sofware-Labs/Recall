import { useState, ChangeEvent, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Award, Upload, Sparkles, Printer, Download, Eye, RefreshCw,
  CheckCircle2, School, UserCheck, Calendar, ShieldCheck,
  FileText, Image as ImageIcon, Check, Sliders, Palette, ZoomIn,
  Trash2, ToggleLeft, ToggleRight, X, Percent, Trophy,
  Layers, ChevronRight, ChevronLeft, LayoutTemplate, Shield, Star, Crown,
  GraduationCap, Feather, Cpu, Bookmark, Lock, Users, QrCode,
  ScanLine, Copy, ChevronDown
} from 'lucide-react';

export interface StudentProgressRecord {
  id: string;
  name: string;
  scoreEarned: number;
  scoreTotal: number;
  completionDate: string;
}

export const sampleStudentProgress: StudentProgressRecord[] = [
  {
    id: 'std_1',
    name: 'Alexandria J. Mercer',
    scoreEarned: 98,
    scoreTotal: 100,
    completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
  {
    id: 'std_2',
    name: 'Marcus K. Thorne',
    scoreEarned: 94,
    scoreTotal: 100,
    completionDate: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
  {
    id: 'std_3',
    name: 'Sophia Mei Lin',
    scoreEarned: 88,
    scoreTotal: 100,
    completionDate: new Date(Date.now() - 172800000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
  {
    id: 'std_4',
    name: 'Ethan J. Vance',
    scoreEarned: 78,
    scoreTotal: 100,
    completionDate: new Date(Date.now() - 259200000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  },
];

export const computeDistinctionRemark = (score: number, total: number): string => {
  if (!total || total <= 0) return 'Completed Coursework';
  const pct = Math.round((score / total) * 100);
  if (pct >= 95) return 'Passed with High Distinction';
  if (pct >= 90) return 'Passed with Distinction';
  if (pct >= 85) return 'Passed with Honors';
  if (pct >= 75) return 'Successfully Completed';
  return 'Completed Coursework';
};

import CertificateDiplomaView, {
  CertificateFormData,
  CertificatePaperFormat,
  CertificateTemplateMeta,
  certificateTemplates,
  generateUniqueVerificationCode,
  getFormattedIssueDate,
  getCertificateOfflinePayload,
  RealQrCodeImage,
} from './certificate/CertificateDiplomaView';

export {
  CertificateDiplomaView,
  certificateTemplates,
  generateUniqueVerificationCode,
  getFormattedIssueDate,
  getCertificateOfflinePayload,
  RealQrCodeImage,
};
export type { CertificatePaperFormat };

export const initialDefaultData: CertificateFormData = {
  schoolName: 'Horizon Academy of Sciences & Technology',
  departmentName: 'Department of Applied Engineering & Renewable Studies',
  selectedStudentId: 'std_1',
  recipientName: 'Alexandria J. Mercer',
  completionStatement: 'has successfully completed all required multimedia coursework, laboratory simulations, and master-level quiz evaluations for the course of',
  courseName: 'Physics & Applied Systems Engineering',
  gradeLevel: 'Grade 12 — Senior STEM Honors Track',
  showScore: true,
  scoreEarned: 98,
  scoreTotal: 100,
  gradeRemark: 'Passed with High Distinction',
  certificateId: 'REC-2026-A3F9-7339-CERT',
  teacherName: 'Dr. Elena Rostova',
  teacherTitle: 'Lead Course Instructor',
  includePrincipal: true,
  principalName: 'Prof. Marcus Vance, Ph.D.',
  principalTitle: 'School Principal & Academic Dean',
  selectedTemplateId: 'tpl_1_classic_gold',
  paperFormat: 'a4',
};

export interface CertificateBuilderProps {
  currentProject?: any;
  onUpdateProject?: (updated: any) => void;
}

export default function CertificateBuilder({ currentProject, onUpdateProject }: CertificateBuilderProps) {
  const [paperFormat, setPaperFormat] = useState<CertificatePaperFormat>(() => {
    if (currentProject?.certificate?.paperFormat) {
      return currentProject.certificate.paperFormat;
    }
    const saved = localStorage.getItem(`recall_certificate_${currentProject?.id || 'default'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.paperFormat) return parsed.paperFormat;
      } catch {}
    }
    return 'a4';
  });
  const [formData, setFormData] = useState<CertificateFormData>(() => {
    let savedData: Partial<CertificateFormData> = {};
    if (currentProject?.certificate) {
      savedData = currentProject.certificate;
    } else {
      const saved = localStorage.getItem(`recall_certificate_${currentProject?.id || 'default'}`);
      if (saved) {
        try {
          savedData = JSON.parse(saved);
        } catch {}
      }
    }
    return {
      ...initialDefaultData,
      ...savedData,
      courseName: currentProject?.title || savedData.courseName || initialDefaultData.courseName,
      certificateId: savedData.certificateId || generateUniqueVerificationCode(),
    };
  });
  const [isQrPayloadModalOpen, setIsQrPayloadModalOpen] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [copiedPayloadToast, setCopiedPayloadToast] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const teacherSigInputRef = useRef<HTMLInputElement>(null);
  const principalSigInputRef = useRef<HTMLInputElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripRef.current) {
      const scrollAmount = 260;
      filmstripRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Sync certificate to project
  const saveToProject = (newData: CertificateFormData) => {
    try {
      localStorage.setItem(`recall_certificate_${currentProject?.id || 'default'}`, JSON.stringify(newData));
    } catch {}
    if (currentProject && onUpdateProject) {
      onUpdateProject({
        ...currentProject,
        certificate: newData,
      });
    }
  };

  const handleInputChange = (field: keyof CertificateFormData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      saveToProject(next);
      return next;
    });
  };

  const handleTemplateChange = (templateId: string) => {
    handleInputChange('selectedTemplateId', templateId);
  };

  const handleFileUpload = (field: 'schoolLogoUrl' | 'teacherSignatureUrl' | 'principalSignatureUrl', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleInputChange(field, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (field: 'schoolLogoUrl' | 'teacherSignatureUrl' | 'principalSignatureUrl') => {
    handleInputChange(field, '');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(getCertificateOfflinePayload(formData));
    setCopiedPayloadToast(true);
    setTimeout(() => setCopiedPayloadToast(false), 2000);
  };

  const handleSaveCertificate = () => {
    saveToProject(formData);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const currentIssueDate = getFormattedIssueDate();
  const activeTemplate = certificateTemplates.find(t => t.id === formData.selectedTemplateId) || certificateTemplates[0];

  const percentage = formData.scoreTotal > 0
    ? Math.round((formData.scoreEarned / formData.scoreTotal) * 100)
    : 100;

  const currentOfflinePayload = getCertificateOfflinePayload(formData);

  return (
    <div className="space-y-6 w-full">
      {/* Hidden File Inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload('schoolLogoUrl', e)}
      />
      <input
        ref={teacherSigInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload('teacherSignatureUrl', e)}
      />
      <input
        ref={principalSigInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload('principalSignatureUrl', e)}
      />

      {/* Top Action Controls: Paper format, Test QR Payload, and Print PDF in a single row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        {/* Paper Size / Format Dropdown Selector (Conforms to Light, Dark, Device Theme) */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <FileText size={13} className="text-blue-600 dark:text-blue-400" />
            <span>Paper Format:</span>
          </span>
          <div className="relative inline-flex items-center">
            <select
              value={paperFormat}
              onChange={(e) => {
                const val = e.target.value as CertificatePaperFormat;
                setPaperFormat(val);
                handleInputChange('paperFormat', val);
              }}
              className="appearance-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-lg pl-2.5 pr-8 py-1 text-xs font-bold shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-colors cursor-pointer"
            >
              <option value="a4" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                A4 Portrait (210 × 297 mm)
              </option>
              <option value="a4_landscape" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                A4 Landscape (297 × 210 mm)
              </option>
              <option value="letter" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                US Letter Portrait (8.5 × 11 in)
              </option>
              <option value="letter_landscape" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                US Letter Landscape (11 × 8.5 in)
              </option>
              <option value="a5_landscape" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                A5 Landscape (210 × 148.5 mm · 1/2 A4)
              </option>
              <option value="a5_portrait" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                A5 Portrait (148.5 × 210 mm · 1/2 A4)
              </option>
            </select>
            <div className="pointer-events-none absolute right-2 flex items-center text-slate-500 dark:text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQrPayloadModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Inspect the exact text summary readable by any scanner offline"
          >
            <ScanLine size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="whitespace-nowrap">Test QR Payload</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Printer size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Print / PDF Export</span>
          </button>
        </div>
      </div>

      {isSavedToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>Certificate configuration saved successfully for this course!</span>
        </div>
      )}

      {/* Template Filmstrip View (10 Templates) */}
      <section className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Choose Certificate Template ({certificateTemplates.length} Styles Available)
            </h3>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg truncate max-w-[200px] sm:max-w-none">
              Active: {activeTemplate.name}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => scrollFilmstrip('left')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Scroll filmstrip left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollFilmstrip('right')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Scroll filmstrip right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filmstrip Horizontal Scrolling Track */}
        <div className="relative group">
          <div
            ref={filmstripRef}
            className="flex items-stretch gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
          >
            {certificateTemplates.map((tpl) => {
              const isSelected = tpl.id === formData.selectedTemplateId;
              const TplIcon = tpl.icon || Crown;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleInputChange('selectedTemplateId', tpl.id)}
                  className={`w-60 min-w-[240px] shrink-0 snap-start p-3.5 rounded-xl border-2 text-left flex flex-col justify-between gap-3 transition-all cursor-pointer relative ${isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 shadow-md ring-2 ring-blue-500/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${tpl.sealBg} ${tpl.sealTextColor} shadow-2xs shrink-0`}>
                        <TplIcon size={16} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tpl.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="p-1 bg-blue-600 text-white rounded-full shadow-xs shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-0.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tpl.name}
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between text-[10.5px]">
                    <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">
                      {tpl.fontClass === 'font-serif' ? 'Classic Serif' : 'Modern Sans'}
                    </span>
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {isSelected ? 'Active' : 'Click to apply'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Form & Live Certificate Preview Grid (Side-by-Side on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modular Customization Form                                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Institution Branding */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <School size={15} className="text-blue-600 dark:text-blue-400" />
              <span>1. Institution / School Branding</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  School / Organization Name
                </label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => handleInputChange('schoolName', e.target.value)}
                  placeholder="e.g. Horizon Academy of Sciences & Technology"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Department / Faculty / Division
                </label>
                <input
                  type="text"
                  value={formData.departmentName}
                  onChange={(e) => handleInputChange('departmentName', e.target.value)}
                  placeholder="e.g. Department of Computer Science & Engineering"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* School Logo Upload */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                    {formData.schoolLogoUrl ? (
                      <img src={formData.schoolLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      School / Academy Logo
                    </span>
                    <p className="text-[11px] text-slate-500 truncate">
                      {formData.schoolLogoUrl ? 'Custom logo image loaded' : 'PNG, JPG, or SVG emblem'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {formData.schoolLogoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('schoolLogoUrl')}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{formData.schoolLogoUrl ? 'Change' : 'Upload Logo'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Student Progress, Course & Locked Assessment Score */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="flex items-center gap-2">
                <UserCheck size={15} className="text-blue-600 dark:text-blue-400" />
                <span>2. Recipient, Course & Assessment Score</span>
              </span>
            </h3>

            <div className="space-y-3.5">
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Recipient Student Name:</span>
                  <span className="text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Runtime Dynamic</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  A sample fictitious name (<strong className="text-slate-800 dark:text-slate-200">Alexandria J. Mercer</strong>) is shown in this builder preview. The certificate will automatically populate with the student's entered name upon finishing the course.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Course / Program Title
                </label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => handleInputChange('courseName', e.target.value)}
                  placeholder="e.g. Course Title or Module Name"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Grade Level / Cohort / Track
                </label>
                <input
                  type="text"
                  value={formData.gradeLevel}
                  onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                  placeholder="e.g. Grade 10 / Track A"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Completion Citation Statement
                </label>
                <textarea
                  rows={2}
                  value={formData.completionStatement}
                  onChange={(e) => handleInputChange('completionStatement', e.target.value)}
                  placeholder="has successfully completed all required coursework..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                />
              </div>

              {/* Assessment Score Section (Read-Only / Uneditable from Student Progress) */}
              <div className="p-3.5 bg-slate-100/70 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showScore}
                      onChange={(e) => handleInputChange('showScore', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-sm"
                    />
                    <Trophy size={14} className="text-amber-500" />
                    <span>Include Evaluation Score on Certificate</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    <Lock size={10} />
                    <span>Verified ({percentage}%)</span>
                  </span>
                </div>

                {formData.showScore && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Lock size={11} className="text-slate-400" />
                          <span>Student Score Earned</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`${formData.scoreEarned} points`}
                          className="w-full px-3 py-1.5 bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden cursor-not-allowed select-none"
                          title="Score is uneditable; it is retrieved directly from student quiz performance."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Lock size={11} className="text-slate-400" />
                          <span>Total Course Max Score</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`${formData.scoreTotal} points`}
                          className="w-full px-3 py-1.5 bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden cursor-not-allowed select-none"
                          title="Total score is uneditable; it is calculated from course quizzes."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Lock size={11} className="text-slate-400" />
                        <span>Academic Distinction Remark (Auto-Computed)</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formData.gradeRemark}
                        className="w-full px-3 py-1.5 bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 outline-hidden cursor-not-allowed select-none"
                        title="Distinction remark is automatically determined by student assessment percentage."
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      ℹ️ Assessment score and honors distinction are uneditable and taken directly from the student's completed course submissions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Signatories & Issue Date */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400" />
              <span>3. Signatories & Signatures</span>
            </h3>

            {/* Teacher Signatory Details */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Subject Teacher (Mandatory Signatory)</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Teacher Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => handleInputChange('teacherName', e.target.value)}
                    placeholder="e.g. Dr. Elena Rostova"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Teacher Title
                  </label>
                  <input
                    type="text"
                    value={formData.teacherTitle}
                    onChange={(e) => handleInputChange('teacherTitle', e.target.value)}
                    placeholder="e.g. Lead Course Instructor"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Teacher Signature Upload */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  {formData.teacherSignatureUrl ? (
                    <div className="h-8 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center p-1">
                      <img src={formData.teacherSignatureUrl} alt="Teacher Sig" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No image signature (using font signature)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {formData.teacherSignatureUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('teacherSignatureUrl')}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => teacherSigInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>{formData.teacherSignatureUrl ? 'Change' : 'Upload Signature'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Principal Signatory (Optional Toggle) */}
            <div className={`p-3.5 rounded-xl border transition-all space-y-3 ${formData.includePrincipal
              ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
              : 'bg-slate-100/60 dark:bg-slate-950/20 border-dashed border-slate-200 dark:border-slate-800/80 opacity-80'
              }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includePrincipal}
                    onChange={(e) => handleInputChange('includePrincipal', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-sm"
                  />
                  <span>Include Principal / Academic Dean Signatory</span>
                </label>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {formData.includePrincipal ? 'Active' : 'Disabled (Single Teacher Signatory)'}
                </span>
              </div>

              {formData.includePrincipal && (
                <div className="space-y-3 pt-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Principal Name
                      </label>
                      <input
                        type="text"
                        value={formData.principalName}
                        onChange={(e) => handleInputChange('principalName', e.target.value)}
                        placeholder="e.g. Prof. Marcus Vance, Ph.D."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Principal Title
                      </label>
                      <input
                        type="text"
                        value={formData.principalTitle}
                        onChange={(e) => handleInputChange('principalTitle', e.target.value)}
                        placeholder="e.g. School Principal & Academic Dean"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Principal Signature Upload */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      {formData.principalSignatureUrl ? (
                        <div className="h-8 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center p-1">
                          <img src={formData.principalSignatureUrl} alt="Principal Sig" className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No image signature (using font signature)</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.principalSignatureUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('principalSignatureUrl')}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => principalSigInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        <Upload size={12} />
                        <span>{formData.principalSignatureUrl ? 'Change' : 'Upload Signature'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Live Interactive Certificate of Completion */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4 sticky top-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Eye size={15} className="text-blue-600 dark:text-blue-400" />
              <span>
                Live Generated Certificate ({
                  paperFormat === 'a4_landscape' ? 'A4 Landscape' :
                  paperFormat === 'letter_landscape' ? 'US Letter Landscape' :
                  paperFormat === 'letter' ? 'US Letter Portrait' :
                  paperFormat === 'a5_landscape' ? 'A5 Landscape (1/2 A4)' :
                  paperFormat === 'a5_portrait' ? 'A5 Portrait (1/2 A4)' : 'A4 Portrait'
                })
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Style: {activeTemplate.name}
            </span>
          </div>

          {/* Half-Sheet A4 Efficiency Notice Banner */}
          {(paperFormat === 'a5_landscape' || paperFormat === 'a5_portrait') && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
              <span className="text-base shrink-0 select-none">✂️</span>
              <div>
                <span className="font-bold">Half-Page Efficiency Mode Active (Consumes only 1/2 of A4 Paper):</span>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  {paperFormat === 'a5_landscape'
                    ? 'The certificate occupies the top half of standard A4 paper (210 × 148.5 mm). When printed, a dashed cutting line appears across the horizontal middle so you can cut the sheet in half cleanly.'
                    : 'The certificate occupies the left half of standard A4 paper (148.5 × 210 mm). When printed, a dashed cutting line appears along the vertical middle so you can cut the sheet in half cleanly.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Certificate Canvas Frame */}
          <div className="p-2 sm:p-4 bg-slate-200/80 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-md flex items-center justify-center overflow-x-auto">
            <CertificateDiplomaView
              data={formData}
              paperFormat={paperFormat}
              certRef={certRef}
              onQrClick={() => setIsQrPayloadModalOpen(true)}
              isPrintTarget={true}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSaveCertificate}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isSavedToast
                  ? 'bg-emerald-600 ring-2 ring-emerald-400/50 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white'
              }`}
            >
              <Check size={16} className={isSavedToast ? 'text-emerald-200 stroke-[3]' : ''} />
              <span>{isSavedToast ? 'Saved to Course!' : 'Apply & Save Certificate to Course'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Save Success Toast Notification */}
      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white border border-emerald-500/40 shadow-2xl rounded-2xl animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Certificate Saved Successfully</p>
            <p className="text-[11px] text-slate-400">All design settings, signatories, and QR payload applied to the course.</p>
          </div>
        </div>
      )}

      {/* Offline QR Code Text Payload Simulator Modal */}
      {isQrPayloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <QrCode size={20} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold">Offline QR Scanned Verification Payload</h3>
              </div>
              <button
                onClick={() => setIsQrPayloadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When any smartphone camera or QR scanner scans the certificate offline, it reads and displays this exact text payload immediately without requiring an internet connection:
            </p>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto border border-slate-800 select-all">
                {currentOfflinePayload}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Verification Code: {formData.certificateId}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Copy size={13} />
                  <span>{copiedPayloadToast ? 'Copied!' : 'Copy Summary'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQrPayloadModalOpen(false)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
