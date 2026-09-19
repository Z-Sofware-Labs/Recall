import { useState, useMemo, MouseEvent, ReactNode } from 'react';
import {
  ChevronRight, ChevronDown, BookOpen, HelpCircle,
  Download, Settings, Presentation, Sparkles, CheckCircle2,
  FileCheck, Shield, HardDrive, ArrowRight, Layout, Monitor,
  Search, X
} from 'lucide-react';

interface HelpItem {
  id: string;
  title: string;
  content: string;
  children?: HelpItem[];
}

const gettingStartedContent = `Welcome to **Recall**! This guide will help you set up your first course and get familiar with the offline desktop authoring environment.

Recall is a powerful, offline desktop authoring tool and learning management system designed to convert presentations into interactive courses, build rich assessments, and generate certificates completely locally.

---

## Welcome to Recall

Operating entirely on your local machine, Recall ensures complete privacy and security for your course materials and learner data. Whether you are building training modules for corporate environments or educational content, Recall provides all the tools you need in a single desktop interface.

### What You Can Do
* **Convert Presentations:** Import existing slides and structure them into engaging learning paths.
* **Build Assessments:** Create interactive quizzes to test knowledge retention.
* **Generate Certificates:** Design and award custom completion certificates.
* **Manage Locally:** Keep all your media assets, quizzes, and project files safely stored on your device.

---

## Next Steps

Now that you are familiar with what Recall can do, move on to the next sections to get your environment ready:

1. **Installation:** Learn how to install the desktop application on your system.
2. **Basic Setup:** Configure your workspace preferences and explore the dashboard layout.`;

const uiOverviewContent = `Welcome to the **Recall** desktop environment. The user interface is built around a fixed two-panel architecture designed to keep your core authoring modules, project workspaces, and global settings easily within reach.

---

## 1. The Main Layout

* **Left Navigation Sidebar:** Stays pinned across all screens, granting instant access to your primary workspaces, quick-action shortcuts, and utility toggles.
* **Main Content Area:** Dynamically updates depending on the module you select, displaying your project status, authoring canvases, or system configurations.

---

## 2. Core Workspaces

* **Dashboard:** Your central home base for managing project files. Here you can inspect active project metadata, quick-save your work, browse existing local files (\`.recall\` or \`.json\`), or start a new project.
* **Course Editor:** The timeline and structuring studio where you arrange your imported media assets, build interactive curriculum sequences, add custom sections, milestones, and preview your finished course.
* **Media Organizer:** The asset management hub that integrates local office suites for slide extraction, and lets you import PowerPoint presentations (\`.pptx\`, \`.pt\`), images (\`.png\`, \`.jpg\`, \`.gif\`, \`.webp\`), and video files (\`.mp4\`, \`.av1\`, \`.webm\`).
* **Quiz Builder:** An assessment design studio offering interactive question categories such as Categorization, Click an Image, Connect the Dots, Enumeration, Essay, Identification, Multiple Choice, Multiple Response, Sequencing, and True/False.
* **Certificate Builder:** A completion award studio featuring customizable template styles (e.g., Classic Gold & Navy, Prestige Ivy League), dynamic institution branding fields, and live-generated layout previews with export options.
* **Course Player:** An interactive web learning environment providing seamless lesson delivery, video playback, assessment evaluations, real-time gamified scoring, and completion awards.

---

## 3. Settings & Utilities

* **Export Settings:** The distribution configuration panel where you package your course projects into self-contained standalone HTML webpages or server-ready ZIP archives.
* **System Settings:** The preference hub for managing PowerPoint slide converter engines, theme switches, auto-save timers, file associations (\`.recall\`), and storage synchronization.
* **Bottom Utility Bar:** Quick links located at the base of the sidebar allowing you to instantly jump to the **Course Editor**, toggle **Light/Dark Mode**, and view software **About** details.`;

