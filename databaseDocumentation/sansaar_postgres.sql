CREATE TYPE "lang_options" AS ENUM (
  'hi',
  'en',
  'ta',
  'te'
);

CREATE TYPE "courses_type" AS ENUM (
  'html',
  'js',
  'python'
);

CREATE TYPE "exercises_review_type" AS ENUM (
  'manual',
  'peer',
  'facilitator',
  'automatic'
);

CREATE TYPE "exercises_submission_type" AS ENUM (
  'number',
  'text',
  'text_large',
  'attachments',
  'url'
);

CREATE TYPE "user_roles_roles" AS ENUM (
  'admin',
  'alumni',
  'students',
  'facilitator'
);

CREATE TYPE "user_roles_center" AS ENUM (
  'dharamshala',
  'banagalore',
  'all'
);

CREATE TABLE "c_users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "mobile" varchar(255),
  "user_name" varchar(255) NOT NULL,
  "mail_id" varchar(255) NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "password" bytea,
  "profile_pic" varchar(255),
  "google_user_id" varchar(255),
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "category" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "category_name" varchar(100) NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "classes" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "title" varchar(45) NOT NULL,
  "description" varchar(255) NOT NULL,
  "facilitator_id" int,
  "facilitator_name" varchar(80),
  "facilitator_email" varchar(80),
  "start_time" timestamptz NOT NULL,
  "end_time" timestamptz NOT NULL,
  "category_id" int NOT NULL,
  "course_id" int,
  "exercise_id" int,
  "video_id" varchar(45),
  "lang" lang_options NOT NULL DEFAULT 'hi',
  "type" varchar,
  "meet_link" varchar(12),
  "calendar_event_id" varchar(255)
);

CREATE TABLE "class_registrations" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "class_id" int NOT NULL,
  "user_id" int NOT NULL,
  "registered_at" timestamptz NOT NULL,
  "feedback" varchar(1000),
  "feedback_at" timestamptz
);

CREATE TABLE "contacts" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "student_id" int,
  "mobile" varchar(10),
  "is_whatsapp" boolean DEFAULT false,
  "contact_type" varchar(255),
  "created_at" timestamptz
);

CREATE TABLE "course_categories" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "course_id" int NOT NULL,
  "category_id" int NOT NULL,
  "created_at" timestamptz
);

CREATE TABLE "courses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type" courses_type,
  "name" varchar(100),
  "logo" varchar(100),
  "notes" varchar(10000),
  "days_to_complete" bigint,
  "short_description" varchar(300)
);

CREATE TABLE "course_completion" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" int NOT NULL,
  "course_id" int NOT NULL
);

CREATE TABLE "course_enrolments" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "student_id" bigint NOT NULL,
  "course_id" bigint NOT NULL,
  "enrolled_at" timestamptz,
  "completed_at" timestamptz
);

CREATE TABLE "course_relation" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "course_id" bigint NOT NULL,
  "relies_on" bigint NOT NULL
);

CREATE TABLE "daily_metrics" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "metric_name" varchar(255),
  "value" int,
  "date" date,
  "created_at" timestamptz,
  "gender" int
);

CREATE TABLE "enrolment_keys" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "key" varchar(6),
  "student_id" int,
  "start_time" timestamptz,
  "end_time" timestamptz,
  "total_marks" varchar(45),
  "type_of_test" varchar(255),
  "question_set_id" int,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "exercises" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "parent_exercise_id" bigint,
  "course_id" bigint NOT NULL,
  "name" varchar(300) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "sequence_num" double,
  "review_type" exercises_review_type,
  "content" text,
  "submission_type" exercises_submission_type,
  "github_link" varchar(300),
  "solution" text
);

CREATE TABLE "exercise_completion" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" int NOT NULL,
  "exercise_id" int NOT NULL
);

CREATE TABLE "feedbacks" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "student_id" int,
  "user_id" int,
  "student_stage" varchar(255) NOT NULL,
  "feedback" text,
  "state" varchar(255),
  "who_assign" varchar(255),
  "to_assign" varchar(255),
  "audio_recording" varchar(255),
  "deadline_at" timestamptz,
  "finished_at" timestamptz,
  "last_updated" timestamptz,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "incoming_calls" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "contact_id" int,
  "call_type" varchar(15),
  "created_at" timestamptz
);

CREATE TABLE "k_details" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "parents_name" varchar(255) NOT NULL,
  "address" varchar(255) NOT NULL,
  "city" varchar(255) NOT NULL,
  "state" varchar(255) NOT NULL,
  "pin_code" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL,
  "email" varchar(255) NOT NULL,
  "profile_pic" varchar(255) NOT NULL,
  "indemnity_form" varchar(255) NOT NULL,
  "deleted" boolean
);

CREATE TABLE "knex_migrations" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "name" varchar(255),
  "batch" bigint,
  "migration_time" timestamptz
);

