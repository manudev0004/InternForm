import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { firebaseApp, db as importedDb } from "./firebase";

// Import training data utilities
import {
  getTrainingDataSubmissions,
  exportTrainingData,
  getTrainingSubmissionById,
} from "./training-data-utils";

import { exportFormDataForTraining } from "./data-export";

import { generateDataQualityStats } from "./data-quality";

import {
  archiveSubmissionVersion,
  getSubmissionVersionHistory,
  compareSubmissionVersions,
} from "./version-history";

// Re-export training data functions for easy access
export {
  // Training data core functions
  getTrainingDataSubmissions,
  exportTrainingData,
  getTrainingSubmissionById,

  // Enhanced export utilities
  exportFormDataForTraining,

  // Data quality metrics
  generateDataQualityStats,

  // Version history management
  archiveSubmissionVersion,
  getSubmissionVersionHistory,
  compareSubmissionVersions,
};

// Use imported db first, or initialize if it's not available
const db = importedDb || (firebaseApp ? getFirestore(firebaseApp) : null);

// Safety check for db - will throw clear error if Firebase is not properly initialized
if (!db) {
  console.error(
    "Firebase Firestore instance is not initialized properly. Check your Firebase configuration."
  );
}

// --- User Utilities ---
export async function addUser(user: {
  id: string;
  email: string;
  role: string;
  name?: string;
}) {
  await setDoc(doc(db, "users", user.id), user);
}

export async function getUsersByRole(role: string) {
  const q = query(collection(db, "users"), where("role", "==", role));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function updateUser(
  userId: string,
  data: Partial<{ email: string; role: string; name?: string }>
) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, data);
}

export async function deleteUser(userId: string) {
  const ref = doc(db, "users", userId);
  await deleteDoc(ref);
}

// --- Exam Utilities ---
export async function addExam(exam: any) {
  const ref = await addDoc(collection(db, "exams"), exam);
  return ref.id;
}

export async function updateExam(examId: string, data: Partial<any>) {
  const ref = doc(db, "exams", examId);
  await updateDoc(ref, data);
}

