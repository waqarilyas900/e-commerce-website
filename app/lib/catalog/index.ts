import type { StoreVerticalId } from "../store-brand.types";
import type { StoreCatalog } from "./types";
import { clothingCatalog } from "./clothing.catalog";
import { electronicsCatalog } from "./electronics.catalog";
import { jewelleryCatalog } from "./jewellery.catalog";
import { homeComplianceCatalog } from "./home-compliance.catalog";

export function getCatalog(vertical: StoreVerticalId): StoreCatalog {
  switch (vertical) {
    case "electronics":
      return electronicsCatalog;
    case "jewellery":
      return jewelleryCatalog;
    case "home-compliance":
      return homeComplianceCatalog;
    case "clothing":
      return clothingCatalog;
    default:
      return electronicsCatalog;
  }
}

export type { StoreCatalog } from "./types";
export type { Product, Collection, Bundle } from "./types";
