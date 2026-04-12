import type { StoreCatalog } from "./types";

const COLLECTION_SLUG = "electronics";

export const electronicsCatalog: StoreCatalog = {
  brand: {
    siteTitle: "Electronics & tech",
    siteDescription:
      "Curated electronics — clear specs, fair pricing, and fast support.",
    announcement: "FREE shipping on orders over Rs. 3,000 · Easy returns within 14 days",
    missionParagraph:
      "We stock reliable gear for work and home: tested accessories, displays, and peripherals with transparent pricing and warranty-friendly returns.",
    featured: {
      eyebrow: "New in tech",
      title: "Electronics drop",
      description:
        "From USB hubs to mechanical keyboards — upgrade your desk with gear that ships fast and is priced to move.",
      imageUrl:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
      primaryLabel: "Shop electronics",
      primaryHref: `/collections/${COLLECTION_SLUG}`,
      secondaryLabel: "Best deals",
      secondaryHref: "/collections/sale",
    },
    whyShop: {
      eyebrow: "Why shop here",
      title: "REAL SPECS. REAL SUPPORT.",
      body:
        "Every listing shows variant-level pricing and stock. Sale items show compare-at pricing so you know the deal. Questions? Our team replies within one business day.",
      ctaLabel: `Shop ${COLLECTION_SLUG}`,
      ctaHref: `/collections/${COLLECTION_SLUG}`,
      reviewsLine: "Customers rate us 4.8/5 on delivery and product accuracy.",
      imageUrl:
        "https://images.unsplash.com/photo-1550009158-9dcbf661f676?auto=format&fit=crop&w=1200&q=80",
    },
    footer: {
      supportEmail: "support@example.com",
      phone: "0300-0000000",
      hoursLine: "Mon–Sat 9am–6pm",
      exploreLinks: [
        { label: "Electronics", href: `/collections/${COLLECTION_SLUG}` },
        { label: "Sale", href: "/collections/sale" },
        { label: "Shipping", href: "/policies/shipping" },
        { label: "Returns", href: "/policies/returns" },
        { label: "Contact", href: "/contact" },
      ],
    },
  },
  homeHeroSlides: [
    {
      title: "Desk upgrades",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=2400&q=80",
    },
    {
      title: "Audio & input",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=2400&q=80",
    },
    {
      title: "Displays",
      href: `/collections/${COLLECTION_SLUG}`,
      image:
        "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=2400&q=80",
    },
  ],
  homeCategoryRails: [
    {
      title: "Featured electronics",
      viewAllHref: `/collections/${COLLECTION_SLUG}`,
      productSlugs: [
        "orbit-usb-c-hub",
        "pulse-wireless-mouse",
        "vector-qhd-monitor",
        "echo-mini-smart-speaker",
      ],
    },
    {
      title: "Deals & bundles",
      viewAllHref: "/collections/sale",
      productSlugs: [
        "vector-qhd-monitor",
        "echo-mini-smart-speaker",
        "typeforge-mechanical-keyboard",
        "orbit-usb-c-hub",
      ],
    },
  ],
  collections: [
    {
      slug: COLLECTION_SLUG,
      name: "Electronics",
      description:
        "Accessories, peripherals, audio, and displays — one collection for your setup.",
      heroImage:
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2000&q=80",
    },
  ],
  bundles: [],
  products: [
    {
      id: "prod-orbit-usb-c-hub",
      slug: "orbit-usb-c-hub",
      name: "Orbit USB-C Hub",
      shortDescription: "Aluminum hub: pick 4-in-1 or 7-in-1 with SD reader.",
      description:
        "<p>Pass-through charging where supported, HDMI on the larger kit, and stable data lines. Pick the configuration that matches your laptop ports.</p>",
      category: "Accessories",
      collection: COLLECTION_SLUG,
      price: 4990,
      rating: 4.7,
      reviews: 128,
      image:
        "https://images.unsplash.com/photo-1625948515291-69613efd103f?auto=format&fit=crop&w=1200&q=80",
      tags: ["usb-c", "hub", "desk"],
    },
    {
      id: "prod-pulse-wireless-mouse",
      slug: "pulse-wireless-mouse",
      name: "Pulse Wireless Mouse",
      shortDescription: "Silent clicks, long battery, Black or White.",
      description:
        "<p>Ergonomic shape for daily use. Connects via the included receiver; color variants share the same sensor and battery life.</p>",
      category: "Peripherals",
      collection: COLLECTION_SLUG,
      price: 2490,
      rating: 4.5,
      reviews: 402,
      image:
        "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=80",
      tags: ["mouse", "wireless", "office"],
    },
    {
      id: "prod-vector-qhd-monitor",
      slug: "vector-qhd-monitor",
      name: "Vector QHD Monitor",
      shortDescription: "27″ or 32″ QHD — limited-time sale on 27″.",
      description:
        "<p>IPS panel, thin bezels, and a stand with tilt. The 27″ model is on promotion while supplies last.</p>",
      category: "Displays",
      collection: COLLECTION_SLUG,
      price: 45900,
      compareAtPrice: 52900,
      rating: 4.8,
      reviews: 89,
      image:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80",
      tags: ["monitor", "qhd", "sale"],
    },
    {
      id: "prod-echo-mini-smart-speaker",
      slug: "echo-mini-smart-speaker",
      name: "Echo Mini Smart Speaker",
      shortDescription: "Compact smart speaker — 8 GB or 16 GB storage tiers.",
      description:
        "<p>Room-filling sound with voice assistant ready. Entry tier is on sale; 16 GB holds more offline playlists.</p>",
      category: "Audio",
      collection: COLLECTION_SLUG,
      price: 15990,
      compareAtPrice: 19990,
      rating: 4.4,
      reviews: 256,
      image:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e2?auto=format&fit=crop&w=1200&q=80",
      tags: ["speaker", "smart", "audio"],
    },
    {
      id: "prod-typeforge-mechanical-keyboard",
      slug: "typeforge-mechanical-keyboard",
      name: "Typeforge Mechanical Keyboard",
      shortDescription: "Hot-swap board — Linear vs Tactile × Black vs White.",
      description:
        "<p>Per-key RGB, doubleshot caps, and your choice of switch feel and case color. Matrix pricing reflects switch cost differences.</p>",
      category: "Peripherals",
      collection: COLLECTION_SLUG,
      price: 8490,
      rating: 4.9,
      reviews: 311,
      image:
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
      tags: ["keyboard", "mechanical", "rgb"],
    },
  ],
};
