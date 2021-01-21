//// -- LEVEL 1
//// -- Tables and References

// Creating tables
Table c_users {
  id int [pk, increment, not null] // auto-increment
  mobile varchar(255)
  user_name varchar(255) [not null]
  mail_id varchar(255) [not null]
  email varchar(255) [unique, not null]
  password bytea
  profile_pic varchar(255)
  google_user_id varchar(255)
  created_at timestamptz [not null] 
}

Table category {
  id int [pk, increment, not null]
  category_name varchar(100) [not null]
  created_at timestamptz [not null]
}
 
Enum lang_options {
  hi
  en
  ta 
  te
}

Table classes {
  id int [pk, increment, not null]
  title varchar(45) [not null]
  description varchar(255) [not null]
  facilitator_id int 
  facilitator_name varchar(80)
  facilitator_email varchar(80)
  start_time timestamptz [not null]
  end_time timestamptz [not null]
  category_id int [not null, ref: > category.id]
  course_id int
  exercise_id int 
  video_id varchar(45)
  lang lang_options [not null, default: "hi"]
  type varchar
  meet_link varchar(12)
  calendar_event_id varchar(255)
}


Table class_registrations {
  id int [pk, increment, not null]
  class_id int [not null, ref: > classes.id]
  user_id int [not null]
  registered_at timestamptz [not null]
  feedback varchar(1000)
  feedback_at timestamptz
}

Table contacts {
  id int [pk, increment, not null]
  student_id int
  mobile varchar(10)
  is_whatsapp boolean [default: false]
  contact_type varchar(255)
  created_at timestamptz
}

Table course_categories {
  id int [pk, increment, not null]
  course_id int [not null, ref: > courses.id]
  category_id int [not null, ref: - category.id]
  created_at timestamptz
}

Enum courses_type {
  html
  js
  python
}

Table courses {
  id int [pk, increment, not null]
  type courses_type
  name varchar(100)
  logo varchar(100)
  notes varchar(10000)
  days_to_complete bigint
  short_description varchar(300)
}

Table course_completion {
  id int [pk, increment, not null]
  user_id int [not null, ref: > users.id]
  course_id int [ref: > courses.id, not null] 
}

Table course_enrolments {
  id bigint [pk, increment, not null]
  student_id bigint [not null, ref: > users.id]
  course_id bigint [ref: > courses.id, not null]
  enrolled_at timestamptz
  completed_at timestamptz
}

Table course_relation {
  id bigint [pk, increment, not null]
  course_id bigint [ref: > courses.id, not null]
  relies_on bigint [ref: > courses.id, not null]
}

Table daily_metrics {
  id int [pk, increment, not null]
  metric_name varchar(255)
  value int
  date date
  created_at timestamptz
  gender int
}

Table enrolment_keys {
  id int [pk, increment, not null]
  key varchar(6)
  student_id int
  start_time timestamptz
  end_time timestamptz
  total_marks varchar(45)
  type_of_test varchar(255)
  question_set_id int [ref: > question_sets.id]
  created_at timestamptz [not null]
}

Enum exercises_review_type {
  manual
  peer 
  facilitator
  automatic
}

Enum exercises_submission_type {
  number
  text
  text_large
  attachments
  url
}

Table exercises {
  id bigint [pk, increment, not null]
  parent_exercise_id bigint
  course_id bigint [not null, ref: > courses.id]
  name varchar(300) [not null]
  slug varchar(100) [not null]
  sequence_num double
  review_type exercises_review_type
  content text
  submission_type exercises_submission_type
  github_link varchar(300)
  solution text
}

Table exercise_completion {
  id int [pk, increment, not null]
  user_id int [not null, ref: > users.id]
  exercise_id int [ref: > exercises.id, not null] 
}

Table feedbacks {
  id int [pk, increment, not null]
  student_id int [ref: > students.id]
  user_id int [ref: > c_users.id]
  student_stage varchar(255) [not null]
  feedback text
  state varchar(255)
  who_assign varchar(255)
  to_assign varchar(255)
  audio_recording varchar(255)
  deadline_at timestamptz
  finished_at timestamptz
  last_updated timestamptz
  created_at timestamptz [not null]
}

