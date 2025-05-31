// Utilities for exporting and processing training data
import { getTrainingDataSubmissions } from "./training-data-utils";

interface ExportOptions {
  format: "json" | "csv";
  includeMetadata: boolean;
  onlyApproved: boolean;
  limit?: number;
  anonymize?: boolean;
}

/**
 * Exports form data in a format suitable for training ML models
 */
export async function exportFormDataForTraining({
  format = "json",
  includeMetadata = true,
  onlyApproved = true,
  limit,
  anonymize = false,
}: ExportOptions) {
  // Get the raw submissions
  const submissions = await getTrainingDataSubmissions({
    onlyApproved,
    includeMetadata,
    limit,
  });

  // Process submissions based on format
  if (format === "json") {
    return formatAsJson(submissions, anonymize);
  } else if (format === "csv") {
    return formatAsCsv(submissions, anonymize);
  }

  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Format submissions as JSON for training
 */
function formatAsJson(submissions: any[], anonymize: boolean) {
  // Process the data to make it suitable for training
  const processedData = submissions.map((submission) => {
    // Create a clean data record for training
    const trainRecord = {
      id: submission.id,
      form_data: submission.clean_data || submission.formData,
      metadata: includeTrainingMetadata(submission, anonymize),
      quality_metrics: extractQualityMetrics(submission),
      timestamp: formatTimestamp(submission.createdAt || new Date()),
    };

    return trainRecord;
  });

  return JSON.stringify(processedData, null, 2);
}

/**
 * Format submissions as CSV for training (simplified)
 */
function formatAsCsv(submissions: any[], anonymize: boolean) {
  // Implementation would flatten the nested structure for CSV
  throw new Error("CSV export not yet implemented");
}

/**
 * Include relevant metadata for training
 */
function includeTrainingMetadata(submission: any, anonymize: boolean) {
  const metadata =
    submission.training_metadata || submission.formData?.metadata || {};

  // If anonymizing, remove personally identifiable fields
  if (anonymize) {
    return {
      created_at: metadata.created_at || submission.createdAt,
      updated_at: metadata.updated_at || submission.updatedAt,
      version: metadata.version || 1,
      admin_approved:
        metadata.admin_approved || submission.adminApproved || false,
      data_quality: metadata.data_quality || {},
      // Replace personal identifiers with anonymous IDs
      intern_id: metadata.intern_id ? hashId(metadata.intern_id) : "anonymous",
      approved_by: metadata.approved_by
        ? hashId(metadata.approved_by)
        : undefined,
    };
  }

  return metadata;
}

/**
 * Extract quality metrics for the dataset
 */
function extractQualityMetrics(submission: any) {
  const metadata =
    submission.training_metadata || submission.formData?.metadata || {};

  return {
    quality_score: submission.qualityScore || metadata.quality_score || null,
    completeness: metadata.data_quality?.completeness || null,
    verified: metadata.data_quality?.verified || false,
    approved: submission.adminApproved || metadata.admin_approved || false,
    version: metadata.version || 1,
  };
}

/**
 * Format a timestamp to ISO string
 */
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Simple hash function for anonymizing IDs
 */
function hashId(id: string): string {
  // This is a simplified hash for demo purposes
  // In production, use a proper hashing function
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `anon_${Math.abs(hash).toString(16)}`;
}
