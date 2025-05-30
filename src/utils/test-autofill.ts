/**
 * Simple test for auto-fill functionality
 */

import { getAutoFilledFormValues, ExamAssignment } from '@/services/exam-autofill';

export async function testAutoFill() {
  console.log('Testing auto-fill functionality...');
  
  try {
    const testAssignment: ExamAssignment = {
      examId: '1', // SSC Exams
      subExamId: '1', // SSC GD Constable
      internIds: ['test@example.com'],
      dueDate: new Date(),
      assignedBy: 'admin'
    };

    console.log('Test assignment:', testAssignment);
    
    const result = await getAutoFilledFormValues(testAssignment);
    console.log('Auto-fill result:', result);
    
    return result;
  } catch (error) {
    console.error('Auto-fill test failed:', error);
    return null;
  }
}

// Test function to verify exam data loading
export function testExamDataLoad() {
  try {
    // This will be imported in the browser environment - using dynamic import for client-side
    console.log('Attempting to load exam data...');
    // For now, just return a message since we can test through the auto-fill service
    return { message: 'Use auto-fill service to test data loading' };
  } catch (error) {
    console.error('Failed to load exam data:', error);
    return null;
  }
}
