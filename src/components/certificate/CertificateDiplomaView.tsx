import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Award, QrCode, ScanLine, Trophy, GraduationCap,
  LayoutTemplate, Shield, Cpu, Feather, Crown, Star, Bookmark, Sparkles, CheckCircle2
} from 'lucide-react';

export type CertificatePaperFormat = 'a4' | 'a4_landscape' | 'letter' | 'letter_landscape' | 'a5_landscape' | 'a5_portrait';

export interface CertificateFormData {
  schoolName: string;
  departmentName: string;
  selectedStudentId?: string;
  recipientName: string;
  completionStatement: string;
  courseName: string;
  gradeLevel: string;
  showScore: boolean;
  scoreEarned: number;
  scoreTotal: number;
  gradeRemark: string;
  issueDate?: string;
  certificateId: string;
  teacherName: string;
  teacherTitle: string;
  includePrincipal: boolean;
  principalName: string;
  principalTitle: string;
  schoolLogoUrl?: string;
  teacherSignatureUrl?: string;
  principalSignatureUrl?: string;
  selectedTemplateId: string;
  paperFormat?: CertificatePaperFormat;
}

export interface CertificateTemplateMeta {
  id: string;
  name: string;
  badge: string;
  icon: any;
  description: string;
  outerBorder: string;
  innerBorder: string;
  bgGradient: string;
  titleColor: string;
  accentTextColor: string;
  sealBg: string;
  sealTextColor: string;
  fontClass: string;
  accentBadgeBorder: string;
  headerAccent: string;
  cornerAccent: string;
}

