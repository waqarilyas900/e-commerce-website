import type { StoreVerticalId } from "../store-brand.types";
import type { StoreCatalog } from "./types";
import { clothingCatalog } from "./clothing.catalog";
import { simpleCartStoreDemoCatalog } from "./simplecartstore.catalog";
import { jewelleryCatalog } from "./jewellery.catalog";
import { homeComplianceCatalog } from "./home-compliance.catalog";

export function getCatalog(vertical: StoreVerticalId): StoreCatalog {
  switch (vertical) {
    case "tailoring":
      return simpleCartStoreDemoCatalog;
    case "jewellery":
      return jewelleryCatalog;
    case "home-compliance":
      return homeComplianceCatalog;
    case "clothing":
      return clothingCatalog;
    default:
      return simpleCartStoreDemoCatalog;
  }
}

export type { StoreCatalog } from "./types";
export type { Product, Collection, Bundle } from "./types";
