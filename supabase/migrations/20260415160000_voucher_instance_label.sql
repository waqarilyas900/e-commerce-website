-- Optional admin-facing name per assigned code (e.g. "Birthday gift — Jane").
alter table public.voucher_instances
  add column if not exists voucher_label text;

comment on column public.voucher_instances.voucher_label is
  'Optional label when this code is assigned to a customer (admin reference; not shown at checkout).';
