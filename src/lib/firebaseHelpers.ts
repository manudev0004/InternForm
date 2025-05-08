import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { Exam, User } from '@/types';

// Logs
export type LogEntry = {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
};

export async function addLog(log: LogEntry) {
  const logsCol = collection(db, 'logs');
  // Firestore can't store Date objects directly, so convert to ISO string
  await setDoc(doc(logsCol, log.id), { ...log, timestamp: log.timestamp.toISOString() });
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const logsCol = collection(db, 'logs');
  const logsQuery = query(logsCol, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      timestamp: new Date(data.timestamp),
    } as LogEntry;
  });
}

// Exams
export async function fetchExams(): Promise<Exam[]> {
  const examsCol = collection(db, 'exams');
  const examSnapshot = await getDocs(examsCol);
  return examSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Exam[];
}

export async function addExam(exam: Exam) {
  const examsCol = collection(db, 'exams');
  await setDoc(doc(examsCol, exam.id), exam);
}

export async function updateExam(examId: string, data: Partial<Exam>) {
  const examRef = doc(db, 'exams', examId);
  await updateDoc(examRef, data);
}

// Users
export async function fetchUsers(): Promise<User[]> {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  return userSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[];
}

// Delete User
export async function deleteUser(userId: string) {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

export async function addUser(user: User) {
  const usersCol = collection(db, 'users');
  await setDoc(doc(usersCol, user.id), user);
}

export async function updateUser(userId: string, data: Partial<User>) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
}

// Utility to check if collection is empty
export async function isCollectionEmpty(collectionName: string) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.empty;
}
