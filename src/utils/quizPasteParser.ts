/**
 * Quiz Paste Parser Utility
 * 
 * Provides intelligent copy-paste recognition and structuring for:
 * 1. Multiple Choice & Multiple Response (Single / Multiple questions with options A, B, C, D...)
 * 2. Identification (Numbered or listed prompts with optional answers/aliases)
 * 3. Connect the Dots / Matching (Hanay A / Column A and Hanay B / Column B or side-by-side pairs)
 * 4. True or False (Traditional & Modified with statement, truth value, underlined word, and replacement answer)
 * 5. Sequencing & Categorization (Bulleted, numbered, lettered, or plain lists)
 */

export interface ParsedMCOption {
  id?: string;
  letter?: string;
  targetIndex?: number;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ParsedMCQuestion {
  prompt: string;
  options: ParsedMCOption[];
  explanation?: string;
}

export interface ParsedIdentificationQuestion {
  questionPrompt: string;
  primaryAnswer: string;
  acceptableAliases: string[];
  explanation?: string;
}

export interface ParsedMatchingPair {
  leftText: string;
  rightText: string;
  explanation?: string;
}

export interface ParsedMatchingActivity {
  leftTitle?: string;
  rightTitle?: string;
  pairs: ParsedMatchingPair[];
}

export interface ParsedTFQuestion {
  statement: string;
  isTrue: boolean;
  underlinedWord?: string;
  replacementAnswer?: string;
  acceptableAliases?: string[];
  explanation?: string;
}

/**
 * Parses generic lists of items (numbered, lettered, bulleted, or plain lines).
 * Examples:
 * Apple
 * Ball
 * Candle
 * 
 * 1. Apple
 * 2. Ball
 * 3. Candle
 * 
 * - Apple
 * • Ball
 * * Candle
 */
export function parsePastedList(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Split into lines
  let lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // If pasted as single line with embedded markers (e.g. "1. Apple 2. Ball 3. Candle" or "• Apple • Ball")
  if (lines.length === 1) {
    if (/(?:^|\s+)[1-9][0-9]*[\.\)\:\-]\s+/.test(lines[0])) {
      lines = lines[0]
        .split(/(?=(?:^|\s+)[1-9][0-9]*[\.\)\:\-]\s+)/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (/(?:^|\s+)[A-Za-z][\.\)\:\-]\s+/.test(lines[0])) {
      lines = lines[0]
        .split(/(?=(?:^|\s+)[A-Za-z][\.\)\:\-]\s+)/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (/[•\*\-]\s+/.test(lines[0])) {
      lines = lines[0]
        .split(/(?=(?:^|\s+)[•\*\-]\s+)/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (lines[0].includes(';') || lines[0].includes(',')) {
      // If delimited by comma or semicolon
      const parts = lines[0].split(/[;,]/).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        lines = parts;
      }
    }
  }

  const results: string[] = [];

  for (const line of lines) {
    let clean = line.trim();
    if (!clean) continue;

    // Strip leading numbering / lettering / bullets
    clean = clean.replace(/^[\(\[]?[0-9]{1,3}[\)\]\:\.\-\s]+\s*/, '');
    clean = clean.replace(/^[\(\[]?[A-Za-z][\)\]\:\.\-\s]+\s*/, '');
    clean = clean.replace(/^[•\*\-\+\–\—\>]\s*/, '');
    clean = clean.trim();

    if (clean) {
      results.push(clean);
    }
  }

  return results;
}

/**
 * Parses single or multiple choices/options.
 */
export function parsePastedChoices(rawText: string): ParsedMCOption[] {
  const text = rawText.trim();
  if (!text) return [];

  // Split into lines first
  let rawLines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // If text is a single line with multiple lettered choices (e.g. "A) Apple B) Banana C) Cherry")
  if (rawLines.length === 1 && /(?:^|\s+)[A-Ha-h1-8][\.\)\:\-]\s+/.test(rawLines[0])) {
    const splitTokens = rawLines[0]
      .split(/(?=(?:^|\s+)[A-Ha-h1-8][\.\)\:\-]\s+)/)
      .map(s => s.trim())
      .filter(Boolean);
    if (splitTokens.length > 1) {
      rawLines = splitTokens;
    }
  }

