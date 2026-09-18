export interface CategoryItem {
  id: string;
  text: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  items: CategoryItem[];
}

export interface HotspotTarget {
  id: string;
  label: string;
  xPercent: number; // 0 - 100%
  yPercent: number; // 0 - 100%
  radiusPercent: number; // tolerance circle radius (default ~6%)
  questionPrompt?: string;
  explanation?: string;
}

export interface ClickAnImageActivityData {
  imageUrl: string;
  imageTitle: string;
  imageTheme: 'map' | 'anatomy' | 'diagram' | 'odd_one_out' | 'custom';
  hotspots: HotspotTarget[];
}

export interface MatchingPair {
  id: string;
  leftText: string;
  rightText: string;
  color?: string;
  explanation?: string;
}

export interface ConnectTheDotsActivityData {
  pairs: MatchingPair[];
  leftTitle?: string;
  rightTitle?: string;
}

export interface EnumerationKeyItem {
  id: string;
  primaryAnswer: string;
  acceptableAliases: string[];
  explanation?: string;
}

export interface EnumerationActivityData {
  items: EnumerationKeyItem[];
  strictOrder: boolean;
  caseSensitive: boolean;
  itemCount: number;
}

export interface EssayActivityData {
  minWords?: number;
  maxWords?: number;
  referenceAnswer?: string;
  keyConcepts?: string[];
  teacherComments?: string;
  awardedScore?: number;
}

export interface IdentificationQuestionItem {
  id: string;
  questionPrompt: string;
  primaryAnswer: string;
  acceptableAliases: string[];
  explanation?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface IdentificationActivityData {
  questions: IdentificationQuestionItem[];
  caseSensitive: boolean;
  displayPerPage?: 1 | 5 | 10 | 'all';
  shuffleQuestions?: boolean;
  primaryAnswer?: string;
  acceptableAliases?: string[];
  explanation?: string;
}

export interface ChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface MultipleChoiceQuestionItem {
  id: string;
  prompt: string;
  options: ChoiceOption[];
  explanation?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface MultipleChoiceActivityData {
  questions: MultipleChoiceQuestionItem[];
  displayMode: 'paginated' | 'single_page';
  shuffleOptions?: boolean;
  shuffleQuestions?: boolean;
  options?: ChoiceOption[];
  explanation?: string;
}

export interface MultipleResponseQuestionItem {
  id: string;
  prompt: string;
  options: ChoiceOption[];
  explanation?: string;
}

export interface MultipleResponseActivityData {
  questions: MultipleResponseQuestionItem[];
  displayMode: 'paginated' | 'single_page';
  allowPartialCredit?: boolean;
  shuffleOptions?: boolean;
  options?: ChoiceOption[];
  explanation?: string;
}

export interface SequenceStep {
  id: string;
  text: string;
  correctOrder: number;
}

export interface SequencingActivityData {
  steps: SequenceStep[];
  explanation?: string;
}

export interface TrueFalseQuestionItem {
  id: string;
  statement: string;
  isTrue: boolean;
  underlinedWord?: string;
  replacementAnswer?: string;
  acceptableAliases?: string[];
  explanation?: string;
}

export interface TrueFalseActivityData {
  mode: 'traditional' | 'modified';
  displayPerPage?: 1 | 5 | 10;
  questions: TrueFalseQuestionItem[];
  statement?: string;
  correctAnswer?: boolean;
  explanation?: string;
}

export interface NumericQuestionItem {
  id: string;
  questionPrompt: string;
  correctAnswer: string; // e.g. "3/4", "y = 2x", "5"
  alternativeAnswers?: string[]; // Acceptable alternative answers / representations
  acceptableAliases?: string[]; // Alias support for seamless compatibility
  tolerance?: number;
  explanation?: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface NumericActivityData {
  questions: NumericQuestionItem[];
  displayPerPage?: 1 | 3 | 5 | 'all';
  shuffleQuestions?: boolean;
}

export interface DropdownOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface DropdownQuestionItem {
  id: string;
  prompt: string; // e.g. "The capital of France is [select]"
  options: DropdownOption[];
  explanation?: string;
}

export interface DropdownActivityData {
  questions: DropdownQuestionItem[];
  displayMode?: 'paginated' | 'single_page';
  displayPerPage?: 1 | 3 | 5;
  shuffleOptions?: boolean;
  shuffleQuestions?: boolean;
}

export interface QuizActivity {
  id: string;
  name: string;
  type: 
    | 'Categorization' 
    | 'Click an Image' 
    | 'Connect the Dots' 
    | 'Enumeration' 
    | 'Essay' 
    | 'Identification' 
    | 'Multiple Choice' 
    | 'Multiple Response' 
    | 'Sequencing' 
    | 'True or False' 
    | 'Numeric'
    | 'Dropdown Select'
    | string;
  prompt: string;
  instructions: string;
  pointsPerCorrect: number;
  deductionPerMistake: number;
  retries: number;
  isGraded?: boolean;
  passingScore?: number;
  data: {
    categories?: Category[];
    clickAnImage?: ClickAnImageActivityData;
    connectTheDots?: ConnectTheDotsActivityData;
    enumeration?: EnumerationActivityData;
    essay?: EssayActivityData;
    identification?: IdentificationActivityData;
    multipleChoice?: MultipleChoiceActivityData;
    multipleResponse?: MultipleResponseActivityData;
    sequencing?: SequencingActivityData;
    trueFalse?: TrueFalseActivityData;
    numeric?: NumericActivityData;
    dropdownSelect?: DropdownActivityData;
    [key: string]: any;
  };
  totalPoints: number;
  lastModified?: number;
}
