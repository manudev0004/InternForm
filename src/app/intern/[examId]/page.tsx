"use client";

import { useParams } from 'next/navigation';
import ExamForm from '@/components/exam-form';

export default function ExamAssignmentPage() {
  const params = useParams();
  const examId = params.examId;
  if (!examId) return <div className="container mx-auto py-10">No exam selected.</div>;
  return <ExamForm examId={examId} />;
}