CREATE TABLE "mentor_tree" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "mentor_id" int NOT NULL,
  "mentee_id" int NOT NULL,
  "pathway_id" int NOT NULL,
  "created_at" timestamptz
);

CREATE TABLE "mentors" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "mentor" bigint,
  "mentee" bigint,
  "scope" varchar(255),
  "user_id" int,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "migrations" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "run_on" timestamptz NOT NULL
);

CREATE TABLE "partner_assessments" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(45) NOT NULL,
  "assessments_key_url" varchar(300),
  "assessments_url" varchar(300),
  "question_set_id" varchar(45) NOT NULL,
  "partner_id" int NOT NULL,
  "created_at" varchar(45) NOT NULL
);

CREATE TABLE "partners" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(45),
  "notes" varchar(2000),
  "slug" varchar(255),
  "created_at" timestamptz
);

CREATE TABLE "pathway_completion" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" int NOT NULL,
  "pathway_id" int NOT NULL
);

CREATE TABLE "pathway_courses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "course_id" int NOT NULL,
  "pathway_id" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_milestones" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(45) NOT NULL,
  "description" varchar(5000) NOT NULL,
  "pathway_id" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_tracking_form_structure" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "pathway_id" int NOT NULL,
  "parameter_id" int,
  "question_id" int,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_tracking_request" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "pathway_id" int NOT NULL,
  "mentor_id" int NOT NULL,
  "mentee_id" int NOT NULL,
  "status" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_tracking_request_details" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "pathway_id" int NOT NULL,
  "mentor_id" int NOT NULL,
  "mentee_id" int NOT NULL,
  "request_id" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_tracking_request_parameter_details" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "parameter_id" int NOT NULL,
  "data" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathway_tracking_request_question_details" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "question_id" int NOT NULL,
  "data" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "pathways" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "code" varchar(6) UNIQUE NOT NULL,
  "name" varchar(45) NOT NULL,
  "description" varchar(5000) NOT NULL,
  "created_at" timestamptz NOT NULL,
  "tracking_enabled" boolean NOT NULL DEFAULT false,
  "tracking_frequency" varchar(255),
  "tracking_day_of_week" int,
  "tracking_days_lock_before_cycle" int
);

CREATE TABLE "progress_parameters" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type" varchar(10) NOT NULL,
  "min_range" int,
  "max_range" int,
  "created_at" timestamptz NOT NULL,
  "name" varchar(20) NOT NULL,
  "description" varchar(5000) NOT NULL
);

CREATE TABLE "progress_questions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "type" varchar(10) NOT NULL,
  "created_at" timestamptz NOT NULL,
  "name" varchar(20) NOT NULL,
  "description" varchar(5000) NOT NULL
);

CREATE TABLE "question_attempts" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "enrolment_key_id" int NOT NULL,
  "question_id" int NOT NULL,
  "selected_option_id" int,
  "text_answer" varchar(45),
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "question_bucket_choices" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "bucket_id" int,
  "question_ids" text NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "question_buckets" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "num_questions" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "question_options" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "text" varchar(2000) NOT NULL,
  "question_id" int NOT NULL,
  "correct" bool NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "question_sets" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "question_ids" varchar(8000) NOT NULL,
  "version_id" int NOT NULL,
  "created_at" timestamptz
);

CREATE TABLE "questions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "common_text" varchar(2000),
  "en_text" varchar(2000),
  "hi_text" varchar(2000),
  "difficulty" int NOT NULL,
  "topic" varchar(45) NOT NULL,
  "type" int NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "sansaar_user_roles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" int NOT NULL,
  "role" varchar(255),
  "created_at" timestamptz
);

CREATE TABLE "stage_transitions" (
  "id" int NOT NULL,
  "student_id" int,
  "from_stage" varchar(255),
  "to_stage" varchar(255),
  "created_at" timestamptz
);

CREATE TABLE "stage_pathways" (
  "id" int NOT NULL,
  "user_id" int NOT NULL,
  "pathway_id" int NOT NULL,
  "created_at" timestamptz
);

CREATE TABLE "students" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(300),
  "gender" int,
  "dob" timestamptz,
  "email" varchar(150),
  "state" varchar(2),
  "city" varchar(45),
  "gps_lat" varchar(45),
  "gps_long" varchar(45),
  "pin_code" varchar(10),
  "qualification" int,
  "current_status" int,
  "school_medium" int,
  "religon" int,
  "caste" int,
  "percentage_in10th" varchar(255),
  "math_marks_in10th" int,
  "percentage_in12th" varchar(255),
  "math_marks_in12th" int,
  "stage" varchar(45),
  "tag" varchar(255),
  "partner_id" int,
  "created_at" timestamptz
);

CREATE TABLE "test_versions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" varchar(45) NOT NULL,
  "data" text NOT NULL,
  "current" boolean NOT NULL,
  "created_at" timestamptz NOT NULL
);

