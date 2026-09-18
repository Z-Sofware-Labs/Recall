import Dexie, { Table } from 'dexie';

export interface Course {
  id?: number;
  title: string;
  description: string;
  createdAt: number;
}

export interface Media {
  id?: number;
  courseId: number;
  name: string;
  type: string;
  data: string; // Base64 or local URL
}

export class RecallDatabase extends Dexie {
  courses!: Table<Course>;
  media!: Table<Media>;

  constructor() {
    super('RecallDatabase');
    this.version(1).stores({
      courses: '++id, title',
      media: '++id, courseId, name'
    });
  }
}

export const db = new RecallDatabase();
