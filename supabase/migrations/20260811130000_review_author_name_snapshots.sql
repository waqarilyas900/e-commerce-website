-- Store a public-safe reviewer name snapshot on registered reviews.
-- Public PDPs can read approved reviews, but they cannot join private public.users rows under RLS.

alter table public.reviews drop constraint if exists reviews_attributed_when_no_user;

alter table public.reviews add constraint reviews_attributed_when_no_user check (
  (user_id is not null and attributed_display_email is null)
  or
  (user_id is null and length(trim(coalesce(attributed_display_name, ''))) > 0)
);

update public.reviews r
set
  attributed_display_name = nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
  updated_at = now()
from public.users u
where r.user_id = u.id
  and nullif(trim(coalesce(r.attributed_display_name, '')), '') is null
  and nullif(trim(concat_ws(' ', u.first_name, u.last_name)), '') is not null;
