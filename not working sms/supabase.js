
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ohsrnuydyqskuwzairqw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oc3JudXlkeXFza3V3emFpcnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjQ0MDUsImV4cCI6MjA3MTEwMDQwNX0.W9kP3kMNzjhOKY3mVkW596RaRPFZDvsymWT73n78USo'

export const supabase = createClient(supabaseUrl, supabaseKey)