export async function getAllExams() {
  const snap = await getDocs(collection(db, "exams"));
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
export async function addSubExam(mainExamId: string, subExam: any) {
  // Option 1: sub-exams as subcollection
  const ref = await addDoc(
    collection(db, "exams", mainExamId, "subExams"),
    subExam
  );
  return ref.id;
}

// --- Assignment Utilities ---
export async function assignWork({
  examId,
  subExamId = null,
  internIds,
  dueDate,
  assignedBy,
  notes = "",
  bulk = false,
}: {
  examId: string;
  subExamId?: string | null;
  internIds: string[];
  dueDate: Date;
  assignedBy: string;
  notes?: string;
  bulk?: boolean;
}) {
  const batch = [];
  for (const internId of internIds) {
    const assignment = {
      examId,
      subExamId: subExamId || null,
      internId,
      assignedBy,
      dueDate: Timestamp.fromDate(dueDate),
      status: "assigned",
      notes,
      history: [
        {
          action: "assigned",
          actorId: assignedBy,
          timestamp: Timestamp.now(),
          details: { notes },
        },
      ],
    };
    batch.push(addDoc(collection(db, "assignments"), assignment));
  }
  return Promise.all(batch);
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: string,
  actorId: string,
  details: any = {}
) {
  const ref = doc(db, "assignments", assignmentId);
  await updateDoc(ref, {
    status,
    [`history`]: [
      ...((await getDoc(ref)).data()?.history || []),
      { action: status, actorId, timestamp: Timestamp.now(), details },
    ],
  });
}

// --- Submission Utilities ---
export async function submitExamForm({
  assignmentId,
  formData,
  internNotes,
  internId,
  deviceInfo,
}: {
  assignmentId: string;
  formData: any;
  internNotes: string;
  internId?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    screenSize?: {
      width: number;
      height: number;
      viewportWidth: number;
      viewportHeight: number;
    };
  };
}) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const timestamp = Timestamp.now();

  // Process form data to handle nulls and empty values properly
  const processValues = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(processValues);
    }
    if (typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
          // Convert empty strings to null
          if (value === "") return [key, null];
          // Process nested objects/arrays
          return [key, processValues(value)];
        })
      );
    }
    return obj;
  };

  const processedFormData = processValues(formData);

  // Add comprehensive metadata fields for training datasets
  const enhancedFormData = {
    ...processedFormData,
    metadata: {
      created_at: timestamp,
      updated_at: timestamp,
      intern_id: internId || "unknown",
      admin_approved: false,
      version: 1,
      source: "intern_submission",
      submission_environment: {
        timestamp: timestamp,
        date: timestamp.toDate().toISOString().split("T")[0],
        time: timestamp.toDate().toISOString().split("T")[1].split(".")[0],
        browser: deviceInfo?.browser || "unknown",
        os: deviceInfo?.os || "unknown",
        device: deviceInfo?.device || "unknown",
        screen_width: deviceInfo?.screenSize?.width,
        screen_height: deviceInfo?.screenSize?.height,
        viewport_width: deviceInfo?.screenSize?.viewportWidth,
        viewport_height: deviceInfo?.screenSize?.viewportHeight,
      },
      data_quality: {
        completeness: null, // Will be filled by admin during review
        verified: false,
        needs_review: true,
      },
      training_data_status: "pending_review",
    },
  };

  // Add submission document with comprehensive tracking
  const ref = await addDoc(collection(db, "submissions"), {
    assignmentId,
    formData: enhancedFormData,
    status: "submitted",
    internNotes: internNotes || "",
    adminNotes: "",
    feedbackNotes: "",
    adminApproved: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    history: [
      {
        action: "submitted",
        actorId: internId || "intern",
        timestamp: timestamp,
        details: {
          internNotes: internNotes || "",
          source: "intern_submission",
          device: deviceInfo?.device || "unknown",
        },
      },
    ],
  });

  // Also log this submission action
  await addLog({
    action: "exam_submission",
    actorId: internId || "unknown_intern",
    entityType: "submission",
    entityId: ref.id,
    details: {
      assignmentId,
      timestamp,
      status: "submitted",
      device: deviceInfo?.device || "unknown",
    },
  });

  return ref.id;
}

export async function updateSubmission({
  submissionId,
  status,
  actorId,
  adminNotes,
  feedbackNotes,
  changeReason,
}: {
  submissionId: string;
  status: string;
  actorId: string;
  adminNotes?: string;
  feedbackNotes?: string;
  changeReason?: string;
}) {
  const ref = doc(db, "submissions", submissionId);
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const snap = await getDoc(ref);
  const prev = snap.data();

  if (!prev) throw new Error("Submission not found");

  const timestamp = Timestamp.now();

  // Import the version history utility
  const { archiveSubmissionVersion } = await import("./version-history");

  // Archive the current version before updating
  try {
    await archiveSubmissionVersion(
      submissionId,
      actorId,
      changeReason || `Status updated to ${status}`
    );
  } catch (error) {
    console.error("Error archiving submission version:", error);
    // Continue with update even if archiving fails
  }

  // Update the metadata in the formData as well
  const updatedFormData = prev.formData
    ? {
        ...prev.formData,
        metadata: {
          ...(prev.formData.metadata || {}),
          updated_at: timestamp,
          admin_approved: status === "approved",
          version: (prev.formData.metadata?.version || 1) + 1,
          last_update_by: actorId,
          update_reason: status,
          feedback: feedbackNotes || prev.formData.metadata?.feedback,
          change_history: [
            ...(prev.formData.metadata?.change_history || []),
            {
              version: (prev.formData.metadata?.version || 1) + 1,
              timestamp,
              actor: actorId,
              status,
              reason: changeReason || `Status updated to ${status}`,
            },
          ],
        },
      }
    : prev.formData;

  await updateDoc(ref, {
    status,
    formData: updatedFormData,
    adminNotes: adminNotes ?? prev.adminNotes,
    feedbackNotes: feedbackNotes ?? prev.feedbackNotes,
    adminApproved: status === "approved",
    updatedAt: timestamp,
    history: [
      ...(prev.history || []),
      {
        action: status,
        actorId,
        timestamp: timestamp,
        details: {
          adminNotes,
          feedbackNotes,
          changeReason: changeReason || `Status updated to ${status}`,
        },
      },
    ],
  });
}

