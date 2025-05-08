"use client";

import { useState, useEffect } from 'react';
import { getUsersByRole, addExam, addUser, updateUser, deleteUser, assignWork, addLog, getAllLogs, getAssignmentsForIntern, getAllExams } from '@/lib/firestore-utils';
import { LogEntry } from '@/lib/firebaseHelpers'; // for type only, adjust as needed

// Temporary stub for updateExam until implemented in firestore-utils
async function updateExam(examId: string, data: any) {
  // TODO: Implement updateExam in firestore-utils and use it here
  // For now, just log
  console.warn('updateExam not implemented yet', examId, data);
}

// All imports are correct for used components and hooks.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Exam, User } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ExamForm from '@/components/exam-form';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useAuth } from "@/components/auth/auth-provider";
import examList from '../../../Exams.json';

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
    reviewStatus: 'Pending',
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
    status: 'active',
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
    status: 'archived',
    version: 1,
    effectiveDate: new Date(),
    dataSourceLink: 'https://example.com',
    internNote: 'Yet another sample note',
    filledBy: 'intern3',
    reviewStatus: 'Rejected',
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
];

const DUMMY_USERS: User[] = [
  {
    id: 'admin1',
    email: 'admin@example.com',
    role: 'admin',
    assignedExams: [],
  },
  {
    id: 'intern1',
    email: 'intern@example.com',
    role: 'intern',
    assignedExams: ['1'],
  },
  {
    id: 'guest1',
    email: 'guest@example.com',
    role: 'guest',
    assignedExams: [],
  },
  {
    id: 'intern2',
    email: 'intern2@example.com',
    role: 'intern',
    assignedExams: ['2'],
  },
  {
    id: 'intern3',
    email: 'intern3@example.com',
    role: 'intern',
    assignedExams: ['3'],
  },
];

