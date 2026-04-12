-- Derive profile names from Google OAuth metadata (full_name, given_name, family_name)
-- in addition to email/password signup fields (first_name, last_name).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  p_first text;
  p_last text;
  v_given text;
  v_family text;
  v_full text;
  fn text;
  ln text;
  sp int;
begin
  p_first := nullif(trim(coalesce(meta->>'first_name', '')), '');
  p_last := nullif(trim(coalesce(meta->>'last_name', '')), '');

  if p_first is not null or p_last is not null then
    fn := coalesce(p_first, '');
    ln := coalesce(p_last, '');
  else
    v_given := nullif(trim(coalesce(meta->>'given_name', '')), '');
    v_family := nullif(trim(coalesce(meta->>'family_name', '')), '');
    if v_given is not null or v_family is not null then
      fn := coalesce(v_given, '');
      ln := coalesce(v_family, '');
    else
      v_full := nullif(trim(coalesce(meta->>'full_name', meta->>'name', '')), '');
      if v_full is not null then
        sp := strpos(v_full, ' ');
        if sp > 0 then
          fn := substr(v_full, 1, sp - 1);
          ln := trim(both from substr(v_full, sp + 1));
        else
          fn := v_full;
          ln := '';
        end if;
      else
        fn := '';
        ln := '';
      end if;
    end if;
  end if;

  insert into public.users (auth_id, first_name, last_name, phone)
  values (
    new.id,
    fn,
    ln,
    coalesce(nullif(trim(coalesce(meta->>'phone', '')), ''), '')
  )
  on conflict (auth_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    updated_at = now();
  return new;
end;
$$;