Table incoming_calls {
  id int [pk, increment, not null]
  contact_id int [ref: > contacts.id]
  call_type varchar(15)
  created_at timestamptz
}

Table k_details {
  id bigint [pk, increment, not null]
  name varchar(255) [not null]
  parents_name varchar(255) [not null]
  address varchar(255) [not null]
  city varchar(255) [not null]
  state varchar(255) [not null]
  pin_code varchar(255) [not null]
  created_at timestamptz [not null]
  email varchar(255) [not null]
  profile_pic varchar(255) [not null]
  indemnity_form varchar(255) [not null]
  deleted boolean
}

Table knex_migrations {
  id bigint [pk, increment, not null]
  name varchar(255)
  batch bigint
  migration_time timestamptz
}

Table mentor_tree {
  id bigint [pk, increment, not null]
  mentor_id int [not null, ref: > users.id]
  mentee_id int [not null, ref: > users.id]
  pathway_id int [not null, ref: > pathways.id]
  created_at timestamptz
}

Table mentors {
  id bigint [pk, increment, not null]
  mentor bigint
  mentee bigint
  scope varchar(255)
  user_id int
  created_at timestamptz [not null]
}

Table migrations {
  id bigint [pk, increment, not null]
  name varchar(255) [not null]
  run_on timestamptz [not null]
}

Table partner_assessments {
  id int [pk,increment, not null]
  name varchar(45) [not null]
  assessments_key_url varchar(300)
  assessments_url varchar(300)
  question_set_id varchar(45) [not null]
  partner_id int [not null]
  created_at varchar(45) [not null]
}

Table partners {
  id int [pk,increment, not null]
  name varchar(45)
  notes varchar(2000)
  slug varchar(255)
  created_at timestamptz
}

Table pathway_completion {
  id int [pk,increment, not null]
  user_id int [not null, ref: > users.id]
  pathway_id int [not null, ref: > pathways.id]
}

Table pathway_courses {
  id int [pk,increment, not null]
  course_id int [not null, ref: > courses.id]
  pathway_id int [not null, ref: > pathways.id]
  created_at timestamptz [not null]
}

Table pathway_milestones {
  id int [pk,increment, not null]
  name varchar(45) [not null]
  description varchar(5000) [not null]
  pathway_id int [not null, ref: > pathways.id]
  created_at timestamptz [not null]
}

Table pathway_tracking_form_structure {
  id int [pk,increment, not null]
  pathway_id int [not null, ref: > pathways.id]
  parameter_id int [ref: > progress_parameters.id]
  question_id int [ref: > progress_questions.id]
  created_at timestamptz [not null]
}

Table pathway_tracking_request {
  id int [pk,increment, not null]
  pathway_id int [not null, ref: > pathways.id]
  mentor_id int [not null, ref: > users.id]
  mentee_id int [not null, ref: > users.id]
  status varchar(255) [not null]
  created_at timestamptz [not null]
}

Table pathway_tracking_request_details {
  id int [pk,increment, not null]
  pathway_id int [not null, ref: > pathways.id]
  mentor_id int [not null, ref: > users.id]
  mentee_id int [not null, ref: > users.id]
  request_id int [not null, ref: > pathway_tracking_request.id]
  created_at timestamptz [not null]
}

Table pathway_tracking_request_parameter_details {
  id int [pk,increment, not null]
  parameter_id int [not null, ref: > progress_parameters.id]
  data int [not null]
  created_at timestamptz [not null]
}

Table pathway_tracking_request_question_details {
  id int [pk,increment, not null]
  question_id int [not null, ref: > progress_questions.id]
  data varchar(255) [not null]
  created_at timestamptz [not null]
}

Table pathways {
  id int [pk, increment, not null]
  code varchar(6) [unique, not null]
  name varchar(45) [not null]
  description varchar(5000) [not null]
  created_at timestamptz [not null]
  tracking_enabled boolean [not null, default: false]
  tracking_frequency varchar(255)
  tracking_day_of_week int
  tracking_days_lock_before_cycle int
}

