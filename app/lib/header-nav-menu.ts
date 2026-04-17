import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasCatalogDb } from "@/app/lib/db/env";

export type HeaderNavMenuItem = {
  id: string;
  name: string;
  label: string;
  slug: string;
  /** Always `/collections/{slug}` from the assigned collection. */
  href: string;
  sort_order: number;
};

let warnedMissingTable: boolean;

async function fetchHeaderNavMenuItems(): Promise<HeaderNavMenuItem[]> {
  if (!hasCatalogDb()) {
    return [];
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("header_nav_menu_items")
      .select("id, name, label, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      const msg = error.message ?? "";
      if (
        msg.includes("Could not find the table") ||
        msg.includes("schema cache")
      ) {
        if (!warnedMissingTable) {
          warnedMissingTable = true;
          console.warn(
            "[header_nav_menu_items] Table missing — apply latest Supabase migrations.",
          );
        }
        return [];
      }
      console.error("[header_nav_menu_items]", msg);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      label: row.label as string,
      slug: row.slug as string,
      sort_order: Number(row.sort_order ?? 0),
      href: `/collections/${row.slug as string}`,
    }));
  } catch (e) {
    console.error("[header_nav_menu_items]", e);
    return [];
  }
}

export const getHeaderNavMenuItems = cache(fetchHeaderNavMenuItems);