export const certificateTemplates: CertificateTemplateMeta[] = [
  {
    id: 'tpl_1_classic_gold',
    name: '1. Classic Gold & Navy',
    badge: 'Traditional',
    icon: Award,
    description: 'Traditional academic diploma with ornamental gold filigree and royal navy accents.',
    outerBorder: 'border-amber-600/80',
    innerBorder: 'border-amber-400/50',
    bgGradient: 'radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(253,248,235,0.94) 100%)',
    titleColor: 'text-slate-900',
    accentTextColor: 'text-amber-800',
    sealBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600',
    sealTextColor: 'text-amber-950',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-amber-500',
    headerAccent: 'text-slate-800',
    cornerAccent: 'text-amber-600',
  },
  {
    id: 'tpl_2_ivy_league',
    name: '2. Prestige Ivy League',
    badge: 'University',
    icon: GraduationCap,
    description: 'Deep burgundy and parchment with stately copperplate serif typography.',
    outerBorder: 'border-red-900/85',
    innerBorder: 'border-amber-500/50',
    bgGradient: 'radial-gradient(circle at center, rgba(255,253,248,0.98) 0%, rgba(250,240,230,0.93) 100%)',
    titleColor: 'text-red-950',
    accentTextColor: 'text-red-800',
    sealBg: 'bg-gradient-to-br from-red-700 via-red-800 to-red-950',
    sealTextColor: 'text-amber-200',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-red-800',
    headerAccent: 'text-red-950',
    cornerAccent: 'text-red-900',
  },
  {
    id: 'tpl_3_modern_minimal',
    name: '3. Modern Minimalist Slate',
    badge: 'Contemporary',
    icon: LayoutTemplate,
    description: 'Clean contemporary borders with cobalt accents and sharp sans-serif aesthetics.',
    outerBorder: 'border-blue-600/90',
    innerBorder: 'border-slate-300/80',
    bgGradient: 'linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(241,245,249,0.95) 100%)',
    titleColor: 'text-slate-900',
    accentTextColor: 'text-blue-600',
    sealBg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700',
    sealTextColor: 'text-white',
    fontClass: 'font-sans',
    accentBadgeBorder: 'border-blue-500',
    headerAccent: 'text-slate-900',
    cornerAccent: 'text-blue-600',
  },
  {
    id: 'tpl_4_emerald_honors',
    name: '4. Academic Emerald Honors',
    badge: 'Honors',
    icon: Shield,
    description: 'Rich botanical forest emerald green with champagne gold seals and laurel accents.',
    outerBorder: 'border-emerald-700/85',
    innerBorder: 'border-emerald-400/50',
    bgGradient: 'radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.93) 100%)',
    titleColor: 'text-emerald-950',
    accentTextColor: 'text-emerald-800',
    sealBg: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700',
    sealTextColor: 'text-emerald-950',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-emerald-600',
    headerAccent: 'text-emerald-900',
    cornerAccent: 'text-emerald-700',
  },
  {
    id: 'tpl_5_tech_stem',
    name: '5. Tech & STEM Cyber Credential',
    badge: 'Engineering',
    icon: Cpu,
    description: 'Cyan and deep obsidian blueprint theme designed for STEM & technology certifications.',
    outerBorder: 'border-cyan-600/85',
    innerBorder: 'border-blue-500/40',
    bgGradient: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(238,248,255,0.94) 100%)',
    titleColor: 'text-slate-900',
    accentTextColor: 'text-cyan-700',
    sealBg: 'bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-800',
    sealTextColor: 'text-cyan-100',
    fontClass: 'font-sans',
    accentBadgeBorder: 'border-cyan-500',
    headerAccent: 'text-cyan-900',
    cornerAccent: 'text-cyan-600',
  },
  {
    id: 'tpl_6_victorian_parchment',
    name: '6. Vintage Victorian Scroll',
    badge: 'Vintage',
    icon: Feather,
    description: 'Warm antique sepia parchment with intricate gothic flourishes and wax seal motif.',
    outerBorder: 'border-amber-800/85',
    innerBorder: 'border-yellow-600/45',
    bgGradient: 'radial-gradient(circle at center, rgba(254,250,238,0.99) 0%, rgba(247,236,206,0.95) 100%)',
    titleColor: 'text-amber-950',
    accentTextColor: 'text-amber-900',
    sealBg: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950',
    sealTextColor: 'text-amber-200',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-amber-700',
    headerAccent: 'text-amber-950',
    cornerAccent: 'text-amber-800',
  },
  {
    id: 'tpl_7_executive_platinum',
    name: '7. Executive Platinum & Obsidian',
    badge: 'Executive',
    icon: Crown,
    description: 'Sleek dark platinum frame with silver foil accents for professional master certifications.',
    outerBorder: 'border-slate-800/90',
    innerBorder: 'border-slate-400/50',
    bgGradient: 'linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(241,245,249,0.93) 100%)',
    titleColor: 'text-slate-900',
    accentTextColor: 'text-slate-700',
    sealBg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950',
    sealTextColor: 'text-slate-100',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-slate-700',
    headerAccent: 'text-slate-900',
    cornerAccent: 'text-slate-800',
  },
  {
    id: 'tpl_8_crimson_magna',
    name: '8. Crimson & Gold Magna Cum Laude',
    badge: 'Distinction',
    icon: Star,
    description: 'Royal crimson ribbon borders and grand gold medals tailored for honors graduates.',
    outerBorder: 'border-rose-700/85',
    innerBorder: 'border-amber-400/55',
    bgGradient: 'radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(255,241,242,0.93) 100%)',
    titleColor: 'text-rose-950',
    accentTextColor: 'text-rose-700',
    sealBg: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800',
    sealTextColor: 'text-rose-100',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-rose-500',
    headerAccent: 'text-rose-900',
    cornerAccent: 'text-rose-700',
  },
  {
    id: 'tpl_9_coastal_sapphire',
    name: '9. Coastal Sapphire & Azure',
    badge: 'Maritime',
    icon: Bookmark,
    description: 'Polished navy and vibrant cyan wave geometry for maritime and life sciences.',
    outerBorder: 'border-indigo-700/85',
    innerBorder: 'border-blue-400/45',
    bgGradient: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(238,242,255,0.93) 100%)',
    titleColor: 'text-indigo-950',
    accentTextColor: 'text-indigo-600',
    sealBg: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700',
    sealTextColor: 'text-indigo-100',
    fontClass: 'font-sans',
    accentBadgeBorder: 'border-indigo-500',
    headerAccent: 'text-indigo-900',
    cornerAccent: 'text-indigo-600',
  },
  {
    id: 'tpl_10_renaissance_royale',
    name: '10. Renaissance Royal Imperial',
    badge: 'Imperial',
    icon: Sparkles,
    description: 'Baroque imperial crests, gilded golden sunburst seal, and regal classical header.',
    outerBorder: 'border-amber-600/90',
    innerBorder: 'border-yellow-500/50',
    bgGradient: 'radial-gradient(circle at center, rgba(255,253,245,0.99) 0%, rgba(252,243,222,0.94) 100%)',
    titleColor: 'text-amber-950',
    accentTextColor: 'text-amber-900',
    sealBg: 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-700',
    sealTextColor: 'text-amber-950',
    fontClass: 'font-serif',
    accentBadgeBorder: 'border-amber-600',
    headerAccent: 'text-amber-950',
    cornerAccent: 'text-amber-600',
  },
];