  const results: ParsedMCOption[] = [];

  rawLines.forEach((line, fallbackIdx) => {
    let cleanLine = line.trim();
    let isCorrect = false;

    // Detect correctness markers (* at start, [x], (correct), (ans), etc.)
    if (cleanLine.startsWith('*')) {
      isCorrect = true;
      cleanLine = cleanLine.substring(1).trim();
    }
    if (/^\([xX*]\)\s*/.test(cleanLine)) {
      isCorrect = true;
      cleanLine = cleanLine.replace(/^\([xX*]\)\s*/, '');
    }
    if (/^\[[xX*]\]\s*/.test(cleanLine)) {
      isCorrect = true;
      cleanLine = cleanLine.replace(/^\[[xX*]\]\s*/, '');
    }
    if (/\s*[\(\[]?(?:correct|answer|ans|tamang sagot)[\)\]]?$/i.test(cleanLine)) {
      isCorrect = true;
      cleanLine = cleanLine.replace(/\s*[\(\[]?(?:correct|answer|ans|tamang sagot)[\)\]]?$/i, '').trim();
    }
    if (/\s*\*$/.test(cleanLine)) {
      isCorrect = true;
      cleanLine = cleanLine.replace(/\s*\*$/, '').trim();
    }

    // Regex to match prefix: "A)", "A.", "A\t", "A:", "A -", "(A)", "[A]", "a)", "1.", "1)"
    const match = cleanLine.match(/^[\(\[]?([A-Za-z0-9])[\)\]\:\.\-\t\s]\s*(.*)$/);
    if (match) {
      const prefixChar = match[1];
      let restText = match[2].trim();

      // Check if correctness asterisk is in restText e.g. "A. *Option"
      if (restText.startsWith('*')) {
        isCorrect = true;
        restText = restText.substring(1).trim();
      }

      let targetIndex = fallbackIdx;
      const upper = prefixChar.toUpperCase();
      if (upper >= 'A' && upper <= 'Z') {
        targetIndex = upper.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3...
      } else if (/^[1-9]$/.test(prefixChar)) {
        targetIndex = parseInt(prefixChar, 10) - 1; // 1=0, 2=1...
      }

      results.push({
        letter: upper,
        targetIndex,
        text: restText,
        isCorrect,
      });
    } else {
      // Also check bullet
      cleanLine = cleanLine.replace(/^[•\*\-\+\–\—\>]\s*/, '').trim();
      results.push({
        targetIndex: fallbackIdx,
        text: cleanLine,
        isCorrect,
      });
    }
  });

  return results;
}

/**
 * Intelligent parser for Multiple Choice questions.
 * Handles single or multiple questions with options (A, B, C, D...).
 */
