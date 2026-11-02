import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  WriteBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { KotobaItem, Lesson } from '@/types/kotoba';

const LOCAL_STORAGE_KOTOBA_KEY = 'nihongo_flashcard_kotoba_v1';
const LOCAL_STORAGE_LESSONS_KEY = 'nihongo_flashcard_lessons_v1';

// Helper to get local data
function getLocalKotoba(): KotobaItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KOTOBA_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalKotoba(items: KotobaItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KOTOBA_KEY, JSON.stringify(items));
}

function getLocalLessons(): Lesson[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_LESSONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalLessons(lessons: Lesson[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_LESSONS_KEY, JSON.stringify(lessons));
}

// Service Methods

export async function fetchAllLessons(): Promise<Lesson[]> {
  if (!isFirebaseConfigured || !db) {
    return getLocalLessons();
  }

  try {
    const lessonsRef = collection(db, 'lessons');
    const q = query(lessonsRef, orderBy('lessonId', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return getLocalLessons();
    }

    return snapshot.docs.map((docSnap) => docSnap.data() as Lesson);
  } catch (error) {
    console.warn('Firestore error fetching lessons, fallback to local storage:', error);
    return getLocalLessons();
  }
}

export async function fetchKotobaByLessons(lessonIds: number[]): Promise<KotobaItem[]> {
  if (!isFirebaseConfigured || !db) {
    const all = getLocalKotoba();
    if (lessonIds.length === 0) return all;
    return all.filter((item) => lessonIds.includes(item.lessonId));
  }

  try {
    const kotobaRef = collection(db, 'kotoba');
    let q;
    if (lessonIds.length > 0) {
      q = query(kotobaRef, where('lessonId', 'in', lessonIds));
    } else {
      q = query(kotobaRef, orderBy('no', 'asc'));
    }

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((docSnap) => docSnap.data() as KotobaItem);
    return results.sort((a, b) => a.lessonId - b.lessonId || a.no - b.no);
  } catch (error) {
    console.warn('Firestore error fetching kotoba, fallback to local storage:', error);
    const all = getLocalKotoba();
    if (lessonIds.length === 0) return all;
    return all.filter((item) => lessonIds.includes(item.lessonId));
  }
}

export async function saveKotobaBatch(lessonId: number, items: Omit<KotobaItem, 'id'>[]): Promise<void> {
  const preparedItems: KotobaItem[] = items.map((item, idx) => {
    const no = Number(item.no) || idx + 1;
    return {
      ...item,
      id: `${lessonId}_${no}`,
      lessonId,
      no,
      updatedAt: Date.now(),
    };
  });

  // Update Local Storage
  const localAll = getLocalKotoba().filter((k) => k.lessonId !== lessonId);
  const updatedLocal = [...localAll, ...preparedItems];
  saveLocalKotoba(updatedLocal);

  const localLessons = getLocalLessons().filter((l) => l.lessonId !== lessonId);
  const newLesson: Lesson = {
    lessonId,
    title: `Bab ${lessonId} / 第${lessonId}課`,
    totalCount: preparedItems.length,
    createdAt: Date.now(),
  };
  saveLocalLessons([...localLessons, newLesson]);

  if (!isFirebaseConfigured || !db) return;

  try {
    // 1. Query all existing kotoba docs for this lesson in Firestore
    const existingSnapshot = await getDocs(
      query(collection(db, 'kotoba'), where('lessonId', '==', lessonId))
    );

    const newDocIds = new Set(preparedItems.map((item) => item.id));

    // 2. Identify docs that exist in Firestore but are NOT in the new preparedItems list
    const docsToDelete = existingSnapshot.docs.filter((docSnap) => !newDocIds.has(docSnap.id));

    const operations: ((batch: WriteBatch) => void)[] = [];

    // Lesson Doc
    const lessonRef = doc(db, 'lessons', `lesson_${lessonId}`);
    operations.push((batch) => batch.set(lessonRef, newLesson));

    // Delete removed Kotoba Docs
    for (const docSnap of docsToDelete) {
      operations.push((batch) => batch.delete(docSnap.ref));
    }

    // Set updated Kotoba Docs
    for (const item of preparedItems) {
      const itemRef = doc(db, 'kotoba', item.id);
      operations.push((batch) => batch.set(itemRef, item));
    }

    // Commit batches in chunks (max 500 ops per Firestore batch)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        op(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Firestore batch save error:', error);
    throw error;
  }
}

export async function deleteLesson(lessonId: number): Promise<void> {
  // Update Local Storage
  const local = getLocalKotoba().filter((k) => k.lessonId !== lessonId);
  saveLocalKotoba(local);

  const lessons = getLocalLessons().filter((l) => l.lessonId !== lessonId);
  saveLocalLessons(lessons);

  if (!isFirebaseConfigured || !db) return;

  try {
    // Delete lesson doc
    const lessonRef = doc(db, 'lessons', `lesson_${lessonId}`);

    // Delete kotoba docs for this lesson
    const snapshot = await getDocs(query(collection(db, 'kotoba'), where('lessonId', '==', lessonId)));
    
    const operations: ((batch: WriteBatch) => void)[] = [];
    operations.push((batch) => batch.delete(lessonRef));
    for (const docSnap of snapshot.docs) {
      operations.push((batch) => batch.delete(docSnap.ref));
    }

    const CHUNK_SIZE = 400;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        op(batch);
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Firestore delete lesson error:', error);
    throw error;
  }
}