// Reusable component for displaying exam data in a table
function ExamTable({ exams, handleApproveReject, handleViewExam }: {
  exams: Exam[];
  handleApproveReject: (examId: string, status: 'Approved' | 'Rejected') => void;
  handleViewExam: (exam: Exam) => void;
}) {

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Exam Name</TableHead>
            <TableHead className="w-[150px]">Conducting Body</TableHead>
            <TableHead className="w-[150px]">Exam Level</TableHead>
            <TableHead className="w-[150px]">Category</TableHead>
            <TableHead className="w-[150px]">Filled By</TableHead>
            <TableHead className="w-[150px]">Review Status</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => (
            <TableRow key={exam.id}>
              <TableCell className="font-medium">{exam.mainExam}</TableCell>
              <TableCell>{exam.conductedBy}</TableCell>
              <TableCell>{exam.examSector}</TableCell>
              <TableCell>{exam.examSector}</TableCell>
              <TableCell>{exam.filledBy || 'N/A'}</TableCell>
              <TableCell>{exam.reviewStatus}</TableCell>
              <TableCell className="text-right">
                {exam.reviewStatus === 'Pending' && (
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleApproveReject(exam.id, 'Approved')}>
                      Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleApproveReject(exam.id, 'Rejected')}>
                      Reject
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => handleViewExam(exam)}>
                  <Edit className="mr-2 h-4 w-4" />
                  View/Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


function LogTable({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {(log.timestamp instanceof Date && !isNaN(log.timestamp.getTime()))
                  ? format(log.timestamp, 'PPP p')
                  : 'N/A'}
              </TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


export default function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Firestore Timestamp to JS Date
  const normalizeLogs = (rawLogs: any[]): LogEntry[] =>
    rawLogs.map(log => ({
      ...log,
      timestamp: log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
    }));

  // Helper: log action and refresh logs list
  const logAndRefresh = async (payload: { action: string; actorId: string; entityType: string; entityId: string; details: string }) => {
    try {
      await addLog(payload);
      console.log('addLog succeeded:', payload);
    } catch (error) {
      console.error('addLog failed:', error, payload);
      toast({ title: 'Logging failed', description: 'Could not save log entry.' });
      return;
    }
    try {
      const logsFromDb = await getAllLogs();
      setLogs(normalizeLogs(logsFromDb));
    } catch (error) {
      console.error('getAllLogs failed:', error);
    }
  };

  // Handler: Approve/Reject Exam
  const handleApproveReject = async (examId: string, status: 'Approved' | 'Rejected') => {
    await updateExam(examId, { reviewStatus: status });
    setExams(exams.map(exam => exam.id === examId ? { ...exam, reviewStatus: status } : exam));
    const affectedExam = exams.find(exam => exam.id === examId);
    if (affectedExam) {
      await logAndRefresh({
        action: `Exam ${status}`,
        actorId: user?.id || 'admin',
        entityType: 'exam',
        entityId: affectedExam.id,
        details: `Admin ${user?.email || 'unknown'} ${status.toLowerCase()} exam ${affectedExam.mainExam} (code: ${affectedExam.examCode})`
      });
    }
  };

  // Handler: Add User
  const handleAddUser = async () => {
    if (newEmail && !users.find(user => user.email === newEmail)) {
      const newUser: User = {
        id: `user${users.length + 1}`,
        email: newEmail,
        role: newRole,
        assignedExams: [],
      };
      await addUser(newUser);
      setUsers([...users, newUser]);
      setNewEmail('');
      await logAndRefresh({
        action: 'User Added',
        actorId: user?.id || 'admin',
        entityType: 'user',
        entityId: newUser.id,
        details: `Admin ${user?.email || 'unknown'} added user ${newUser.email} with role ${newUser.role}`
      });
    } else {
      alert('Please enter a valid unique email address.');
    }
  };

  // Handler: Change User Role
  const handleChangeRole = async (userId: string, newRole: 'admin' | 'intern' | 'guest') => {
    const updatedUser = users.find(user => user.id === userId);
    await updateUser(userId, { role: newRole });
    setUsers(users.map(user => user.id === userId ? { ...user, role: newRole } : user));
    if (updatedUser) {
      await logAndRefresh({
        action: 'User Role Changed',
        actorId: user?.id || 'admin',
        entityType: 'user',
        entityId: updatedUser.id,
        details: `Admin ${user?.email || 'unknown'} changed role of user ${updatedUser.email} to ${newRole}`
      });
    }
  };

  // Handler: Remove User
  const handleRemoveUser = async (userId: string) => {
    const removedUser = users.find(u => u.id === userId);
    if (!removedUser) return;
    await deleteUser(userId);
    setUsers(users.filter(u => u.id !== userId));
    await logAndRefresh({
      action: 'User Removed',
      actorId: user?.id || 'admin',
      entityType: 'user',
      entityId: removedUser.id,
      details: `Admin ${user?.email || 'unknown'} removed user ${removedUser.email} (role: ${removedUser.role})`
    });
  };

  // Fetch initial data on mount
  useEffect(() => {
    async function syncFirebase() {
      setIsLoading(true);
      const examsFromDb = await getAllExams();
      const usersFromDb = await getUsersByRole('intern');
      setExams(examsFromDb);
      setUsers(usersFromDb as User[]);
      const logsFromDb = await getAllLogs();
      setLogs(normalizeLogs(logsFromDb));
      setIsLoading(false);
    }
    syncFirebase();
  }, []);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'intern' | 'guest'>('intern');
  const { toast } = useToast();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>(undefined);
  const [selectedExamsForAssignment, setSelectedExamsForAssignment] = useState<string[]>([]);
  const [selectedInternForAssignment, setSelectedInternForAssignment] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { user } = useAuth();

  const [jsonMainExams] = useState(examList.exams as { id: number; name: string; sub_exams: { id: number; name: string; code: string }[] }[]);
  const [selectedMainExamId, setSelectedMainExamId] = useState<number | null>(null);
  const [availableSubExams, setAvailableSubExams] = useState<{ id: number; name: string; code: string }[]>([]);
  // Toggle sub-exam selection
  const toggleSubExam = (id: number) => {
    const idStr = id.toString();
    setSelectedExamsForAssignment(prev =>
      prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]
    );
  };
  // Select/Deselect all sub-exams
  const selectAllSubs = () => {
    setSelectedExamsForAssignment(availableSubExams.map(se => se.id.toString()));
  };
  const deselectAllSubs = () => {
    setSelectedExamsForAssignment([]);
  };
  // Sync available sub-exams when main exam changes
  useEffect(() => {
    const main = jsonMainExams.find(me => me.id === selectedMainExamId);
    setAvailableSubExams(main?.sub_exams || []);
    setSelectedExamsForAssignment([]);
  }, [selectedMainExamId]);

  // Handler: View Exam
  const handleViewExam = (exam: Exam) => {
    setSelectedExam(exam);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedExam(null);
  };

  const handleAssignExamsWithDueDate = async () => {
    if (!selectedInternForAssignment) {
      alert('Please select an intern to assign the exams to.');
      return;
    }
    if (!selectedMainExamId) {
      alert('Please select a main exam before assigning.');
      return;
    }
    if (!assignmentDueDate) {
      alert('Please select a due date for the assignment.');
      return;
    }
    // Determine exam IDs: use selected subs or all subs of the main exam
    const examIdsToAssign = selectedExamsForAssignment.length > 0
      ? selectedExamsForAssignment
      : availableSubExams.map(se => se.id.toString());
    // Assign each exam
    for (const examId of examIdsToAssign) {
      await assignWork({ examId, internIds: [selectedInternForAssignment], dueDate: assignmentDueDate, assignedBy: user?.id || 'admin', notes: '', bulk: false });
    }
    // Log bulk assignment
    await logAndRefresh({
      action: 'Exams Assigned',
      actorId: user?.id || 'admin',
      entityType: 'assignment',
      entityId: examIdsToAssign.join(','),
      details: `Assigned exams ${examIdsToAssign.join(', ')} to intern ${selectedInternForAssignment} with due date ${format(assignmentDueDate, 'PPP')}`
    });
    setSelectedExamsForAssignment([]);
    setSelectedInternForAssignment(null);
    setAssignmentDueDate(undefined);
    toast({
      title: "Exams assigned successfully!",
      description: `Exams assigned to intern with due date.`,
    });
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Manage exams and intern assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExamTable
            exams={exams}
            handleApproveReject={handleApproveReject}
            handleViewExam={handleViewExam}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Exam Assignment</CardTitle>
          <CardDescription>Select main exam and sub-exams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Main Exam Dropdown */}
            <div>
              <Label>Main Exam</Label>
              <Select
                value={selectedMainExamId?.toString() || ''}
                onValueChange={val => setSelectedMainExamId(parseInt(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select main exam" />
                </SelectTrigger>
                <SelectContent>
                  {jsonMainExams.map(me => (
                    <SelectItem key={me.id} value={me.id.toString()}>
                      {me.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-Exam Checkboxes */}
            <div className="md:col-span-2">
              <Label>Sub-Exams</Label>
              <div className="flex justify-end space-x-2 mb-2">
                <Button size="sm" onClick={selectAllSubs}>Select All</Button>
                <Button size="sm" variant="outline" onClick={deselectAllSubs}>Deselect All</Button>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 max-h-64 overflow-auto border p-2 rounded text-xs">
                {availableSubExams.map(se => (
                  <div key={se.id} className="flex items-center">
                    <Input
                      type="checkbox"
                      checked={selectedExamsForAssignment.includes(se.id.toString())}
                      onChange={() => toggleSubExam(se.id)}
                    />
                    <span className="ml-2 whitespace-nowrap">{se.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Controls */}
          <div className="mt-4 flex items-center space-x-4">
            {/* Intern Selection */}
            <div className="w-1/3">
              <Label htmlFor="intern">Assign to Intern:</Label>
              <Select onValueChange={(value) => setSelectedInternForAssignment(value)} value={selectedInternForAssignment || ''}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an intern" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.role === 'intern')
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date Selection */}
            <div className="w-1/3">
              <Label htmlFor="dueDate">Due Date:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={format(assignmentDueDate || new Date(), "PPP")}
                  >
                    {assignmentDueDate ? (
                      format(assignmentDueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assignmentDueDate}
                    onSelect={(date: Date | undefined) => setAssignmentDueDate(date)}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assign Button */}
            <Button onClick={handleAssignExamsWithDueDate} disabled={selectedExamsForAssignment.length === 0 && !selectedMainExamId || !selectedInternForAssignment || !assignmentDueDate}>
              Assign Exams with Due Date
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Add and manage users.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add User Form */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value) => setNewRole(value as 'admin' | 'intern' | 'guest')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddUser}>Add User</Button>
          </div>

          {/* User Table */}
          <div className="mt-4 overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="space-x-2">
                        <Select onValueChange={(value) => handleChangeRole(user.id, value as 'admin' | 'intern' | 'guest')} defaultValue={user.role}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveUser(user.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Intern Workload</CardTitle>
          <CardDescription>List of assigned works.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Intern Name</TableHead>
                  <TableHead>Assigned Exam</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter((user) => user.role === 'intern')
                  .flatMap((user) =>
                    (user.assignedExams || []).map((examId) => {
                      const exam = exams.find((e) => e.id === examId);
                      if (!exam) return null;
                      return (
                        <TableRow key={`${user.id}-${exam.id}`}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{exam.mainExam}</TableCell>
                          <TableCell>{format(new Date(), "PPP")}</TableCell>
                          <TableCell>Pending</TableCell>
                        </TableRow>
                      );
                    })
                  )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Log Details</CardTitle>
          <CardDescription>Audit trail of activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogTable logs={logs} />
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[80%]">
          <DialogHeader>
            <DialogTitle>View/Edit Exam</DialogTitle>
            <DialogDescription>
              View or edit the details of the selected exam.
            </DialogDescription>
          </DialogHeader>
          {selectedExam && (
            <ExamForm exam={selectedExam} onClose={handleCloseEditDialog} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
