-- Outbox sync sink table (server-side insert only)
create table if not exists public.sync_events (
  id uuid primary key,
  entity_type text not null check (entity_type in ('session', 'routine')),
  entity_id text not null,
  op text not null check (op in ('create', 'update', 'delete')),
  payload jsonb not null,
  client_created_at bigint not null,
  client_updated_at bigint not null,
  client_attempt_count integer not null default 0,
  received_at timestamptz not null default now()
);

create index if not exists idx_sync_events_entity_op
  on public.sync_events (entity_type, entity_id, op);

create index if not exists idx_sync_events_client_updated_at
  on public.sync_events (client_updated_at desc);

alter table public.sync_events enable row level security;

-- Route Handler uses service role key; keep anon/authenticated blocked by default.
revoke all on table public.sync_events from anon, authenticated;
