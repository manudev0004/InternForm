/**
 * @fileOverview Auto-fill service for intern exam forms.
 * 
 * This service maps exam assignments to pre-populate form fields with relevant data
 * from Exams.json when interns open their assigned exam forms.
 */

import examsData from '../../Exams.json';

export interface ExamAutoFillData {
  // Main exam information
  main_exam_name: string;
  exam_code: string;
  conducting_body: string;
  exam_sector: string;
  
  // Sub-exam information
  subExams: Array<{
    sub_exam_name: string;
    short_code: string;
  }>;
  
  // Additional metadata
  main_exam_id: number;
  sub_exam_id?: number;
}

export interface ExamAssignment {
  examId: string;
  subExamId?: string;
  internIds: string[];
  dueDate: Date;
  assignedBy: string;
}

/**
 * Maps exam sector codes to human-readable names
 */
const EXAM_SECTOR_MAP: Record<string, string> = {
  'SSC': 'Government - Staff Selection Commission',
  'Banking': 'Banking & Financial Services',
  'Civil Services': 'Civil Services',
  'Railway': 'Railway Services',
  'Defence': 'Defence Services',
  'Insurance': 'Insurance Sector',
  'Nursing': 'Healthcare - Nursing',
  'PG': 'Post Graduate Entrance',
  'Campus Placement': 'Campus Recruitment',
  'MBA': 'Management Entrance',
  'Accounting': 'Accounting & Finance',
  'Judiciary': 'Judicial Services',
  'Banking & Finance': 'Banking & Financial Services',
  'UG Entrance': 'Under Graduate Entrance'
};

/**
 * Maps exam codes to conducting bodies
 */
const CONDUCTING_BODY_MAP: Record<string, string> = {
  'SSC': 'Staff Selection Commission',
  'Banking': 'Institute of Banking Personnel Selection (IBPS)',
  'Civil Services': 'Union Public Service Commission (UPSC)',
  'Railway': 'Railway Recruitment Board (RRB)',
  'Defence': 'Ministry of Defence',
  'Insurance': 'National Insurance Academy',
  'Nursing': 'National Board of Examinations',
  'PG': 'National Testing Agency (NTA)',
  'Campus Placement': 'Various Organizations',
  'MBA': 'National Testing Agency (NTA)',
  'Accounting': 'Institute of Chartered Accountants of India (ICAI)',
  'Judiciary': 'High Court / Supreme Court',
  'Banking & Finance': 'Institute of Banking Personnel Selection (IBPS)',
  'UG Entrance': 'National Testing Agency (NTA)'
};

/**
 * Retrieves auto-fill data for a specific exam assignment
 * 
 * @param mainExamId - The main exam ID from the assignment
 * @param subExamId - Optional sub-exam ID from the assignment
 * @returns Auto-fill data or null if exam not found
 */
export async function getExamAutoFillData(
  mainExamId: string | number,
  subExamId?: string | number
): Promise<ExamAutoFillData | null> {
  try {
    const examIdNum = typeof mainExamId === 'string' ? parseInt(mainExamId) : mainExamId;
    
    // Find the main exam in the JSON data
    const mainExam = examsData.exams.find(exam => exam.id === examIdNum);
    
    if (!mainExam) {
      console.warn(`Main exam with ID ${examIdNum} not found in Exams.json`);
      return null;
    }

    // Prepare the auto-fill data
    const autoFillData: ExamAutoFillData = {
      main_exam_name: mainExam.name,
      exam_code: mainExam.code,
      conducting_body: CONDUCTING_BODY_MAP[mainExam.code] || 'Not Specified',
      exam_sector: EXAM_SECTOR_MAP[mainExam.code] || 'Other',
      main_exam_id: mainExam.id,
      subExams: []
    };

    // If a specific sub-exam is assigned, include only that sub-exam
    if (subExamId) {
      const subExamIdNum = typeof subExamId === 'string' ? parseInt(subExamId) : subExamId;
      const subExam = mainExam.sub_exams.find(sub => sub.id === subExamIdNum);
      
      if (subExam) {
        autoFillData.subExams = [{
          sub_exam_name: subExam.name,
          short_code: subExam.code
        }];
        autoFillData.sub_exam_id = subExam.id;
      }
    } else {
      // When no specific sub-exam is assigned, don't auto-fill sub-exams
      // Let the intern choose which sub-exam(s) they want to work on
      autoFillData.subExams = [];
      console.log('No specific sub-exam assigned. Main exam info auto-filled, sub-exams left for manual selection.');
    }

    return autoFillData;
  } catch (error) {
    console.error('Error retrieving exam auto-fill data:', error);
    return null;
  }
}

/**
 * Checks if an exam assignment should trigger auto-fill
 * 
 * @param examAssignment - The exam assignment data
 * @returns Boolean indicating if auto-fill should be applied
 */
export function shouldAutoFill(examAssignment: ExamAssignment): boolean {
  // Auto-fill should be applied if:
  // 1. The assignment has a valid examId
  // 2. The assignment is not expired (due date hasn't passed)
  
  if (!examAssignment.examId) {
    return false;
  }

  const now = new Date();
  const dueDate = new Date(examAssignment.dueDate);
  
  // Allow auto-fill even for overdue assignments (they might have extensions)
  return true;
}

/**
 * Gets default form values based on exam assignment
 * This function prepares the initial form state with auto-filled values
 * 
 * @param examAssignment - The exam assignment data
 * @returns Partial form values for auto-fill
 */
export async function getAutoFilledFormValues(
  examAssignment: ExamAssignment
): Promise<Partial<any> | null> {
  if (!shouldAutoFill(examAssignment)) {
    return null;
  }

  // Parse examId and subExamId from the assignment
  let mainExamId = examAssignment.examId;
  let subExamId = examAssignment.subExamId;

  // If subExamId is in format "mainId-subId", parse it
  if (subExamId && subExamId.includes('-')) {
    const [parsedMainId, parsedSubId] = subExamId.split('-');
    mainExamId = parsedMainId;
    subExamId = parsedSubId;
  }

  const autoFillData = await getExamAutoFillData(mainExamId, subExamId);

  if (!autoFillData) {
    return null;
  }

  // Map auto-fill data to form field structure
  const formValues: Partial<any> = {
    // Main exam information
    main_exam_name: autoFillData.main_exam_name,
    exam_code: autoFillData.exam_code,
    conducting_body: autoFillData.conducting_body,
    exam_sector: autoFillData.exam_sector,
    
    // Sub-exams array
    subExams: autoFillData.subExams.map(subExam => ({
      sub_exam_name: subExam.sub_exam_name,
      short_code: subExam.short_code,
      // Initialize other fields with defaults
      gender: '',
      marital_status: '',
      pwd_eligible: false,
      has_age_limit: false,
      educationRequirements: []
    }))
  };

  return formValues;
}

/**
 * Utility function to get available exam options for dropdowns
 * 
 * @returns List of available main exams and their sub-exams
 */
export function getAvailableExamOptions() {
  return {
    mainExams: examsData.exams.map(exam => ({
      id: exam.id,
      name: exam.name,
      code: exam.code
    })),
    examSectors: Object.values(EXAM_SECTOR_MAP),
    conductingBodies: Object.values(CONDUCTING_BODY_MAP)
  };
}