export function parseMultipleChoiceQuestions(rawText: string): ParsedMCQuestion[] {
  const text = rawText.trim();
  if (!text) return [];

  // Normalize line endings
  const rawLines = text.split(/\r?\n/);
  
  // Group lines into question blocks
  interface RawQuestionBlock {
    promptLines: string[];
    optionLines: string[];
    explanation?: string;
  }

  const blocks: RawQuestionBlock[] = [];
  let currentBlock: RawQuestionBlock | null = null;
  let inOptions = false;

  // Regex to detect start of a question:
  // e.g. "1.", "1.\t", "1)", "(1)", "Q1.", "Question 1:", "Item 1."
  const questionStartRegex = /^(?:(?:question|q|item)\s*\d+[\.\:\-\s]*|\d+[\.\)\:\-]\s+|\(\d+\)\s*)/i;
  
  // Regex to detect an option line:
  // e.g. "A.", "A.\t", "A)", "(A)", "[A]", "A -", "A:", "a.", "a)"
  const optionStartRegex = /^[\(\[]?([A-Ha-h])[\)\]\:\.\-\t\s]\s*(.*)$/;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Check if line is an explanation or answer key
    if (/^(?:explanation|rason|paliwanag)\s*[\:\-]\s*(.*)$/i.test(line)) {
      if (currentBlock) {
        currentBlock.explanation = line.replace(/^(?:explanation|rason|paliwanag)\s*[\:\-]\s*/i, '').trim();
      }
      continue;
    }

    // Check if this line is an option (A., B., C., D.)
    const optionMatch = line.match(optionStartRegex);
    if (optionMatch) {
      if (!currentBlock) {
        // If options appear before any question prompt, create a default block
        currentBlock = { promptLines: ['Question Prompt'], optionLines: [] };
        blocks.push(currentBlock);
      }
      inOptions = true;
      currentBlock.optionLines.push(line);
      continue;
    }

    // Check if this line starts a new question
    const isNewQuestionStart = questionStartRegex.test(line);

    if (isNewQuestionStart) {
      currentBlock = { promptLines: [line], optionLines: [] };
      blocks.push(currentBlock);
      inOptions = false;
      continue;
    }

    // If we are already in options and get a non-option line that looks like a continuation of an option
    if (inOptions && currentBlock && currentBlock.optionLines.length > 0) {
      // Append to the previous option if not a new question
      const lastIdx = currentBlock.optionLines.length - 1;
      currentBlock.optionLines[lastIdx] += ' ' + line;
      continue;
    }

    // If we haven't started options yet in current block
    if (currentBlock && !inOptions) {
      currentBlock.promptLines.push(line);
    } else {
      // Start a new block
      currentBlock = { promptLines: [line], optionLines: [] };
      blocks.push(currentBlock);
      inOptions = false;
    }
  }

  // Convert raw blocks into structured questions
  const parsedQuestions: ParsedMCQuestion[] = [];

  for (const block of blocks) {
    // Clean prompt
    let prompt = block.promptLines.join(' ').trim();
    // Strip leading numbering from prompt e.g. "1.\t", "1. ", "Question 1: "
    prompt = prompt.replace(/^(?:(?:question|q|item)\s*\d+[\.\:\-\s]*|\d+[\.\)\:\-]\s+|\(\d+\)\s*)/i, '').trim();

    // Parse options
    const parsedOptions = parsePastedChoices(block.optionLines.join('\n'));

    // If no options were found, but prompt is non-empty, provide 4 default blank options
    let finalOptions: ParsedMCOption[] = parsedOptions;
    if (finalOptions.length === 0) {
      finalOptions = [
        { letter: 'A', text: 'Option A', isCorrect: true, targetIndex: 0 },
        { letter: 'B', text: 'Option B', isCorrect: false, targetIndex: 1 },
        { letter: 'C', text: 'Option C', isCorrect: false, targetIndex: 2 },
        { letter: 'D', text: 'Option D', isCorrect: false, targetIndex: 3 },
      ];
    } else {
      // Ensure at least one option is marked isCorrect if none was flagged
      const hasCorrect = finalOptions.some(o => o.isCorrect);
      if (!hasCorrect && finalOptions.length > 0) {
        finalOptions[0].isCorrect = true;
      }
    }

    parsedQuestions.push({
      prompt: prompt || 'Enter question prompt',
      options: finalOptions,
      explanation: block.explanation || '',
    });
  }

  return parsedQuestions;
}

/**
 * Intelligent parser for Identification questions.
 * Handles numbered lines, bullet points, or list of prompts.
 * Also extracts answer if embedded like "Prompt - Answer" or "Prompt : Answer".
 */
