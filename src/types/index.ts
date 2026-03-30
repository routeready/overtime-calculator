export type ServiceType = "lawn" | "snow";

export type JobStatus =
  | "pending"
  | "confirmed"
  | "on_my_way"
  | "done"
  | "cancelled";

export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
  pin_lat: number;
  pin_lng: number;
  pin_address: string | null;
  slug: string;
  created_at: string;
}

export interface Customer {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  address: string;
  created_at: string;
}

export interface Job {
  id: string;
  profile_id: string;
  customer_id: string;
  service_type: ServiceType;
  status: JobStatus;
  requested_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}
