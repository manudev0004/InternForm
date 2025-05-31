"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth/auth-provider";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { firebaseApp, db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { Exam } from "@/types";
import { submitExamForm } from "@/lib/firestore-utils";
import {
  getAutoFilledFormValues,
  ExamAssignment,
} from "@/services/exam-autofill";
import { testAutoFill } from "@/utils/test-autofill";
import {
  parseExamAssignment,
  getAutoFillStrategy,
} from "@/services/exam-assignment-parser";

const examSchema = z.object({
  // Section 1: Main Exam Information
  main_exam_name: z
    .string()
    .min(3, { message: "Main exam name must be at least 3 characters." }),
  exam_code: z
    .string()
    .min(3, { message: "Exam code must be at least 3 characters." }),
  conducting_body: z
    .string()
    .min(3, { message: "Conducting body must be at least 3 characters." }),
  conducting_body_custom: z.string().optional(),
  exam_sector: z.string().min(1, { message: "Please select an exam sector." }),
  exam_sector_custom: z.string().optional(),
  application_start_date: z.date(),
  application_end_date: z.date(),
  website_link: z.string().url({ message: "Invalid URL." }),

  // Section 2: Sub-Exams (Handled dynamically)
  subExams: z.array(
    z.object({
      sub_exam_name: z.string(),
      short_code: z.string(),
      gender: z.string(),
      gender_custom: z.string().optional(),
      marital_status: z.string(),
      marital_status_custom: z.string().optional(),
      pwd_eligible: z.boolean().default(false),
      eligible_disability_types: z.array(z.string()).optional(),
      other_disability_specified: z.string().optional(),
      has_age_limit: z.boolean().default(false),
      lower_age_limit: z.number().min(10).max(99).optional().nullable(),
      upper_age_limit: z.number().min(10).max(99).optional().nullable(),
      reference_date_lower: z.date().optional(),
      reference_date_upper: z.date().optional(),
      educationRequirements: z.array(
        z.object({
          level: z.string(),
          level_custom: z.string().optional(),
          degree: z.string(),
          specialization: z.string(),
          specialization_custom: z.string().optional(),
          min_percentage: z.number().nullable(),
          completion_status: z.enum(["Completed", "Final Year"]),
          completion_year: z.string().regex(/^\d{4}$/, {
            message: "Completion year must be a 4-digit number.",
          }),
          subjects_required_12th: z.array(z.string()).optional(),
        })
      ),
      nationality: z.array(z.string()).optional(),
      nationality_custom: z.string().optional(),
      domicile: z.array(z.string()).optional(),
      domicile_custom: z.string().optional(),
      has_category_relaxation: z.boolean().default(false),
      categoryRelaxations: z
        .array(
          z.object({
            category_key: z.string(),
            custom_category_name: z.string().optional(),
            age_relaxation_years: z.number().min(0).max(10),
            education_relaxation_percent: z.number().min(0).max(20).nullable(),
            remarks: z.string().optional(),
          })
        )
        .optional(),
      exam_subjects: z.array(z.string()).optional(),
      exam_subjects_custom: z.string().optional(),
      exam_medium: z.array(z.string()).optional(),
      exam_medium_custom: z.string().optional(),
      notes: z.string().optional(), // Add notes field
    })
  ),
});

const nationalityOptions = [
  "Indian",
  "American",
  "British",
  "Canadian",
  "Australian",
  "German",
  "French",
  "Chinese",
  "Japanese",
  "Russian",
  "Brazilian",
  "Mexican",
  "South African",
  "Egyptian",
  "Other",
];

const domicileOptions = [
  "All India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Other",
];

const languageOptions = [
  "English",
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Urdu",
  "Gujarati",
  "Malayalam",
  "Kannada",
  "Odia",
  "Punjabi",
  "Assamese",
  "Sanskrit",
  "Nepali",
  "French",
  "German",
  "Spanish",
  "Chinese",
  "Japanese",
  "Russian",
  "Arabic",
  "Persian",
  "Portuguese",
  "Italian",
  "Korean",
  "Other",
];

const degreeOptions = [
  "B.Tech",
  "B.E",
  "B.Sc",
  "B.A",
  "B.Com",
  "MBBS",
  "BDS",
  "B.Arch",
  "LLB",
  "BBA",
  "BCA",
  "M.Tech",
  "M.E",
  "M.Sc",
  "M.A",
  "M.Com",
  "MS",
  "MBA",
  "MCA",
  "LLM",
  "Ph.D",
  "Diploma",
  "10th",
  "12th",
  "Other",
];

const specializationOptions = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Chemical",
  "Aerospace",
  "Biotechnology",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "History",
  "Geography",
  "Political Science",
  "Sociology",
  "Commerce",
  "Accounting",
  "Finance",
  "Marketing",
  "Human Resources",
  "Operations",
  "Systems",
  "Networking",
  "Database",
  "Software Engineering",
  "Data Science",
  "Artificial Intelligence",
  "Machine Learning",
  "Cybersecurity",
  "Web Development",
  "Mobile App Development",
  "Cloud Computing",
  "Big Data",
  "Other",
];

