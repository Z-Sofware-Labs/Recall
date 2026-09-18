import { TimelineItem } from '../CourseOrganizer';
import { QuizActivity } from '../../types/quiz';
import CoursePlayerEngine from './CoursePlayerEngine';

interface CoursePlayerPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: TimelineItem[];
  courseTitle: string;
  currentProject?: any;
  quizActivities?: QuizActivity[];
}

export default function CoursePlayerPreviewModal({
  isOpen,
  onClose,
  timeline,
  courseTitle,
  currentProject,
  quizActivities = [],
}: CoursePlayerPreviewModalProps) {
  if (!isOpen || !timeline || timeline.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <CoursePlayerEngine
        timeline={timeline}
        courseTitle={courseTitle}
        currentProject={currentProject}
        quizActivities={quizActivities}
        mode="preview"
        onClose={onClose}
        isStandaloneWindow={false}
      />
    </div>
  );
}
