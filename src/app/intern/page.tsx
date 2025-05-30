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
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Assignment {
  id: string;
  examId: string;
  subExamId: string;
  internId: string;
  assignedBy: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  notes: {
    mainExamName: string;
    subExamName: string;
    subExamCode: string;
    formLink?: string;
  };
  mainExamName: string;
  subExamName: string;
  subExamCode: string;
  formLink?: string;
  createdAt: Date;
  lastUpdated?: Date;
}

async function getAssignmentsForIntern(userEmail: string) {
  try {
    // First, get the user document to find the intern's ID
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', userEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      console.warn('No user found with email:', userEmail);
      return [];
    }
    
    const userId = userSnapshot.docs[0].id;
    
    // Now fetch assignments for this user
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('internId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const assignmentsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to Date if needed
      dueDate: doc.data().dueDate?.toDate ? doc.data().dueDate.toDate() : doc.data().dueDate,
    }));
    
    console.log('Fetched assignments:', assignmentsData);

    // Parse notes if it's a string
    return assignmentsData.map((assignment: any) => {
      let notes = assignment.notes;
      if (typeof notes === 'string') {
        try {
          notes = JSON.parse(notes);
        } catch (e) {
          console.warn('Failed to parse notes:', e);
          notes = {};
        }
      } else if (!notes) {
        notes = {};
      }

      return {
        ...assignment,
        notes,
        mainExamName: assignment.mainExamName || notes.mainExamName || 'N/A',
        subExamName: assignment.subExamName || notes.subExamName || 'N/A',
        subExamCode: assignment.subExamCode || notes.subExamCode || 'N/A',
        status: assignment.status || 'pending',
      };
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

export default function InternDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const router = useRouter();

  const handleStatusChange = async (assignmentId: string, newStatus: Assignment['status']) => {
    if (!user?.email) return;
    
    try {
      const assignmentRef = doc(db, 'assignments', assignmentId);
      await updateDoc(assignmentRef, { 
        status: newStatus,
        lastUpdated: new Date()
      });
      
      setAssignments(prev => 
        prev.map(a => 
          a.id === assignmentId 
            ? { ...a, status: newStatus, lastUpdated: new Date() } 
            : a
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800',
    };
    
    const statusText = status.replace('-', ' ');
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {statusText}
      </span>
    );
  };

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        if (user?.email) {
          console.log('Fetching assignments for user email:', user.email);
          const assignmentsData = await getAssignmentsForIntern(user.email);
          console.log('Assignments data:', assignmentsData);
          setAssignments(assignmentsData);
        } else {
          console.warn('No user email found');
          setAssignments([]);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  if (isLoading) {
    return <div className="container mx-auto py-10">Loading your assignments...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Assignments</h1>
          <p className="text-muted-foreground">Manage your assigned exams and tasks</p>
        </div>
      </div>

      <div className="grid gap-6">
        {assignments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>Your active and upcoming tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          <div className="font-medium">{assignment.mainExamName}</div>
                          <div className="text-xs text-muted-foreground">{assignment.subExamCode}</div>
                        </TableCell>
                        <TableCell>{assignment.subExamName}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {assignment.dueDate ? format(assignment.dueDate, 'MMM d, yyyy') : 'No deadline'}
                          </div>
                          {assignment.dueDate && (
                            <div className={`text-xs ${new Date(assignment.dueDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {new Date(assignment.dueDate) < new Date() ? 'Overdue' : 'Due soon'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(assignment.status)}
                        </TableCell>
                        <TableCell className="text-sm">{assignment.assignedBy}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end space-x-2">
                            <select
                              className="text-xs p-1 border rounded"
                              value={assignment.status}
                              onChange={(e) => handleStatusChange(assignment.id, e.target.value as Assignment['status'])}
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <div className="flex flex-col space-y-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => router.push(`/intern/${assignment.subExamId}`)}
                                className="w-full"
                              >
                                Fill Exam Form
                              </Button>
                              {assignment.formLink && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => window.open(assignment.formLink, '_blank')}
                                  className="w-full"
                                >
                                  View Additional Resources
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={60}
                  height={60}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1={16} x2={8} y1={13} y2={13} />
                  <line x1={16} x2={8} y1={17} y2={17} />
                  <line x1={10} x2={8} y1={9} y2={9} />
                </svg>
                <h3 className="mt-4 text-lg font-semibold">No assignments yet</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  You don't have any assignments at this time. Check back later or contact your supervisor.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