const disabilityOptions = [
  "Locomotor Disability",
  "Visual Impairment",
  "Hearing Impairment",
  "Intellectual Disability",
  "Multiple Disabilities",
  "Other",
];

const categoryOptions = ["SC", "ST", "OBC", "EWS", "General", "PwD", "Other"];

interface ExamFormProps {
  examId?: string;
}

// Add TypeScript interfaces for better type safety
interface EducationRequirement {
  level: string;
  level_custom?: string;
  degree: string;
  specialization: string;
  specialization_custom?: string;
  min_percentage: number | null;
  completion_status: "Completed" | "Final Year";
  completion_year: string;
  subjects_required_12th: string[];
}

interface CategoryRelaxation {
  category_key: string;
  custom_category_name?: string;
  age_relaxation_years: number;
  education_relaxation_percent: number | null;
  remarks?: string;
}

interface SubExamData {
  sub_exam_name: string;
  short_code: string;
  gender: string;
  gender_custom?: string;
  marital_status: string;
  marital_status_custom?: string;
  pwd_eligible: boolean;
  eligible_disability_types: string[];
  other_disability_specified?: string;
  has_age_limit: boolean;
  lower_age_limit: number | null;
  upper_age_limit: number | null;
  reference_date_lower: Date;
  reference_date_upper: Date;
  educationRequirements: EducationRequirement[];
  nationality: string[];
  nationality_custom?: string;
  domicile: string[];
  domicile_custom?: string;
  has_category_relaxation: boolean;
  categoryRelaxations: CategoryRelaxation[];
  exam_subjects: string[];
  exam_subjects_custom?: string;
  exam_medium: string[];
  exam_medium_custom?: string;
  notes?: string; // Added notes field
}

