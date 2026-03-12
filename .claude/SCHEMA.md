USERS TABLE (Global identity of every human using the platform)

users.id — Unique identifier for every person in the system.
users.name — Full name of the person (admin, teacher, or student).
users.username — Unique login identifier used for authentication.
users.email — Optional email used mainly for teachers/admin password resets and communication.
users.phone — Optional phone number for contact purposes.
users.password_hash — Securely hashed password used for authentication.
users.must_reset_password — Forces user to change the temporary password on first login.
users.is_active — Determines if the user account is allowed to log in.
users.last_login_at — Timestamp of the user’s most recent login.
users.created_at — Timestamp when the user record was created.
users.updated_at — Timestamp when the user record was last updated.

SCHOOLS TABLE (Represents each school tenant using the SaaS)

schools.id — Unique identifier for each school.
schools.schoolCode — Short unique code identifying the school across the platform.
schools.schoolName — Full name of the school.
schools.subscription_status — Billing state of the school (TRIAL, ACTIVE, SUSPENDED, CANCELLED).
schools.status — Operational status determining whether the school can access the system (ACTIVE or INACTIVE).
schools.trial_ends_at — Timestamp indicating when the school’s trial period expires.
schools.subscription_ends_at — Timestamp indicating when the paid subscription ends.
schools.max_students — Maximum number of students allowed for the school based on its pricing plan.
schools.created_at — Timestamp when the school was registered in the system.
schools.updated_at — Timestamp when the school record was last updated.

SCHOOL_USERS TABLE (Maps users to schools and defines their role within that school)

school_users.id — Unique identifier for the membership record.
school_users.school_id — Foreign key referencing the school the user belongs to.
school_users.user_id — Foreign key referencing the user assigned to that school.
school_users.role — Role of the user within that school (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT).
school_users.status — Indicates whether the membership is currently active.
school_users.joined_at — Timestamp when the user joined the school system.
school_users.left_at — Timestamp indicating when the user left the school (if applicable).
school_users.created_at — Timestamp when the membership record was created.
school_users.updated_at — Timestamp when the membership record was last updated.

STUDENTS TABLE (Academic metadata for student users within a school)

students.id — Unique identifier for the student record.
students.school_id — Foreign key referencing the school the student belongs to.
students.user_id — Foreign key referencing the user identity of the student.
students.admission_no — Unique admission number assigned by the school.
students.class — Academic class/grade of the student.
students.section — Section or division within the class.
students.roll_no — Roll number assigned to the student within the class.
students.admission_date — Date when the student was admitted to the school.
students.stream — Optional academic stream for higher classes (e.g., Science, Commerce).
students.guardian_name — Name of the student’s primary guardian.
students.guardian_phone — Contact phone number of the guardian.
students.status — Indicates if the student is active, inactive, or transferred.
students.created_at — Timestamp when the student record was created.
students.updated_at — Timestamp when the student record was last updated.

TEACHERS TABLE (Professional metadata for teacher users)

teachers.id — Unique identifier for the teacher record.
teachers.school_id — Foreign key referencing the school the teacher belongs to.
teachers.user_id — Foreign key referencing the user identity of the teacher.
teachers.employee_id — Unique employee identifier used for teacher login and management.
teachers.joining_date — Date when the teacher joined the school.
teachers.status — Indicates whether the teacher is currently active or inactive.
teachers.created_at — Timestamp when the teacher record was created.
teachers.updated_at — Timestamp when the teacher record was last updated.