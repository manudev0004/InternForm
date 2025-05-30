"use client";

import { useState, useEffect } from "react";
import {
  getUsersByRole,
  addExam,
  addUser,
  updateUser,
  deleteUser,
  assignWork,
  addLog,
  getAllLogs,
  getAssignmentsForIntern,
  getAllExams,
} from "@/lib/firestore-utils";
import { LogEntry } from "@/lib/firebaseHelpers"; // for type only, adjust as needed
import { deleteDoc, doc, getFirestore } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";

interface Assignment {
  id: string;
  examId: string;
  subExamId: string;
  internId: string;
  assignedBy: string;
  dueDate: Date;
  status: string;
  notes: {
    mainExamName: string;
    subExamName: string;
    subExamCode: string;
  };
  mainExamName: string;
  subExamName: string;
  subExamCode: string;
  history: Array<{
    action: string;
    actorId: string;
    timestamp: Date;
    details: any;
  }>;
}

// Temporary stub for updateExam until implemented in firestore-utils
async function updateExam(examId: string, data: any) {
  // TODO: Implement updateExam in firestore-utils and use it here
  // For now, just log
  console.warn("updateExam not implemented yet", examId, data);
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
} from "@/components/ui/table";
import { Exam, User } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ExamForm from "@/components/exam-form";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useAuth } from "@/components/auth/auth-provider";
import examList from "../../../Exams.json";

