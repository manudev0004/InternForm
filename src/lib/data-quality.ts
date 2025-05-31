// Data quality and statistics utilities for training data
import { getTrainingDataSubmissions } from "./training-data-utils";

/**
 * Interface for data quality statistics
 */
interface DataQualityStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  averageQualityScore: number | null;
  completenessRate: number;
  versionStats: {
    averageVersions: number;
    maxVersions: number;
  };
  fieldStats: {
    [key: string]: {
      fillRate: number;
      nullRate: number;
      uniqueValues: number;
    };
  };
  submissionTrends: {
    byDay: { [key: string]: number };
    byWeek: { [key: string]: number };
  };
}

/**
 * Generate comprehensive statistics about the training data quality
 */
export async function generateDataQualityStats(): Promise<DataQualityStats> {
  // Get all submissions including pending ones
  const allSubmissions = await getTrainingDataSubmissions({
    onlyApproved: false,
    includeMetadata: true,
  });

  // Get only approved submissions
  const approvedSubmissions = allSubmissions.filter(
    (sub) =>
      sub.training_metadata?.approved_at ||
      sub.training_metadata?.approved_by ||
      sub.formData?.metadata?.admin_approved
  );

  // Calculate basic statistics
  const totalSubmissions = allSubmissions.length;
  const approvedCount = approvedSubmissions.length;
  const pendingCount = totalSubmissions - approvedCount;

  // Calculate quality scores
  const qualityScores = allSubmissions
    .map((sub) => sub.qualityScore || sub.formData?.metadata?.quality_score)
    .filter((score) => score !== null && score !== undefined) as number[];

  const averageQualityScore =
    qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) /
        qualityScores.length
      : null;

  // Calculate completeness
  const completenessValues = allSubmissions
    .map((sub) => calculateCompleteness(sub))
    .filter(Boolean) as number[];

  const completenessRate =
    completenessValues.length > 0
      ? completenessValues.reduce((sum, rate) => sum + rate, 0) /
        completenessValues.length
      : 0;

  // Calculate version statistics
  const versions = allSubmissions.map(
    (sub) => sub.formData?.metadata?.version || 1
  );

  const averageVersions =
    versions.reduce((sum, v) => sum + v, 0) / versions.length;
  const maxVersions = Math.max(...versions);

  // Calculate field statistics
  const fieldStats = calculateFieldStats(allSubmissions);

  // Calculate submission trends
  const submissionTrends = calculateSubmissionTrends(allSubmissions);

  return {
    totalSubmissions,
    approvedSubmissions: approvedCount,
    pendingSubmissions: pendingCount,
    averageQualityScore,
    completenessRate,
    versionStats: {
      averageVersions,
      maxVersions,
    },
    fieldStats,
    submissionTrends,
  };
}

/**
 * Calculate completeness ratio for a submission
 */
function calculateCompleteness(submission: any): number | null {
  const formData = submission.clean_data || submission.formData;
  if (!formData) return null;

  // Remove metadata from consideration
  const { metadata, ...cleanData } = formData;

  // Count fields recursively
  const { totalFields, filledFields } = countFields(cleanData);

  return totalFields > 0 ? filledFields / totalFields : 0;
}

/**
 * Count total fields and filled fields recursively
 */
function countFields(obj: any): { totalFields: number; filledFields: number } {
  if (!obj || typeof obj !== "object") {
    return {
      totalFields: 1,
      filledFields: obj !== null && obj !== undefined && obj !== "" ? 1 : 0,
    };
  }

  if (Array.isArray(obj)) {
    // For arrays, count each element
    return obj.reduce(
      (acc, item) => {
        const { totalFields, filledFields } = countFields(item);
        return {
          totalFields: acc.totalFields + totalFields,
          filledFields: acc.filledFields + filledFields,
        };
      },
      { totalFields: 0, filledFields: 0 }
    );
  }

  // For objects, count each property
  return Object.entries(obj).reduce(
    (acc, [, value]) => {
      const { totalFields, filledFields } = countFields(value);
      return {
        totalFields: acc.totalFields + totalFields,
        filledFields: acc.filledFields + filledFields,
      };
    },
    { totalFields: 0, filledFields: 0 }
  );
}

/**
 * Calculate statistics for each field in the form data
 */
function calculateFieldStats(submissions: any[]) {
  const fieldCounts: Record<
    string,
    {
      total: number;
      nullCount: number;
      values: Set<string>;
    }
  > = {};

  // Process each submission
  submissions.forEach((sub) => {
    const formData = sub.clean_data || sub.formData;
    if (!formData) return;

    // Extract field paths and values
    collectFieldPaths(formData, "", (path, value) => {
      if (!fieldCounts[path]) {
        fieldCounts[path] = { total: 0, nullCount: 0, values: new Set() };
      }

      fieldCounts[path].total++;

      if (value === null || value === undefined || value === "") {
        fieldCounts[path].nullCount++;
      } else {
        // Store unique string representation of value
        fieldCounts[path].values.add(
          typeof value === "object" ? JSON.stringify(value) : String(value)
        );
      }
    });
  });

  // Calculate statistics for each field
  const fieldStats: Record<string, any> = {};

  Object.entries(fieldCounts).forEach(([path, stats]) => {
    fieldStats[path] = {
      fillRate:
        stats.total > 0 ? (stats.total - stats.nullCount) / stats.total : 0,
      nullRate: stats.total > 0 ? stats.nullCount / stats.total : 0,
      uniqueValues: stats.values.size,
    };
  });

  return fieldStats;
}

/**
 * Collect all field paths and values from form data
 */
function collectFieldPaths(
  obj: any,
  prefix: string,
  callback: (path: string, value: any) => void
) {
  if (!obj || typeof obj !== "object") {
    callback(prefix, obj);
    return;
  }

  if (Array.isArray(obj)) {
    // For arrays, include the index in the path
    obj.forEach((item, index) => {
      const newPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      collectFieldPaths(item, newPrefix, callback);
    });
    return;
  }

  // For objects, include the key in the path
  Object.entries(obj).forEach(([key, value]) => {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    collectFieldPaths(value, newPrefix, callback);
  });
}

/**
 * Calculate submission trends by day and week
 */
function calculateSubmissionTrends(submissions: any[]) {
  const byDay: Record<string, number> = {};
  const byWeek: Record<string, number> = {};

  submissions.forEach((sub) => {
    const timestamp = sub.createdAt || sub.formData?.metadata?.created_at;
    if (!timestamp) return;

    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    // Format as YYYY-MM-DD
    const dayKey = date.toISOString().split("T")[0];
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;

    // Calculate week number (simplified)
    const weekNum = Math.floor(date.getDate() / 7);
    const weekKey = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-W${weekNum}`;
    byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
  });

  return { byDay, byWeek };
}
