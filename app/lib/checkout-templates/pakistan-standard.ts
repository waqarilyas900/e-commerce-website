import type { CheckoutTemplateDef } from "@/app/lib/checkout-templates/types";

/** Full COD + Pakistan address flow — default for this storefront. */
export const PAKISTAN_STANDARD_CHECKOUT: CheckoutTemplateDef = {
  id: "pakistan-standard",
  title: "Pakistan delivery (COD)",
  sections: [
    {
      id: "contact",
      title: "Contact information",
      fields: [
        {
          id: "email",
          label: "Email",
          type: "email",
          autoComplete: "email",
          required: true,
          colSpan: 2,
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery",
      fields: [
        {
          id: "shipping_country",
          label: "Country/Region",
          type: "country",
          colSpan: 2,
        },
        {
          id: "first_name",
          label: "First name",
          type: "text",
          autoComplete: "given-name",
          required: true,
          colSpan: 1,
        },
        {
          id: "last_name",
          label: "Last name",
          type: "text",
          autoComplete: "family-name",
          required: true,
          colSpan: 1,
        },
        {
          id: "shipping_street",
          label: "Address",
          type: "textarea",
          placeholder: "Address",
          autoComplete: "street-address",
          required: true,
          colSpan: 2,
        },
        {
          id: "shipping_city",
          label: "City",
          type: "text",
          autoComplete: "address-level2",
          required: true,
          colSpan: 1,
        },
        {
          id: "shipping_postal_code",
          label: "Postal code (optional)",
          type: "text",
          autoComplete: "postal-code",
          required: false,
          colSpan: 1,
        },
        {
          id: "phone",
          label: "Phone",
          type: "phone",
          placeholder: "0300 1234567",
          required: true,
          colSpan: 2,
          meta: { lockCountry: true },
        },
      ],
    },
  ],
};
