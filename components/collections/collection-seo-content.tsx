import Link from "next/link";

type CollectionSeoData = {
  title: string;
  intro: string;
  subsections: Array<{
    heading: string;
    body: string;
  }>;
  relatedGuideSlug?: string;
  relatedGuideTitle?: string;
};

const COLLECTION_SEO_DATA: Record<string, CollectionSeoData> = {
  "drinkware-tumblers": {
    title: "Buy Drinkware, Tumblers & Insulated Bottles Online in Pakistan",
    intro:
      "Staying properly hydrated in Pakistan's varying climate requires high-grade, leakproof, and temperature-retaining drinkware. From insulated double-wall 304 stainless steel flasks that keep ice water freezing cold for up to 24 hours in Lahore's scorching summer heat, to aesthetic borosilicate glass sippers with bamboo lids for desk iced lattes and green teas, SimpleCart Store brings you premium drinkware with fast Cash on Delivery across Pakistan.",
    subsections: [
      {
        heading: "Why Choose Double-Wall 304 Stainless Steel?",
        body: "Our metal tumblers and thermal flasks utilize premium 304 (18/8) food-grade stainless steel with genuine vacuum insulation. This eliminates outer sweating on your desk, resists corrosion from acidic beverages, and ensures zero metallic aftertaste throughout the day.",
      },
      {
        heading: "Aesthetic Glass Sippers & Desk Hydration",
        body: "For home office workstations and coffee enthusiasts, our borosilicate glass sippers with reusable glass straws provide a toxin-free, BPA-free hydration experience that looks stunning on any desk setup.",
      },
      {
        heading: "Smart Car Heated Tumblers for Highway Commutes",
        body: "Frequent travelers driving on the M-2 Motorway and GT Road can enjoy piping hot chai or coffee on demand with our 12V/24V smart digital heating cups that plug right into vehicle charging sockets.",
      },
    ],
    relatedGuideSlug: "drinkware-buying-guide-pakistan",
    relatedGuideTitle: "Read our Complete Drinkware & Tumbler Buying Guide →",
  },
  "kitchen-essentials": {
    title: "Kitchen Essentials, Choppers & Cooking Gadgets in Pakistan",
    intro:
      "Cooking hearty Pakistani meals shouldn't require exhausting hours of manual prep work. At SimpleCart Store, we curate durable, high-torque electric kitchen appliances, precision spice grinders, fast-boil stainless steel kettles, and non-scratch silicone utensils designed specifically for the demands of Pakistani cooking.",
    subsections: [
      {
        heading: "High-Power Multi-Blade Food Choppers",
        body: "Mince pounds of onions, ginger, garlic, and boneless meat in under 15 seconds. Built with sharp stainless steel blades and durable copper-wound motors, our choppers handle heavy daily meal preparations effortlessly.",
      },
      {
        heading: "Spice & Coffee Grinders for Fresh Masalas",
        body: "Nothing compares to the aroma of freshly pulverized whole spices. Our electric dry grinders powder whole cumin, black cardamom, cinnamon, and roasted coffee beans in seconds.",
      },
      {
        heading: "2.0L Fast-Boil Stainless Steel Kettles",
        body: "Boil water in under 3 minutes with automatic thermostat shut-off for rapid morning chai brewing, green tea, and cooking water prep while saving on gas cylinder expenses.",
      },
    ],
    relatedGuideSlug: "kitchen-essentials-pakistani-homes",
    relatedGuideTitle: "Read our 10 Essential Kitchen Tools & Appliances Guide →",
  },
  "home-appliances": {
    title: "Small Home Appliances Online Shopping in Pakistan",
    intro:
      "Modern Pakistani homes need smart, energy-efficient household appliances that operate reliably on local power grids, UPS backups, and hybrid solar systems. SimpleCart Store delivers quality-tested electric kettles, winter room heaters, compact stoves, and lifestyle electronics with Cash on Delivery nationwide.",
    subsections: [
      {
        heading: "Winter Heating Solutions: Ceramic Fan & Radiant Heaters",
        body: "Keep bedrooms and living areas comfortably warm during cold months in Islamabad, Quetta, and Punjab with safety-certified heaters featuring built-in tip-over shutoff and overheat thermal cutoffs.",
      },
      {
        heading: "Energy Efficiency & Low-Wattage Operation",
        body: "Our appliances are selected for optimal wattage ratings to ensure powerful performance without overloading home circuit breakers or draining inverter batteries during peak hours.",
      },
    ],
    relatedGuideSlug: "home-appliances-buying-guide-pakistan",
    relatedGuideTitle: "Read our Home Appliances Buying & Energy Saving Guide →",
  },
  "beauty-personal-care": {
    title: "Beauty & Personal Care Gadgets Online in Pakistan",
    intro:
      "Elevate your daily grooming and skincare routine with professional vanity gadgets from SimpleCart Store. From daylight-simulating LED touch makeup mirrors to precision rechargeable hair trimmers, enjoy salon-quality grooming at home.",
    subsections: [
      {
        heading: "LED Touch Folding Makeup Vanity Mirrors",
        body: "Experience flawless makeup application with daylight-accurate High-CRI LED lights, 3-level touch brightness adjustment, and portable folding designs for home vanities and travel.",
      },
      {
        heading: "Rechargeable Precision Trimmers & Grooming Tools",
        body: "Enjoy painless, close grooming with hypoallergenic titanium/ceramic blades and long-lasting USB rechargeable lithium batteries.",
      },
    ],
    relatedGuideSlug: "beauty-personal-care-gadgets-guide-pakistan",
    relatedGuideTitle: "Read our Beauty & Grooming Gadgets Guide →",
  },
  "lamps-lighting": {
    title: "Modern Lamps & Ambient Room Lighting in Pakistan",
    intro:
      "Lighting creates the ambiance and comfort of your living space. Discover eye-care rechargeable study desk lamps, soothing ambient night lights, and decorative lighting at SimpleCart Store with nationwide COD.",
    subsections: [
      {
        heading: "Flicker-Free Rechargeable LED Study Lamps",
        body: "Protect your vision during late-night reading and computer work with flicker-free optical diffusers, adjustable color temperatures, and flexible gooseneck designs.",
      },
      {
        heading: "Aesthetic Bedroom Night Lamps",
        body: "Warm, cozy ambient night lights promote relaxing sleep while adding a modern aesthetic touch to your bedroom decor.",
      },
    ],
    relatedGuideSlug: "lamps-lighting-home-decor-guide-pakistan",
    relatedGuideTitle: "Read our Lamps & Ambient Lighting Ideas Guide →",
  },
  "pest-control": {
    title: "Pest Control & Mosquito Killer Bats Online in Pakistan",
    intro:
      "Protect your family and home against seasonal mosquitoes, Dengue, and Malaria with rechargeable electric insect killer bats and non-toxic pest control devices from SimpleCart Store.",
    subsections: [
      {
        heading: "3000V High-Voltage Rechargeable Mosquito Bats",
        body: "Instantly eliminate flying pests on contact with powerful high-voltage grids protected by triple-layer insulated safety mesh to prevent accidental shocks.",
      },
      {
        heading: "Chemical-Free, Non-Toxic Home Protection",
        body: "Avoid inhaling toxic smoke from mosquito coils and chemical sprays. Electric bats provide 100% clean, odorless, and reusable pest control for families.",
      },
    ],
    relatedGuideSlug: "pest-control-mosquito-killer-bats-guide-pakistan",
    relatedGuideTitle: "Read our Dengue Prevention & Mosquito Bat Guide →",
  },
  "wellness-comfort": {
    title: "Wellness, Body Massagers & Posture Comfort in Pakistan",
    intro:
      "Relieve physical tension, chronic neck stiffness, and back fatigue after demanding workdays with ergonomic wellness devices and Shiatsu massagers from SimpleCart Store.",
    subsections: [
      {
        heading: "3D Shiatsu Kneading Neck & Back Massagers",
        body: "Experience deep-tissue tension relief with multi-directional rotating massage nodes and optional soothing infrared heat to improve circulation and relieve knots.",
      },
      {
        heading: "Ergonomic Lumbar Support Cushions",
        body: "Maintain healthy spinal alignment while sitting at your computer desk or during long driving commutes with high-density memory foam support cushions.",
      },
    ],
    relatedGuideSlug: "wellness-comfort-massagers-lifestyle-pakistan",
    relatedGuideTitle: "Read our Daily Wellness & Posture Comfort Guide →",
  },
  "home-essentials": {
    title: "Home Essentials & Daily Living Organizers in Pakistan",
    intro:
      "Explore curated home essentials, practical lifestyle accessories, organizers, and everyday apparel at SimpleCart Store. Backed by authentic in-hand warehouse stock, protective packaging, and fast Cash on Delivery across 400+ Pakistani cities.",
    subsections: [
      {
        heading: "Everyday Practicality & Long-Lasting Durability",
        body: "Every product in our Home Essentials catalog is tested for build quality, materials, and long-term utility in Pakistani households.",
      },
      {
        heading: "7-Day Purchase Protection & COD Convenience",
        body: "Shop with total confidence: inspect your parcel upon courier delivery and enjoy our hassle-free 7-day replacement guarantee.",
      },
    ],
    relatedGuideSlug: "inside-simplecart-store-real-stock-cod-pakistan",
    relatedGuideTitle: "Learn How SimpleCart Sourcing & Quality Inspection Works →",
  },
};

export function CollectionSeoContent({ slug }: { slug: string }) {
  const data = COLLECTION_SEO_DATA[slug];
  if (!data) return null;

  return (
    <section className="mt-14 rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-6 sm:p-8 md:p-10">
      <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
        {data.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700 sm:text-base">
        {data.intro}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {data.subsections.map((sub, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-xs"
          >
            <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
              {sub.heading}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
              {sub.body}
            </p>
          </div>
        ))}
      </div>

      {data.relatedGuideSlug ? (
        <div className="mt-6 border-t border-neutral-200/80 pt-4">
          <Link
            href={`/blogs/${data.relatedGuideSlug}`}
            className="inline-flex items-center text-sm font-bold text-amber-700 hover:text-amber-800 hover:underline"
          >
            {data.relatedGuideTitle}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
