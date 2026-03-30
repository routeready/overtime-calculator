-- YardBoss V1 Schema

-- Teen provider profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text,
  pin_lat double precision not null,
  pin_lng double precision not null,
  pin_address text,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Customers (neighbors who request service)
create table customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  email text not null,
  address text not null,
  created_at timestamptz default now()
);

-- Service requests / jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  customer_id uuid references customers(id) on delete cascade not null,
  service_type text not null check (service_type in ('lawn', 'snow')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'on_my_way', 'done', 'cancelled')),
  requested_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_profiles_slug on profiles(slug);
create index idx_customers_profile_id on customers(profile_id);
create index idx_jobs_profile_id on jobs(profile_id);
create index idx_jobs_customer_id on jobs(customer_id);
create index idx_jobs_status on jobs(status);

-- Row Level Security
alter table profiles enable row level security;
alter table customers enable row level security;
alter table jobs enable row level security;

-- Profiles: users can read/write their own profile; public can read by slug
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Public can read profiles by slug"
  on profiles for select using (true);

-- Customers: owners can manage; public can insert (for request form)
create policy "Owners can view their customers"
  on customers for select using (auth.uid() = profile_id);

create policy "Owners can manage their customers"
  on customers for all using (auth.uid() = profile_id);

create policy "Public can create customers"
  on customers for insert with check (true);

-- Jobs: owners can manage; public can insert (for request form)
create policy "Owners can view their jobs"
  on jobs for select using (auth.uid() = profile_id);

create policy "Owners can manage their jobs"
  on jobs for all using (auth.uid() = profile_id);

create policy "Public can create jobs"
  on jobs for insert with check (true);
