export type Role = 'STUDENT' | 'OWNER';

export interface UserProfile {
  id: string;
  full_name: string;
  unique_short_id: number;
  photo_path?: string | null;
  phone?: string;
  address?: string;
  meal_plan?: 'L' | 'D' | 'DL';
  role: Role;
  is_active: boolean;
  subscription_start_date?: string;
  subscription_end_date?: string;
  created_at?: string;
}

export interface DailyLog {
  log_id: string;
  user_id: string;
  date: string;
  meal_type: 'LUNCH' | 'DINNER';
  status: 'CONSUMED' | 'SKIPPED' | 'LEAVE';
  access_method: 'SELF_ID' | 'PARCEL_OTP';
  created_at: string;
}