Table progress_parameters {
  id int [pk, increment, not null]
  type varchar(10) [not null]
  min_range int
  max_range int
  created_at timestamptz [not null]
  name varchar(20) [not null]
  description varchar(5000) [not null]
}

Table progress_questions {
  id int [pk, increment, not null]
  type varchar(10) [not null]
  created_at timestamptz [not null]
  name varchar(20) [not null]
  description varchar(5000) [not null]
}

Table question_attempts {
  id int [pk, increment, not null]
  enrolment_key_id int [not null]
  question_id int [not null]
  selected_option_id int
  text_answer varchar(45)
  created_at timestamptz [not null]
}

Table question_bucket_choices {
  id int [pk, increment, not null]
  bucket_id int [ref: > question_buckets.id]
  question_ids text [not null]
  created_at timestamptz [not null]
}

Table question_buckets {
  id int [pk, increment, not null]
  name varchar(100) [not null]
  num_questions int [not null]
  created_at timestamptz [not null]  
}

Table question_options {
  id int [pk, increment, not null]
  text varchar(2000) [not null]
  question_id int [not null, ref: > questions.id]
  correct bool [not null]
  created_at timestamptz [not null]  
}

Table question_sets {
  id int [pk, increment, not null]
  question_ids varchar(8000) [not null]
  version_id int [not null, ref: > test_versions.id]
  created_at timestamptz  
}

Table questions {
  id int [pk, increment, not null]
  common_text varchar(2000)
  en_text varchar(2000)
  hi_text varchar(2000)
  difficulty int [not null]
  topic varchar(45) [not null]
  type int [not null]
  created_at timestamptz [not null]  
}

Table sansaar_user_roles {
  id int [pk, increment, not null]
  user_id int [not null, ref: > users.id]
  role varchar(255)
  created_at timestamptz
}

Table stage_transitions {
  id int [not null]
  student_id int [ref: > students.id]
  from_stage varchar(255)
  to_stage varchar(255)
  created_at timestamptz
}

Table stage_pathways {
  id int [not null]
  user_id int [not null, ref: > users.id]
  pathway_id int [not null, ref: > pathways.id]
  created_at timestamptz
}

Table students {
  id int [pk, increment, not null]
  name varchar(300)
  gender int
  dob timestamptz
  email varchar(150)
  state varchar(2)
  city varchar(45)
  gps_lat varchar(45)
  gps_long varchar(45)
  pin_code varchar(10)
  qualification int
  current_status int
  school_medium int
  religon int
  caste int
  percentage_in10th varchar(255)
  math_marks_in10th int
  percentage_in12th varchar(255)
  math_marks_in12th int
  stage varchar(45)
  tag varchar(255)
  partner_id int [ref: > partners.id]
  created_at timestamptz
}

Table test_versions {
  id int [pk, increment, not null]
  name varchar(45) [not null]
  data text [not null]
  current boolean [not null]
  created_at timestamptz [not null]
}

Enum user_roles_roles {
  admin
  alumni
  students
  facilitator
}

Enum user_roles_center {
  dharamshala
  banagalore
  all
}

Table user_roles {
  id bigint [pk, increment, not null]
  user_id bigint [not null, ref: > users.id]
  roles user_roles_roles
  center user_roles_center
}

Table users {
  id int [pk, increment, not null]
  email varchar(50) [not null]
  name varchar(250) [not null]
  profile_picture varchar(250)
  google_user_id varchar(250)
  center users_center
  github_link varchar(145)
  linkedin_link varchar(145)
  medium_link varchar(145)
  created_at timestamptz
  chat_id varchar(255)
  chat_password varchar(32)
  partner_id int
  lang_1 char(2)
  lang_2 char(2)
}

Table vb_sentences {
  id bigint [pk, increment, not null]
  sentence varchar(255) [not null]
  h_translation varchar(255) [not null]
  d_level bigint [not null]
}

Table vb_words {
  id bigint [pk, increment, not null]
  word varchar(250) [not null]
  e_meaning varchar(250) [not null]
  h_meaning varchar(250) [not null]
  word_type varchar(5)
  d_level bigint [not null]
}

// Creating references
// You can also define relaionship separately
// > many-to-one; < one-to-many; - one-to-one