export function parseIdentificationQuestions(rawText: string): ParsedIdentificationQuestion[] {
  const text = rawText.trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const results: ParsedIdentificationQuestion[] = [];

  for (const line of lines) {
    let clean = line;

    // Check if line starts with question number: e.g. "1.\t", "1. ", "(1) "
    clean = clean.replace(/^(?:(?:question|q|item)\s*\d+[\.\:\-\s]*|\d+[\.\)\:\-]\s+|\(\d+\)\s*)/i, '').trim();
    clean = clean.replace(/^[•\*\-\+\–\—\>]\s*/, '').trim();

    if (!clean) continue;

    let questionPrompt = clean;
    let primaryAnswer = '';
    let acceptableAliases: string[] = [];
    let explanation = '';

    // Check for answer embedded at the end:
    // e.g. "Question prompt... - Answer" or "Question prompt... [Answer]" or "Question prompt... (Answer: X)"
    const ansMatch1 = clean.match(/^(.*?)\s*(?:[-–—]|\=\>|\->|\:\s*(?:ans|answer|sagot)\s*[\:\-]?)[\t\s]+([^\(\[\]\)]+)$/i);
    const ansMatch2 = clean.match(/^(.*?)\s*[\(\[](?:ans|answer|sagot)?\s*[\:\-]?\s*([^\)\]]+)[\)\]]$/i);

    if (ansMatch1 && ansMatch1[1].trim().length > 3) {
      questionPrompt = ansMatch1[1].trim();
      const rawAns = ansMatch1[2].trim();
      const aliasParts = rawAns.split(/[\/,;]/).map(a => a.trim()).filter(Boolean);
      primaryAnswer = aliasParts[0] || '';
      acceptableAliases = aliasParts.slice(1);
    } else if (ansMatch2 && ansMatch2[1].trim().length > 3) {
      questionPrompt = ansMatch2[1].trim();
      const rawAns = ansMatch2[2].trim();
      const aliasParts = rawAns.split(/[\/,;]/).map(a => a.trim()).filter(Boolean);
      primaryAnswer = aliasParts[0] || '';
      acceptableAliases = aliasParts.slice(1);
    }

    results.push({
      questionPrompt,
      primaryAnswer,
      acceptableAliases,
      explanation,
    });
  }

  return results;
}

/**
 * Intelligent parser for Connect the Dots / Matching pairs.
 * Handles:
 * 1. "Hanay A" / "Column A" ... "Hanay B" / "Column B" section headers
 * 2. Side-by-side pairs: "Item 1 \t Match 1" or "Item 1 - Match 1"
 */
export function parseConnectTheDots(rawText: string): ParsedMatchingActivity {
  const text = rawText.trim();
  if (!text) return { pairs: [] };

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // Check if text has Column A and Column B section headers (e.g. Hanay A / Hanay B, Column A / Column B, Set A / Set B)
  const headerARegex = /^(?:hanay|column|kolum|set|pangkat|part)\s*[a1]\b/i;
  const headerBRegex = /^(?:hanay|column|kolum|set|pangkat|part)\s*[b2]\b/i;

  let headerAIndex = -1;
  let headerBIndex = -1;
  let leftTitle = 'Column A';
  let rightTitle = 'Column B';

  for (let i = 0; i < lines.length; i++) {
    if (headerAIndex === -1 && headerARegex.test(lines[i])) {
      headerAIndex = i;
      leftTitle = lines[i];
    } else if (headerBIndex === -1 && headerBRegex.test(lines[i])) {
      headerBIndex = i;
      rightTitle = lines[i];
    }
  }

  // If section headers are found (like Hanay A ... Hanay B)
  if (headerAIndex !== -1 && headerBIndex !== -1 && headerBIndex > headerAIndex) {
    const leftRawLines = lines.slice(headerAIndex + 1, headerBIndex);
    const rightRawLines = lines.slice(headerBIndex + 1);

    const leftItems = parsePastedList(leftRawLines.join('\n'));
    const rightItems = parsePastedList(rightRawLines.join('\n'));

    const maxCount = Math.max(leftItems.length, rightItems.length);
    const pairs: ParsedMatchingPair[] = [];

    for (let i = 0; i < maxCount; i++) {
      pairs.push({
        leftText: leftItems[i] || `Item ${i + 1}`,
        rightText: rightItems[i] || `Match ${i + 1}`,
      });
    }

    return {
      leftTitle,
      rightTitle,
      pairs,
    };
  }

  // Check if the lines are side-by-side pairs (e.g. "Visigoths - Barbarians" or tab-delimited)
  const pairs: ParsedMatchingPair[] = [];

  for (const line of lines) {
    let clean = line.replace(/^(?:(?:item|q)\s*\d+[\.\:\-\s]*|\d+[\.\)\:\-]\s+|\(\d+\)\s*)/i, '').trim();
    if (!clean) continue;

    // Check tab separator
    if (clean.includes('\t')) {
      const parts = clean.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        pairs.push({
          leftText: parts[0],
          rightText: parts[1],
        });
        continue;
      }
    }

    // Check delimiter ( - , = , -> , : )
    const splitMatch = clean.match(/^(.*?)\s*(?:[\t]|[-–—]{1,2}|={1,2}|->|=>|:\s+)\s*(.+)$/);
    if (splitMatch && splitMatch[1].trim() && splitMatch[2].trim()) {
      pairs.push({
        leftText: splitMatch[1].trim(),
        rightText: splitMatch[2].trim(),
      });
      continue;
    }

    // Single item fallback
    pairs.push({
      leftText: clean,
      rightText: `Match ${pairs.length + 1}`,
    });
  }

  return {
    leftTitle,
    rightTitle,
    pairs,
  };
}

