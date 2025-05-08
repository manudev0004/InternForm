"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Exam } from '@/types';

const DUMMY_EXAMS: Exam[] = [
  {
    id: '1',
    mainExam: 'UPSC Civil Services',
    examCode: 'UPSC_CSE_2025',
    subExams: ['IAS', 'IPS', 'IFS'],
    conductedBy: 'UPSC',
    examSector: 'Civil Services',
    status: 'active',
    version: 3,
    effectiveDate: new Date(),
    dataSourceLink: 'https://example.com',
    internNote: 'Sample note',
    filledBy: 'intern1',
    reviewStatus: 'Approved',
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
  {
    id: '2',
    mainExam: 'SSC CGL',
    examCode: 'SSC_CGL_2024',
    subExams: [],
    conductedBy: 'SSC',
    examSector: 'General Competitive',
    status: 'approved',
    version: 2,
    effectiveDate: new Date(),
    dataSourceLink: 'https://example.com',
    internNote: 'Another sample note',
    filledBy: 'intern2',
    reviewStatus: 'Approved',
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
  {
    id: '3',
    mainExam: 'IBPS PO',
    examCode: 'IBPS_PO_2024',
    subExams: [],
    conductedBy: 'IBPS',
    examSector: 'Banking',
    status: 'rejected',
    version: 1,
    effectiveDate: new Date(),
    dataSourceLink: 'https://example.com',
    internNote: 'Yet another sample note',
    filledBy: 'intern3',
    reviewStatus: 'Approved',
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
];

export default function GuestDashboard() {
  // Filter exams to only show approved ones for guests
  const approvedExams = DUMMY_EXAMS.filter(exam => exam.reviewStatus === 'Approved');

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Guest Dashboard</CardTitle>
          <CardDescription>Read-only view of submitted and reviewed exams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableCaption>List of submitted and reviewed exams.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Exam Name</TableHead>
                  <TableHead className="w-[150px]">Conducting Body</TableHead>
                  <TableHead className="w-[150px]">Exam Level</TableHead>
                  <TableHead className="w-[150px]">Category</TableHead>
                  <TableHead className="w-[150px]">Filled By</TableHead>
                  <TableHead className="w-[150px]">Review Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.mainExam}</TableCell>
                    <TableCell>{exam.conductedBy}</TableCell>
                    <TableCell>{exam.examSector}</TableCell>
                     <TableCell>{exam.examSector}</TableCell>
                    <TableCell>{exam.filledBy || 'N/A'}</TableCell>
                    <TableCell>{exam.reviewStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
