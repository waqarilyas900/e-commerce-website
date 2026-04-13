import { getCatalog } from "./catalog";
import { getStoreVertical } from "./store-vertical";
import type { Product } from "./catalog/types";

export type { Product, Collection, Bundle } from "./catalog/types";

const catalog = getCatalog(getStoreVertical());

export const products = catalog.products;
export const collections = catalog.collections;
export const bundles = catalog.bundles;
export const homeHeroSlides = catalog.homeHeroSlides;
export const homeCategoryRails = catalog.homeCategoryRails;

/** Legacy hero tiles — derived from catalog hero slides for `Hero` fallback */
export const promoSlides = catalog.homeHeroSlides.map((slide) => ({
  title: slide.title,
  subtitle: "Shop the collection.",
  cta: "Shop now",
  href: slide.href,
  image: slide.image,
}));

export function productsByIds(ids: string[]): Product[] {
  return ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);
}

export function productsBySlugs(slugs: string[]): Product[] {
  return slugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => p !== undefined);
}

export const policyPages = [
  {
    slug: "size-charts",
    title: "Size Charts",
    content:
      "Use our size guides on each product page to find your fit. When in doubt, size up for a relaxed fit or contact support for measurements.",
  },
  {
    slug: "about",
    title: "About us",
    content:
      "We are focused on quality, fair pricing, and support you can reach. Thank you for shopping with us.",
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    content:
      "Orders are processed within 1-2 business days. Standard shipping usually arrives in 3-5 business days based on destination.",
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    content:
      "Returns are accepted within 14 days of delivery for unused items in original condition. Contact support to initiate a return.",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "We only collect the information required to process orders and improve your store experience. Data is never sold to third parties.",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "By using this storefront, you agree to standard usage, payment, and fulfillment terms defined in this policy.",
  },
];

export const getProductBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);

export const getProductById = (id: string) =>
  products.find((product) => product.id === id);

export const getCollectionBySlug = (slug: string) =>
  collections.find((collection) => collection.slug === slug);

export const getPolicyBySlug = (slug: string) =>
  policyPages.find((policy) => policy.slug === slug);
