CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "action" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" INTEGER,
  "details" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "admins" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role" TEXT,
  "permissions" TEXT,
  "status" TEXT,
  "last_login" TIMESTAMP,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "analytics" (
  "id" SERIAL PRIMARY KEY,
  "metric_name" TEXT NOT NULL,
  "metric_value" NUMERIC,
  "dimension_name" TEXT,
  "dimension_value" TEXT,
  "date" DATE,
  "source" TEXT,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT,
  "target_audience" TEXT,
  "priority" TEXT,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "status" TEXT,
  "created_by" INTEGER,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "authors" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "staff_id" TEXT,
  "faculty" TEXT,
  "department" TEXT,
  "qualifications" TEXT,
  "biography" TEXT,
  "areas_of_expertise" TEXT,
  "orcid_id" TEXT,
  "google_scholar_id" TEXT,
  "research_gate_url" TEXT,
  "linkedin_url" TEXT,
  "total_publications" INTEGER,
  "h_index" INTEGER,
  "total_citations" INTEGER,
  "awards" TEXT,
  "cv_url" TEXT
);

CREATE TABLE IF NOT EXISTS "book_progress" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "stage" TEXT NOT NULL,
  "status" TEXT,
  "assigned_to" INTEGER,
  "start_date" DATE,
  "due_date" DATE,
  "completed_date" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "book_reviews" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "user_id" INTEGER,
  "rating" INTEGER,
  "title" TEXT,
  "content" TEXT,
  "helpful_count" INTEGER,
  "verified_purchase" INTEGER,
  "status" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "books" (
  "id" SERIAL PRIMARY KEY,
  "author_id" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "manuscript_file" TEXT,
  "cover_image" TEXT,
  "status" TEXT,
  "review_notes" TEXT,
  "created_at" TIMESTAMP,
  "publication_date" DATE
);

CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT,
  "status" TEXT,
  "assigned_to" INTEGER,
  "priority" TEXT,
  "response" TEXT,
  "responded_by" INTEGER,
  "response_date" TIMESTAMP,
  "tags" JSONB,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "contracts" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "author_id" INTEGER,
  "contract_type" TEXT,
  "contract_number" TEXT,
  "status" TEXT,
  "start_date" DATE,
  "end_date" DATE,
  "royalty_percentage" NUMERIC,
  "advance_amount" NUMERIC,
  "payment_schedule" TEXT,
  "rights_granted" TEXT,
  "territory" TEXT,
  "digital_rights" INTEGER,
  "audio_rights" INTEGER,
  "translation_rights" INTEGER,
  "contract_file" TEXT,
  "signed_date" DATE,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "start_datetime" TIMESTAMP,
  "end_datetime" TIMESTAMP,
  "venue" TEXT,
  "online_link" TEXT,
  "organizer" TEXT,
  "max_attendees" INTEGER,
  "current_attendees" INTEGER,
  "registration_fee" NUMERIC,
  "status" TEXT,
  "featured_image" TEXT,
  "gallery" JSONB,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "file_uploads" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "file_path" TEXT,
  "file_size" INTEGER,
  "file_type" TEXT,
  "uploaded_by" INTEGER,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "format" TEXT NOT NULL,
  "quantity" INTEGER,
  "reserved" INTEGER,
  "available" INTEGER,
  "reorder_level" INTEGER,
  "location" TEXT,
  "last_restocked" DATE,
  "unit_cost" NUMERIC,
  "selling_price" NUMERIC,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "format" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER,
  "reserved" INTEGER,
  "available" INTEGER,
  "reorder_level" INTEGER,
  "reorder_quantity" INTEGER,
  "location" TEXT,
  "shelf_number" TEXT,
  "batch_number" TEXT,
  "unit_cost" NUMERIC,
  "selling_price" NUMERIC,
  "last_restocked" DATE,
  "supplier" TEXT,
  "supplier_contact" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "production" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "stage" TEXT,
  "assigned_to" TEXT,
  "start_date" DATE,
  "due_date" DATE,
  "completed_date" DATE,
  "status" TEXT,
  "notes" TEXT,
  "files" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "production_tasks" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "task_type" TEXT NOT NULL,
  "assigned_to" INTEGER,
  "priority" TEXT,
  "start_date" DATE,
  "due_date" DATE,
  "completed_date" DATE,
  "status" TEXT,
  "notes" TEXT,
  "files" JSONB,
  "quality_score" INTEGER,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" SERIAL PRIMARY KEY,
  "report_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "period_start" DATE,
  "period_end" DATE,
  "generated_by" INTEGER,
  "report_data" JSONB,
  "file_url" TEXT,
  "status" TEXT,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" SERIAL PRIMARY KEY,
  "submission_id" INTEGER,
  "reviewer_id" INTEGER,
  "rating" INTEGER,
  "originality_score" INTEGER,
  "clarity_score" INTEGER,
  "methodology_score" INTEGER,
  "contribution_score" INTEGER,
  "overall_score" NUMERIC,
  "comments" TEXT,
  "confidential_comments" TEXT,
  "recommendation" TEXT,
  "status" TEXT,
  "assigned_date" TIMESTAMP,
  "completed_date" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "royalties" (
  "id" SERIAL PRIMARY KEY,
  "contract_id" INTEGER,
  "book_id" INTEGER,
  "author_id" INTEGER,
  "period_start" DATE,
  "period_end" DATE,
  "units_sold" INTEGER,
  "revenue" NUMERIC,
  "royalty_amount" NUMERIC,
  "payment_status" TEXT,
  "payment_date" DATE,
  "payment_method" TEXT,
  "transaction_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "royalty_statements" (
  "id" SERIAL PRIMARY KEY,
  "contract_id" INTEGER,
  "book_id" INTEGER,
  "author_id" INTEGER,
  "period_start" DATE,
  "period_end" DATE,
  "units_sold" INTEGER,
  "revenue" NUMERIC,
  "royalty_percentage" NUMERIC,
  "royalty_amount" NUMERIC,
  "expenses" NUMERIC,
  "net_amount" NUMERIC,
  "payment_status" TEXT,
  "payment_date" DATE,
  "payment_method" TEXT,
  "transaction_reference" TEXT,
  "notes" TEXT,
  "statement_file" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sales" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "format" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC NOT NULL,
  "total_amount" NUMERIC,
  "customer_type" TEXT,
  "customer_email" TEXT,
  "customer_name" TEXT,
  "payment_method" TEXT,
  "payment_status" TEXT,
  "invoice_number" TEXT,
  "sale_date" TIMESTAMP,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" SERIAL PRIMARY KEY,
  "order_number" TEXT,
  "customer_id" INTEGER,
  "customer_name" TEXT,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "shipping_address" TEXT,
  "billing_address" TEXT,
  "subtotal" NUMERIC,
  "tax_amount" NUMERIC,
  "shipping_cost" NUMERIC,
  "total_amount" NUMERIC,
  "payment_method" TEXT,
  "payment_status" TEXT,
  "order_status" TEXT,
  "notes" TEXT,
  "tracking_number" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" SERIAL PRIMARY KEY,
  "setting_key" TEXT NOT NULL,
  "setting_value" TEXT,
  "setting_type" TEXT,
  "category" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "submissions" (
  "id" SERIAL PRIMARY KEY,
  "book_id" INTEGER,
  "submission_type" TEXT NOT NULL,
  "status" TEXT,
  "admin_notes" TEXT,
  "submission_date" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "training_registrations" (
  "id" SERIAL PRIMARY KEY,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "student_id" TEXT,
  "faculty" TEXT,
  "department" TEXT,
  "level" TEXT,
  "training_type" TEXT,
  "preferred_date" DATE,
  "status" TEXT,
  "created_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "training_workshops" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "facilitator" TEXT,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "duration_hours" INTEGER,
  "max_participants" INTEGER,
  "current_participants" INTEGER,
  "fee" NUMERIC,
  "venue" TEXT,
  "online_link" TEXT,
  "status" TEXT,
  "materials_url" TEXT,
  "certificate_template" TEXT,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "role" TEXT,
  "status" TEXT,
  "email_verified" INTEGER,
  "verification_token" TEXT,
  "reset_token" TEXT,
  "reset_token_expiry" TIMESTAMP,
  "last_login" TIMESTAMP,
  "profile_image" TEXT,
  "preferences" JSONB,
  "created_at" TIMESTAMP,
  "updated_at" TIMESTAMP
);