export default function ExamForm({ examId }: ExamFormProps) {
  const { user } = useAuth();
  const [isAutoFillLoading, setIsAutoFillLoading] = useState(false);
  const [autoFillApplied, setAutoFillApplied] = useState(false);
  // Toggle section functionality
  const toggleSection = (section: "pwd" | "age" | "education" | "category") => {
    // This function will be implemented in the UI components
    console.log(`Toggling section: ${section}`);
  };

  // Auto-expand default settings are set directly in the UI

  const [subExams, setSubExams] = useState<SubExamData[]>([
    {
      sub_exam_name: "",
      short_code: "",
      gender: "All",
      gender_custom: "",
      marital_status: "Unmarried",
      marital_status_custom: "",
      pwd_eligible: true, // Auto-expanded by default
      eligible_disability_types: [],
      other_disability_specified: "",
      has_age_limit: true, // Auto-expanded by default
      lower_age_limit: null,
      upper_age_limit: null,
      reference_date_lower: new Date(),
      reference_date_upper: new Date(),
      educationRequirements: [
        {
          level: "",
          level_custom: "",
          degree: "",
          specialization: "",
          specialization_custom: "",
          min_percentage: null,
          completion_status: "Completed",
          completion_year: "",
          subjects_required_12th: [],
        },
      ],
      nationality: [],
      nationality_custom: "",
      domicile: [],
      domicile_custom: "",
      has_category_relaxation: true, // Auto-expanded by default
      categoryRelaxations: [],
      exam_subjects: [],
      exam_subjects_custom: "",
      exam_medium: [],
      exam_medium_custom: "",
      notes: "", // Add notes field
    },
  ]);

  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    if (firebaseApp) {
      setDb(getFirestore(firebaseApp));
    }
  }, []);

  const form = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      main_exam_name: "",
      exam_code: "",
      conducting_body: "",
      exam_sector: "",
      application_start_date: new Date(),
      application_end_date: new Date(),
      website_link: "",
      subExams: [
        {
          sub_exam_name: "",
          short_code: "",
          gender: "All",
          gender_custom: "",
          marital_status: "Unmarried",
          marital_status_custom: "",
          pwd_eligible: true, // Auto-expanded by default
          eligible_disability_types: [],
          other_disability_specified: "",
          has_age_limit: true, // Auto-expanded by default
          lower_age_limit: null,
          upper_age_limit: null,
          reference_date_lower: new Date(),
          reference_date_upper: new Date(),
          educationRequirements: [
            {
              level: "",
              level_custom: "",
              degree: "",
              specialization: "",
              specialization_custom: "",
              min_percentage: null,
              completion_status: "Completed",
              completion_year: "",
              subjects_required_12th: [],
            },
          ],
          nationality: [],
          nationality_custom: "",
          domicile: [],
          domicile_custom: "",
          has_category_relaxation: true, // Auto-expanded by default
          categoryRelaxations: [],
          exam_subjects: [],
          exam_subjects_custom: "",
          exam_medium: [],
          exam_medium_custom: "",
          notes: "", // Add notes field
        },
      ],
    },
  });

  // Auto-fill form when examId is provided
  useEffect(() => {
    async function loadAutoFillData() {
      if (!examId || autoFillApplied) return;

      setIsAutoFillLoading(true);
      try {
        // Parse the examId to determine assignment strategy
        const parsed = parseExamAssignment(examId);
        const strategy = getAutoFillStrategy(examId);

        console.log("Parsed exam assignment:", parsed);
        console.log("Auto-fill strategy:", strategy);

        // Create assignment object based on parsing
        const examAssignment: ExamAssignment = {
          examId: parsed.mainExamId,
          subExamId: examId, // Pass the full examId which contains format like "1-5"
          internIds: [user?.email || ""],
          dueDate: new Date(),
          assignedBy: "admin",
        };

        // Only proceed with auto-fill if strategy allows it
        if (strategy.shouldFillMainExam) {
          const autoFillData = await getAutoFilledFormValues(examAssignment);

          if (autoFillData) {
            // Reset form with auto-filled values
            form.reset({
              ...form.getValues(),
              ...autoFillData,
            });

            // Update subExams state only if strategy allows sub-exam filling
            if (
              strategy.shouldFillSubExams &&
              autoFillData.subExams &&
              autoFillData.subExams.length > 0
            ) {
              setSubExams(autoFillData.subExams);
              console.log(
                "Auto-filled specific sub-exam:",
                autoFillData.subExams[0].sub_exam_name
              );
            } else {
              console.log(
                "Main exam info auto-filled. Sub-exams left for manual selection."
              );
            }

            setAutoFillApplied(true);
            console.log("Auto-fill applied successfully:", autoFillData);
          }
        } else {
          console.log("No auto-fill applied based on assignment strategy");
          setAutoFillApplied(true); // Prevent repeated attempts
        }
      } catch (error) {
        console.error("Error applying auto-fill:", error);
      } finally {
        setIsAutoFillLoading(false);
      }
    }

    loadAutoFillData();
  }, [examId, user?.email, autoFillApplied, form]);

  // Destructure form methods
  const {
    control,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const watchHasAgeLimit = form.watch("subExams");
  const watchHasCategoryRelaxation = form.watch("subExams");
  const watchConductingBody = form.watch("conducting_body");
  const watchExamSector = form.watch("exam_sector");

  const addSubExam = (copyIndex?: number) => {
    const base =
      typeof copyIndex === "number" && subExams[copyIndex]
        ? JSON.parse(JSON.stringify(subExams[copyIndex]))
        : {
            sub_exam_name: "",
            short_code: "",
            gender: "All",
            gender_custom: "",
            marital_status: "Unmarried",
            marital_status_custom: "",
            pwd_eligible: true, // Auto-expanded by default
            eligible_disability_types: [],
            other_disability_specified: "",
            has_age_limit: true, // Auto-expanded by default
            lower_age_limit: null,
            upper_age_limit: null,
            reference_date_lower: new Date(),
            reference_date_upper: new Date(),
            educationRequirements: [
              {
                level: "",
                level_custom: "",
                degree: "",
                specialization: "",
                specialization_custom: "",
                min_percentage: null,
                completion_status: "Completed",
                completion_year: "",
                subjects_required_12th: [],
              },
            ],
            nationality: [],
            nationality_custom: "",
            domicile: [],
            domicile_custom: "",
            has_category_relaxation: true, // Auto-expanded by default
            categoryRelaxations: [],
            exam_subjects: [],
            exam_subjects_custom: "",
            exam_medium: [],
            exam_medium_custom: "",
            notes: "", // Add notes field
          };
    setSubExams([...subExams, base]);
  };

  const removeSubExam = (index: number) => {
    const newSubExams = [...subExams];
    newSubExams.splice(index, 1);
    setSubExams(newSubExams);
  };

  const handleSubExamChange = (index: number, field: string, value: any) => {
    const newSubExams = [...subExams];
    (newSubExams[index] as any)[field] = value;
    setSubExams(newSubExams);
  };

  const addEducationRequirement = (subExamIndex: number) => {
    const newSubExams = [...subExams];
    newSubExams[subExamIndex].educationRequirements = [
      ...newSubExams[subExamIndex].educationRequirements,
      {
        level: "",
        level_custom: "",
        degree: "",
        specialization: "",
        specialization_custom: "",
        min_percentage: null,
        completion_status: "Completed",
        completion_year: "",
        subjects_required_12th: [],
      },
    ];
    setSubExams(newSubExams);
  };

  const removeEducationRequirement = (
    subExamIndex: number,
    eduIndex: number
  ) => {
    const newSubExams = [...subExams];
    newSubExams[subExamIndex].educationRequirements.splice(eduIndex, 1);
    setSubExams(newSubExams);
  };

  const handleEducationRequirementChange = (
    subExamIndex: number,
    eduIndex: number,
    field: string,
    value: any
  ) => {
    const newSubExams = [...subExams];
    (newSubExams[subExamIndex].educationRequirements[eduIndex] as any)[field] =
      value;
    setSubExams(newSubExams);
  };

  const onSubmit = async (data: z.infer<typeof examSchema>) => {
    // Convert blank strings to null recursively
    function blanksToNull(obj: any): any {
      if (Array.isArray(obj)) return obj.map(blanksToNull);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [
            k,
            blanksToNull(v === "" ? null : v),
          ])
        );
      }
      return obj;
    }
    const cleanedData = blanksToNull(data);
    try {
      // Get device info for enhanced metadata
      const { getDeviceInfo } = await import("@/utils/device-info");
      const deviceInfo = getDeviceInfo();

      // You need assignmentId and internNotes for submission; adapt as needed
      const assignmentId = examId || "";
      const internNotes = "";

      // Submit form with enhanced metadata
      await submitExamForm({
        assignmentId,
        formData: cleanedData,
        internNotes,
        internId: user?.email || "",
        deviceInfo: deviceInfo
          ? {
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              device: deviceInfo.device,
              screenSize: deviceInfo.screenSize
                ? {
                    width: deviceInfo.screenSize.width,
                    height: deviceInfo.screenSize.height,
                    viewportWidth: deviceInfo.screenSize.viewportWidth,
                    viewportHeight: deviceInfo.screenSize.viewportHeight,
                  }
                : undefined,
            }
          : undefined,
      });
      alert("Exam details submitted successfully!");
    } catch (error) {
      console.error("Error submitting exam form: ", error);
      alert("Failed to submit exam details.");
    }
  };

  const disabilityOptions = [
    "Locomotor Disability",
    "Visual Impairment",
    "Hearing Impairment",
    "Intellectual Disability",
    "Multiple Disabilities",
    "Other",
  ];

  return (
    <div className="container mx-auto py-6 px-2">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Exam Form</CardTitle>
          <CardDescription className="text-sm">
            Fill in the exam details.
            {isAutoFillLoading && (
              <span className="ml-2 text-blue-600">
                Loading assignment data...
              </span>
            )}
            {autoFillApplied && examId && (
              <span className="ml-2 text-green-600">
                ✓ Auto-filled for{" "}
                {examId.includes("-")
                  ? "specific exam assignment"
                  : "main exam category"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAutoFillLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">
                  Loading exam information...
                </p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Section 1: Main Exam Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-base font-semibold mb-3 text-gray-800">
                    Main Exam Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <FormField
                      control={control}
                      name="main_exam_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Main Exam Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., UPSC Civil Services"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="exam_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Exam Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., UPSC_CSE_2025"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="conducting_body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Conducting Body
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Body" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UPSC">UPSC</SelectItem>
                              <SelectItem value="SSC">SSC</SelectItem>
                              <SelectItem value="IBPS">IBPS</SelectItem>
                              <SelectItem value="State PSC">
                                State PSC
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="exam_sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Exam Sector
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Sector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Defence">Defence</SelectItem>
                              <SelectItem value="Civil Services">
                                Civil Services
                              </SelectItem>
                              <SelectItem value="Banking">Banking</SelectItem>
                              <SelectItem value="Engineering">
                                Engineering
                              </SelectItem>
                              <SelectItem value="Teaching">Teaching</SelectItem>
                              <SelectItem value="Medical">Medical</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conditional custom fields in a compact row */}
                  {(watchConductingBody === "Other" ||
                    watchExamSector === "Other") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {watchConductingBody === "Other" && (
                        <FormField
                          control={control}
                          name="conducting_body_custom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                Custom Conducting Body
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter custom conducting body"
                                  className="h-9"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      {watchExamSector === "Other" && (
                        <FormField
                          control={control}
                          name="exam_sector_custom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                Custom Exam Sector
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter custom exam sector"
                                  className="h-9"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}

                  {/* Dates and Website in compact row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <FormField
                      control={control}
                      name="application_start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Start Date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "h-9 w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick start date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="application_end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            End Date
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "h-9 w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick end date</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="website_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Website Link
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="e.g., https://example.com"
                              className="h-9"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Sub-Exams */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sub-Exams</h3>
                  {subExams.map((subExam, index) => (
                    <div key={index} className="border p-4 rounded-md mb-2">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => addSubExam(index)}
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sub Exam Name */}
                        <div className="w-full">
                          <Label htmlFor={`sub_exam_name_${index}`}>
                            Sub Exam Name
                          </Label>
                          <Input
                            type="text"
                            id={`sub_exam_name_${index}`}
                            value={subExam.sub_exam_name ?? ""}
                            onChange={(e) =>
                              handleSubExamChange(
                                index,
                                "sub_exam_name",
                                e.target.value
                              )
                            }
                            className="w-full"
                          />
                        </div>

                        {/* Short Code */}
                        <div className="w-full">
                          <Label htmlFor={`short_code_${index}`}>
                            Short Code
                          </Label>
                          <Input
                            type="text"
                            id={`short_code_${index}`}
                            value={subExam.short_code ?? ""}
                            onChange={(e) =>
                              handleSubExamChange(
                                index,
                                "short_code",
                                e.target.value
                              )
                            }
                            className="w-full"
                          />
                        </div>

                        {/* Gender */}
                        <div className="w-full">
                          <Label htmlFor={`gender_${index}`}>Gender</Label>
                          <Select
                            value={subExam.gender}
                            onValueChange={(value) =>
                              handleSubExamChange(index, "gender", value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {subExam.gender === "Other" && (
                            <Input
                              type="text"
                              placeholder="Specify gender"
                              value={subExam.gender_custom ?? ""}
                              onChange={(e) =>
                                handleSubExamChange(
                                  index,
                                  "gender_custom",
                                  e.target.value
                                )
                              }
                              className="w-full mt-2"
                            />
                          )}
                        </div>

                        {/* Marital Status */}
                        <div className="w-full">
                          <Label htmlFor={`marital_status_${index}`}>
                            Marital Status
                          </Label>
                          <Select
                            value={subExam.marital_status}
                            onValueChange={(value) =>
                              handleSubExamChange(
                                index,
                                "marital_status",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Marital Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Unmarried">
                                Unmarried
                              </SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {subExam.marital_status === "Other" && (
                            <Input
                              type="text"
                              placeholder="Specify marital status"
                              value={subExam.marital_status_custom ?? ""}
                              onChange={(e) =>
                                handleSubExamChange(
                                  index,
                                  "marital_status_custom",
                                  e.target.value
                                )
                              }
                              className="w-full mt-2"
                            />
                          )}
                        </div>

                        {/* PWD Eligible */}
                        <div className="w-full">
                          <FormField
                            control={control}
                            name={`subExams.${index}.pwd_eligible`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-0.5">
                                  <FormLabel>PWD Eligible?</FormLabel>
                                  <FormDescription>
                                    Enable to specify disability eligibility for
                                    this exam.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {watch(`subExams.${index}.pwd_eligible`) && (
                          <div className="w-full">
                            <FormField
                              control={control}
                              name={`subExams.${index}.eligible_disability_types`}
                              render={({ field }) => (
                                <FormItem className="w-full">
                                  <FormLabel>
                                    Eligible Disability Types
                                  </FormLabel>
                                  <FormControl>
                                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                      {disabilityOptions.map((disability) => {
                                        const isChecked = (
                                          (field.value as string[]) || []
                                        ).includes(disability);
                                        return (
                                          <div
                                            key={disability}
                                            className="flex items-center space-x-2"
                                          >
                                            <Checkbox
                                              checked={isChecked}
                                              onCheckedChange={(checked) => {
                                                const currentValues =
                                                  (field.value as string[]) ||
                                                  [];
                                                if (checked) {
                                                  field.onChange([
                                                    ...currentValues,
                                                    disability,
                                                  ]);
                                                } else {
                                                  field.onChange(
                                                    currentValues.filter(
                                                      (val) =>
                                                        val !== disability
                                                    )
                                                  );
                                                }
                                              }}
                                            />
                                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                              {disability}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            {form
                              .getValues(
                                `subExams.${index}.eligible_disability_types`
                              )
                              ?.includes("Other") && (
                              <FormField
                                control={control}
                                name={`subExams.${index}.other_disability_specified`}
                                render={({ field }) => (
                                  <FormItem className="w-full">
                                    <FormLabel>
                                      Specify Other Disability
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., Neurological Condition"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        )}

                        {/* Section 3: Age Criteria */}
                        <div className="w-full">
                          <h3 className="text-lg font-semibold mb-2">
                            Age Criteria
                          </h3>
                          <FormField
                            control={control}
                            name={`subExams.${index}.has_age_limit`}
                            render={({ field }) => (
                              <FormItem className="w-full flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-0.5">
                                  <FormLabel>Has Age Limit?</FormLabel>
                                  <FormDescription>
                                    Enable to specify age limits for this exam.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          {watch(`subExams.${index}.has_age_limit`) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={control}
                                name={`subExams.${index}.lower_age_limit`}
                                render={({ field }) => (
                                  <FormItem className="w-full">
                                    <FormLabel>Lower Age Limit</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 21"
                                        min={10}
                                        max={99}
                                        value={field.value ?? ""}
                                        onChange={(e) =>
                                          field.onChange(
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value)
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={control}
                                name={`subExams.${index}.upper_age_limit`}
                                render={({ field }) => (
                                  <FormItem className="w-full">
                                    <FormLabel>Upper Age Limit</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 30"
                                        min={10}
                                        max={99}
                                        value={field.value ?? ""}
                                        onChange={(e) =>
                                          field.onChange(
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value)
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={control}
                                name={`subExams.${index}.reference_date_lower`}
                                render={({ field }) => (
                                  <FormItem className="w-full flex flex-col space-y-3">
                                    <FormLabel>Lower Age Limit Date</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full pl-3 text-left font-normal",
                                              !field.value &&
                                                "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => date > new Date()}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={control}
                                name={`subExams.${index}.reference_date_upper`}
                                render={({ field }) => (
                                  <FormItem className="w-full flex flex-col space-y-3">
                                    <FormLabel>Upper Age Limit Date</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full pl-3 text-left font-normal",
                                              !field.value &&
                                                "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(field.value, "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => date > new Date()}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </div>

                        {/* Section 4: Education Requirements */}
                        <div className="w-full">
                          <h3 className="text-lg font-semibold mb-2">
                            Education Requirements
                          </h3>
                          {subExams[index].educationRequirements.map(
                            (requirement, eduIndex) => (
                              <div
                                key={eduIndex}
                                className="border p-4 rounded-md mb-2"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Level */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`level_${index}_${eduIndex}`}
                                    >
                                      Level
                                    </Label>
                                    <Select
                                      value={requirement.level ?? ""}
                                      onValueChange={(value) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "level",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="10th">
                                          10th
                                        </SelectItem>
                                        <SelectItem value="12th">
                                          12th
                                        </SelectItem>
                                        <SelectItem value="Diploma">
                                          Diploma
                                        </SelectItem>
                                        <SelectItem value="Graduation">
                                          Graduation
                                        </SelectItem>
                                        <SelectItem value="Post-Graduation">
                                          Post-Graduation
                                        </SelectItem>
                                        <SelectItem value="Other">
                                          Other
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {requirement.level === "Other" && (
                                      <Input
                                        type="text"
                                        placeholder="Specify level"
                                        value={requirement.level_custom ?? ""}
                                        onChange={(e) =>
                                          handleEducationRequirementChange(
                                            index,
                                            eduIndex,
                                            "level_custom",
                                            e.target.value
                                          )
                                        }
                                        className="w-full mt-2"
                                      />
                                    )}
                                  </div>

                                  {/* Degree */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`degree_${index}_${eduIndex}`}
                                    >
                                      Degree
                                    </Label>
                                    <Select
                                      value={requirement.degree ?? ""}
                                      onValueChange={(value) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "degree",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Degree" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {degreeOptions.map((degree) => (
                                          <SelectItem
                                            key={degree}
                                            value={degree}
                                          >
                                            {degree}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Specialization */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`specialization_${index}_${eduIndex}`}
                                    >
                                      Specialization
                                    </Label>
                                    <Select
                                      value={requirement.specialization ?? ""}
                                      onValueChange={(value) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "specialization",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Specialization" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {specializationOptions.map(
                                          (specialization) => (
                                            <SelectItem
                                              key={specialization}
                                              value={specialization}
                                            >
                                              {specialization}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {requirement.specialization === "Other" && (
                                      <Input
                                        type="text"
                                        placeholder="Specify Specialization"
                                        value={
                                          requirement.specialization_custom ??
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleEducationRequirementChange(
                                            index,
                                            eduIndex,
                                            "specialization_custom",
                                            e.target.value
                                          )
                                        }
                                        className="w-full mt-2"
                                      />
                                    )}
                                  </div>

                                  {/* Min Percentage */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`min_percentage_${index}_${eduIndex}`}
                                    >
                                      Min Percentage
                                    </Label>
                                    <Input
                                      type="number"
                                      id={`min_percentage_${index}_${eduIndex}`}
                                      value={requirement.min_percentage ?? ""}
                                      onChange={(e) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "min_percentage",
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value)
                                        )
                                      }
                                      placeholder="e.g., 60"
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Completion Status */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`completion_status_${index}_${eduIndex}`}
                                    >
                                      Completion Status
                                    </Label>
                                    <Select
                                      value={
                                        requirement.completion_status ?? ""
                                      }
                                      onValueChange={(value) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "completion_status",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Completed">
                                          Completed
                                        </SelectItem>
                                        <SelectItem value="Final Year">
                                          Final Year
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Completion Year */}
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`completion_year_${index}_${eduIndex}`}
                                    >
                                      Completion Year
                                    </Label>
                                    <Input
                                      type="text"
                                      id={`completion_year_${index}_${eduIndex}`}
                                      value={requirement.completion_year ?? ""}
                                      onChange={(e) =>
                                        handleEducationRequirementChange(
                                          index,
                                          eduIndex,
                                          "completion_year",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g., 2023"
                                      maxLength={4}
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Subjects Required (12th) - Conditional */}
                                  {requirement.level === "12th" && (
                                    <div className="w-full">
                                      <Label
                                        htmlFor={`subjects_required_12th_${index}_${eduIndex}`}
                                      >
                                        Subjects Required (12th)
                                      </Label>
                                      <Input
                                        type="text"
                                        placeholder="e.g., Mathematics, Physics"
                                        className="w-full"
                                      />
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    removeEducationRequirement(index, eduIndex)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            )
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addEducationRequirement(index)}
                          >
                            Add Education Requirement
                          </Button>
                        </div>

                        {/* Section 5: Nationality and Domicile */}
                        <div className="w-full">
                          <h3 className="text-lg font-semibold mb-2">
                            Nationality and Domicile
                          </h3>
                          <FormField
                            control={control}
                            name={`subExams.${index}.nationality`}
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Nationality</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                    {nationalityOptions.map((nationality) => {
                                      const isChecked = (
                                        (field.value as string[]) || []
                                      ).includes(nationality);
                                      return (
                                        <div
                                          key={nationality}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const currentValues =
                                                (field.value as string[]) || [];
                                              if (checked) {
                                                field.onChange([
                                                  ...currentValues,
                                                  nationality,
                                                ]);
                                              } else {
                                                field.onChange(
                                                  currentValues.filter(
                                                    (val) => val !== nationality
                                                  )
                                                );
                                              }
                                            }}
                                          />
                                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {nationality}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                {form
                                  .getValues(`subExams.${index}.nationality`)
                                  ?.includes("Other") && (
                                  <Input
                                    type="text"
                                    placeholder="Specify nationality"
                                    value={subExam.nationality_custom || ""}
                                    onChange={(e) =>
                                      handleSubExamChange(
                                        index,
                                        "nationality_custom",
                                        e.target.value
                                      )
                                    }
                                    className="w-full mt-2"
                                  />
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`subExams.${index}.domicile`}
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Domicile</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                    {domicileOptions.map((domicile) => {
                                      const isChecked = (
                                        (field.value as string[]) || []
                                      ).includes(domicile);
                                      return (
                                        <div
                                          key={domicile}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const currentValues =
                                                (field.value as string[]) || [];
                                              if (checked) {
                                                field.onChange([
                                                  ...currentValues,
                                                  domicile,
                                                ]);
                                              } else {
                                                field.onChange(
                                                  currentValues.filter(
                                                    (val) => val !== domicile
                                                  )
                                                );
                                              }
                                            }}
                                          />
                                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {domicile}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                {form
                                  .getValues(`subExams.${index}.domicile`)
                                  ?.includes("Other") && (
                                  <Input
                                    type="text"
                                    placeholder="Specify domicile"
                                    value={subExam.domicile_custom || ""}
                                    onChange={(e) =>
                                      handleSubExamChange(
                                        index,
                                        "domicile_custom",
                                        e.target.value
                                      )
                                    }
                                    className="w-full mt-2"
                                  />
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Section 6: Category-Based Relaxations (Optional) */}
                        <div className="w-full">
                          <h3 className="text-lg font-semibold mb-2">
                            Category-Based Relaxations (Optional)
                          </h3>
                          <FormField
                            control={control}
                            name={`subExams.${index}.has_category_relaxation`}
                            render={({ field }) => (
                              <FormItem className="w-full flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-0.5">
                                  <FormLabel>
                                    Has Category Relaxation?
                                  </FormLabel>
                                  <FormDescription>
                                    Enable to specify category-based relaxations
                                    for this exam.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          {watch(
                            `subExams.${index}.has_category_relaxation`
                          ) && (
                            <div>
                              {subExams[index].categoryRelaxations?.map(
                                (relaxation, relaxIndex) => (
                                  <div
                                    key={relaxIndex}
                                    className="border p-4 rounded-md mb-2"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Category */}
                                      <div className="w-full">
                                        <Label>Category</Label>
                                        <Select
                                          value={relaxation.category_key}
                                          onValueChange={(value) => {
                                            const newSubExams = [...subExams];
                                            newSubExams[
                                              index
                                            ].categoryRelaxations[
                                              relaxIndex
                                            ].category_key = value;
                                            setSubExams(newSubExams);
                                          }}
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select Category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {categoryOptions.map((category) => (
                                              <SelectItem
                                                key={category}
                                                value={category}
                                              >
                                                {category}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {relaxation.category_key ===
                                          "Other" && (
                                          <Input
                                            type="text"
                                            value={
                                              relaxation.custom_category_name ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const newSubExams = [...subExams];
                                              newSubExams[
                                                index
                                              ].categoryRelaxations[
                                                relaxIndex
                                              ].custom_category_name =
                                                e.target.value;
                                              setSubExams(newSubExams);
                                            }}
                                            placeholder="e.g., Central list only"
                                            className="w-full mt-2"
                                          />
                                        )}
                                      </div>

                                      {/* Age Relaxation (in years) */}
                                      <div className="w-full">
                                        <Label>Age Relaxation (in years)</Label>
                                        <Input
                                          type="number"
                                          value={
                                            relaxation.age_relaxation_years ??
                                            ""
                                          }
                                          onChange={(e) => {
                                            const newSubExams = [...subExams];
                                            const newValue = Math.max(
                                              0,
                                              Math.min(
                                                10,
                                                Number(e.target.value)
                                              )
                                            ); // Ensure value is between 0 and 10
                                            newSubExams[
                                              index
                                            ].categoryRelaxations[
                                              relaxIndex
                                            ].age_relaxation_years = newValue;
                                            setSubExams(newSubExams);
                                          }}
                                          placeholder="e.g., 3"
                                          className="w-full"
                                        />
                                      </div>

                                      {/* Education Relaxation (in %) */}
                                      <div className="w-full">
                                        <Label>
                                          Education Relaxation (in %)
                                        </Label>
                                        <Input
                                          type="number"
                                          value={
                                            relaxation.education_relaxation_percent ??
                                            ""
                                          }
                                          onChange={(e) => {
                                            const newSubExams = [...subExams];
                                            const newValue =
                                              e.target.value === ""
                                                ? null
                                                : Math.max(
                                                    0,
                                                    Math.min(
                                                      20,
                                                      Number(e.target.value)
                                                    )
                                                  ); // Ensure value is between 0 and 20 or null
                                            newSubExams[
                                              index
                                            ].categoryRelaxations[
                                              relaxIndex
                                            ].education_relaxation_percent =
                                              newValue;
                                            setSubExams(newSubExams);
                                          }}
                                          placeholder="e.g., 5"
                                          className="w-full"
                                        />
                                      </div>

                                      {/* Remarks */}
                                      <div className="w-full">
                                        <Label>Remarks</Label>
                                        <Input
                                          type="text"
                                          value={relaxation.remarks || ""}
                                          onChange={(e) => {
                                            const newSubExams = [...subExams];
                                            newSubExams[
                                              index
                                            ].categoryRelaxations[
                                              relaxIndex
                                            ].remarks = e.target.value;
                                            setSubExams(newSubExams);
                                          }}
                                          placeholder="e.g., Central list only"
                                          className="w-full"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        const newSubExams = [...subExams];
                                        newSubExams[
                                          index
                                        ].categoryRelaxations.splice(
                                          relaxIndex,
                                          1
                                        );
                                        setSubExams(newSubExams);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )
                              )}
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const newSubExams = [...subExams];
                                  if (!newSubExams[index].categoryRelaxations) {
                                    newSubExams[index].categoryRelaxations = [];
                                  }
                                  newSubExams[index].categoryRelaxations.push({
                                    category_key: "",
                                    age_relaxation_years: 0,
                                    education_relaxation_percent: null,
                                    remarks: "",
                                  });
                                  setSubExams(newSubExams);
                                }}
                              >
                                Add Category Relaxation
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Section 7: Exam Subjects & Medium */}
                        <div className="w-full">
                          <h3 className="text-lg font-semibold mb-2">
                            Exam Subjects &amp; Medium
                          </h3>
                          <FormField
                            control={control}
                            name={`subExams.${index}.exam_subjects`}
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Exam Subjects</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                    {languageOptions.map((language) => {
                                      const isChecked = (
                                        (field.value as string[]) || []
                                      ).includes(language);
                                      return (
                                        <div
                                          key={language}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const currentValues =
                                                (field.value as string[]) || [];
                                              if (checked) {
                                                field.onChange([
                                                  ...currentValues,
                                                  language,
                                                ]);
                                              } else {
                                                field.onChange(
                                                  currentValues.filter(
                                                    (val) => val !== language
                                                  )
                                                );
                                              }
                                            }}
                                          />
                                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {language}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                {form
                                  .getValues(`subExams.${index}.exam_subjects`)
                                  ?.includes("Other") && (
                                  <Input
                                    type="text"
                                    placeholder="Specify exam subjects"
                                    value={subExam.exam_subjects_custom || ""}
                                    onChange={(e) =>
                                      handleSubExamChange(
                                        index,
                                        "exam_subjects_custom",
                                        e.target.value
                                      )
                                    }
                                    className="w-full mt-2"
                                  />
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name={`subExams.${index}.exam_medium`}
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>Exam Medium</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                    {languageOptions.map((language) => {
                                      const isChecked = (
                                        (field.value as string[]) || []
                                      ).includes(language);
                                      return (
                                        <div
                                          key={language}
                                          className="flex items-center space-x-2"
                                        >
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const currentValues =
                                                (field.value as string[]) || [];
                                              if (checked) {
                                                field.onChange([
                                                  ...currentValues,
                                                  language,
                                                ]);
                                              } else {
                                                field.onChange(
                                                  currentValues.filter(
                                                    (val) => val !== language
                                                  )
                                                );
                                              }
                                            }}
                                          />
                                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {language}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </FormControl>
                                {form
                                  .getValues(`subExams.${index}.exam_medium`)
                                  ?.includes("Other") && (
                                  <Input
                                    type="text"
                                    placeholder="Specify exam medium"
                                    value={subExam.exam_medium_custom ?? ""}
                                    onChange={(e) =>
                                      handleSubExamChange(
                                        index,
                                        "exam_medium_custom",
                                        e.target.value
                                      )
                                    }
                                    className="w-full mt-2"
                                  />
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Notes Section */}
                        <div className="w-full col-span-2">
                          <h3 className="text-lg font-semibold mb-2">
                            Additional Notes
                          </h3>
                          <FormField
                            control={control}
                            name={`subExams.${index}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Add any additional notes, requirements or special instructions here..."
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Include any specific details or exceptions
                                  that don't fit in other categories.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeSubExam(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" onClick={() => addSubExam()}>
                    Add Sub Exam
                  </Button>
                </div>

                {/* Test Auto-fill Button */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Auto-fill Test</h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      console.log("Testing auto-fill...");
                      const result = await testAutoFill();
                      console.log("Test result:", result);
                      if (result) {
                        alert(
                          "Auto-fill test successful! Check console for details."
                        );
                      } else {
                        alert(
                          "Auto-fill test failed. Check console for errors."
                        );
                      }
                    }}
                    className="mr-2"
                  >
                    Test Auto-fill
                  </Button>
                  {examId && (
                    <span className="text-sm text-gray-600">
                      Current examId: {examId}
                    </span>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Submit
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
