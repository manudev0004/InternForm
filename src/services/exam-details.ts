/**
 * Represents the basic information for an exam.
 */
export interface ExamDetails {
  /**
   * The level of the exam (e.g., National, State, Institutional).
   */
  examLevel: string;
  /**
   * The category of the exam (e.g., Defense, Banking, Civil Services).
   */
  category: string;
}

/**
 * Asynchronously retrieves exam details based on the exam name and conducting body.
 *
 * @param examName The name of the exam.
 * @param conductingBody The body conducting the exam.
 * @returns A promise that resolves to an ExamDetails object containing exam level and category.
 */
export async function getExamDetails(
  examName: string,
  conductingBody: string
): Promise<ExamDetails> {
  // TODO: Implement this by calling an API.
  return {
    examLevel: 'National',
    category: 'Civil Services',
  };
}
