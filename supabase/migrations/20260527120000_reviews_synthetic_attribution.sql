-- Allow admin-seeded reviews without a linked `users` row (display name/email stored on the review only).

alter table public.reviews
  add column if not exists attributed_display_name text,
  add column if not exists attributed_display_email text;

comment on column public.reviews.attributed_display_name is
  'When user_id is null, storefront shows this reviewer name (admin testimonial; not a DB customer).';

comment on column public.reviews.attributed_display_email is
  'Optional display email for admin-seeded reviews when user_id is null.';

alter table public.reviews alter column user_id drop not null;

alter table public.reviews drop constraint if exists reviews_product_user_key;

create unique index if not exists reviews_product_registered_user_unique
  on public.reviews (product_id, user_id)
  where user_id is not null;

alter table public.reviews drop constraint if exists reviews_attributed_when_no_user;

alter table public.reviews add constraint reviews_attributed_when_no_user check (
  (user_id is not null and attributed_display_name is null and attributed_display_email is null)
  or
  (user_id is null and length(trim(coalesce(attributed_display_name, ''))) > 0)
);
