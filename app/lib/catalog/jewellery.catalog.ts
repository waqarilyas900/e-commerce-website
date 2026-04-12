import { createStubVerticalCatalog } from "./stub-vertical.catalog";
import type { StoreCatalog } from "./types";

/** Legacy vertical — static demo data removed; use `electronics` for the live catalog. */
export const jewelleryCatalog: StoreCatalog =
  createStubVerticalCatalog("Jewellery (offline)");
