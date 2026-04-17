-- Review media attachments (JSON) + keep products.rating / products.reviews_count in sync with approved reviews.

alter table public.reviews
  add column if not exists media jsonb not null default '[]'::jsonb;

comment on column public.reviews.media is
  'JSON array of { "url": string, "kind": "image" | "video" } for uploaded storefront assets.';

create or replace function public.refresh_product_review_stats(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_avg numeric;
begin
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

comment on function public.refresh_product_review_stats(uuid) is
  'Recomputes products.rating and products.reviews_count from approved reviews only.';

create or replace function public.trg_reviews_refresh_product_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_review_stats(old.product_id);
    return old;
  end if;

  perform public.refresh_product_review_stats(new.product_id);
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_review_stats(old.product_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_refresh_product_stats_after on public.reviews;
create trigger reviews_refresh_product_stats_after
  after insert or update or delete on public.reviews
  for each row
  execute function public.trg_reviews_refresh_product_stats();

-- One-time alignment: recompute rating / reviews_count for every product from approved reviews.
do $$
declare
  pid uuid;
begin
  for pid in select id from public.products loop
    perform public.refresh_product_review_stats(pid);
  end loop;
end $$;
