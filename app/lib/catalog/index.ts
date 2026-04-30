import type { StoreVerticalId } from "../store-brand.types";
import type { StoreCatalog } from "./types";
import { clothingCatalog } from "./clothing.catalog";
import { outflintDemoCatalog } from "./outflint.catalog";
import { jewelleryCatalog } from "./jewellery.catalog";
import { homeComplianceCatalog } from "./home-compliance.catalog";

export function getCatalog(vertical: StoreVerticalId): StoreCatalog {
  switch (vertical) {
    case "tailoring":
      return outflintDemoCatalog;
    case "jewellery":
      return jewelleryCatalog;
    case "home-compliance":
      return homeComplianceCatalog;
    case "clothing":
      return clothingCatalog;
    default:
      return outflintDemoCatalog;
  }
}

export type { StoreCatalog } from "./types";
export type { Product, Collection, Bundle } from "./types";