/**
 * Intelligent parser for True or False questions.
 * Handles traditional and modified True/False formats.
 */
export function parseTrueFalseQuestions(rawText: string): ParsedTFQuestion[] {
  const text = rawText.trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const results: ParsedTFQuestion[] = [];

  for (const line of lines) {
    let clean = line;

    // Strip question number prefix e.g. "1.", "1.\t", "1)", "(1)"
    clean = clean.replace(/^(?:(?:question|q|item)\s*\d+[\.\:\-\s]*|\d+[\.\)\:\-]\s+|\(\d+\)\s*)/i, '').trim();
    clean = clean.replace(/^[•\*\-\+\–\—\>]\s*/, '').trim();

    if (!clean) continue;

    let isTrue = true;
    let underlinedWord: string | undefined = undefined;
    let replacementAnswer: string | undefined = undefined;
    let acceptableAliases: string[] = [];
    let explanation: string | undefined = undefined;

    // Detect truth value indicators at end of line:
    // e.g. " - True", " (Tama)", " [False]", " - Mali", " (T)", " (F)"
    const tfEndMatch = clean.match(/\s*[\(\[\-\–\—\:\t]\s*(true|false|tama|mali|t|f|wasto|di-wasto)[\)\]]?\s*$/i);
    if (tfEndMatch) {
      const val = tfEndMatch[1].toLowerCase();
      isTrue = (val === 'true' || val === 'tama' || val === 't' || val === 'wasto');
      clean = clean.substring(0, tfEndMatch.index).trim();
    }

    // Detect truth value indicators at beginning of line:
    // e.g. "T. Statement", "True - Statement", "(Tama) Statement"
    const tfStartMatch = clean.match(/^[\(\[]?(true|false|tama|mali|t|f|wasto|di-wasto)[\)\]\.\:\-\s]\s*(.*)$/i);
    if (tfStartMatch) {
      const val = tfStartMatch[1].toLowerCase();
      isTrue = (val === 'true' || val === 'tama' || val === 't' || val === 'wasto');
      clean = tfStartMatch[2].trim();
    }

    // Detect modified format with underlined or marked word:
    // e.g. "Ang _Simbahang Katolika_ ang..." or "Ang *pyudalismo* ay..." or "Ang [lupa] ang..."
    const underlinedMatch = clean.match(/[_*\[]([^_*\[\]]+)[_*\]]/);
    if (underlinedMatch) {
      underlinedWord = underlinedMatch[1].trim();
      // Look for replacement answer after -> or => if marked false
      const replaceMatch = clean.match(/(?:->|=>|sagot:|palitan:)\s*([^\(\[\r\n]+)/i);
      if (replaceMatch) {
        replacementAnswer = replaceMatch[1].trim();
        const aliasParts = replacementAnswer.split(/[\/,;]/).map(a => a.trim()).filter(Boolean);
        replacementAnswer = aliasParts[0] || '';
        acceptableAliases = aliasParts.slice(1);
      }
    }

    results.push({
      statement: clean,
      isTrue,
      underlinedWord,
      replacementAnswer,
      acceptableAliases,
      explanation,
    });
  }

  return results;
}
