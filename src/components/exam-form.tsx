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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/components/auth/auth-provider";
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { firebaseApp, db } from '@/lib/firebase';
import { Checkbox } from "@/components/ui/checkbox";
import { Exam } from '@/types';
import { submitExamForm } from '@/lib/firestore-utils';

const examSchema = z.object({
  // Section 1: Main Exam Information
  main_exam_name: z.string().min(3, { message: "Main exam name must be at least 3 characters." }),
  exam_code: z.string().min(3, { message: "Exam code must be at least 3 characters." }),
  conducting_body: z.string().min(3, { message: "Conducting body must be at least 3 characters." }),
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
          completion_year: z.string().regex(/^\d{4}$/, { message: "Completion year must be a 4-digit number." }),
          subjects_required_12th: z.array(z.string()).optional(),
        })
      ),
      nationality: z.array(z.string()).optional(),
      nationality_custom: z.string().optional(),
      domicile: z.array(z.string()).optional(),
      domicile_custom: z.string().optional(),
      has_category_relaxation: z.boolean().default(false),
      categoryRelaxations: z.array(
        z.object({
          category_key: z.string(),
          custom_category_name: z.string().optional(),
          age_relaxation_years: z.number().min(0).max(10),
          education_relaxation_percent: z.number().min(0).max(20).nullable(),
          remarks: z.string().optional(),
        })
      ).optional(),
      exam_subjects: z.array(z.string()).optional(),
      exam_subjects_custom: z.string().optional(),
      exam_medium: z.array(z.string()).optional(),
      exam_medium_custom: z.string().optional(),
    })
  ),
});

const nationalityOptions = [
  "Indian", "American", "British", "Canadian", "Australian",
  "German", "French", "Chinese", "Japanese", "Russian",
  "Brazilian", "Mexican", "South African", "Egyptian", "Other"
];

const domicileOptions = [
  "All India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other"
];

const languageOptions = [
  "English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu",
  "Gujarati", "Malayalam", "Kannada", "Odia", "Punjabi", "Assamese",
  "Sanskrit", "Nepali", "French", "German", "Spanish", "Chinese", "Japanese",
  "Russian", "Arabic", "Persian", "Portuguese", "Italian", "Korean", "Other"
];

const degreeOptions = [
  "B.Tech", "B.E", "B.Sc", "B.A", "B.Com", "MBBS", "BDS", "B.Arch", "LLB", "BBA", "BCA",
  "M.Tech", "M.E", "M.Sc", "M.A", "M.Com", "MS", "MBA", "MCA", "LLM",
  "Ph.D", "Diploma", "10th", "12th", "Other"
];

const specializationOptions = [
  "Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil",
  "Electrical", "Chemical", "Aerospace", "Biotechnology", "Mathematics", "Physics",
  "Chemistry", "Biology", "Economics", "History", "Geography", "Political Science",
  "Sociology", "Commerce", "Accounting", "Finance", "Marketing", "Human Resources",
  "Operations", "Systems", "Networking", "Database", "Software Engineering", "Data Science",
  "Artificial Intelligence", "Machine Learning", "Cybersecurity", "Web Development",
  "Mobile App Development", "Cloud Computing", "Big Data", "Other"
];

const disabilityOptions = [
    "Locomotor Disability",
    "Visual Impairment",
    "Hearing Impairment",
    "Intellectual Disability",
    "Multiple Disabilities",
    "Other"
];

const categoryOptions = [
    "SC", "ST", "OBC", "EWS", "General", "PwD", "Other"
];