const helpData: HelpItem[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: gettingStartedContent,
    children: [
      {
        id: 'installation',
        title: 'Installation',
        content: `### Installing Recall on Your System

Recall is distributed as a lightweight, native offline desktop executable.

1. **Download the Package:** Get the official executable installer for your operating system (\`.exe\` for Windows, \`.dmg\` for macOS, or \`.AppImage\` for Linux).
2. **Run Installer:** Launch the installer and follow on-screen prompts.
3. **No Cloud Login Required:** Once installed, Recall runs completely locally with 100% offline data privacy. All project files, quizzes, and learner records stay on your storage device.`
      },
      {
        id: 'basic-setup',
        title: 'Basic Setup',
        content: `### Workspace & Preferences Setup

Configure your authoring workspace before building your first course:

1. **System Settings:** Click **System Settings** in the sidebar to configure default course templates, instructor information, and appearance themes (Light / Dark mode).
2. **Dashboard Navigation:** Use the left navigation sidebar to switch between **Dashboard**, **Media Organizer**, **Quiz Builder**, **Course Organizer**, **Certificate Builder**, and **Export Settings**.`
      },
    ],
  },
  {
    id: 'ui-overview',
    title: 'User Interface Overview',
    content: uiOverviewContent,
    children: [
      {
        id: 'dashboard-guide',
        title: 'Dashboard',
        content: `The **Dashboard** is the central home screen of Recall, where you can manage your active course project, open existing files, or start a new authoring session.

![Recall Central Project Dashboard](/help/dashboard.png)

---

## Active Project & Top Actions

* **Active Project Status:** Displays your currently loaded project name (e.g., *Sample Project*), media asset counts (e.g., *12 media assets loaded*), and local file path. Use the edit icon to rename your project.
* **Project Action Buttons:**
  * **Save Project:** Instantly save your current progress to disk.
  * **Save As...:** Export or save your project under a new file name or directory.
  * **Open in Editor:** Switch directly to the Course Editor workspace to continue building your modules.

---

## Project Actions & Management

* **Browse Local Projects:** Click this card to open an existing \`.recall\` or \`.json\` project from your local computer disk.
* **Start New Project:** Initialize a clean course timeline and interactive question bank from scratch.

---

## Recently Opened Projects

* **Quick Access List:** View a history of recently accessed projects with their file paths and timestamp indicators (e.g., *Just now*) for fast retrieval.`
      }
    ]
  },
  {
    id: 'course-creation',
    title: 'Course Creation',
    content: `### Building Interactive Courses

Structure your lessons by importing media assets and sequencing interactive checkpoints on the visual timeline.

* **Media Ingestion:** Import PowerPoint (\`.pptx\`) slide decks, videos, and images.
* **Sequencing:** Drag and drop items onto the horizontal filmstrip timeline.
* **Mastery Gates:** Add Section Checkpoint Assessments with required passing percentages to ensure learner comprehension before unlocking subsequent modules.`,
    children: [
      {
        id: 'media-organizer',
        title: 'Media Organizer',
        content: `The **Media Organizer** is the central asset management hub in **Recall** where you import, store, and organize all the raw components needed for your interactive courses. 

![Media Organizer Workspace Interface](/help/media-organizer.png)

---

## Overview

When you open the Media Organizer, the app checks for local Office suite integrations to enable high-fidelity slide conversions. The interface provides a centralized workspace with drag-and-drop support for quick importing, alongside category filtering to help you manage your project assets.

---

## Import Categories

You can bring three main types of media into your project workspace:

* **Import PowerPoint (.pptx, .ppt):** Extracts slides using local Office suites or fallback conversion engines for exact layout fidelity.
* **Import Photos (PNG, JPG, JPEG, GIF, WebP):** Adds graphic assets and illustrations directly to your asset library.
* **Import Video (MP4, AV1, WebM):** Integrates video files to enrich your course materials.

---

## Asset Management & Filtering

Once your files are uploaded, you can manage them using the built-in view tabs:

* **All (0):** Displays a unified list of every loaded asset in your project.
* **Slides (0):** Filters your view specifically to presentation slides extracted from PowerPoint files.
* **Photos (0):** Filters your view to image and graphic assets.
* **Videos (0):** Filters your view to video files.

> **Tip:** You can drag and drop your files directly into the dashed drop zone or right-click any item for quick management options.`
      },
      {
        id: 'quiz-builder',
        title: 'Quiz Builder',
        content: `The **Quiz Builder** is Recall's assessment engine, designed to help you create rich, interactive evaluations and tests for your learners. 

![Quiz Builder Question Types Dashboard](/help/quiz-builder.png)

---

## Overview

The Quiz Builder provides a dedicated interactive authoring canvas for various assessment formats. For any question type you choose, you can define correct answers, adjust scoring parameters, and preview the learner experience directly.

---

## Supported Question Types

Recall supports a wide array of interactive question types to test different learning outcomes:

* **Categorization:** Learners sort randomized items or terms into distinct predefined groups, categories, or columns.
* **Click an Image:** An interactive image hotspot challenge where learners click directly on diagram parts, maps, or anatomy regions.
* **Connect the Dots:** Interactive matching pairs where learners drag lines or connect related terms between left and right columns.
* **Enumeration:** Direct term listing allowing learners to input items with case-sensitivity, order tolerance, and synonym keys.
* **Essay:** Open-ended comprehensive responses evaluated directly with manual teacher scoring.
* **Identification:** Direct term identification with synonym support, supporting direct entry of answers.
* **Multiple Choice:** Single best answer selection from randomized options with per-page question navigation.
* **Multiple Response:** Multi-select checkboxes allowing multiple valid choices with partial credit.
* **Sequencing:** Chronological or logical re-ordering via full-box drag-and-drop or stepper arrows.
* **True or False:** Binary assessment option for quick knowledge checks.

---

## Getting Started

To begin building an assessment, click **Open Designer** on any of the question cards listed in the Quiz Builder dashboard to open its configuration canvas.`,
        children: [
          {
            id: 'quiz-categorization',
            title: 'Categorization Designer',
            content: `The **Categorization** designer allows you to build bucket-sorting activities where learners sort randomized items or terms into distinct predefined groups, categories, or columns.

![Categorization Activity Designer](/help/categorization.png)

---

## Overview & Top Actions

At the top of the canvas, you can toggle between **Authoring** mode and **Learner Preview** to test the student sorting and instant grading experience. You can also click **Save to Course Editor** to save your progress or **Back** to return to the main Quiz Builder dashboard.

---

## General Configuration

* **Question Prompt / Title:** Enter the primary title or prompt for the activity (e.g., *Categorization Activity*).
* **Learner Instructions:** Provide directions for the learner (e.g., *Drag each item from the unsorted pool into its correct category column*).

---

## Scoring & Retries

Configure the grading and attempt rules for the activity:

* **Score per correct item:** Set the points awarded for each correctly sorted item (e.g., 2 pts, with a max score automatically calculated).
* **Passing Score:** Define the minimum score required to pass (e.g., 6 pts), with a warning indicator if the threshold is not met (*Fails if score < 6 pts (must repeat)*).
* **Deduction per mistake:** Set the penalty points subtracted for incorrect placements (e.g., 1 pt per error).
* **Allowed retries:** Specify the maximum number of attempts permitted (e.g., 2 attempts max).

---

## Category Buckets Definition

Define your category columns and the items assigned to each bucket:

* **Add Category Bucket:** Click the **+ Add Category Bucket** button to create additional columns.
* **Assigned Items:** View and manage items inside each column (e.g., *Item 1*, *Item 2*).
* **Add New Item:** Use the input field at the bottom of each bucket column to add new target items.`
          },
          {
            id: 'quiz-click-an-image',
            title: 'Click an Image Designer',
            content: `The **Click an Image** designer lets you create interactive image hotspot challenges where learners click directly on diagram parts, maps, anatomy regions, or schematics.

![Click an Image Activity Designer](/help/click-an-image.png)

---

## General Configuration

* **Activity Title & Prompt:** Set the primary title for your image hotspot challenge (e.g., *Click an Image Activity*).
* **Learner Instructions:** Provide clear directions for the student (e.g., *Examine the image below and click directly on the requested location or target object*).

---

## Scoring & Retries

Configure the grading and attempt rules for the hotspot challenge:

* **Score per correct target:** Assign points awarded for each correct hotspot click (e.g., 1 pt, with total section value automatically calculated).
* **Passing Score:** Set the minimum score required to pass (e.g., 2 pts), with a warning indicator if the threshold is not met (*Fails if score < 2 pts (must repeat)*).
* **Deduction per miss:** Define penalty points subtracted for incorrect clicks (e.g., 1 pt per mistake).
* **Allowed retries:** Set the maximum number of attempts permitted (e.g., 0 for unlimited retries).

---

## Interactive Hotspot Canvas & Target List

Manage your background reference image and target coordinates:

* **Image Setup:** Upload custom images via the top tools to use as your diagram, map, or body scan canvas.
* **Target Hotspot List:** View and manage your defined target regions (e.g., *Tsim Sha Tsui*, *Central*, *HK International Airport*) with coordinate percentages and delete options.
* **Edit Target Point:** Configure individual target properties including the **Target Label**, specific **Prompt / Question for Learner**, and an adjustable **Tolerance Radius (0 - 100%)** slider to control pinpoint versus broader hit precision.`
          },
          {
            id: 'quiz-connect-the-dots',
            title: 'Connect the Dots Designer',
            content: `The **Connect the Dots** designer lets you create interactive matching pair activities where learners connect related terms, concepts, or definitions between two columns.

![Connect the Dots Activity Designer](/help/connect-the-dots.png)

---

## Overview & Top Actions

At the top of the designer canvas, you can toggle between the **Authoring** view and the **Learner Preview** to test the student experience. You can also click **Save to Course Editor** to save your progress or **Back** to return to the main Quiz Builder dashboard.

---

## General Configuration

* **Question Prompt / Title:** Enter the primary title or prompt for the activity (e.g., *Connect the Dots Activity*).
* **Learner Instructions:** Provide clear directions for the learner (e.g., *Draw lines or click dots to match each concept in the left column with its matching definition*).
* **Header Labels:** Customize the labels for your columns using **Left Column Header Label** and **Right Column Header Label** (default is Column A and Column B).

---

## Scoring & Retries

Configure how the activity is graded and attempted:

* **Score per correct match:** Assign points awarded for each correct pair (e.g., 2 pts). The total possible score updates automatically.
* **Passing Score:** Set the minimum score required to pass. A warning note indicates if the score fails below a certain threshold (e.g., *Fails if score < 3 pts (must repeat)*).
* **Deduction per mismatch:** Set the penalty points subtracted for each incorrect connection (e.g., 1 pt).
* **Allowed retries:** Define the maximum number of attempts a learner is permitted to take (e.g., 2 retries max).

---

## Matching Pairs Definition

Define the correct associations that learners will need to solve. In learner mode, the right-hand column will automatically randomize.

* Click **+ Add New Pair** to add more items to your activity.
* For each pair, input the **Left Item (Prompt / Concept)** and its corresponding **Right Item (Matching Definition / Target)**.`
          },
          {
            id: 'quiz-enumeration',
            title: 'Enumeration Designer',
            content: `The **Enumeration** designer allows you to create direct term listing activities where learners input required items with case-sensitivity controls, order tolerance, and synonym keys.

![Enumeration Activity Designer](/help/enumeration.png)

---

## General Configuration & Evaluation Rules

* **Enumeration Prompt / Question:** Set the title or direct question for the listing activity (e.g., *Enumeration Activity*).
* **Learner Instructions:** Provide clear directions for the student (e.g., *Type each required item into the fields below.*).
* **Strict Sequential Order:** Toggle switch to enforce strict order or allow learners to list answers in any order.
* **Case-Sensitive Evaluation:** Toggle switch for case sensitivity (case-insensitive is recommended so variations like "solar" match "Solar").

---

## Scoring & Retries

Configure the grading parameters for the enumeration challenge:

* **Score per correct item:** Assign points awarded for each correct entry (e.g., 2 pts, with total possible score calculated automatically).
* **Passing Score:** Set the minimum score threshold required to pass, with a warning indicator if it fails below the limit (e.g., *Fails if score < 3 pts (must repeat)*).
* **Deduction per mistake:** Define penalty points subtracted for incorrect fields (e.g., 1 pt).
* **Allowed retries:** Set the maximum number of attempts permitted (e.g., 2 attempts max).

---

## Instructor Answer Key Definition

Define the correct expected answers and alternate acceptable terms:

* **Add Expected Item:** Click the **+ Add Expected Item** button to include more required answers.
* **Primary Answer Text (Canonical):** Enter the core correct answer (e.g., *Item 1*, *Item 2*).
* **Context / Explanation Note:** Add optional clarifying notes or definitions (e.g., *e.g., Solar PV captures photon radiation*).
* **Acceptable Alternate Synonyms & Spellings:** Add alternative correct spellings or accepted synonyms using the input field and click **Add**.`
          },
          {
            id: 'quiz-essay',
            title: 'Essay Designer',
            content: `The **Essay** designer allows you to create open-ended, ungraded formative reflection prompts for comprehensive student writing and self-comparison.

![Essay Activity Designer](/help/essay.png)

---

## Configuration & Writing Rules

* **Essay Question / Topic Prompt:** Enter the core topic or prompt for the writing task.
* **Student Writing Instructions:** Provide detailed writing guidelines for the learner.
* **Minimum Input Required:** Set the word count threshold (e.g., requires at least 25 words).
* **Max Word Limit:** Set an upper ceiling for word count, or leave at 0 for unlimited length.
* **Scoring Policy:** Configured as **Ungraded Practice Only** (no automated points awarded to prevent false score inflation).

---

## Reference Feedback Guide

* **Benchmark / Sample Response (Optional):** Provide an expert sample response to show students after submission.
* **Key Concepts & Themes for Self-Checklist:** Add specific thematic items or criteria points that students can use to self-evaluate their writing.`
          },
          {
            id: 'quiz-identification',
            title: 'Identification Designer',
            content: `The **Identification** designer lets you build terminology challenges where learners type precise technical terms or concepts to answer direct prompts.

![Identification Activity Designer](/help/identification.png)

---

## Configuration & Options

* **Activity Title / Topic Prompt:** Enter the main title for the identification assessment.
* **Student Instructions:** Provide guidelines for entering technical answers.
* **Display on Learner Preview:** Organize layout by pagination choices or select **All on 1 Page**.
* **Toggles:** Enable **Case-Insensitive** evaluation and **Shuffle Questions Order** to randomize student presentation.

---

## Scoring & Question Entry

* **Scoring Rules:** Configure **Points per Question**, **Passing Score**, **Deduction per error**, and **Allowed retries**.
* **Questions Builder:** Enter your **Question Prompt / Statement**, define the **Primary Correct Answer (Canonical Term)**, add review **Explanation / Context**, and include **Acceptable Alternate Spellings / Aliases**.`
          },
          {
            id: 'quiz-multiple-choice',
            title: 'Multiple Choice Designer',
            content: `The **Multiple Choice** designer lets you create single-best-answer assessment options with randomized option positions and per-page navigation.

![Multiple Choice Activity Designer](/help/multiple-choice.png)

---

## Configuration & Settings

* **Assessment Title / Subject:** Set the title for the multiple-choice activity.
* **Student Instructions:** Provide direction for selecting choices.
* **Randomization Toggles:** Enable **Shuffle Questions Order** and **Shuffle Choices (A, B, C, D)** to randomize options per student.
* **Grading Parameters:** Set **Points per Question**, **Passing Score**, **Deduction per error**, and **Allowed retries**.

---

## Constructing Questions

* Use **+ Add Question** to build your question pool.
* Enter the **Question Prompt** and select the correct radio button next to your desired option (**Option A**, **B**, **C**, etc.).
* Use **Paste Choices** for fast multi-line text entry.`
          },
          {
            id: 'quiz-multiple-response',
            title: 'Multiple Response Designer',
            content: `The **Multiple Response** designer enables you to create multi-select checkbox questions allowing multiple valid choices with partial credit.

![Multiple Response Activity Designer](/help/multiple-response.png)

---

## Configuration & Layout

* **Assessment Title:** Set the title for the activity.
* **Student Instructions:** Provide direction for choosing multiple applicable options.
* **Layout Display:** Choose between **One Question per Page** or **All on Single Page**.
* **Scoring Rules:** Configure **Points per correct pick**, **Passing Score**, **Deduction per wrong pick** (points subtracted for false picks), and **Allowed retries**.

---

## Constructing Options

* Enter your main prompt in the **Question Prompt** box.
* Check the boxes next to all correct valid choices (e.g., Option A and Option B).
* Use **Paste Choices** or **+ Add Choice** to manage options dynamically.`
          },
          {
            id: 'quiz-sequencing',
            title: 'Sequencing Designer',
            content: `The **Sequencing** designer lets you create chronological or logical re-ordering challenges via full-box drag-and-drop or stepper arrows.

![Sequencing Activity Designer](/help/sequencing.png)

---

## Configuration & Rules

* **Sequencing Prompt:** Set the title for the ordering task.
* **Student Instructions:** Provide guidance on arranging steps from first to last.
* **Scoring Parameters:** Configure **Points for Sequence**, **Passing Score**, **Deduction per error**, and **Allowed retries**.

---

## Correct Master Order Definition

* **Master Order (Top to Bottom):** Define the absolute correct sequence using cards (Step 1, Step 2, Step 3, etc.). In learner mode, students receive a randomized version.
* Use the **+ Add Step** button to insert new sequence nodes, and use arrow controls or drag handles to adjust positions.`
          },
          {
            id: 'quiz-true-false',
            title: 'True or False Assessment',
            content: `The **True or False** designer enables you to create binary evaluation questions. Recall supports two distinct formats: **Traditional True/False** and **Modified True/False**.

---

## Format Selection & General Configuration

* **Select True/False Format:** Switch between standard True/False evaluation or Modified True/False with replacement answer correction.
* **Assessment Title:** Enter the primary title for your assessment.
* **Student Instructions:** Provide clear directions for evaluating the statements.
* **Display / Pagination:** 
  * *Traditional Mode:* Choose how questions appear per page (**1 Question / Page**, **5 Questions / Page**, or **10 Questions / Page**).
  * *Modified Mode:* Automatically presents 1 question per page for interactive word correction.

---

## Scoring & Retries

* **Points per Question:** Assign point values for each question (total points update dynamically).
* **Passing Score:** Set the minimum score threshold required to pass.
* **Deduction per error:** Set penalty points subtracted on incorrect evaluations.
* **Allowed retries:** Specify maximum attempt limits for students.

---

## 1. Traditional True/False Mode

In traditional mode, statements are evaluated directly as binary options:
* **Statement Text:** Enter the statement to evaluate.
* **Correct Key:** Select whether the statement is **TRUE** or **FALSE**.
* **Explanation:** Provide optional feedback or text shown during student review.

![Traditional True/False Assessment Designer](/help/true-false-traditional.png)

---

## 2. Modified True/False Mode

In modified mode, if a statement is marked **FALSE**, learners must provide a correct replacement term for an underlined word:
* **Statement Text:** Enter the statement containing a term to evaluate.
* **Correct Key:** Set to **FALSE** to enable the modification configuration box.
* **Modified False Statement Configuration:** 
  * **Word in Statement to Underline:** Specify the target word to highlight (e.g., *boilers*).
  * **Correct Replacement Word (Canonical Answer):** Input the expected correction (e.g., *penstocks*).
  * **Acceptable Alternate Replacement Spellings / Aliases:** Add any accepted alternative synonyms or spellings.

![Modified True/False Assessment Designer](/help/true-false-modified.png)`
          }
        ]
      },
      {
        id: 'certificate-builder',
        title: 'Certificate Builder',
        content: `The **Certificate Builder** allows you to design and customize professional completion awards featuring offline QR code verification, 10 distinct certificate styles, institutional branding, student score metrics, and signees. 

> **Student Note:** After completing a course, students will be asked for their name to be put on the finished certificate.

![Certificate Builder Templates & Canvas Controls](/help/certificate-builder-templates.png)

---

## Top Actions & Canvas Controls

* **Page Sizing:** Toggle between **A4 Portrait** and **US Letter Portrait** formats.
* **Verification & Testing:** Use **Test QR Payload** to test verification data or **Fill Sample Data** to populate placeholder previews.
* **Preview & Export:** Access **Full Screen View**, **Print / PDF Export**, or click **Apply & Save Certificate to Course**.

---

## 1. Choose Certificate Template

Recall includes **10 Certificate Styles Available**, such as *Classic Gold & Navy*, *Prestige Ivy League*, *Modern Minimalist Slate*, *Academic Emerald Honors*, and *Tech & STEM Cyber Credential*.

---

## 2. Institution / School Branding & Course Award

* **Institution Branding:** Enter your **School / Organization Name**, **Department / Faculty / Division**, and upload an official **School / Academy Logo** (PNG, JPG, or SVG).
* **Recipient & Course Award:** Customize the **Recipient Full Name**, **Course / Program Title**, **Grade Level / Cohort**, and **Completion Citation Statement**. You can also toggle whether to include evaluation scores on the certificate and specify auto-computed academic distinctions like *Passed with High Distinction*.

![Certificate Builder Branding, Metrics & Signatories](/help/certificate-builder-signatories.png)

---

## 3. Signatories, Signatures & Offline QR ID

* **Dynamic Print Date & Offline QR Verification:** The certificate issue date is automatically rendered based on the actual date it is printed or generated. Each certificate also carries a unique **Verification ID** that strictly matches the offline QR code scan payload.`
      },
      {
        id: 'export-settings-guide',
        title: 'Export Settings',
        content: `The **Export Settings** window allows you to package and publish your complete course project into standalone, 100% offline web formats that run anywhere on any device.

![Recall Export Settings Workspace](/help/export-settings.png)

---

## 1. Delivery Formats

* **Self-Contained Single File (.html):** Bundles all lesson media (videos, slides, images), stylesheets, interactive quizzes, essay response tools, and offline QR completion certificates into one single standalone file. Double-click to run in any modern web browser (Edge, Chrome, Safari, Firefox) on Windows, macOS, Android, iOS, or Linux with zero internet required.
* **Web Package Archive (.zip):** Packages \`index.html\`, a structured \`course_data.json\` metadata manifest, and a deployment guide into a standard ZIP archive. Ready for extraction or hosting on school intranets, LMS platforms, Apache/Nginx web servers, or cloud static hosting.

---

## 2. Player & Experience Options

* **Default Theme Mode:** Choose between **Dark** and **Light** mode for the player's initial launch appearance.
* **Official Certificate of Completion:** Toggle whether learners receive the verifiable completion award screen upon finishing all modules.
* **Free Stepper Navigation:** Allow learners to freely jump back and forth between completed modules on the player stepper bar.`
      },
    ],
  },
  {
    id: 'course-player',
    title: 'Course Player',
    content: `The **Recall Course Player** is an interactive, web-based learning environment designed to deliver multimedia course content seamlessly. Based on the provided interface, the player features a dark-themed UI optimized for focused learning, allowing students to navigate through structured slides, track their learning progress, and interact with various media components (such as videos).

![Recall Course Player Interface](/help/course-player.png)

---

## Key Interface Elements

* **Top Navigation Bar:**
  * **Course Title & Brand:** Displays the current program name (*Recall Course Player* and *Sample Project*).
  * **Overall Progress Bar:** Visualizes the student's completion percentage (e.g., *8%*).
  * **Points / Gamification Tracker:** Displays earned points or achievements (e.g., *0/5 pts*).
  * **Theme Toggle:** Allows switching between light and dark viewing modes (moon icon).

* **Slide Navigation Ribbon:**
  * Provides quick access to individual course slides (numbered 1 through 12, plus an **Activity** section).
  * Active and completed slides are visually highlighted (e.g., Slide 2 is currently selected).

* **Main Content Area:**
  * Hosts the core learning material for the active slide (e.g., a video titled \`file_example_MP4_1920_18MG.mp4\` categorized as **VIDEO**).
  * Provides an embedded media player with standard playback views.

* **Footer Navigation:**
  * **Previous Button:** Directs the student to the preceding slide.
  * **Slide Counter:** Shows exact pacing (e.g., *Slide 2 of 13*).
  * **Next Slide Button:** Advances the course forward to the next module.

---

## Basic Navigation Workflow

1. **Select a Slide:** Click any numbered block in the top slides ribbon to jump directly to that module.
2. **Engage with Content:** Watch videos, read texts, or complete embedded media inside the main content container.
3. **Track Progress:** Monitor your overall completion percentage and points in the top-right indicators.
4. **Progress Forward:** Use the **Next Slide** button at the bottom right to proceed through the course sequentially.`,
    children: [
      {
        id: 'course-player-quiz-module',
        title: 'Quiz Module',
        content: `If an activity is included in the module and is opened, the Recall Course Player transitions into an interactive assessment mode. This module evaluates comprehension through structured multiple-choice questions while integrating with the player's scoring and progress system.

![Course Player Quiz Activity Module](/help/course-player-quiz.png)

---

## Key Quiz Interface Elements

* **Activity Header & Score Indicator:**
  * **Question Counter:** Displays current progress through the assessment (e.g., *QUESTION 1 OF 5*).
  * **Activity Title:** Identifies the interaction type (e.g., *Multiple Choice Activity*).
  * **Points Badge:** Shows the potential point value for the current question (e.g., *+1 pts*).

* **Question Box:**
  * Clearly presents the question prompt (e.g., *1. Enter question prompt here*).

* **Answer Options (A–D):**
  * Features four distinct, selectable choices housed in interactive blocks.
  * Includes radio buttons with clear alphabetical labeling (**A**, **B**, **C**, **D**) for easy selection.

* **Interaction & Navigation Controls:**
  * **Submit Selection Button:** A prominent primary button used to lock in the chosen answer.
  * **Internal Quiz Sub-Navigation:** **← Previous Question** and **Next Question →** links track local pacing alongside a step indicator (*1 / 5*).
  * **Pass Activity Button:** Found in the main footer (*Pass Activity to Continue*), allowing learners to bypass or complete the requirement once conditions are met.

---

## Quiz Workflow

1. **Read the Prompt:** Review the question text displayed in the primary content container.
2. **Select an Answer:** Click on one of the option blocks (**A**, **B**, **C**, or **D**) to highlight your preferred choice.
3. **Submit Response:** Click the **Submit Selection** button to record your answer and earn points toward your total score.
4. **Navigate Questions:** Use the internal question navigation to move through the remaining items in the activity block.`
      },
      {
        id: 'course-player-end-screen',
        title: 'End Screen',
        content: `Upon completing final assessment activity, the Recall Course Player displays the End Screen. This interface serves as a comprehensive evaluation summary, displaying the learner's score, pass/fail status, overall readiness, and actionable next steps based on their performance.

![Course Player End Screen Assessment Summary](public/help/course-player-endscreen.png)

---

## Key Interface Elements

* **Status Icon & Assessment Badge:**
  * **Visual Indicator:** Features a clear status icon (e.g., a red cross for non-passing attempts) reflecting the evaluation outcome.
  * **Status Pill:** Displays the evaluation state (e.g., **ASSESSMENT NOT PASSED**) to immediately inform the learner of their standing.

* **Result Header & Summary Text:**
  * **Headline:** Highlights the primary directive or outcome (e.g., *Review Required to Unlock Next Slides*).
  * **Subtext:** Provides explicit context on the performance threshold (e.g., *"You scored 1 / 5 pts. A minimum score of 4 pts is required to unlock subsequent course modules."*).

* **Score Breakdown Container:**
  * **Earned Score:** Displays the total points achieved by the learner (e.g., *1 / 5*).
  * **Passing Requirement:** Clearly states the target threshold needed to succeed (e.g., *4 pts*).

* **Actionable Next Steps (Buttons):**
  * **Retake Assessment:** Allows learners to clear their answers and try the quiz again to improve their score.
  * **Review Lesson Slides:** Directs learners back to the instructional content modules for remediation.

---

## End Screen Workflow

1. **Evaluate Performance:** Review the earned score against the passing requirement displayed in the summary breakdown.
2. **Determine Readiness:** Identify whether remediation is necessary based on the **ASSESSMENT NOT PASSED** prompt.
3. **Choose Next Steps:**
   * Click **Review Lesson Slides** to study course material if a failing score is recorded.
   * Click **Retake Assessment** to attempt the quiz again and meet the required threshold to progress.`
      }
    ]
  },
  {
    id: 'system-settings-guide',
    title: 'System Settings',
    content: `The **System Settings** window allows you to configure conversion engines, interface preferences, file associations, and storage defaults for Recall.

![Recall System Settings Workspace](/help/system-settings.png)

---

## PowerPoint Slide Converter Engine

* **Microsoft Office PowerPoint:** Displays detection status (e.g., *Detected (v16.0)*). Uses native COM automation for high-fidelity slide and media extraction on Windows and Mac.
* **LibreOffice Impress:** Displays fallback status (e.g., *Not Installed*). Serves as a cross-platform fallback engine using headless LibreOffice conversion.

---

## Appearance & General Preferences

* **Theme:** Toggle the interface appearance between dark mode and light mode using the **Switch to Light Mode** button.
* **Auto-save:** Enable or disable automatic project saving, and customize the frequency using the **Auto-save every [X] minutes** input field.

---

## File Associations & Storage

* **.recall Project Files:** Displays file association status (e.g., *Associated (Default App)*). Double-clicking saved \`.recall\` files in File Explorer will automatically open them in Recall. Includes options to **Re-apply Association** or **Remove**.
* **Storage & Sync:** View your **Default project location** and click **Change path** to update where your local projects are stored.`,
  },
];

