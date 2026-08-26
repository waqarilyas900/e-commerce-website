-- Sticky product reel / promo video URL (YouTube, Facebook, Instagram, or direct MP4).
alter table public.products
  add column if not exists video_url text;

comment on column public.products.video_url is
  'Optional product promo video URL (YouTube / Facebook / Instagram / direct MP4). Shown as sticky mini-player on PDP and randomly on home.';