export default function InternDashboard() {
  const { user } = useAuth();
  const [subExams, setSubExams] = useState([{
    sub_exam_name: '',
    short_code: '',
    gender: 'All',
    gender_custom: '',
    marital_status: 'Unmarried',
    marital_status_custom: '',
    pwd_eligible: false,
    eligible_disability_types: [],
    other_disability_specified: '',
    has_age_limit: false,
    lower_age_limit: null,
    upper_age_limit: null,
    reference_date_lower: new Date(),
    reference_date_upper: new Date(),
    educationRequirements: [{ level: '', level_custom: '', degree: '', specialization: '', specialization_custom:'', min_percentage: null, completion_status: 'Completed', subjects_required_12th: [] }],
    nationality: [],
    nationality_custom: '',
    domicile: [],
    domicile_custom:'',
    has_category_relaxation: false,
    categoryRelaxations: [],
    exam_subjects: [],
    exam_subjects_custom: '',
    exam_medium: [],
    exam_medium_custom: '',
  }]);

  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    if (firebaseApp) {
      setDb(getFirestore(firebaseApp));
    }
  }, []);

  const form = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      main_exam_name: '',
      exam_code: '',
      conducting_body: '',
      exam_sector: '',
      application_start_date: new Date(),
      application_end_date: new Date(),
      website_link: '',
      subExams: [{
        sub_exam_name: '',
        short_code: '',
        gender: 'All',
        gender_custom: '',
        marital_status: 'Unmarried',
        marital_status_custom: '',
        pwd_eligible: false,
        eligible_disability_types: [],
        other_disability_specified: '',
        has_age_limit: false,
        lower_age_limit: null,
        upper_age_limit: null,
        reference_date_lower: new Date(),
        reference_date_upper: new Date(),
        educationRequirements: [{ level: '', level_custom: '', degree: '', specialization: '', specialization_custom:'', min_percentage: null, completion_status: 'Completed', subjects_required_12th: [] }],
        nationality: [],
        nationality_custom: '',
        domicile: [],
        domicile_custom:'',
        has_category_relaxation: false,
        categoryRelaxations: [],
        exam_subjects: [],
        exam_subjects_custom: '',
        exam_medium: [],
        exam_medium_custom: '',
      }],
    },
  });

  const { watch, register, control, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof examSchema>>({
    resolver: zodResolver(examSchema)
  });

  const watchHasAgeLimit = watch("has_age_limit");
  const watchHasCategoryRelaxation = watch("has_category_relaxation");
  const watchConductingBody = watch("conducting_body");
  const watchExamSector = watch("exam_sector");

  const addSubExam = (copyIndex?: number) => {
    const base = (typeof copyIndex === 'number' && subExams[copyIndex])
      ? JSON.parse(JSON.stringify(subExams[copyIndex]))
      : {
          sub_exam_name: '',
          short_code: '',
          gender: 'All',
          gender_custom: '',
          marital_status: 'Unmarried',
          marital_status_custom: '',
          pwd_eligible: false,
          eligible_disability_types: [],
          other_disability_specified: '',
          has_age_limit: false,
          lower_age_limit: null,
          upper_age_limit: null,
          reference_date_lower: new Date(),
          reference_date_upper: new Date(),
          educationRequirements: [{level: '', level_custom: '', degree: '', specialization: '',specialization_custom:'', min_percentage: null, completion_status: 'Completed', subjects_required_12th: []}],
          nationality: [],
          nationality_custom: '',
          domicile: [],
          domicile_custom:'',
          has_category_relaxation: false,
          categoryRelaxations: [],
          exam_subjects: [],
          exam_subjects_custom: '',
          exam_medium: [],
          exam_medium_custom: '',
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
    newSubExams[index][field] = value;
    setSubExams(newSubExams);
  };

  const addEducationRequirement = (subExamIndex: number) => {
    const newSubExams = [...subExams];
    newSubExams[subExamIndex].educationRequirements = [
      ...newSubExams[subExamIndex].educationRequirements,
      { level: '', level_custom: '', degree: '', specialization: '', specialization_custom:'', min_percentage: null, completion_status: 'Completed', subjects_required_12th: [] }
    ];
    setSubExams(newSubExams);
  };

  const removeEducationRequirement = (subExamIndex: number, eduIndex: number) => {
    const newSubExams = [...subExams];
    newSubExams[subExamIndex].educationRequirements.splice(eduIndex, 1);
    setSubExams(newSubExams);
  };

  const handleEducationRequirementChange = (subExamIndex: number, eduIndex: number, field: string, value: any) => {
    const newSubExams = [...subExams];
    newSubExams[subExamIndex].educationRequirements[eduIndex][field] = value;
    setSubExams(newSubExams);
  };

  const onSubmit = async (data: z.infer<typeof examSchema>) => {
    // Convert blank strings to null recursively
    function blanksToNull(obj: any): any {
      if (Array.isArray(obj)) return obj.map(blanksToNull);
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, blanksToNull(v === '' ? null : v)])
        );
      }
      return obj;
    }
    const cleanedData = blanksToNull(data);
    try {
      // You need assignmentId and internNotes for submission; adapt as needed
      const assignmentId = '';
      const internNotes = '';
      await submitExamForm({ assignmentId, formData: cleanedData, internNotes });
      alert('Exam details submitted successfully!');
    } catch (error) {
      console.error("Error submitting exam form: ", error);
      alert('Failed to submit exam details.');
    }
  };

  const disabilityOptions = [
    "Locomotor Disability",
    "Visual Impairment",
    "Hearing Impairment",
    "Intellectual Disability",
    "Multiple Disabilities",
    "Other"
  ];

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Intern Dashboard</CardTitle>
          <CardDescription>Fill in the exam details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Section 1: Main Exam Information */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Main Exam Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name="main_exam_name"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Main Exam Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., UPSC Civil Services" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="exam_code"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Exam Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., UPSC_CSE_2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="conducting_body"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Conducting Body</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Conducting Body" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UPSC">UPSC</SelectItem>
                            <SelectItem value="SSC">SSC</SelectItem>
                            <SelectItem value="IBPS">IBPS</SelectItem>
                            <SelectItem value="State PSC">State PSC</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchConductingBody === "Other" && (
                    <FormField
                      control={control}
                      name="conducting_body_custom"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Custom Conducting Body</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter custom conducting body" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={control}
                    name="exam_sector"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Exam Sector</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Exam Sector" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Defence">Defence</SelectItem>
                            <SelectItem value="Civil Services">Civil Services</SelectItem>
                            <SelectItem value="Banking">Banking</SelectItem>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Teaching">Teaching</SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchExamSector === "Other" && (
                    <FormField
                      control={control}
                      name="exam_sector_custom"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Custom Exam Sector</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter custom exam sector" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={control}
                    name="application_start_date"
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col space-y-3">
                        <FormLabel>Application Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date()
                              }
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
                      <FormItem className="w-full flex flex-col space-y-3">
                        <FormLabel>Application End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
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
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date()
                              }
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
                      <FormItem className="w-full">
                        <FormLabel>Website Link</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="e.g., https://example.com" {...field} />
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
                      <Button type="button" variant="secondary" size="sm" onClick={() => addSubExam(index)}>
                        Copy
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sub Exam Name */}
                      <div className="w-full">
                        <Label htmlFor={`sub_exam_name_${index}`}>Sub Exam Name</Label>
                        <Input
                          type="text"
                          id={`sub_exam_name_${index}`}
                          value={subExam.sub_exam_name ?? ""}
                          onChange={(e) => handleSubExamChange(index, 'sub_exam_name', e.target.value)}
                          className="w-full"
                        />
                      </div>

                      {/* Short Code */}
                      <div className="w-full">
                        <Label htmlFor={`short_code_${index}`}>Short Code</Label>
                        <Input
                          type="text"
                          id={`short_code_${index}`}
                          value={subExam.short_code ?? ""}
                          onChange={(e) => handleSubExamChange(index, 'short_code', e.target.value)}
                          className="w-full"
                        />
                      </div>

                      {/* Gender */}
                      <div className="w-full">
                        <Label htmlFor={`gender_${index}`}>Gender</Label>
                        <Select
                          id={`gender_${index}`}
                          value={subExam.gender}
                          onValueChange={(value) => handleSubExamChange(index, 'gender', value)}
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
                            onChange={(e) => handleSubExamChange(index, "gender_custom", e.target.value)}
                            className="w-full mt-2"
                          />
                        )}
                      </div>

                      {/* Marital Status */}
                      <div className="w-full">
                        <Label htmlFor={`marital_status_${index}`}>Marital Status</Label>
                        <Select
                          id={`marital_status_${index}`}
                          value={subExam.marital_status}
                          onValueChange={(value) => handleSubExamChange(index, 'marital_status', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Marital Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unmarried">Unmarried</SelectItem>
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
                            onChange={(e) => handleSubExamChange(index, "marital_status_custom", e.target.value)}
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
                                  Enable to specify disability eligibility for this exam.
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
                                <FormLabel>Eligible Disability Types</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  multiple
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select disabilities" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {disabilityOptions.map((disability) => (
                                      <SelectItem key={disability} value={disability}>
                                        {disability}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.getValues(`subExams.${index}.eligible_disability_types`)?.includes("Other") && (
                            <FormField
                              control={control}
                              name={`subExams.${index}.other_disability_specified`}
                              render={({ field }) => (
                                <FormItem className="w-full">
                                  <FormLabel>Specify Other Disability</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Neurological Condition" {...field} />
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
                        <h3 className="text-lg font-semibold mb-2">Age Criteria</h3>
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
                                      {...field}
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
                                      {...field}
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
                                            !field.value && "text-muted-foreground"
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
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                          date > new Date()
                                        }
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
                                            !field.value && "text-muted-foreground"
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
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                          date > new Date()
                                        }
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
                        <h3 className="text-lg font-semibold mb-2">Education Requirements</h3>
                        {subExams[index].educationRequirements.map((requirement, eduIndex) => (
                          <div key={eduIndex} className="border p-4 rounded-md mb-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Level */}
                              <div className="w-full">
                                <Label htmlFor={`level_${index}_${eduIndex}`}>Level</Label>
                                <Select
                                  id={`level_${index}_${eduIndex}`}
                                  value={requirement.level ?? ""}
                                  onValueChange={(value) => handleEducationRequirementChange(index, eduIndex, 'level', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="10th">10th</SelectItem>
                                    <SelectItem value="12th">12th</SelectItem>
                                    <SelectItem value="Diploma">Diploma</SelectItem>
                                    <SelectItem value="Graduation">Graduation</SelectItem>
                                    <SelectItem value="Post-Graduation">Post-Graduation</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                {requirement.level === "Other" && (
                                  <Input
                                    type="text"
                                    placeholder="Specify level"
                                    value={requirement.level_custom ?? ""}
                                    onChange={(e) => handleEducationRequirementChange(index, eduIndex, "level_custom", e.target.value)}
                                    className="w-full mt-2"
                                  />
                                )}
                              </div>

                              {/* Degree */}
                              <div className="w-full">
                                <Label htmlFor={`degree_${index}_${eduIndex}`}>Degree</Label>
                                <Select
                                  id={`degree_${index}_${eduIndex}`}
                                  value={requirement.degree ?? ""}
                                  onValueChange={(value) => handleEducationRequirementChange(index, eduIndex, 'degree', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Degree" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {degreeOptions.map((degree) => (
                                      <SelectItem key={degree} value={degree}>
                                        {degree}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Specialization */}
                              <div className="w-full">
                                <Label htmlFor={`specialization_${index}_${eduIndex}`}>Specialization</Label>
                                <Select
                                  id={`specialization_${index}_${eduIndex}`}
                                  value={requirement.specialization ?? ""}
                                  onValueChange={(value) => handleEducationRequirementChange(index, eduIndex, 'specialization', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Specialization" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {specializationOptions.map((specialization) => (
                                      <SelectItem key={specialization} value={specialization}>
                                        {specialization}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {requirement.specialization === "Other" && (
                                  <Input
                                    type="text"
                                    placeholder="Specify Specialization"
                                    value={requirement.specialization_custom ?? ""}
                                    onChange={(e) => handleEducationRequirementChange(index, eduIndex, "specialization_custom", e.target.value)}
                                    className="w-full mt-2"
                                  />
                                )}
                              </div>

                              {/* Min Percentage */}
                              <div className="w-full">
                                <Label htmlFor={`min_percentage_${index}_${eduIndex}`}>Min Percentage</Label>
                                <Input
                                  type="number"
                                  id={`min_percentage_${index}_${eduIndex}`}
                                  value={requirement.min_percentage ?? ""}
                                  onChange={(e) => handleEducationRequirementChange(index, eduIndex, 'min_percentage', e.target.value === '' ? null : Number(e.target.value))}
                                  placeholder="e.g., 60"
                                  className="w-full"
                                />
                              </div>

                              {/* Completion Status */}
                              <div className="w-full">
                                <Label htmlFor={`completion_status_${index}_${eduIndex}`}>Completion Status</Label>
                                <Select
                                  id={`completion_status_${index}_${eduIndex}`}
                                  value={requirement.completion_status ?? ""}
                                  onValueChange={(value) => handleEducationRequirementChange(index, eduIndex, 'completion_status', value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Final Year">Final Year</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Completion Year */}
                              <div className="w-full">
                                <Label htmlFor={`completion_year_${index}_${eduIndex}`}>Completion Year</Label>
                                <Input
                                  type="text"
                                  id={`completion_year_${index}_${eduIndex}`}
                                  value={requirement.completion_year ?? ""}
                                  onChange={(e) => handleEducationRequirementChange(index, eduIndex, 'completion_year', e.target.value)}
                                  placeholder="e.g., 2023"
                                  maxLength={4}
                                  className="w-full"
                                />
                              </div>

                              {/* Subjects Required (12th) - Conditional */}
                              {requirement.level === "12th" && (
                                <div className="w-full">
                                  <Label htmlFor={`subjects_required_12th_${index}_${eduIndex}`}>Subjects Required (12th)</Label>
                                  <Input type="text" placeholder="e.g., Mathematics, Physics" className="w-full" />
                                </div>
                              )}
                            </div>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeEducationRequirement(index, eduIndex)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button type="button" size="sm" onClick={() => addEducationRequirement(index)}>
                          Add Education Requirement
                        </Button>
                      </div>

                      {/* Section 5: Nationality and Domicile */}
                      <div className="w-full">
                        <h3 className="text-lg font-semibold mb-2">Nationality and Domicile</h3>
                        <FormField
                          control={control}
                          name={`subExams.${index}.nationality`}
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Nationality</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                multiple
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select nationalities" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {nationalityOptions.map((nationality) => (
                                    <SelectItem key={nationality} value={nationality}>
                                      {nationality}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.getValues(`subExams.${index}.nationality`)?.includes("Other") && (
                                <Input
                                  type="text"
                                  placeholder="Specify nationality"
                                  value={subExam.nationality_custom || ""}
                                  onChange={(e) => handleSubExamChange(index, "nationality_custom", e.target.value)}
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
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                multiple
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select domiciles" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {domicileOptions.map((domicile) => (
                                    <SelectItem key={domicile} value={domicile}>
                                      {domicile}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.getValues(`subExams.${index}.domicile`)?.includes("Other") && (
                                <Input
                                  type="text"
                                  placeholder="Specify domicile"
                                  value={subExam.domicile_custom || ""}
                                  onChange={(e) => handleSubExamChange(index, "domicile_custom", e.target.value)}
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
                        <h3 className="text-lg font-semibold mb-2">Category-Based Relaxations (Optional)</h3>
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
                                <FormLabel>Has Category Relaxation?</FormLabel>
                                <FormDescription>
                                  Enable to specify category-based relaxations for this exam.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        {watch(`subExams.${index}.has_category_relaxation`) && (
                          <div>
                            {subExams[index].categoryRelaxations?.map((relaxation, relaxIndex) => (
                              <div key={relaxIndex} className="border p-4 rounded-md mb-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Category */}
                                  <div className="w-full">
                                    <Label>Category</Label>
                                    <Select
                                      value={relaxation.category_key}
                                      onValueChange={(value) => {
                                        const newSubExams = [...subExams];
                                        newSubExams[index].categoryRelaxations[relaxIndex].category_key = value;
                                        setSubExams(newSubExams);
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categoryOptions.map((category) => (
                                          <SelectItem key={category} value={category}>
                                            {category}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {relaxation.category_key === "Other" && (
                                      <Input
                                        type="text"
                                        value={relaxation.custom_category_name ?? ""}
                                        onChange={(e) => {
                                          const newSubExams = [...subExams];
                                          newSubExams[index].categoryRelaxations[relaxIndex].custom_category_name = e.target.value;
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
                                      value={relaxation.age_relaxation_years ?? ""}
                                      onChange={(e) => {
                                        const newSubExams = [...subExams];
                                        const newValue = Math.max(0, Math.min(10, Number(e.target.value))); // Ensure value is between 0 and 10
                                        newSubExams[index].categoryRelaxations[relaxIndex].age_relaxation_years = newValue;
                                        setSubExams(newSubExams);
                                      }}
                                      placeholder="e.g., 3"
                                      className="w-full"
                                    />
                                  </div>

                                  {/* Education Relaxation (in %) */}
                                  <div className="w-full">
                                    <Label>Education Relaxation (in %)</Label>
                                    <Input
                                      type="number"
                                      value={relaxation.education_relaxation_percent ?? ""}
                                      onChange={(e) => {
                                        const newSubExams = [...subExams];
                                        const newValue = e.target.value === "" ? null : Math.max(0, Math.min(20, Number(e.target.value))); // Ensure value is between 0 and 20 or null
                                        newSubExams[index].categoryRelaxations[relaxIndex].education_relaxation_percent = newValue;
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
                                        newSubExams[index].categoryRelaxations[relaxIndex].remarks = e.target.value;
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
                                    newSubExams[index].categoryRelaxations.splice(relaxIndex, 1);
                                    setSubExams(newSubExams);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
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
                        <h3 className="text-lg font-semibold mb-2">Exam Subjects &amp; Medium</h3>
                        <FormField
                          control={control}
                          name={`subExams.${index}.exam_subjects`}
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Exam Subjects</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                multiple
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select exam subjects" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {languageOptions.map((language) => (
                                    <SelectItem key={language} value={language}>
                                      {language}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.getValues(`subExams.${index}.exam_subjects`)?.includes("Other") && (
                                <Input
                                  type="text"
                                  placeholder="Specify exam subjects"
                                  value={subExam.exam_subjects_custom || ""}
                                  onChange={(e) => handleSubExamChange(index, "exam_subjects_custom", e.target.value)}
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
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                multiple
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select exam medium" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {languageOptions.map((language) => (
                                    <SelectItem key={language} value={language}>
                                      {language}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {form.getValues(`subExams.${index}.exam_medium`)?.includes("Other") && (
                                <Input
                                  type="text"
                                  placeholder="Specify exam medium"
                                  value={subExam.exam_medium_custom ?? ""}
                                  onChange={(e) => handleSubExamChange(index, "exam_medium_custom", e.target.value)}
                                  className="w-full mt-2"
                                />
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeSubExam(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" onClick={addSubExam}>
                  Add Sub Exam
                </Button>
              </div>

              <Button type="submit" className="w-full">
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