export async function approveSubmission({
  submissionId,
  assignmentId,
  actorId,
  feedbackNotes,
  qualityScore,
  reviewNotes,
}: {
  submissionId: string;
  assignmentId: string;
  actorId: string;
  feedbackNotes?: string;
  qualityScore?: number;
  reviewNotes?: string;
}) {
  // Move to finalSubmissions
  if (!db) throw new Error("Firebase Firestore is not initialized");

  // Import the version history utility
  const { archiveSubmissionVersion } = await import("./version-history");

  const snap = await getDoc(doc(db, "submissions", submissionId));
  const data = snap.data();
  if (!data) throw new Error("Submission not found");

  const timestamp = Timestamp.now();

  // Archive the current version before updating
  try {
    await archiveSubmissionVersion(
      submissionId,
      actorId,
      "Submission approved for training data"
    );
  } catch (error) {
    console.error("Error archiving submission version:", error);
    // Continue with approval even if archiving fails
  }

  // Update metadata in the formData with comprehensive training data annotations
  const enhancedData = {
    ...data,
    formData: {
      ...data.formData,
      metadata: {
        ...(data.formData?.metadata || {}),
        admin_approved: true,
        updated_at: timestamp,
        approved_at: timestamp,
        approved_by: actorId,
        version: (data.formData?.metadata?.version || 1) + 1,
        review_notes: reviewNotes || null,
        quality_score: qualityScore || null,
        training_data_status: "approved",
        data_quality: {
          completeness: qualityScore ? qualityScore >= 8 : null,
          verified: true,
          verification_date: timestamp,
        },
        change_history: [
          ...(data.formData?.metadata?.change_history || []),
          {
            version: (data.formData?.metadata?.version || 1) + 1,
            timestamp,
            actor: actorId,
            status: "approved",
            reason: "Submission approved for training data",
          },
        ],
      },
    },
    approvedAt: timestamp,
    approvedBy: actorId,
    adminApproved: true,
    feedbackNotes: feedbackNotes || data.feedbackNotes || "",
    qualityScore: qualityScore || null,
    reviewNotes: reviewNotes || null,
  };

  // Store approved submissions in finalSubmissions collection for training data
  await addDoc(collection(db, "finalSubmissions"), enhancedData);

  // Update assignment status
  await updateAssignmentStatus(assignmentId, "approved", actorId);

  // Update submission status
  await updateSubmission({
    submissionId,
    status: "approved",
    actorId,
    adminNotes: data.adminNotes,
    feedbackNotes: feedbackNotes || data.feedbackNotes,
    changeReason: "Submission approved for training data",
  });
}

// --- Logging (admin only) ---
export async function addLog({
  action,
  actorId,
  entityType,
  entityId,
  details,
}: {
  action: string;
  actorId: string;
  entityType: string;
  entityId: string;
  details: any;
}) {
  await addDoc(collection(db, "logs"), {
    action,
    actorId,
    entityType,
    entityId,
    details,
    timestamp: Timestamp.now(),
  });
}

// --- Restore from logs (admin only) ---
export async function restoreFromLog(logId: string) {
  // Implement restoration logic as needed
  // Fetch log, determine entity, and restore previous state
}

// --- Utility: Get assignments for intern ---
export async function getAssignmentsForIntern(internId: string = "") {
  let q;
  if (internId) {
    q = query(collection(db, "assignments"), where("internId", "==", internId));
  } else {
    q = query(collection(db, "assignments"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Utility: Get submissions for assignment ---
export async function getSubmissionsForAssignment(assignmentId: string) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const q = query(
    collection(db, "submissions"),
    where("assignmentId", "==", assignmentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Utility: Get all logs (admin only) ---
export async function getAllLogs() {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const snap = await getDocs(collection(db, "logs"));
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Using training-data-utils.ts for these functionalities instead
