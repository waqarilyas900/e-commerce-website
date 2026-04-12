import { PAKISTAN_PROVINCE_OPTIONS } from "@/app/lib/checkout-templates/pakistan-provinces";
import type { CheckoutTemplateDef } from "@/app/lib/checkout-templates/types";

/**
 * Example alternate template: fewer sections, same API field ids.
 * Use when you only need contact + a single address line (e.g. pickup or pilot regions).
 */
export const GUEST_MINIMAL_CHECKOUT: CheckoutTemplateDef = {
  id: "guest-minimal",
  title: "Quick checkout",
  sections: [
    {
      id: "essentials",
      title: "Details",
      description: "Minimal fields — still maps to the same order API.",
      fields: [
        {
          id: "email",
          label: "Email",
          type: "email",
          required: true,
          colSpan: 2,
        },
        {
          id: "first_name",
          label: "First name",
          type: "text",
          required: true,
          colSpan: 1,
        },
        {
          id: "last_name",
          label: "Last name",
          type: "text",
          required: true,
          colSpan: 1,
        },
        {
          id: "phone",
          label: "Phone",
          type: "phone",
          required: true,
          colSpan: 2,
        },
        {
          id: "shipping_street",
          label: "Full address",
          type: "textarea",
          required: true,
          colSpan: 2,
        },
        {
          id: "shipping_city",
          label: "City",
          type: "text",
          required: true,
          colSpan: 1,
        },
        {
          id: "shipping_postal_code",
          label: "Postal code",
          type: "text",
          required: true,
          colSpan: 1,
        },
        {
          id: "shipping_province",
          label: "Province",
          type: "select",
          required: true,
          colSpan: 2,
          options: PAKISTAN_PROVINCE_OPTIONS,
        },
      ],
    },
  ],
};
