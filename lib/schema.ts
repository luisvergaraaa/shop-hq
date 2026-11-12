// Keep in sync with db/schema.sql
export const SCHEMA = `
create table if not exists services (
  id serial primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0,
  duration_min integer not null default 60,
  active boolean not null default true,
  sort integer not null default 0
);
create table if not exists customers (
  id serial primary key,
  name text not null,
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists vehicles (
  id serial primary key,
  customer_id integer not null references customers(id) on delete cascade,
  year text not null default '',
  make text not null default '',
  model text not null default '',
  vin text not null default '',
  mileage text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists jobs (
  id serial primary key,
  customer_id integer not null references customers(id) on delete cascade,
  vehicle_id integer references vehicles(id) on delete set null,
  service_id integer references services(id) on delete set null,
  status text not null default 'requested',
  scheduled_at timestamp,
  address text not null default '',
  concern text not null default '',
  findings text not null default '',
  notes text not null default '',
  token text not null unique,
  estimate_response text not null default '',
  paid_at timestamptz,
  paid_cents integer not null default 0,
  paid_method text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists codes (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  code text not null,
  description text not null default '',
  severity text not null default 'warn'
);
create table if not exists line_items (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  label text not null,
  qty numeric not null default 1,
  unit_cents integer not null default 0
);
create table if not exists expenses (
  id serial primary key,
  spent_on date not null default current_date,
  category text not null default 'Other',
  amount_cents integer not null default 0,
  note text not null default ''
);
create table if not exists tasks (
  id serial primary key,
  title text not null,
  due_on date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_sched_idx on jobs(scheduled_at);
create table if not exists leads (
  id serial primary key,
  name text not null,
  phone text not null default '',
  email text not null default '',
  source text not null default 'Other',
  vehicle text not null default '',
  notes text not null default '',
  stage text not null default 'new',
  follow_up_on date,
  customer_id integer references customers(id) on delete set null,
  job_id integer references jobs(id) on delete set null,
  last_contact_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists messages (
  id serial primary key,
  lead_id integer not null references leads(id) on delete cascade,
  direction text not null default 'in',
  body text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists approvals (
  id serial primary key,
  kind text not null default 'reply',
  lead_id integer references leads(id) on delete cascade,
  job_id integer references jobs(id) on delete cascade,
  to_name text not null default '',
  to_phone text not null default '',
  body text not null default '',
  reason text not null default '',
  by_ai boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create table if not exists automations (
  key text primary key,
  enabled boolean not null default true
);
create table if not exists ai_log (
  id serial primary key,
  kind text not null default 'chat',
  question text not null default '',
  answer text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists leads_stage_idx on leads(stage);
create index if not exists messages_lead_idx on messages(lead_id);
create index if not exists approvals_status_idx on approvals(status);
`;
