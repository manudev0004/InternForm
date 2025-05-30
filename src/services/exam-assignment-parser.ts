/**
 * Service for managing exam assignments and determining what should be auto-filled
 */

export interface ExamAssignmentDetails {
  assignmentId: string;
  internEmail: string;
  mainExamId: string;
  subExamId?: string;
  specificTask?: 'complete_form' | 'verify_data' | 'update_requirements';
  dueDate: Date;
  assignedBy: string;
  instructions?: string;
}

/**
 * Parse examId from URL to determine assignment type
 * Formats supported:
 * - "1" = Main exam 1, no specific sub-exam (fill main info only)
 * - "1-5" = Main exam 1, specific sub-exam 5 (fill main + that sub-exam)
 * - "assignment-abc123" = Specific assignment ID (fetch from database)
 */
export function parseExamAssignment(examId: string): {
  mainExamId: string;
  subExamId?: string;
  assignmentId?: string;
  assignmentType: 'main_only' | 'specific_subexam' | 'assignment_based';
} {
  // Check if it's an assignment ID format
  if (examId.startsWith('assignment-')) {
    return {
      mainExamId: '',
      assignmentId: examId,
      assignmentType: 'assignment_based'
    };
  }

  // Check if it contains a sub-exam indicator
  if (examId.includes('-')) {
    const [mainId, subId] = examId.split('-');
    return {
      mainExamId: mainId,
      subExamId: subId,
      assignmentType: 'specific_subexam'
    };
  }

  // Just a main exam ID
  return {
    mainExamId: examId,
    assignmentType: 'main_only'
  };
}

/**
 * Get assignment details (mock implementation - would fetch from database in real app)
 */
export async function getAssignmentDetails(assignmentId: string): Promise<ExamAssignmentDetails | null> {
  // Mock implementation - in a real app, this would fetch from Firestore/database
  try {
    console.log(`Fetching assignment details for: ${assignmentId}`);
    
    // Simulate database lookup
    const mockAssignments: Record<string, ExamAssignmentDetails> = {
      'assignment-ssc-gd-001': {
        assignmentId: 'assignment-ssc-gd-001',
        internEmail: 'intern@example.com',
        mainExamId: '1',
        subExamId: '1',
        specificTask: 'complete_form',
        dueDate: new Date('2025-06-15'),
        assignedBy: 'admin@example.com',
        instructions: 'Complete the SSC GD Constable exam form with all eligibility criteria'
      },
      'assignment-banking-po-002': {
        assignmentId: 'assignment-banking-po-002',
        internEmail: 'intern@example.com',
        mainExamId: '2',
        subExamId: '3',
        specificTask: 'verify_data',
        dueDate: new Date('2025-06-20'),
        assignedBy: 'admin@example.com',
        instructions: 'Verify and update the Banking PO exam requirements'
      }
    };

    return mockAssignments[assignmentId] || null;
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return null;
  }
}

/**
 * Determine what data should be auto-filled based on assignment
 */
export function getAutoFillStrategy(examId: string): {
  shouldFillMainExam: boolean;
  shouldFillSubExams: boolean;
  specificSubExamOnly: boolean;
  subExamId?: string;
} {
  const parsed = parseExamAssignment(examId);

  switch (parsed.assignmentType) {
    case 'main_only':
      return {
        shouldFillMainExam: true,
        shouldFillSubExams: false,
        specificSubExamOnly: false
      };

    case 'specific_subexam':
      return {
        shouldFillMainExam: true,
        shouldFillSubExams: true,
        specificSubExamOnly: true,
        subExamId: parsed.subExamId
      };

    case 'assignment_based':
      // This would fetch assignment details and determine strategy
      return {
        shouldFillMainExam: true,
        shouldFillSubExams: true,
        specificSubExamOnly: true
      };

    default:
      return {
        shouldFillMainExam: false,
        shouldFillSubExams: false,
        specificSubExamOnly: false
      };
  }
}
