// AI Lab Pro intake portal config. Public values only (the anon key is meant to be public; RLS protects the data).
// Filled by tools/intake_setup.py. Empty SUPABASE_URL = portal shows "opening soon".
window.INTAKE_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  GOOGLE_ENABLED: false,
  APPLE_ENABLED: false,
  MAX_FILES: 5,
  MAX_FILE_MB: 10,
  BUCKET: "intake-files"
};