export const generateUniqueVerificationCode = (): string => {
  const year = new Date().getFullYear();
  const rand1 = Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase();
  const rand2 = Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase();
  return `REC-${year}-${rand1}-${rand2}-CERT`;
};

export const getFormattedIssueDate = (): string => {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const getCertificateOfflinePayload = (data: CertificateFormData, isCompact: boolean = false): string => {
  const pct = data.scoreTotal > 0 ? Math.round((data.scoreEarned / data.scoreTotal) * 100) : 100;
  const issueDate = data.issueDate || getFormattedIssueDate();
  
  if (isCompact) {
    // Ultra-low density Version 4 (33x33 grid) for smaller A5 paper formats
    const lines = [
      data.certificateId,
      data.recipientName,
      data.showScore ? `${data.courseName} (${pct}%)` : data.courseName,
    ].filter(Boolean);
    return lines.join('\n');
  }

  const lines = [
    `RECALL VERIFIED CERTIFICATE`,
    `ID: ${data.certificateId}`,
    `Recipient: ${data.recipientName}`,
    `Course: ${data.courseName}`,
    data.showScore ? `Score: ${data.scoreEarned}/${data.scoreTotal} (${pct}%)` : '',
    `Instructor: ${data.teacherName}`,
    `Date: ${issueDate}`,
    `Status: Authentic & Valid`,
  ].filter(Boolean);
  return lines.join('\n');
};

export function RealQrCodeImage({
  payload,
  size = 86,
  className = '',
  onPreviewClick,
}: {
  payload: string;
  size?: number;
  className?: string;
  onPreviewClick?: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(payload, {
      margin: 4,
      width: 600,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => {
        if (isMounted) setDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating offline QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [payload]);

  return (
    <div
      onClick={onPreviewClick}
      title="Click to inspect offline scanned verification details"
      className={`flex flex-col items-center justify-center cursor-pointer group select-none ${className}`}
    >
      <div className="bg-white p-1 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-center shrink-0">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Verification QR Code"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              imageRendering: 'pixelated',
            }}
            className="cert-qr-img object-contain block mx-auto shrink-0 bg-white"
          />
        ) : (
          <div style={{ width: `${size}px`, height: `${size}px` }} className="bg-slate-100 flex items-center justify-center shrink-0">
            <QrCode size={size * 0.6} className="text-slate-400 animate-pulse" />
          </div>
        )}
      </div>
      <span className="cert-qr-tag text-[7.5px] sm:text-[8px] font-sans font-extrabold uppercase text-slate-800 tracking-tight mt-1 group-hover:text-blue-600 flex items-center justify-center gap-0.5 whitespace-nowrap leading-tight text-center">
        <ScanLine size={7} className="shrink-0" />
        <span>Scan to Verify</span>
      </span>
    </div>
  );
}

export interface CertificateDiplomaViewProps {
  data: CertificateFormData;
  paperFormat?: CertificatePaperFormat;
  certRef?: React.RefObject<HTMLDivElement | null>;
  onQrClick?: () => void;
  className?: string;
  isPrintTarget?: boolean;
}