// Helper to format inline markdown (bold **text** and code `snippets`)
function renderInlineMarkdown(text: string): ReactNode {
  // First split by code snippets
  const codeParts = text.split('`');

  return codeParts.map((part, cIdx) => {
    if (cIdx % 2 === 1) {
      return (
        <code
          key={cIdx}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[12px] border border-slate-200 dark:border-slate-700/60 font-bold"
        >
          {part}
        </code>
      );
    }

    // Split by bold markers
    const boldParts = part.split('**');
    return boldParts.map((bPart, bIdx) => (
      bIdx % 2 === 1 ? (
        <strong key={`${cIdx}-${bIdx}`} className="font-bold text-slate-900 dark:text-white">
          {bPart}
        </strong>
      ) : (
        bPart
      )
    ));
  });
}

// Helper to render markdown-like formatted text cleanly
function FormattedContent({ text, onZoomImage }: { text: string; onZoomImage: (src: string, alt: string) => void }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed === '---') {
          return <hr key={idx} className="my-5 border-slate-200 dark:border-slate-800" />;
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-black text-slate-900 dark:text-white tracking-tight pt-1">
              {renderInlineMarkdown(trimmed.substring(2))}
            </h1>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
              {renderInlineMarkdown(trimmed.substring(3))}
            </h2>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-slate-800 dark:text-slate-200 pt-1">
              {renderInlineMarkdown(trimmed.substring(4))}
            </h3>
          );
        }

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                {renderInlineMarkdown(content)}
              </span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            const num = match[1];
            const content = match[2];

            return (
              <div key={idx} className="flex items-start gap-2.5 pl-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {num}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {renderInlineMarkdown(content)}
                </span>
              </div>
            );
          }
        }

        if (trimmed.startsWith('> ') || trimmed.startsWith('>')) {
          const quoteContent = trimmed.replace(/^>\s*/, '');
          return (
            <div key={idx} className="p-3.5 my-2 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <span className="shrink-0 text-sm">💡</span>
              <div className="leading-relaxed font-medium">{renderInlineMarkdown(quoteContent)}</div>
            </div>
          );
        }

        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
          const alt = imageMatch[1];
          const src = imageMatch[2];
          return (
            <div
              key={idx}
              onClick={() => onZoomImage(src, alt)}
              className="group relative my-5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-950/40 cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
            >
              <img
                src={src}
                alt={alt}
                className="w-full h-auto object-contain rounded-xl"
              />
              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-all flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-slate-900/90 text-white rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
                  <span>Click to enlarge</span>
                </div>
              </div>
              {alt && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>{alt}</span>
                  <span className="text-[10px] text-blue-500 font-bold">Zoom</span>
                </div>
              )}
            </div>
          );
        }

        if (trimmed === '') {
          return null;
        }

        // Regular paragraph with inline formatting
        return (
          <p key={idx} className="text-slate-600 dark:text-slate-300">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to recursively collect all parent section IDs
function getAllParentSectionIds(items: HelpItem[]): string[] {
  const ids: string[] = [];
  function collect(list: HelpItem[]) {
    for (const item of list) {
      if (item.children && item.children.length > 0) {
        ids.push(item.id);
        collect(item.children);
      }
    }
  }
  collect(items);
  return ids;
}

export default function Help() {
  const [selectedItem, setSelectedItem] = useState<HelpItem>(helpData[0]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set(getAllParentSectionIds(helpData)));
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomModalImage, setZoomModalImage] = useState<{ src: string; alt: string } | null>(null);

  const toggleExpand = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Filter help tree based on search query
  const filteredHelpData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return helpData;

    function filterItem(item: HelpItem): HelpItem | null {
      const titleMatches = item.title.toLowerCase().includes(q);
      const contentMatches = item.content.toLowerCase().includes(q);

      let matchingChildren: HelpItem[] | undefined = undefined;
      if (item.children) {
        matchingChildren = item.children
          .map(filterItem)
          .filter((c): c is HelpItem => c !== null);
      }

      if (titleMatches || contentMatches || (matchingChildren && matchingChildren.length > 0)) {
        return {
          ...item,
          children: matchingChildren && matchingChildren.length > 0 ? matchingChildren : item.children,
        };
      }
      return null;
    }

    return helpData
      .map(filterItem)
      .filter((item): item is HelpItem => item !== null);
  }, [searchQuery]);

  const renderTOC = (items: HelpItem[], level: number = 0) => {
    return items.map((item) => {
      const isSearchActive = !!searchQuery.trim();
      const isExpanded = isSearchActive || expandedItems.has(item.id);

      return (
        <div key={item.id} className="w-full">
          <button
            onClick={() => setSelectedItem(item)}
            className={`w-full flex items-center p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedItem.id === item.id
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            {item.children && (
              <span onClick={(e) => toggleExpand(item.id, e)} className="mr-1.5 hover:opacity-80">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            {!item.children && <span className="w-4 mr-1.5"></span>}
            <span className="truncate">{item.title}</span>
          </button>
          {item.children && isExpanded && renderTOC(item.children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="relative flex flex-col lg:flex-row flex-1 h-full min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
      {/* Sidebar TOC */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-3 px-2">
          <BookOpen size={18} className="text-blue-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">User Guide</h3>
        </div>

        {/* Search Input Box */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help topics..."
            className="w-full pl-8 pr-7 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtered TOC List */}
        <div className="space-y-1 flex-1">
          {filteredHelpData.length > 0 ? (
            renderTOC(filteredHelpData)
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching help topics found.
            </div>
          )}
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-6 sm:p-10 overflow-y-auto w-full min-w-0 space-y-6">
        <div className="flex items-center gap-2.5 text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
          <HelpCircle size={15} />
          <span>Documentation</span>
        </div>

        <FormattedContent
          text={selectedItem.content}
          onZoomImage={(src, alt) => setZoomModalImage({ src, alt })}
        />
      </div>

      {/* Interactive Fullscreen Screenshot Zoom Lightbox Modal */}
      {zoomModalImage && (
        <div
          onClick={() => setZoomModalImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-6xl w-full max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 truncate">
                {zoomModalImage.alt || 'Screenshot Preview'}
              </span>
              <button
                type="button"
                onClick={() => setZoomModalImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Image Container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/40">
              <img
                src={zoomModalImage.src}
                alt={zoomModalImage.alt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
