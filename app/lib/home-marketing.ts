import {
  getCachedAnnouncementBar,
  getCachedHomeHeroAndMission,
} from "@/lib/cache/layout-data";
import type { AnnouncementBarSettings, HeroSlide } from "./store-brand.types";

/**
 * Loads announcement bar settings for the root layout. Delegates to the
 * tag-revalidated layout cache so the same row is shared across every render
 * until `LAYOUT_CACHE_TAGS.announcementBar` is busted by `/api/revalidate`.
 */
export async function getAnnouncementBarForLayout(): Promise<AnnouncementBarSettings> {
  return getCachedAnnouncementBar();
}

/**
 * Homepage hero + mission copy. Delegates to the cache layer so the home page
 * doesn't re-query the home_page_settings + home_hero_slides tables on every
 * navigation back to `/`.
 */
export async function getHomeMarketingData(): Promise<{
  slides: HeroSlide[];
  missionParagraph: string;
}> {
  return getCachedHomeHeroAndMission();
}
