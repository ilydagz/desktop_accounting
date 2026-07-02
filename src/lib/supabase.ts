import { createClient } from '@supabase/supabase-js';

// Bu değerleri Supabase panelinizden (Project Settings -> API) alıp
// projenin ana dizininde bir .env dosyası oluşturarak içine yapıştırmalısınız.
// Örnek .env dosyası içeriği:
// VITE_SUPABASE_URL=https://xyz.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