export default function CertificateDiplomaView({
  data,
  paperFormat: customPaperFormat,
  certRef,
  onQrClick,
  className = '',
  isPrintTarget = false,
}: CertificateDiplomaViewProps) {
  const paperFormat = customPaperFormat || data.paperFormat || 'a4';
  const activeTemplate = certificateTemplates.find(t => t.id === data.selectedTemplateId) || certificateTemplates[0];

  const isLandscape = paperFormat === 'a4_landscape' || paperFormat === 'letter_landscape' || paperFormat === 'a5_landscape';
  const isA5 = paperFormat === 'a5_landscape' || paperFormat === 'a5_portrait';

  const percentage = data.scoreTotal > 0
    ? Math.round((data.scoreEarned / data.scoreTotal) * 100)
    : 100;

  const currentIssueDate = data.issueDate || getFormattedIssueDate();
  const currentOfflinePayload = getCertificateOfflinePayload(data, isA5);

  // Determine container aspect ratio and max width class based on format
  const getContainerFormatClasses = () => {
    switch (paperFormat) {
      case 'a4_landscape':
        return 'max-w-[760px] aspect-[297/210] p-4 sm:p-6';
      case 'letter_landscape':
        return 'max-w-[740px] aspect-[11/8.5] p-4 sm:p-6';
      case 'letter':
        return 'max-w-[560px] aspect-[8.5/11] p-5 sm:p-7';
      case 'a5_landscape':
        return 'max-w-[620px] aspect-[210/148.5] p-3 sm:p-4';
      case 'a5_portrait':
        return 'max-w-[440px] aspect-[148.5/210] p-3 sm:p-4';
      case 'a4':
      default:
        return 'max-w-[540px] aspect-[210/297] p-5 sm:p-7';
    }
  };

  // Determine print page CSS size rule
  const getPageSizeRule = () => {
    switch (paperFormat) {
      case 'a4_landscape':
        return 'A4 landscape';
      case 'letter_landscape':
        return 'letter landscape';
      case 'letter':
        return 'letter portrait';
      case 'a5_landscape':
        // Prints on the top half of an A4 portrait paper (210 x 148.5 mm)
        return 'A4 portrait';
      case 'a5_portrait':
        // Prints on the left half of an A4 landscape paper (148.5 x 210 mm)
        return 'A4 landscape';
      case 'a4':
      default:
        return 'A4 portrait';
    }
  };

  return (
    <div
      id={isPrintTarget ? 'printable-certificate' : undefined}
      ref={certRef as any}
      className={`w-full ${getContainerFormatClasses()} text-slate-900 rounded-sm border-8 ${
        activeTemplate.outerBorder
      } shadow-2xl relative flex flex-col justify-between select-none ${
        activeTemplate.fontClass
      } ${isPrintTarget ? 'printable-certificate-target' : ''} ${className}`}
      style={{
        backgroundImage: activeTemplate.bgGradient,
      }}
    >
      {/* High Precision Dynamic Print Stylesheet for A4 / US Letter / A5 Half-Sheet export */}
      <style>{`
        @page {
          size: ${getPageSizeRule()};
          margin: 0mm !important;
        }
        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible !important;
          }
          #printable-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            right: ${paperFormat === 'a5_portrait' ? 'auto' : '0'} !important;
            bottom: ${paperFormat === 'a5_landscape' ? 'auto' : '0'} !important;
            width: ${paperFormat === 'a5_portrait' ? '50vw' : '100vw'} !important;
            height: ${paperFormat === 'a5_landscape' ? '50vh' : '100vh'} !important;
            max-width: ${paperFormat === 'a5_portrait' ? '148.5mm' : '100vw'} !important;
            max-height: ${paperFormat === 'a5_landscape' ? '148.5mm' : '100vh'} !important;
            aspect-ratio: auto !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: ${
              paperFormat === 'a5_landscape' ? '5.5mm 9mm 4.5mm 9mm' :
              paperFormat === 'a5_portrait' ? '6.5mm 8mm 5.5mm 8mm' :
              isLandscape ? '10mm 16mm 9mm 16mm' : '14mm 16mm 12mm 16mm'
            } !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            background-image: ${activeTemplate.bgGradient} !important;
          }
          .cert-logo { max-height: ${isA5 ? '34px' : isLandscape ? '48px' : '56px'} !important; max-width: ${isA5 ? '100px' : '140px'} !important; }
          .cert-seal { width: ${isA5 ? '32px' : isLandscape ? '44px' : '48px'} !important; height: ${isA5 ? '32px' : isLandscape ? '44px' : '48px'} !important; font-size: ${isA5 ? '15px' : isLandscape ? '20px' : '22px'} !important; }
          .cert-school-name { font-size: ${isA5 ? '11.5pt' : isLandscape ? '15pt' : '15pt'} !important; line-height: 1.15 !important; }
          .cert-dept-name { font-size: ${isA5 ? '7.5pt' : '9.5pt'} !important; line-height: 1.15 !important; margin-top: ${isA5 ? '1px' : '2px'} !important; }
          .cert-certifies-tag { font-size: ${isA5 ? '7.5pt' : '10pt'} !important; letter-spacing: 0.2em !important; margin-top: ${isA5 ? '2px' : isLandscape ? '4px' : '6px'} !important; margin-bottom: 1px !important; }
          .cert-recipient-name { font-size: ${isA5 ? '16.5pt' : '24pt'} !important; line-height: 1.15 !important; padding-bottom: 2px !important; }
          .cert-statement { font-size: ${isA5 ? '7.5pt' : '10pt'} !important; line-height: 1.25 !important; max-width: ${isA5 ? '92%' : isLandscape ? '85%' : '94%'} !important; margin-top: ${isA5 ? '1px' : '3px'} !important; }
          .cert-course-title { font-size: ${isA5 ? '12pt' : isLandscape ? '16pt' : '16.5pt'} !important; line-height: 1.15 !important; margin-top: ${isA5 ? '1px' : '3px'} !important; }
          .cert-grade-track { font-size: ${isA5 ? '7.5pt' : '9.5pt'} !important; margin-top: 1px !important; }
          .cert-score-badge { font-size: ${isA5 ? '7pt' : '9pt'} !important; padding: ${isA5 ? '1.5px 8px' : '3px 12px'} !important; margin-top: ${isA5 ? '1px' : '3px'} !important; }
          .cert-footer-wrap { margin-top: ${isA5 ? '3px' : isLandscape ? '6px' : '8px'} !important; padding-top: ${isA5 ? '3px' : isLandscape ? '6px' : '8px'} !important; }
          .cert-sig-slot { height: ${isA5 ? '26px' : isLandscape ? '38px' : '42px'} !important; }
          .cert-sig-name { font-size: ${isA5 ? '8.5pt' : '10.5pt'} !important; line-height: 1.1 !important; }
          .cert-sig-title { font-size: ${isA5 ? '6.5pt' : '8.5pt'} !important; line-height: 1.1 !important; }
          .cert-sig-img { max-height: ${isA5 ? '24px' : isLandscape ? '36px' : '40px'} !important; max-width: ${isA5 ? '85px' : '130px'} !important; }
          .cert-qr-container { min-width: ${isA5 ? '80px' : isLandscape ? '100px' : '104px'} !important; width: auto !important; padding: 3px !important; background: #ffffff !important; }
          .cert-qr-img { width: ${isA5 ? '74px' : isLandscape ? '92px' : '96px'} !important; height: ${isA5 ? '74px' : isLandscape ? '92px' : '96px'} !important; max-width: ${isA5 ? '74px' : isLandscape ? '92px' : '96px'} !important; max-height: ${isA5 ? '74px' : isLandscape ? '92px' : '96px'} !important; image-rendering: pixelated !important; }
          .cert-qr-tag { display: none !important; }
          .cert-qr-code { font-size: ${isA5 ? '7pt' : '8pt'} !important; margin-top: 2px !important; white-space: nowrap !important; }
          .cert-bottom-bar { font-size: ${isA5 ? '6.5pt' : '8.5pt'} !important; padding-top: 1px !important; }
        }
      `}</style>

      {/* Outer Fine Double Border Frame */}
      <div className={`absolute inset-2 sm:inset-3 border-2 ${activeTemplate.innerBorder} pointer-events-none rounded-xs`} />
      <div className="absolute inset-3 sm:inset-4 border border-slate-400/25 pointer-events-none" />

      {/* Decorative Corner Filigree Ornaments */}
      <div className={`absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 ${activeTemplate.accentBadgeBorder} pointer-events-none`} />
      <div className={`absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 ${activeTemplate.accentBadgeBorder} pointer-events-none`} />
      <div className={`absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 ${activeTemplate.accentBadgeBorder} pointer-events-none`} />
      <div className={`absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 ${activeTemplate.accentBadgeBorder} pointer-events-none`} />

      {/* Inner Corner Diamonds */}
      <div className={`absolute top-4.5 left-4.5 w-1.5 h-1.5 rotate-45 ${activeTemplate.accentBadgeBorder.replace('border-', 'bg-')} pointer-events-none opacity-70`} />
      <div className={`absolute top-4.5 right-4.5 w-1.5 h-1.5 rotate-45 ${activeTemplate.accentBadgeBorder.replace('border-', 'bg-')} pointer-events-none opacity-70`} />
      <div className={`absolute bottom-4.5 left-4.5 w-1.5 h-1.5 rotate-45 ${activeTemplate.accentBadgeBorder.replace('border-', 'bg-')} pointer-events-none opacity-70`} />
      <div className={`absolute bottom-4.5 right-4.5 w-1.5 h-1.5 rotate-45 ${activeTemplate.accentBadgeBorder.replace('border-', 'bg-')} pointer-events-none opacity-70`} />

      {/* ========================================================================= */}
      {/* 1. Header: School Logo / Emblem, School Name & Department                 */}
      {/* ========================================================================= */}
      <div className={`text-center z-10 ${isLandscape ? 'space-y-0.5 pt-1 sm:pt-2' : 'space-y-1 pt-2 sm:pt-3'}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt="Logo"
              className={`cert-logo ${isLandscape ? 'max-h-11 sm:max-h-12' : 'max-h-14 sm:max-h-16'} max-w-[140px] object-contain drop-shadow-xs`}
            />
          ) : (
            <div className={`cert-seal ${isLandscape ? 'w-9 h-9 sm:w-10 sm:h-10 text-base' : 'w-11 h-11 sm:w-12 sm:h-12 text-lg'} rounded-full ${activeTemplate.sealBg} ${activeTemplate.sealTextColor} flex items-center justify-center shadow-2xs font-bold ring-2 ring-white/80`}>
              <Award size={isLandscape ? 20 : 24} />
            </div>
          )}
        </div>
        <h4 className={`cert-school-name ${isLandscape ? 'text-xs sm:text-sm md:text-base' : 'text-sm sm:text-base'} font-bold tracking-widest uppercase ${activeTemplate.headerAccent}`}>
          {data.schoolName || 'School / Organization Name'}
        </h4>
        {data.departmentName && (
          <p className={`cert-dept-name ${isLandscape ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'} font-sans font-medium uppercase tracking-wider text-slate-600`}>
            {data.departmentName}
          </p>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Main Award Title & Recipient Name                                      */}
      {/* ========================================================================= */}
      <div className={`text-center z-10 ${isLandscape ? 'space-y-0.5 my-1 sm:my-2' : 'space-y-1 my-2 sm:my-3'}`}>
        <span className={`cert-certifies-tag ${isLandscape ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-[11px]'} uppercase font-sans tracking-[0.25em] font-bold ${activeTemplate.accentTextColor} block`}>
          This Certifies That
        </span>
        <div className="w-full max-w-[560px] mx-auto px-4">
          <h1
            className={`cert-recipient-name font-extrabold uppercase tracking-wide ${activeTemplate.titleColor} py-0.5 border-b-2 border-slate-300 inline-block max-w-full break-words`}
            style={{
              fontSize: isLandscape
                ? `clamp(1.2rem, ${Math.max(1.2, 2.4 - (data.recipientName?.length || 0) * 0.028)}rem, 2rem)`
                : `clamp(1.1rem, ${Math.max(1.1, 2.2 - (data.recipientName?.length || 0) * 0.03)}rem, 1.875rem)`
            }}
          >
            {data.recipientName || 'Student Name'}
          </h1>
        </div>
        <p className={`cert-statement ${isLandscape ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'} text-slate-700 font-sans max-w-xl mx-auto leading-normal pt-0.5 px-3`}>
          {data.completionStatement || 'has successfully completed all required multimedia coursework, laboratory simulations, and master-level evaluations for the course of'}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. Course Name, Track & Evaluation Score Badge                           */}
      {/* ========================================================================= */}
      <div className={`text-center z-10 ${isLandscape ? 'space-y-0.5 -mt-0.5' : 'space-y-1 -mt-0.5'}`}>
        <h2 className={`cert-course-title ${isLandscape ? 'text-sm sm:text-base md:text-lg' : 'text-base sm:text-lg'} font-bold uppercase tracking-wider ${activeTemplate.titleColor}`}>
          {data.courseName || 'Course Name'}
        </h2>
        {data.gradeLevel && (
          <p className={`cert-grade-track ${isLandscape ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'} font-sans font-semibold ${activeTemplate.accentTextColor}`}>
            {data.gradeLevel}
          </p>
        )}

        {/* Score & Honors Distinction Badge */}
        {data.showScore && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className={`cert-score-badge inline-flex items-center gap-2 ${isLandscape ? 'px-3 py-1 text-[10.5px] sm:text-xs' : 'px-4 py-1.5 text-xs'} rounded-full border ${activeTemplate.innerBorder} bg-white/90 shadow-2xs font-sans`}>
              <Trophy size={isLandscape ? 12 : 14} className={activeTemplate.accentTextColor} />
              <span className="font-bold text-slate-900">
                Score: {data.scoreEarned} / {data.scoreTotal} ({percentage}%)
              </span>
              {data.gradeRemark && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className={`font-semibold ${activeTemplate.accentTextColor}`}>
                    {data.gradeRemark}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. Genuine Verification QR Code & Signatures Footer                      */}
      {/* ========================================================================= */}
      <div className={`cert-footer-wrap z-10 border-t border-slate-300/80 ${isLandscape ? 'pt-2 mt-1 sm:mt-2 space-y-1.5' : 'pt-3.5 mt-2 space-y-2.5'}`}>
        {data.includePrincipal ? (
          <div className="flex items-end justify-between gap-3 w-full">
            {/* Left Signatory (Teacher / Instructor) */}
            <div className="cert-sig-block text-center flex-1 max-w-[190px]">
              <div className={`cert-sig-slot ${isLandscape ? 'h-8 sm:h-9' : 'h-10 sm:h-11'} flex items-end justify-center pb-1`}>
                {data.teacherSignatureUrl ? (
                  <img
                    src={data.teacherSignatureUrl}
                    alt="Teacher Signature"
                    className="cert-sig-img max-h-full max-w-[130px] object-contain mx-auto"
                  />
                ) : (
                  <span className="font-serif italic text-xs sm:text-sm md:text-base text-slate-700 font-bold tracking-wide">
                    {data.teacherName}
                  </span>
                )}
              </div>
              <div className="cert-sig-line border-t border-slate-700/80 pt-1 w-full">
                <p className={`cert-sig-name ${isLandscape ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[10.5px] sm:text-[11px]'} font-bold text-slate-900 leading-tight`}>
                  {data.teacherName || 'Subject Teacher'}
                </p>
                <p className={`cert-sig-title ${isLandscape ? 'text-[8.5px] sm:text-[9px]' : 'text-[9px] sm:text-[9.5px]'} font-sans text-slate-600 leading-tight`}>
                  {data.teacherTitle || 'Lead Course Instructor'}
                </p>
              </div>
            </div>

            {/* Center Offline QR Code Verification Box */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="cert-qr-container">
                <RealQrCodeImage
                  payload={currentOfflinePayload}
                  size={isA5 ? 72 : isLandscape ? 88 : 92}
                  onPreviewClick={onQrClick}
                />
              </div>
              <span className={`cert-qr-code ${isA5 ? 'text-[7px] sm:text-[7.5px]' : isLandscape ? 'text-[8px] sm:text-[8.5px]' : 'text-[8.5px] sm:text-[9px]'} font-sans font-mono text-slate-600 font-bold mt-1 tracking-tight`}>
                {data.certificateId}
              </span>
            </div>

            {/* Right Signatory (Principal / Dean) */}
            <div className="cert-sig-block text-center flex-1 max-w-[190px]">
              <div className={`cert-sig-slot ${isLandscape ? 'h-8 sm:h-9' : 'h-10 sm:h-11'} flex items-end justify-center pb-1`}>
                {data.principalSignatureUrl ? (
                  <img
                    src={data.principalSignatureUrl}
                    alt="Principal Signature"
                    className="cert-sig-img max-h-full max-w-[130px] object-contain mx-auto"
                  />
                ) : (
                  <span className="font-serif italic text-xs sm:text-sm md:text-base text-slate-700 font-bold tracking-wide">
                    {data.principalName}
                  </span>
                )}
              </div>
              <div className="cert-sig-line border-t border-slate-700/80 pt-1 w-full">
                <p className={`cert-sig-name ${isLandscape ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[10.5px] sm:text-[11px]'} font-bold text-slate-900 leading-tight`}>
                  {data.principalName || 'Principal Name'}
                </p>
                <p className={`cert-sig-title ${isLandscape ? 'text-[8.5px] sm:text-[9px]' : 'text-[9px] sm:text-[9.5px]'} font-sans text-slate-600 leading-tight`}>
                  {data.principalTitle || 'School Principal & Academic Dean'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3 w-full">
            {/* Left: Date & Auth Code */}
            <div className="cert-sig-block text-left flex-1 max-w-[190px] pb-1 space-y-0.5">
              <p className={`text-[9.5px] sm:text-[10px] font-sans text-slate-500`}>Date of Issue:</p>
              <p className={`text-[11px] sm:text-xs font-bold text-slate-900`}>{currentIssueDate}</p>
              <p className={`text-[8px] sm:text-[8.5px] font-mono text-slate-400`}>ID: {data.certificateId}</p>
            </div>

            {/* Center Offline QR Code Verification Box */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="cert-qr-container">
                <RealQrCodeImage
                  payload={currentOfflinePayload}
                  size={isA5 ? 72 : isLandscape ? 88 : 92}
                  onPreviewClick={onQrClick}
                />
              </div>
              <span className={`cert-qr-code ${isA5 ? 'text-[7px] sm:text-[7.5px]' : isLandscape ? 'text-[8px] sm:text-[8.5px]' : 'text-[8.5px] sm:text-[9px]'} font-sans font-mono text-slate-600 font-bold mt-1 tracking-tight`}>
                {data.certificateId}
              </span>
            </div>

            {/* Right Signatory (Sole Teacher / Instructor) */}
            <div className="cert-sig-block text-center flex-1 max-w-[190px]">
              <div className={`cert-sig-slot ${isLandscape ? 'h-8 sm:h-9' : 'h-10 sm:h-11'} flex items-end justify-center pb-1`}>
                {data.teacherSignatureUrl ? (
                  <img
                    src={data.teacherSignatureUrl}
                    alt="Teacher Signature"
                    className="cert-sig-img max-h-full max-w-[140px] object-contain mx-auto"
                  />
                ) : (
                  <span className="font-serif italic text-xs sm:text-sm md:text-base text-slate-700 font-bold tracking-wide">
                    {data.teacherName}
                  </span>
                )}
              </div>
              <div className="cert-sig-line border-t border-slate-700/80 pt-1 w-full">
                <p className={`cert-sig-name ${isLandscape ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[10.5px] sm:text-[11px]'} font-bold text-slate-900 leading-tight`}>
                  {data.teacherName || 'Subject Teacher'}
                </p>
                <p className={`cert-sig-title ${isLandscape ? 'text-[8.5px] sm:text-[9px]' : 'text-[9px] sm:text-[9.5px]'} font-sans text-slate-600 leading-tight`}>
                  {data.teacherTitle || 'Lead Course Instructor'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Date & Offline Verification Tag */}
        <div className={`cert-bottom-bar flex items-center justify-between ${isLandscape ? 'text-[8.5px] sm:text-[9px]' : 'text-[9px] sm:text-[9.5px]'} font-sans text-slate-500 pt-0.5`}>
          <span>Issued: <strong className="text-slate-800">{currentIssueDate}</strong></span>
          <span className="font-mono text-[7.5px] sm:text-[8px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
            <span>Offline Authenticated Credential</span>
          </span>
        </div>
      </div>

      {/* Printable Cutting Guides for Half-Sheet (A5) Formats on A4 Paper */}
      {paperFormat === 'a5_landscape' && (
        <div className="absolute left-0 right-0 -bottom-6 hidden print:flex items-center justify-center font-mono text-[7pt] text-slate-500 pointer-events-none select-none">
          <div className="w-full border-b border-dashed border-slate-500 flex items-center justify-center relative">
            <span className="bg-white px-2 text-slate-600 font-bold -top-2.5 relative">
              ✂ - - - - - - - - - - Cut line (1/2 A4 Page · 148.5 mm) - - - - - - - - - - ✂
            </span>
          </div>
        </div>
      )}
      {paperFormat === 'a5_portrait' && (
        <div className="absolute top-0 bottom-0 -right-6 hidden print:flex flex-col items-center justify-center font-mono text-[7pt] text-slate-500 pointer-events-none select-none">
          <div className="h-full border-r border-dashed border-slate-500 flex flex-col items-center justify-center relative">
            <span className="bg-white py-2 text-slate-600 font-bold [writing-mode:vertical-lr] text-[6pt] -right-2.5 relative uppercase tracking-wider">
              ✂ Cut line (1/2 A4 Page · 148.5 mm) ✂
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