CREATE TABLE "user_roles" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "user_id" bigint NOT NULL,
  "roles" user_roles_roles,
  "center" user_roles_center
);

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "email" varchar(50) NOT NULL,
  "name" varchar(250) NOT NULL,
  "profile_picture" varchar(250),
  "google_user_id" varchar(250),
  "center" users_center,
  "github_link" varchar(145),
  "linkedin_link" varchar(145),
  "medium_link" varchar(145),
  "created_at" timestamptz,
  "chat_id" varchar(255),
  "chat_password" varchar(32),
  "partner_id" int,
  "lang_1" char(2),
  "lang_2" char(2)
);

CREATE TABLE "vb_sentences" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "sentence" varchar(255) NOT NULL,
  "h_translation" varchar(255) NOT NULL,
  "d_level" bigint NOT NULL
);

CREATE TABLE "vb_words" (
  "id" BIGSERIAL PRIMARY KEY NOT NULL,
  "word" varchar(250) NOT NULL,
  "e_meaning" varchar(250) NOT NULL,
  "h_meaning" varchar(250) NOT NULL,
  "word_type" varchar(5),
  "d_level" bigint NOT NULL
);

ALTER TABLE "classes" ADD FOREIGN KEY ("category_id") REFERENCES "category" ("id");

ALTER TABLE "class_registrations" ADD FOREIGN KEY ("class_id") REFERENCES "classes" ("id");

ALTER TABLE "course_categories" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "course_categories" ADD FOREIGN KEY ("category_id") REFERENCES "category" ("id");

ALTER TABLE "course_completion" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "course_completion" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "course_enrolments" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id");

ALTER TABLE "course_enrolments" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "course_relation" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "course_relation" ADD FOREIGN KEY ("relies_on") REFERENCES "courses" ("id");

ALTER TABLE "enrolment_keys" ADD FOREIGN KEY ("question_set_id") REFERENCES "question_sets" ("id");

ALTER TABLE "exercises" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "exercise_completion" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "exercise_completion" ADD FOREIGN KEY ("exercise_id") REFERENCES "exercises" ("id");

ALTER TABLE "feedbacks" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id");

ALTER TABLE "feedbacks" ADD FOREIGN KEY ("user_id") REFERENCES "c_users" ("id");

ALTER TABLE "incoming_calls" ADD FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id");

ALTER TABLE "mentor_tree" ADD FOREIGN KEY ("mentor_id") REFERENCES "users" ("id");

ALTER TABLE "mentor_tree" ADD FOREIGN KEY ("mentee_id") REFERENCES "users" ("id");

ALTER TABLE "mentor_tree" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_completion" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "pathway_completion" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_courses" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id");

ALTER TABLE "pathway_courses" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_milestones" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_tracking_form_structure" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_tracking_form_structure" ADD FOREIGN KEY ("parameter_id") REFERENCES "progress_parameters" ("id");

ALTER TABLE "pathway_tracking_form_structure" ADD FOREIGN KEY ("question_id") REFERENCES "progress_questions" ("id");

ALTER TABLE "pathway_tracking_request" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_tracking_request" ADD FOREIGN KEY ("mentor_id") REFERENCES "users" ("id");

ALTER TABLE "pathway_tracking_request" ADD FOREIGN KEY ("mentee_id") REFERENCES "users" ("id");

ALTER TABLE "pathway_tracking_request_details" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "pathway_tracking_request_details" ADD FOREIGN KEY ("mentor_id") REFERENCES "users" ("id");

ALTER TABLE "pathway_tracking_request_details" ADD FOREIGN KEY ("mentee_id") REFERENCES "users" ("id");

ALTER TABLE "pathway_tracking_request_details" ADD FOREIGN KEY ("request_id") REFERENCES "pathway_tracking_request" ("id");

ALTER TABLE "pathway_tracking_request_parameter_details" ADD FOREIGN KEY ("parameter_id") REFERENCES "progress_parameters" ("id");

ALTER TABLE "pathway_tracking_request_question_details" ADD FOREIGN KEY ("question_id") REFERENCES "progress_questions" ("id");

ALTER TABLE "question_bucket_choices" ADD FOREIGN KEY ("bucket_id") REFERENCES "question_buckets" ("id");

ALTER TABLE "question_options" ADD FOREIGN KEY ("question_id") REFERENCES "questions" ("id");

ALTER TABLE "question_sets" ADD FOREIGN KEY ("version_id") REFERENCES "test_versions" ("id");

ALTER TABLE "sansaar_user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "stage_transitions" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id");

ALTER TABLE "stage_pathways" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "stage_pathways" ADD FOREIGN KEY ("pathway_id") REFERENCES "pathways" ("id");

ALTER TABLE "students" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id");

ALTER TABLE "user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
