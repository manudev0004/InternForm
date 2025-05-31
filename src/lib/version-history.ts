// Version history utilities for exam form submissions
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { firebaseApp, db as importedDb } from "./firebase";

// Use imported db first, or initialize if it's not available
const db = importedDb || (firebaseApp ? getFirestore(firebaseApp) : null);

/**
 * Archives the current version of a submission to track its history
 * @param submissionId The ID of the submission to archive
 * @param actorId The ID of the user making the change
 * @param changeReason Reason for the change/version
 */
export async function archiveSubmissionVersion(
  submissionId: string,
  actorId: string,
  changeReason: string
) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  // Fetch the current submission data
  const submissionRef = doc(db, "submissions", submissionId);
  const submission = await getDoc(submissionRef);

  if (!submission.exists()) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const submissionData = submission.data();
  const timestamp = Timestamp.now();

  // Create a version record in the version history collection
  await addDoc(collection(db, "submissionHistory"), {
    submissionId,
    versionNumber: submissionData.formData?.metadata?.version || 1,
    versionData: submissionData,
    archivedAt: timestamp,
    archivedBy: actorId,
    changeReason,
  });
}

/**
 * Gets the version history for a submission
 * @param submissionId The ID of the submission to get history for
 * @param includeData Whether to include the full data for each version
 * @returns Array of version history entries
 */
export async function getSubmissionVersionHistory(
  submissionId: string,
  includeData = false
) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const q = query(
    collection(db, "submissionHistory"),
    where("submissionId", "==", submissionId),
    orderBy("archivedAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      submissionId: data.submissionId,
      versionNumber: data.versionNumber,
      archivedAt: data.archivedAt,
      archivedBy: data.archivedBy,
      changeReason: data.changeReason,
      // Only include full version data if requested
      ...(includeData ? { versionData: data.versionData } : {}),
    };
  });
}

/**
 * Compare two versions of a submission to see what changed
 * @param versionId1 ID of the first version record
 * @param versionId2 ID of the second version record
 * @returns Object showing differences between the versions
 */
export async function compareSubmissionVersions(
  versionId1: string,
  versionId2: string
) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  // Fetch both version records
  const v1Doc = await getDoc(doc(db, "submissionHistory", versionId1));
  const v2Doc = await getDoc(doc(db, "submissionHistory", versionId2));

  if (!v1Doc.exists() || !v2Doc.exists()) {
    throw new Error("One or both version records not found");
  }

  const v1Data = v1Doc.data();
  const v2Data = v2Doc.data();

  // Compare the versions (simplified - real diff would be more complex)
  return {
    versionInfo: {
      v1: {
        versionNumber: v1Data.versionNumber,
        archivedAt: v1Data.archivedAt,
        archivedBy: v1Data.archivedBy,
        changeReason: v1Data.changeReason,
      },
      v2: {
        versionNumber: v2Data.versionNumber,
        archivedAt: v2Data.archivedAt,
        archivedBy: v2Data.archivedBy,
        changeReason: v2Data.changeReason,
      },
    },
    // This is a simplistic diff - a real implementation would have more sophisticated logic
    changes: findChanges(
      v1Data.versionData?.formData,
      v2Data.versionData?.formData
    ),
    metadataChanges: findChanges(
      v1Data.versionData?.formData?.metadata,
      v2Data.versionData?.formData?.metadata
    ),
    statusChanges: v1Data.versionData?.status !== v2Data.versionData?.status,
    notesChanges: {
      internNotes:
        v1Data.versionData?.internNotes !== v2Data.versionData?.internNotes,
      adminNotes:
        v1Data.versionData?.adminNotes !== v2Data.versionData?.adminNotes,
      feedbackNotes:
        v1Data.versionData?.feedbackNotes !== v2Data.versionData?.feedbackNotes,
    },
  };
}

/**
 * Helper to find changes between two objects (simplified version)
 */
function findChanges(objA: any, objB: any) {
  if (!objA || !objB) return { fullChange: true };

  const changes: Record<string, any> = {};

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(objA || {}),
    ...Object.keys(objB || {}),
  ]);

  for (const key of allKeys) {
    // If key doesn't exist in one of the objects
    if (!(key in objA) || !(key in objB)) {
      changes[key] = {
        added: !(key in objA) && key in objB,
        removed: key in objA && !(key in objB),
        oldValue: objA?.[key],
        newValue: objB?.[key],
      };
      continue;
    }

    // If values are different
    if (JSON.stringify(objA[key]) !== JSON.stringify(objB[key])) {
      changes[key] = {
        changed: true,
        oldValue: objA[key],
        newValue: objB[key],
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
