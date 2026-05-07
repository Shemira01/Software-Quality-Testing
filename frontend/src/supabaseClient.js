import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwwselyssxokwzxfhzjw.supabase.co';
const supabaseAnonKey = 'sb_publishable__VKbdl-fPM5GBbYlNBWRwg_1YoXm22f';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);