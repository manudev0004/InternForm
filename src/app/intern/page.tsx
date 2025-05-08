"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firebaseApp, db } from '@/lib/firebase';
import { Exam } from '@/types';
import { useRouter } from 'next/navigation';
import { updateDoc, query, where } from 'firebase/firestore';

export default function InternDashboard() {
  const { user } = useAuth();
  const [assignedExams, setAssignedExams] = useState<(Exam & { dueDate?: string, completed?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleViewExam = (exam: Exam & { dueDate?: string, completed?: boolean }) => {
    router.push(`/intern/${exam.id}`);
  };

  // Mark exam as complete
  const handleMarkComplete = async (examId: string) => {
    if (!user || !db) return;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user.email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return;
    const userDocRef = querySnapshot.docs[0].ref;
    const userData = querySnapshot.docs[0].data();
    const assignedExamsArr = userData.assignedExams || [];
    const updatedAssignedExams = assignedExamsArr.map((assignment: any) =>
      (assignment.id || assignment.examId || assignment) === examId
        ? { ...assignment, completed: true }
        : assignment
    );
    await updateDoc(userDocRef, { assignedExams: updatedAssignedExams });
    setAssignedExams(prev => prev.map(exam => exam.id === examId ? { ...exam, completed: true } : exam));
  };

  useEffect(() => {
    const fetchAssignedExams = async () => {
      if (!user || !db) {
        setIsLoading(false);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDocSnapshot = querySnapshot.docs[0];
          const userData = userDocSnapshot.data();
          // assignedExams: [{id: string, dueDate: string, completed: boolean}]
          const assignedExamsArr = userData.assignedExams || [];

          const examsCollection = collection(db, 'exams');
          const examPromises = assignedExamsArr.map(async (assignment: any) => {
            const examDocRef = doc(examsCollection, assignment.id || assignment.examId || assignment);
            const examDocSnapshot = await getDoc(examDocRef);
            if (examDocSnapshot.exists()) {
              return {
                id: examDocSnapshot.id,
                ...examDocSnapshot.data(),
                dueDate: assignment.dueDate || null,
                completed: assignment.completed || false
              } as Exam & { dueDate?: string, completed?: boolean };
            } else {
              console.warn(`Exam not found with ID: ${assignment.id || assignment}`);
              return null;
            }
          });

          const resolvedExams = await Promise.all(examPromises);
          const validExams = resolvedExams.filter(exam => exam !== null) as (Exam & { dueDate?: string, completed?: boolean })[];
          setAssignedExams(validExams);
        } else {
          console.warn(`User not found with email: ${user.email}`);
          setAssignedExams([]);
        }
      } catch (error) {
        console.error('Error fetching assigned exams:', error);
        setAssignedExams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedExams();
  }, [user, db]);

  if (isLoading) {
    return <div className="container mx-auto py-10">Loading assigned exams...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Intern Dashboard</CardTitle>
          <CardDescription>Your assigned exams are listed below.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedExams.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Exam Name</TableHead>
                    <TableHead className="w-[150px]">Conducting Body</TableHead>
                    <TableHead className="w-[150px]">Exam Sector</TableHead>
                    <TableHead className="w-[150px]">Review Status</TableHead>
                    <TableHead className="w-[150px]">Deadline</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.mainExam}</TableCell>
                      <TableCell>{exam.conductedBy}</TableCell>
                      <TableCell>{exam.examSector}</TableCell>
                      <TableCell>{exam.reviewStatus}</TableCell>
                      <TableCell>{exam.dueDate ? new Date(exam.dueDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{exam.completed ? 'Completed' : 'Pending'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewExam(exam)}>
                          Fill Data
                        </Button>
                        {!exam.completed && (
                          <Button variant="default" size="sm" style={{ marginLeft: 8 }} onClick={() => handleMarkComplete(exam.id)}>
                            Mark as Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No exams have been assigned to you yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
