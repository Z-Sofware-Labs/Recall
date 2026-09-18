import { createRoot } from 'react-dom/client';
import CoursePlayerEngine from '../components/course/CoursePlayerEngine';

declare global {
  interface Window {
    __RECALL_COURSE_DATA__?: any;
  }
}

function initPlayer() {
  const data = window.__RECALL_COURSE_DATA__ || {};
  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(
      <CoursePlayerEngine
        timeline={data.timeline || []}
        courseTitle={data.title || 'Interactive Course'}
        currentProject={data}
        quizActivities={data.quizActivities || []}
        mode="standalone"
        isStandaloneWindow={true}
      />
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayer);
} else {
  initPlayer();
}
