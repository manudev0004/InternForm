export type Exam = {
  id: string;
  mainExam: string;
  examCode: string;
  subExams?: string[];
  conductedBy: string;
  examSector: string;
  applicationPeriodStart: Date;
  applicationPeriodEnd: Date;
  status: 'active' | 'draft' | 'archived'; // Removed approved and rejected. Review status controls approval.
  version: number;
  effectiveDate: Date;
  eligibilityCriteria?: string[];
  dataSourceLink: string;
  internNote: string;
  filledBy?: string;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected';
};

export type User = {
  id: string;
  email: string;
  role: 'admin' | 'intern' | 'guest';
  assignedExams: string[];
};
