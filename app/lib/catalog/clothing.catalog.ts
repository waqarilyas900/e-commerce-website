import { createStubVerticalCatalog } from "./stub-vertical.catalog";
import type { StoreCatalog } from "./types";

/** Legacy vertical — static demo data removed; use `tailoring` / default seed for SimpleCartStore demo data. */
export const clothingCatalog: StoreCatalog =
  createStubVerticalCatalog("Clothing (offline)");
