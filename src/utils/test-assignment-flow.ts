/**
 * Test utility to verify the complete assignment flow
 */

import { parseExamAssignment, getAutoFillStrategy } from '../services/exam-assignment-parser';
import { getAutoFilledFormValues } from '../services/exam-autofill';

interface TestAssignment {
  mainExamId: string;
  subExamId: string;
  expectedMainExamName: string;
  expectedSubExamName: string;
  expectedCode: string;
}

// Test cases based on Exams.json structure
const testAssignments: TestAssignment[] = [
  {
    mainExamId: "1",
    subExamId: "1-1", // SSC Exams -> SSC GD Constable
    expectedMainExamName: "SSC Exams",
    expectedSubExamName: "SSC GD Constable",
    expectedCode: "SSC-GDC"
  },
  {
    mainExamId: "2",
    subExamId: "2-3", // Banking Exams -> IBPS PO (id=3 in banking)
    expectedMainExamName: "Banking Exams", 
    expectedSubExamName: "IBPS PO",
    expectedCode: "BNK-IBPSPO"
  },
  {
    mainExamId: "3",
    subExamId: "3-1", // Civil services Exams -> UPSC Civil Services
    expectedMainExamName: "Civil services Exams",
    expectedSubExamName: "UPSC Civil Services", 
    expectedCode: "CSE-UPSCCS"
  }
];

export async function testAssignmentFlow(): Promise<void> {
  console.log('🧪 Testing Assignment Flow...\n');

  for (const testCase of testAssignments) {
    console.log(`📝 Testing assignment: ${testCase.subExamId}`);
    
    // Test parsing
    const parsed = parseExamAssignment(testCase.subExamId);
    console.log('Parsed:', parsed);
    
    // Test strategy
    const strategy = getAutoFillStrategy(testCase.subExamId);
    console.log('Strategy:', strategy);
    
    // Test auto-fill
    const examAssignment = {
      examId: testCase.mainExamId,
      subExamId: testCase.subExamId,
      internIds: ['test@example.com'],
      dueDate: new Date(),
      assignedBy: 'admin'
    };
    
    const autoFillData = await getAutoFilledFormValues(examAssignment);
    
    if (autoFillData) {
      console.log('✅ Auto-fill successful!');
      console.log(`   Main Exam: ${autoFillData.main_exam_name} (expected: ${testCase.expectedMainExamName})`);
      
      if (autoFillData.subExams && autoFillData.subExams.length > 0) {
        console.log(`   Sub Exam: ${autoFillData.subExams[0].sub_exam_name} (expected: ${testCase.expectedSubExamName})`);
        console.log(`   Code: ${autoFillData.subExams[0].short_code} (expected: ${testCase.expectedCode})`);
      }
      
      // Verify results
      const mainExamMatch = autoFillData.main_exam_name === testCase.expectedMainExamName;
      const subExamMatch = autoFillData.subExams?.[0]?.sub_exam_name === testCase.expectedSubExamName;
      const codeMatch = autoFillData.subExams?.[0]?.short_code === testCase.expectedCode;
      
      if (mainExamMatch && subExamMatch && codeMatch) {
        console.log('✅ All fields match expected values!');
      } else {
        console.log('❌ Some fields do not match expected values');
      }
    } else {
      console.log('❌ Auto-fill failed');
    }
    
    console.log('---\n');
  }
  
  console.log('🎉 Assignment flow testing complete!');
}

// Simulate the complete workflow from admin assignment to intern form
export async function simulateCompleteWorkflow(): Promise<void> {
  console.log('🔄 Simulating Complete Workflow...\n');
  
  // 1. Admin assigns exam (simulated)
  console.log('1️⃣ Admin assigns exam:');
  const assignmentData = {
    mainExamId: "1", // SSC Exams
    subExamId: "1-1", // SSC GD Constable 
    internEmail: "intern@example.com",
    dueDate: new Date('2025-07-15'),
    notes: JSON.stringify({
      mainExamName: "SSC Exams",
      subExamName: "SSC GD Constable",
      subExamCode: "SSC-GDC"
    })
  };
  console.log('   Assignment created:', assignmentData);
  
  // 2. Intern opens dashboard and sees assignment
  console.log('\n2️⃣ Intern sees assignment on dashboard');
  console.log('   Assignment visible with "Fill Exam Form" button');
  
  // 3. Intern clicks "Fill Exam Form" - navigates to /intern/1-1
  console.log('\n3️⃣ Intern clicks "Fill Exam Form"');
  console.log('   Navigation to: /intern/1-1');
  
  // 4. Auto-fill triggers
  console.log('\n4️⃣ Auto-fill triggers:');
  const examAssignment = {
    examId: "1",
    subExamId: "1-1", 
    internIds: ["intern@example.com"],
    dueDate: new Date('2025-07-15'),
    assignedBy: 'admin'
  };
  
  const autoFillData = await getAutoFilledFormValues(examAssignment);
  
  if (autoFillData) {
    console.log('✅ Form auto-filled successfully!');
    console.log(`   Main Exam Name: ${autoFillData.main_exam_name}`);
    console.log(`   Exam Code: ${autoFillData.exam_code}`);
    console.log(`   Conducting Body: ${autoFillData.conducting_body}`);
    console.log(`   Exam Sector: ${autoFillData.exam_sector}`);
    
    if (autoFillData.subExams && autoFillData.subExams.length > 0) {
      console.log(`   Sub Exam Name: ${autoFillData.subExams[0].sub_exam_name}`);
      console.log(`   Sub Exam Code: ${autoFillData.subExams[0].short_code}`);
    }
  } else {
    console.log('❌ Auto-fill failed');
  }
  
  console.log('\n🎯 Complete workflow simulation finished!');
}
