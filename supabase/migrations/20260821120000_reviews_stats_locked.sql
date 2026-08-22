-- Allow locking product rating/review count (e.g. synced from Daraz aggregate).
alter table public.products
  add column if not exists reviews_stats_locked boolean not null default false;

comment on column public.products.reviews_stats_locked is
  'When true, refresh_product_review_stats skips overwriting rating/reviews_count (manual/external sync).';

create or replace function public.refresh_product_review_stats(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_avg numeric;
  v_locked boolean;
begin
  select coalesce(reviews_stats_locked, false)
  into v_locked
  from public.products
  where id = p_product_id;

  if v_locked then
    return;
  end if;

  select
    count(*)::int,
    round(avg(r.rating::numeric), 2)
  into v_count, v_avg
  from public.reviews r
  where r.product_id = p_product_id
    and r.status = 'approved'::public.review_moderation_status;

  if v_count is null or v_count = 0 then
    update public.products
    set
      reviews_count = 0,
      rating = 0,
      updated_at = now()
    where id = p_product_id;
  else
    update public.products
    set
      reviews_count = v_count,
      rating = coalesce(v_avg, 0),
      updated_at = now()
    where id = p_product_id;
  end if;
end;
$$;
