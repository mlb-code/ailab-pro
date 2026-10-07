// AI Lab Pro intake portal config. Public values only (the anon key is meant to be public; RLS protects the data).
// Filled by tools/intake_setup.py. Empty SUPABASE_URL = portal shows "opening soon".
window.INTAKE_CONFIG = {
  SUPABASE_URL: "https://ptbvndymihdyxnxvrrig.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YnZuZHltaWhkeXhueHZycmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODIyMDYsImV4cCI6MjEwNjk1ODIwNn0.st-K0rMfSxlL3N6PcYCQ6yIRkdLf9kmJPrg0jM-WZk0",
  GOOGLE_ENABLED: true,
  APPLE_ENABLED: false,
  MAX_FILES: 5,
  MAX_FILE_MB: 10,
  BUCKET: "intake-files"
};
