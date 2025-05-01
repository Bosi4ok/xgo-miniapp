import { createClient } from '@supabase/supabase-js'

// Замените эти значения на ваши из настроек проекта в Supabase
const SUPABASE_URL = 'https://msstnczyshmnhjcnzjlg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zc3RuY3p5c2htbmhqY256amxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjI0MjUsImV4cCI6MjA2MDg5ODQyNX0.9Oa_ghFyX9qVquxokvLMSNRfQq7FzA6mQEvlsM2ZyRc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
