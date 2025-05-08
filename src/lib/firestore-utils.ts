import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { firebaseApp } from './firebase';

const db = getFirestore(firebaseApp);

// --- User Utilities ---
export async function addUser(user: { id: string, email: string, role: string; name?: string }) {
  await setDoc(doc(db, 'users', user.id), user);
}

export async function getUsersByRole(role: string) {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateUser(userId: string, data: Partial<{ email: string; role: string; name?: string }>) {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, data);
}

export async function deleteUser(userId: string) {
  const ref = doc(db, 'users', userId);
  await deleteDoc(ref);
}

// --- Exam Utilities ---
export async function addExam(exam: any) {
  const ref = await addDoc(collection(db, 'exams'), exam);
  return ref.id;
}

export async function updateExam(examId: string, data: Partial<any>) {
  const ref = doc(db, 'exams', examId);
  await updateDoc(ref, data);
}

export async function getAllExams() {
  const snap = await getDocs(collection(db, 'exams'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function addSubExam(mainExamId: string, subExam: any) {
  // Option 1: sub-exams as subcollection
  const ref = await addDoc(collection(db, 'exams', mainExamId, 'subExams'), subExam);
  return ref.id;
}

// --- Assignment Utilities ---
export async function assignWork({
  examId,
  subExamId = null,
  internIds,
  dueDate,
  assignedBy,
  notes = '',
  bulk = false
}: {
  examId: string,
  subExamId?: string | null,
  internIds: string[],
  dueDate: Date,
  assignedBy: string,
  notes?: string,
  bulk?: boolean
}) {
  const batch = [];
  for (const internId of internIds) {
    const assignment = {
      examId,
      subExamId: subExamId || null,
      internId,
      assignedBy,
      dueDate: Timestamp.fromDate(dueDate),
      status: 'assigned',
      notes,
      history: [{ action: 'assigned', actorId: assignedBy, timestamp: Timestamp.now(), details: { notes } }]
    };
    batch.push(addDoc(collection(db, 'assignments'), assignment));
  }
  return Promise.all(batch);
}

export async function updateAssignmentStatus(assignmentId: string, status: string, actorId: string, details: any = {}) {
  const ref = doc(db, 'assignments', assignmentId);
  await updateDoc(ref, {
    status,
    [`history`]: [...(await getDoc(ref)).data()?.history || [], { action: status, actorId, timestamp: Timestamp.now(), details }]
  });
}

// --- Submission Utilities ---
export async function submitExamForm({ assignmentId, formData, internNotes }) {
  const ref = await addDoc(collection(db, 'submissions'), {
    assignmentId,
    formData,
    status: 'submitted',
    internNotes: internNotes || '',
    adminNotes: '',
    history: [{ action: 'submitted', actorId: 'intern', timestamp: Timestamp.now(), details: {} }]
  });
  return ref.id;
}

export async function updateSubmission({ submissionId, status, actorId, adminNotes }) {
  const ref = doc(db, 'submissions', submissionId);
  const snap = await getDoc(ref);
  const prev = snap.data();
  await updateDoc(ref, {
    status,
    adminNotes: adminNotes ?? prev.adminNotes,
    history: [...(prev.history || []), { action: status, actorId, timestamp: Timestamp.now(), details: { adminNotes } }]
  });
}

export async function approveSubmission({ submissionId, assignmentId, actorId }) {
  // Move to finalSubmissions
  const snap = await getDoc(doc(db, 'submissions', submissionId));
  const data = snap.data();
  if (!data) throw new Error('Submission not found');
  await addDoc(collection(db, 'finalSubmissions'), {
    ...data,
    approvedAt: Timestamp.now(),
    approvedBy: actorId
  });
  // Update assignment status
  await updateAssignmentStatus(assignmentId, 'approved', actorId);
  // Update submission status
  await updateSubmission({ submissionId, status: 'approved', actorId, adminNotes: data.adminNotes });
}

// --- Logging (admin only) ---
export async function addLog({ action, actorId, entityType, entityId, details }) {
  await addDoc(collection(db, 'logs'), {
    action,
    actorId,
    entityType,
    entityId,
    details,
    timestamp: Timestamp.now()
  });
}

// --- Restore from logs (admin only) ---
export async function restoreFromLog(logId: string) {
  // Implement restoration logic as needed
  // Fetch log, determine entity, and restore previous state
}

// --- Utility: Get assignments for intern ---
export async function getAssignmentsForIntern(internId: string) {
  const q = query(collection(db, 'assignments'), where('internId', '==', internId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Utility: Get submissions for assignment ---
export async function getSubmissionsForAssignment(assignmentId: string) {
  const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- Utility: Get all logs (admin only) ---
export async function getAllLogs() {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
