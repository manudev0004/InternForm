# **App Name**: ExamPrep Portal

## Core Features:

- User Authentication: User authentication with role-based access control (admin, intern, guest).
- Exam Data Input: Form display for interns with validation for required fields (exam details, source link, notes).
- Admin Dashboard: Admin dashboard for viewing all exams, assigning exams to interns, and approving/rejecting submissions.
- Guest View: Guest dashboard for read-only access to submitted and reviewed exam records.
- AI-Assisted Field Completion: AI powered tool that suggests possible values for fields like 'examLevel' and 'category' based on the 'examName' and 'conductingBody'.

## Style Guidelines:

- Primary color: White or light grey for clean interface.
- Secondary color: Dark grey or black for text and important elements.
- Accent: Teal (#008080) for interactive elements and highlights.
- Clear and readable font for form fields and data display.
- Well-organized layout with clear sections for each exam detail.
- Use of simple, consistent icons to represent different data categories.

## Original User Request:
I want to create a Firebase project to build a full-stack web app that allows us to manage data for government and competitive exams. Here's what I need Firebase Studio to set up for me:

🔐 Authentication Setup
Users & Roles:
Admin

Full access to all data.

Can view, edit, assign tasks to interns, and manage users.

Intern

Can only view and fill unassigned or assigned exam records.

Must add:

All field values,

Source link,

Notes for each exam.

Guest

View-only access to submitted exam records.

Auth Requirements:
Firebase Authentication using email/password login.

Store user role (admin, intern, guest) in Firestore in a users collection.

Enable auto logout after 30 minutes of inactivity.

Optional: 2FA for admin accounts.

📦 Firestore Database Structure
Collection: exams
Each document in exams represents one exam. All fields must exist in a single document (one row per exam). Interns will fill this.

🔹 Fields (Grouped):
1. Basic Information
examName (string)

conductingBody (string, dropdown: UPSC, SSC, Railways, State PSC, IBPS, Other)

examLevel (string, dropdown: National, State, Institutional)

category (string, dropdown: Defense, Banking, Civil Services, Teaching, Medical, Engineering, Other)

2. Eligibility Criteria
minAge (number)

maxAge (number)

ageRelaxation (object with subfields for categories: SC, ST, OBC, PwD, etc.)

educationQualification (string, long text)

requiredPercentage (number, optional)

3. Dates
notificationDate (timestamp)

applicationStartDate (timestamp)

applicationEndDate (timestamp)

examDate (timestamp)

4. Quota & Reservation
reservationPolicy (string, long text)

quotaAvailable (boolean)

5. Documents Required
documentsList (array of strings)

photoSpecs (string, optional)

6. Status & Workflow
isFilled (boolean)

filledBy (userID of intern)

filledDate (timestamp)

reviewedBy (admin ID)

reviewStatus (dropdown: Pending, Approved, Rejected)

adminNotes (string)

7. Link & Notes
dataSourceLink (string, URL)

internNote (string)

adminNote (string)

👤 Collection: users
Each document represents a user.

email (string)

role (dropdown: admin, intern, guest)

assignedExams (array of exam IDs for interns)

🛠️ UI & Workflow Features
When an intern logs in:

Automatically fetch one unfilled exam.

Display all fields in a form.

Required to fill all fields, paste the source link, and add notes before submitting.

Submit button should validate all required fields.

Admin Dashboard:

Can see all exams.

Can assign exams to interns.

Can approve/reject submitted entries.

Can view logs of edits.

Guest Dashboard:

Read-only table of all submitted and reviewed exams.

✅ Additional Setup Instructions:
Enable Firestore rules based on user role.

Use Firestore security rules to:

Allow read/write based on role,

Prevent interns from editing others’ data,

Allow admin to approve/reject entries.
  