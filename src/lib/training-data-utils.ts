// Utilities for handling training data from exam form submissions
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { firebaseApp, db as importedDb } from "./firebase";

// Use imported db first, or initialize if it's not available
const db = importedDb || (firebaseApp ? getFirestore(firebaseApp) : null);

interface TrainingDataOptions {
  onlyApproved?: boolean;
  limit?: number;
  includeMetadata?: boolean;
}

interface TrainingDataSubmission {
  id: string;
  formData: any;
  createdAt?: any;
  updatedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  adminNotes?: string;
  feedbackNotes?: string;
  reviewNotes?: string;
  qualityScore?: number;
  status?: string;
  [key: string]: any;
}

interface TrainingDataExport {
  form_data: any;
  metadata: any;
  quality: any;
  timestamp: string;
}

/**
 * Retrieves submissions formatted for training data purposes
 */
export async function getTrainingDataSubmissions(
  options?: TrainingDataOptions
) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  // Default collection is finalSubmissions for approved data, or can query from submissions
  const collectionRef = collection(
    db,
    options?.onlyApproved ? "finalSubmissions" : "submissions"
  );

  // Create the query
  let queryRef: any = collectionRef;

  // If only approved submissions are requested and we're querying from submissions
  if (options?.onlyApproved && !options.onlyApproved) {
    queryRef = query(collectionRef, where("adminApproved", "==", true));
  }

  const snap = await getDocs(queryRef);
  const submissions: TrainingDataSubmission[] = snap.docs.map((doc) => {
    const data = doc.data() as TrainingDataSubmission;
    return {
      ...data,
      id: doc.id,
    };
  });

  // Process submissions for training format
  const processedSubmissions = submissions.map((submission) => {
    return {
      ...submission,
      // If metadata should be included separately
      training_metadata: options?.includeMetadata
        ? {
            created_at: submission.createdAt,
            updated_at: submission.updatedAt,
            approved_at: submission.approvedAt,
            approved_by: submission.approvedBy,
            quality_score: submission.qualityScore,
            admin_notes: submission.adminNotes,
            feedback_notes: submission.feedbackNotes,
            review_notes: submission.reviewNotes,
            version: submission.formData?.metadata?.version || 1,
            data_quality: submission.formData?.metadata?.data_quality || {},
          }
        : undefined,
      // Get a clean version of the form data without metadata
      clean_data: options?.includeMetadata
        ? (() => {
            const cleanData = { ...submission.formData };
            if (cleanData.metadata) delete cleanData.metadata;
            return cleanData;
          })()
        : undefined,
    };
  });

  // Apply limit if provided
  if (options?.limit && options.limit > 0) {
    return processedSubmissions.slice(0, options.limit);
  }

  return processedSubmissions;
}

/**
 * Exports training data in JSON or CSV format
 */
export async function exportTrainingData(format: "json" | "csv" = "json") {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  const approvedSubmissions = await getTrainingDataSubmissions({
    onlyApproved: true,
    includeMetadata: true,
  });

  // Format training data for ML consumption
  const trainingData: TrainingDataExport[] = approvedSubmissions.map(
    (submission) => {
      // Get timestamp properly from Firebase Timestamp
      const timestamp = submission.approvedAt
        ? typeof submission.approvedAt.toDate === "function"
          ? submission.approvedAt.toDate().toISOString()
          : new Date().toISOString()
        : new Date().toISOString();

      // Structure the data in a format suitable for ML training
      return {
        form_data: submission.clean_data,
        metadata: submission.training_metadata,
        quality: submission.formData?.metadata?.data_quality || {},
        timestamp: timestamp,
      };
    }
  );

  if (format === "csv") {
    // Implementation for CSV formatting would go here
    throw new Error("CSV export not yet implemented");
  }

  return trainingData;
}

/**
 * Gets a specific submission by ID with enhanced data for training purposes
 */
export async function getTrainingSubmissionById(submissionId: string) {
  if (!db) throw new Error("Firebase Firestore is not initialized");

  // Try to fetch from finalSubmissions first (approved)
  let snap = await getDoc(doc(db, "finalSubmissions", submissionId));

  // If not found in finalSubmissions, try the regular submissions
  if (!snap.exists()) {
    snap = await getDoc(doc(db, "submissions", submissionId));
  }

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as TrainingDataSubmission;
  return {
    ...data,
    id: submissionId,
    // Extract and process training-specific metadata
    training_metadata: {
      created_at: data.createdAt,
      updated_at: data.updatedAt,
      approved_at: data.approvedAt,
      approved_by: data.approvedBy,
      quality_score: data.qualityScore,
      admin_notes: data.adminNotes,
      feedback_notes: data.feedbackNotes,
      review_notes: data.reviewNotes,
      version: data.formData?.metadata?.version || 1,
      data_quality: data.formData?.metadata?.data_quality || {},
    },
  };
}