const DUMMY_EXAMS: Exam[] = [
  {
    id: "1",
    mainExam: "UPSC Civil Services",
    examCode: "UPSC_CSE_2025",
    subExams: ["IAS", "IPS", "IFS"],
    conductedBy: "UPSC",
    examSector: "Civil Services",
    status: "active",
    version: 3,
    effectiveDate: new Date(),
    dataSourceLink: "https://example.com",
    internNote: "Sample note",
    filledBy: "intern1",
    reviewStatus: "Pending",
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
  {
    id: "2",
    mainExam: "SSC CGL",
    examCode: "SSC_CGL_2024",
    subExams: [],
    conductedBy: "SSC",
    examSector: "General Competitive",
    status: "active",
    version: 2,
    effectiveDate: new Date(),
    dataSourceLink: "https://example.com",
    internNote: "Another sample note",
    filledBy: "intern2",
    reviewStatus: "Approved",
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
  {
    id: "3",
    mainExam: "IBPS PO",
    examCode: "IBPS_PO_2024",
    subExams: [],
    conductedBy: "IBPS",
    examSector: "Banking",
    status: "archived",
    version: 1,
    effectiveDate: new Date(),
    dataSourceLink: "https://example.com",
    internNote: "Yet another sample note",
    filledBy: "intern3",
    reviewStatus: "Rejected",
    applicationPeriodStart: new Date(),
    applicationPeriodEnd: new Date(),
    eligibilityCriteria: [],
  },
];

const DUMMY_USERS: User[] = [
  {
    id: "admin1",
    email: "admin@example.com",
    role: "admin",
    assignedExams: [],
  },
  {
    id: "intern1",
    email: "intern@example.com",
    role: "intern",
    assignedExams: ["1"],
  },
  {
    id: "guest1",
    email: "guest@example.com",
    role: "guest",
    assignedExams: [],
  },
  {
    id: "intern2",
    email: "intern2@example.com",
    role: "intern",
    assignedExams: ["2"],
  },
  {
    id: "intern3",
    email: "intern3@example.com",
    role: "intern",
    assignedExams: ["3"],
  },
];

// Reusable component for displaying exam data in a table
function ExamTable({
  exams,
  handleApproveReject,
  handleViewExam,
}: {
  exams: Exam[];
  handleApproveReject: (
    examId: string,
    status: "Approved" | "Rejected"
  ) => void;
  handleViewExam: (exam: Exam) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Exam Name</TableHead>
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
              <TableCell
                className="font-medium text-sm truncate max-w-[150px]"
                title={exam.mainExam}
              >
                {exam.mainExam}
              </TableCell>
              <TableCell>{exam.conductedBy}</TableCell>
              <TableCell>{exam.examSector}</TableCell>
              <TableCell>{exam.examSector}</TableCell>
              <TableCell>{exam.filledBy || "N/A"}</TableCell>
              <TableCell>{exam.reviewStatus}</TableCell>
              <TableCell className="text-right">
                {exam.reviewStatus === "Pending" && (
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApproveReject(exam.id, "Approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleApproveReject(exam.id, "Rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewExam(exam)}
                >
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
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Activity Logs</h3>
      <div className="border rounded-md">
        <Table>
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
                  {log.timestamp instanceof Date &&
                  !isNaN(log.timestamp.getTime())
                    ? format(log.timestamp, "PPP p")
                    : "N/A"}
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WorkloadTable({
  assignments,
  onDeleteAssignment,
}: {
  assignments: Assignment[];
  onDeleteAssignment: (id: string) => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      setDeletingId(id);
      try {
        await onDeleteAssignment(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Intern Workload</h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Main Exam</TableHead>
              <TableHead>Sub Exam</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{assignment.mainExamName}</TableCell>
                  <TableCell>{assignment.subExamName}</TableCell>
                  <TableCell>{assignment.subExamCode}</TableCell>
                  <TableCell>
                    {assignment.dueDate instanceof Date
                      ? format(assignment.dueDate, "PPP")
                      : "N/A"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {assignment.status}
                  </TableCell>
                  <TableCell>{assignment.assignedBy}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(assignment.id)}
                      disabled={deletingId === assignment.id}
                    >
                      {deletingId === assignment.id ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Firestore Timestamp to JS Date
  const normalizeLogs = (rawLogs: any[]): LogEntry[] =>
    rawLogs.map((log) => ({
      ...log,
      timestamp: log.timestamp?.toDate
        ? log.timestamp.toDate()
        : new Date(log.timestamp),
    }));

  // Helper: log action and refresh logs list
  const logAndRefresh = async (payload: {
    action: string;
    actorId: string;
    entityType: string;
    entityId: string;
    details: string;
  }) => {
    try {
      await addLog(payload);
      console.log("addLog succeeded:", payload);
    } catch (error) {
      console.error("addLog failed:", error, payload);
      console.log("Logging failed - Could not save log entry.");
      return;
    }
    try {
      const logsFromDb = await getAllLogs();
      setLogs(normalizeLogs(logsFromDb));
    } catch (error) {
      console.error("getAllLogs failed:", error);
    }
  };

  // Handler: Approve/Reject Exam
  const handleApproveReject = async (
    examId: string,
    status: "Approved" | "Rejected"
  ) => {
    await updateExam(examId, { reviewStatus: status });
    setExams(
      exams.map((exam) =>
        exam.id === examId ? { ...exam, reviewStatus: status } : exam
      )
    );
    const affectedExam = exams.find((exam) => exam.id === examId);
    if (affectedExam) {
      await logAndRefresh({
        action: `Exam ${status}`,
        actorId: user?.email || "admin",
        entityType: "exam",
        entityId: affectedExam.id,
        details: `Admin ${
          user?.email || "unknown"
        } ${status.toLowerCase()} exam ${affectedExam.mainExam} (code: ${
          affectedExam.examCode
        })`,
      });
    }
  };

  // Handler: Add User
  const handleAddUser = async () => {
    if (newEmail && !users.find((user) => user.email === newEmail)) {
      const newUser: User = {
        id: `user${users.length + 1}`,
        email: newEmail,
        role: newRole,
        assignedExams: [],
      };
      await addUser(newUser);
      setUsers([...users, newUser]);
      setNewEmail("");
      await logAndRefresh({
        action: "User Added",
        actorId: user?.email || "admin",
        entityType: "user",
        entityId: newUser.id,
        details: `Admin ${user?.email || "unknown"} added user ${
          newUser.email
        } with role ${newUser.role}`,
      });
    } else {
      alert("Please enter a valid unique email address.");
    }
  };

  // Handler: Change User Role
  const handleChangeRole = async (
    userId: string,
    newRole: "admin" | "intern" | "guest"
  ) => {
    const updatedUser = users.find((user) => user.id === userId);
    await updateUser(userId, { role: newRole });
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
    if (updatedUser) {
      await logAndRefresh({
        action: "User Role Changed",
        actorId: user?.email || "admin",
        entityType: "user",
        entityId: updatedUser.id,
        details: `Admin ${user?.email || "unknown"} changed role of user ${
          updatedUser.email
        } to ${newRole}`,
      });
    }
  };

  // Handler: Remove User
  const handleRemoveUser = async (userId: string) => {
    const removedUser = users.find((u) => u.id === userId);
    if (!removedUser) return;
    await deleteUser(userId);
    setUsers(users.filter((u) => u.id !== userId));
    await logAndRefresh({
      action: "User Removed",
      actorId: user?.email || "admin",
      entityType: "user",
      entityId: removedUser.id,
      details: `Admin ${user?.email || "unknown"} removed user ${
        removedUser.email
      } (role: ${removedUser.role})`,
    });
  };

  // Fetch initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setIsLoadingAssignments(true);
      try {
        console.log("Fetching all data...");
        const [examsFromDb, usersFromDb, logsFromDb, assignmentsData] =
          await Promise.all([
            getAllExams(),
            getUsersByRole("intern"),
            getAllLogs(),
            getAssignmentsForIntern(""), // Empty string to get all assignments
          ]);

        console.log("Fetched assignments raw data:", assignmentsData);

        // Convert Firestore data to match Exam interface
        const formattedExams = examsFromDb.map((exam: any) => ({
          id: exam.id,
          mainExam: exam.mainExam || exam.main_exam_name || '',
          examCode: exam.examCode || exam.exam_code || '',
          subExams: exam.subExams || [],
          conductedBy: exam.conductedBy || exam.conducting_body || '',
          examSector: exam.examSector || exam.exam_sector || '',
          applicationPeriodStart: exam.applicationPeriodStart?.toDate ? exam.applicationPeriodStart.toDate() : new Date(),
          applicationPeriodEnd: exam.applicationPeriodEnd?.toDate ? exam.applicationPeriodEnd.toDate() : new Date(),
          status: exam.status || 'draft',
          version: exam.version || 1,
          effectiveDate: exam.effectiveDate?.toDate ? exam.effectiveDate.toDate() : new Date(),
          eligibilityCriteria: exam.eligibilityCriteria || [],
          dataSourceLink: exam.dataSourceLink || exam.website_link || '',
          internNote: exam.internNote || '',
          filledBy: exam.filledBy || '',
          reviewStatus: exam.reviewStatus || 'Pending'
        }));

        // Convert Firestore data to match User interface
        const formattedUsers = usersFromDb.map((user: any) => ({
          id: user.id,
          email: user.email || '',
          role: (user.role as 'admin' | 'intern' | 'guest') || 'intern',
          assignedExams: user.assignedExams || []
        }));

        setExams(formattedExams);
        setUsers(formattedUsers);
        setLogs(normalizeLogs(logsFromDb));

        // Parse the notes field if it's a string and handle Firestore timestamps
        const parsedAssignments = assignmentsData.map((assignment: any) => {
          // Convert Firestore Timestamp to Date if needed
          const dueDate = assignment.dueDate?.toDate
            ? assignment.dueDate.toDate()
            : assignment.dueDate;

          // Parse notes if it's a string
          let notes = assignment.notes;
          if (typeof notes === "string") {
            try {
              notes = JSON.parse(notes);
            } catch (e) {
              console.warn("Failed to parse notes:", e);
              notes = {};
            }
          } else if (!notes) {
            notes = {};
          }

          return {
            ...assignment,
            notes,
            dueDate,
            // Ensure we have all required fields with defaults
            mainExamName:
              assignment.mainExamName || notes.mainExamName || "N/A",
            subExamName: assignment.subExamName || notes.subExamName || "N/A",
            subExamCode: assignment.subExamCode || notes.subExamCode || "N/A",
            status: assignment.status || "pending",
            assignedBy: assignment.assignedBy || "Unknown",
          };
        });

        console.log("Processed assignments:", parsedAssignments);
        setAssignments(parsedAssignments);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingAssignments(false);
      }
    };

    fetchInitialData();
  }, []);

  // Handle assignment deletion
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) return;

    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));

      // Log the deletion
      await addLog({
        action: "Assignment Deleted",
        actorId: user.email,
        entityType: "assignment",
        entityId: assignmentId,
        details: `Assignment ${assignmentId} was deleted by ${
          user.email || "admin"
        }`,
      });

      // Refresh logs to show the deletion
      const updatedLogs = await getAllLogs();
      setLogs(normalizeLogs(updatedLogs));
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete assignment");
    }
  };

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "intern" | "guest">(
    "intern"
  );
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [assignmentDueDate, setAssignmentDueDate] = useState<Date | undefined>(
    undefined
  );
  const [selectedExamsForAssignment, setSelectedExamsForAssignment] = useState<
    string[]
  >([]);
  const [selectedInternForAssignment, setSelectedInternForAssignment] =
    useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const { user } = useAuth();
  
  // Safe database initialization with null checking
  const [db, setDb] = useState<any>(null);
  
  useEffect(() => {
    if (firebaseApp) {
      setDb(getFirestore(firebaseApp));
    }
  }, []);

  const [jsonMainExams] = useState(
    examList.exams as {
      id: number;
      name: string;
      sub_exams: { id: number; name: string; code: string }[];
    }[]
  );
  const [selectedMainExamId, setSelectedMainExamId] = useState<number | null>(
    null
  );
  const [availableSubExams, setAvailableSubExams] = useState<
    { id: number; name: string; code: string }[]
  >([]);
  // Toggle sub-exam selection
  const toggleSubExam = (id: number) => {
    const idStr = id.toString();
    setSelectedExamsForAssignment((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };
  // Select/Deselect all sub-exams
  const selectAllSubs = () => {
    setSelectedExamsForAssignment(
      availableSubExams.map((se) => se.id.toString())
    );
  };
  const deselectAllSubs = () => {
    setSelectedExamsForAssignment([]);
  };
  // Sync available sub-exams when main exam changes
  useEffect(() => {
    const main = jsonMainExams.find((me) => me.id === selectedMainExamId);
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
      alert("Please select an intern to assign the exams to.");
      return;
    }
    if (!selectedMainExamId) {
      alert("Please select a main exam before assigning.");
      return;
    }
    if (!assignmentDueDate) {
      alert("Please select a due date for the assignment.");
      return;
    }

    // Get the main exam details
    const mainExam = jsonMainExams.find((me) => me.id === selectedMainExamId);
    if (!mainExam) {
      alert("Selected main exam not found");
      return;
    }

    // Determine which sub-exams to assign: use selected subs or all subs of the main exam
    const subExamsToAssign =
      selectedExamsForAssignment.length > 0
        ? availableSubExams.filter((se) =>
            selectedExamsForAssignment.includes(se.id.toString())
          )
        : availableSubExams;

    if (subExamsToAssign.length === 0) {
      alert("No sub-exams found to assign");
      return;
    }

    // Assign each sub-exam
    for (const subExam of subExamsToAssign) {
      await assignWork({
        examId: mainExam.id.toString(),
        subExamId: `${mainExam.id}-${subExam.id}`, // Format: mainExamId-subExamId for auto-fill
        internIds: [selectedInternForAssignment],
        dueDate: assignmentDueDate,
        assignedBy: user?.email || "admin",
        notes: JSON.stringify({
          mainExamName: mainExam.name,
          subExamName: subExam.name,
          subExamCode: subExam.code,
        }),
        bulk: subExamsToAssign.length > 1,
      });
    }

    // Log the assignment(s)
    const subExamNames = subExamsToAssign.map((se) => se.name).join(", ");
    await logAndRefresh({
      action: "Exams Assigned",
      actorId: user?.email || "admin",
      entityType: "assignment",
      entityId: subExamsToAssign.map((se) => se.id).join(","),
      details: `Assigned ${
        mainExam.name
      } (${subExamNames}) to intern ${selectedInternForAssignment} with due date ${format(
        assignmentDueDate,
        "PPP"
      )}`,
    });

    // Reset form
    setSelectedExamsForAssignment([]);
    setSelectedInternForAssignment(null);
    setAssignmentDueDate(undefined);
    alert(
      `Successfully assigned ${subExamsToAssign.length} exam(s) to the intern`
    );
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Manage exams and intern assignments.
          </CardDescription>
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
                value={selectedMainExamId?.toString() || ""}
                onValueChange={(val) => setSelectedMainExamId(parseInt(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select main exam" />
                </SelectTrigger>
                <SelectContent>
                  {jsonMainExams.map((me) => (
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
                <Button size="sm" onClick={selectAllSubs}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllSubs}>
                  Deselect All
                </Button>
              </div>
              <div className="w-full grid grid-cols-6 gap-2 max-h-150 overflow-auto border p-2 rounded text-xs">
                {availableSubExams.map((se) => (
                  <div key={se.id} className="flex items-center w-6 h-6">
                    <Input
                      type="checkbox"
                      checked={selectedExamsForAssignment.includes(
                        se.id.toString()
                      )}
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
              <Select
                onValueChange={(value) => setSelectedInternForAssignment(value)}
                value={selectedInternForAssignment || ""}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an intern" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.role === "intern")
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
                    onSelect={(date: Date | undefined) =>
                      setAssignmentDueDate(date)
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assign Button */}
            <Button
              onClick={handleAssignExamsWithDueDate}
              disabled={
                (selectedExamsForAssignment.length === 0 &&
                  !selectedMainExamId) ||
                !selectedInternForAssignment ||
                !assignmentDueDate
              }
            >
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
              <Select
                onValueChange={(value) =>
                  setNewRole(value as "admin" | "intern" | "guest")
                }
              >
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
                        <Select
                          onValueChange={(value) =>
                            handleChangeRole(
                              user.id,
                              value as "admin" | "intern" | "guest"
                            )
                          }
                          defaultValue={user.role}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveUser(user.id)}
                        >
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Intern Workload Management</CardTitle>
          <CardDescription>View and manage intern assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAssignments ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <WorkloadTable
              assignments={assignments}
              onDeleteAssignment={handleDeleteAssignment}
            />
          )}
        </CardContent>
      </Card>

      {/* Test Assignment Flow Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Assignment Flow</CardTitle>
          <CardDescription>Debug and test the complete assignment workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={async () => {
                const { testAssignmentFlow } = await import('@/utils/test-assignment-flow');
                await testAssignmentFlow();
              }}
              variant="outline"
            >
              Test Auto-fill Functionality
            </Button>
            <Button 
              onClick={async () => {
                const { simulateCompleteWorkflow } = await import('@/utils/test-assignment-flow');
                await simulateCompleteWorkflow();
              }}
              variant="outline"
            >
              Simulate Complete Workflow
            </Button>
            <Button 
              onClick={async () => {
                // Quick demo assignment: SSC GD Constable to first intern
                const intern = users.find(u => u.role === 'intern');
                if (!intern) {
                  alert('No intern found. Please add an intern user first.');
                  return;
                }
                
                const demoMainExam = jsonMainExams[0]; // SSC Exams
                const demoSubExam = demoMainExam.sub_exams[0]; // SSC GD Constable
                
                try {
                  await assignWork({
                    examId: demoMainExam.id.toString(),
                    subExamId: `${demoMainExam.id}-${demoSubExam.id}`,
                    internIds: [intern.id],
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                    assignedBy: user?.email || "admin",
                    notes: JSON.stringify({
                      mainExamName: demoMainExam.name,
                      subExamName: demoSubExam.name,
                      subExamCode: demoSubExam.code,
                    }),
                  });
                  
                  alert(`Demo assignment created!\nAssigned: ${demoMainExam.name} - ${demoSubExam.name}\nTo: ${intern.email}\nIntern can now test the form at: /intern/${demoMainExam.id}-${demoSubExam.id}`);
                } catch (error) {
                  console.error('Error creating demo assignment:', error);
                  alert('Error creating demo assignment. Check console for details.');
                }
              }}
              variant="default"
            >
              Create Demo Assignment
            </Button>
            <div className="text-sm text-muted-foreground">
              Open browser console to see test results. Demo assignment creates a real assignment for testing.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
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
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">Exam Details</h4>
                <p><strong>Name:</strong> {selectedExam.mainExam}</p>
                <p><strong>Code:</strong> {selectedExam.examCode}</p>
                <p><strong>Conducted By:</strong> {selectedExam.conductedBy}</p>
                <p><strong>Sector:</strong> {selectedExam.examSector}</p>
                <p><strong>Status:</strong> {selectedExam.status}</p>
                <p><strong>Review Status:</strong> {selectedExam.reviewStatus}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Note: Full exam editing will be available in a future update. 
                For now, you can view exam details and use the assignment system to create new exam entries.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
