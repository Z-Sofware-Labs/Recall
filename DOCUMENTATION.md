# Recall — Comprehensive Application Documentation & User Manual

**Recall** is a desktop-native e-learning authoring suite and interactive course builder built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Tauri (Rust)**. It empowers educators, instructional designers, and course authors to create rich multimedia lessons, assemble interactive assessments across 10 activity types, structure sequenced learning timelines with section gates, preview courses in true-to-life learner mode, and issue verifiable Certificates of Completion.

---

## Table of Contents

1. [Architecture & Technology Stack](#1-architecture--technology-stack)
2. [Project File Format (`*.recall`)](#2-project-file-format-recall)
3. [Core Modules](#3-core-modules)
   - [3.1 Dashboard & Course Management](#31-dashboard--course-management)
   - [3.2 Media Organizer & Slide Ingestion](#32-media-organizer--slide-ingestion)
   - [3.3 Quiz Builder (10 Assessment Engines)](#33-quiz-builder-10-assessment-engines)
   - [3.4 Course Organizer & Sequence Timeline](#34-course-organizer--sequence-timeline)
   - [3.5 Interactive Learner Player (Course Preview)](#35-interactive-learner-player-course-preview)
   - [3.6 Certificate Builder & Graduation Engine](#36-certificate-builder--graduation-engine)
   - [3.7 Export & Distribution Settings](#37-export--distribution-settings)
4. [Keyboard Shortcuts & Hotkeys](#4-keyboard-shortcuts--hotkeys)
5. [Installation, Development & Build](#5-installation-development--build)
6. [Data Schema Reference](#6-data-schema-reference)

---

## 1. Architecture & Technology Stack

Recall is engineered as a hybrid application combining a lightweight Rust native desktop core with a modern web frontend:

- **Frontend Core**: React 19, TypeScript, Vite.
- **Styling & Aesthetics**: Tailwind CSS with custom glassmorphism, curated semantic color palettes, and adaptive light/dark mode.
- **Desktop Runtime**: [Tauri v2](https://tauri.app/) (Rust backend).
- **Icons**: Lucide React.
- **QR Code Engine**: `qrcode` library for encoded certificate verification payloads.
- **Media & File Handling**: Native Tauri file dialogs, background PPTX extraction scripts, and fast base64 / blob asset caching.

```
recall/
├── src/
│   ├── components/
│   │   ├── course/                # Course Player preview and evaluation
│   │   │   ├── CoursePlayerPreviewModal.tsx
│   │   │   └── InteractiveQuizPlayer.tsx
│   │   ├── quiz/                  # 10 Quiz Activity Builder Mockups
│   │   │   ├── MultipleChoiceMockup.tsx
│   │   │   ├── MultipleResponseMockup.tsx
│   │   │   ├── TrueFalseMockup.tsx
│   │   │   ├── IdentificationMockup.tsx
│   │   │   ├── EnumerationMockup.tsx
│   │   │   ├── SequencingMockup.tsx
│   │   │   ├── CategorizationMockup.tsx
│   │   │   ├── ConnectTheDotsMockup.tsx
│   │   │   ├── ClickAnImageMockup.tsx
│   │   │   └── EssayMockup.tsx
│   │   ├── CertificateBuilder.tsx # WYSIWYG certificate template designer
│   │   ├── CourseOrganizer.tsx    # Filmstrip timeline & course sequencer
│   │   ├── MediaOrganizer.tsx     # Media assets, PPTX importer & video library
│   │   ├── QuizBuilder.tsx        # Activity selector & quiz management
│   │   ├── Dashboard.tsx          # Analytics, overview & quick actions
│   │   ├── ExportSettings.tsx     # SCORM / Web / Offline export
│   │   └── SystemSettings.tsx     # App preferences & diagnostics
│   ├── services/
│   │   ├── projectService.ts      # Native *.recall file persistence
│   │   └── scoreService.ts        # Learner scoring & telemetry store
│   ├── types/
│   │   ├── project.ts             # Project data contracts
│   │   └── quiz.ts                # Quiz activities and question schemas
│   └── App.tsx                    # Main app router and state bridge
└── src-tauri/                     # Rust backend (file I/O, PPTX parsing, dialogs)
```

---

## 2. Project File Format (`*.recall`)

Recall projects are saved to disk as portable `*.recall` JSON files. A `.recall` file encapsulates:
- **Course Metadata**: Title, description, passing criteria, author credits, timestamps.
- **Media Asset Registry**: Paths, thumbnail data URLs, media types (slides, photos, videos), and metadata.
- **Quiz Activities Catalog**: Detailed configurations for all 10 activity types.
- **Timeline Structure**: Ordered sequence of slides, videos, standalone quizzes, module sections, and final capstone milestones.
- **Certificate Configuration**: Template styling, typography, border motifs, signature lines, and QR verification options.

Projects are automatically associated with the native Recall document icon on Windows/macOS.

---

## 3. Core Modules

### 3.1 Dashboard & Course Management
- **Course Status Overview**: Real-time counters for imported media slides, interactive quiz activities, timeline duration, and total available assessment points.
- **Recent Projects**: One-click opening of recently edited `.recall` packages.
- **Quick Action Bar**: Fast shortcuts to import PowerPoint presentations, create quizzes, launch the course preview, or export course packages.

---

### 3.2 Media Organizer & Slide Ingestion
- **PowerPoint (.pptx) Importer**: Imports presentations and automatically renders each slide into high-fidelity image slides ready for course sequencing.
- **Photo & Video Ingestion**:
  - Supports PNG, JPG, WEBP, GIF, and MP4/WebM video formats.
  - Generates fast preview thumbnails for all media items.
  - **In-app Video Player**: Play, scrub, and inspect videos directly within the Media Organizer. In the Course Organizer, videos are represented by clean static thumbnails on the filmstrip.
- **Batch Drag & Select**: Select multiple media items and drag them simultaneously onto the course timeline.
- **Dynamic Thumbnail Refresh**: Built-in asset scanner to reload and regenerate missing thumbnails on project re-open.

---

### 3.3 Quiz Builder (10 Assessment Engines)

Recall includes 10 purpose-built activity engines:

1. **Multiple Choice**:
   - Single correct choice from 2 to 6 options.
   - Question prompt with optional image visual attachment.
   - Per-choice image attachments with zoom popout.
   - Individual question explanations and hints.
   - **Shuffle toggles**: Shuffle options order and shuffle questions order.

2. **Multiple Response (Check all that apply)**:
   - Multiple correct answers.
   - Requires selecting all valid options to earn points (with customizable mistake deductions).

3. **True or False**:
   - **Traditional Mode**: Binary TRUE / FALSE evaluation.
   - **Modified True or False**: If a statement is False, learners must identify the highlighted concept and type the correct replacement term (supports primary answer and acceptable aliases).

4. **Identification**:
   - Fill-in-the-blank text term identification.
   - Case-sensitivity toggle.
   - Multiple acceptable answer aliases (synonyms, acronyms, alternative spellings).
   - Visual reference image support.

5. **Enumeration**:
   - Multi-slot listing challenge (e.g., "List the 3 Laws of Thermodynamics").
   - Learners enter items across multiple numbered inputs with fuzzy alias matching.

6. **Sequencing**:
   - Step reordering challenge (e.g., procedural workflows, historical timelines).
   - Interactive up/down step controls and drag-based sorting.

7. **Categorization**:
   - Bucket-sorting activity where learners classify items into predefined buckets/categories.

8. **Connect the Dots / Matching**:
   - Interactive canvas with SVG connectors linking left-hand prompts with right-hand matches.

9. **Click an Image (Hotspot Target)**:
   - Author defines coordinate target zones on an image with customizable radius tolerance.
   - Learners pinpoint the exact location on the image (e.g., anatomy, diagrams, map locations).

10. **Essay (Written Synthesis)**:
    - Structured long-form text response.
    - Minimum and maximum word count restrictions with live counter.
    - Key concepts checklist and reference model answers for self-review.

---

### 3.4 Course Organizer & Sequence Timeline
- **Horizontal Filmstrip**:
  - Displays the sequenced flow of media slides, videos, formative quizzes, section dividers, and capstone milestones.
  - **Zero Vertical Scrolling**: Filmstrip maintains vertical clearance and scrolls horizontally.
  - Reorder items via drag-and-drop or arrow controls.
- **Section Milestone Checkpoints**:
  - Group lessons into logical chapters/modules.
  - Set required passing score percentages (e.g., 75%).
  - Enforces section completion before unlocking downstream lessons.
- **Final Capstone Assessment Milestone**:
  - Evaluates overall course mastery with a comprehensive multi-question battery.
  - Determines course graduation and unlocks the Certificate of Completion.
- **Full Undo / Redo**:
  - `Ctrl+Z` (Windows/Linux) or `Cmd+Z` (macOS) to undo timeline edits.
  - `Ctrl+Y` or `Ctrl+Shift+Z` to redo.
- **Direct Course Project Saving**:
  - `Ctrl+S` / `Cmd+S`: Instantly save project file.
  - `Ctrl+Shift+S` / `Cmd+Shift+S`: Save As.

---

### 3.5 Interactive Learner Player (Course Preview)
- **Authentic Learner Simulation**:
  - Simulates the exact student runtime environment without authoring clutter.
  - Smooth media presentation for slides and embedded videos.
- **Multi-Question Stepper Navigation**:
  - Multi-item tests feature a dedicated question stepper (`Question X of Y`, `Answered Count`, `< Prev`, `Next >`, and numbered chips).
  - Bottom action bar displays **`Next Question ➔`** on intermediate questions, dynamically transitioning to **`Submit Assessment`** on the final question.
- **Instant Diagnostic Feedback & Review**:
  - Displays overall points, pass/fail status, question-by-question scoring, correct answers, and author explanations.
- **Mastery Gates & Remedial Review**:
  - Failing a section checkpoint or exhausting all attempts locks progression and routes the learner back to review that section's instructional slides.
  - In final assessment failure, learners can jump directly into specific section reviews and return to retake the capstone exam.
- **High-Contrast Dark / Light Mode**:
  - Crisp text contrast in both light theme (`slate-900`) and dark theme (`white`).

---

### 3.6 Certificate Builder & Graduation Engine
- **Visual Certificate Designer**:
  - Customizable recipient citation text, program titles, and issuing institution.
  - Adjustable vertical layout spacing and decorative border motifs.
- **Dynamic Auto-Sizing Student Name**:
  - Student names are rendered strictly on a single line with dynamic font scaling to ensure long names never wrap or distort the layout.
- **Verifiable QR Code**:
  - Encodes course completion metadata, verification timestamps, and learner score.
- **Export & Print**:
  - High-resolution PNG image export and direct browser/system print dialog support.

---

### 3.7 Export & Distribution Settings
- **Standalone HTML5 Web Package**: Self-contained web course runnable in any modern browser without an active server.
- **SCORM 1.2 & SCORM 2004**: Standardized LMS packages with automated score tracking and completion status hooks.
- **Offline Executable**: Standalone application bundle for disconnected classroom or kiosk deployments.

---

## 4. Keyboard Shortcuts & Hotkeys

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + S` / `Cmd + S` | Course Organizer & Editor | Save active `.recall` project file |
| `Ctrl + Shift + S` / `Cmd + Shift + S` | Course Organizer & Editor | Save project as a new `.recall` file |
| `Ctrl + Z` / `Cmd + Z` | Course Organizer | Undo last timeline change |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Course Organizer | Redo timeline change |
| `Space` | Video Player / Media | Toggle video playback / pause |
| `Escape` | Modal Windows | Close preview / active dialog |

---

## 5. Installation, Development & Build

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Rust toolchain & Cargo**: Installed via [rustup.rs](https://rustup.rs/) (for Tauri desktop runtime)

### Running the App

```bash
# 1. Clone repository and navigate to root
cd recall

# 2. Install dependencies
npm install

# 3. Launch desktop app in development mode
npm run tauri dev

# 4. Alternatively, run in browser via Vite dev server
npm run dev
```

### Building Production Packages

```bash
# Compile and package native desktop installer (.exe, .dmg, or .AppImage)
npm run tauri build
```

---

## 6. Data Schema Reference

### Timeline Item Schema (`TimelineItem`)

```typescript
export interface TimelineItem {
  timelineId: string;
  kind: 'media' | 'quiz' | 'section' | 'final_assessment' | 'completion_screen';
  media?: MediaItem;
  quiz?: QuizActivity;
  section?: CourseSection;
  finalAssessment?: FinalAssessmentMilestone;
  completionScreen?: CourseCompletionScreen;
  durationSeconds?: number;
  isLocked?: boolean;
}
```

### Quiz Activity Schema (`QuizActivity`)

```typescript
export interface QuizActivity {
  id: string;
  name: string;
  type: QuizType;
  prompt?: string;
  instructions?: string;
  pointsPerCorrect: number;
  deductionPerMistake?: number;
  totalPoints?: number;
  retries?: number;
  isGraded?: boolean;
  passingScore?: number;
  data: QuizActivityData;
}
```
