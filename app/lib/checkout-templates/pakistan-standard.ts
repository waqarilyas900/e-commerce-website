import { PAKISTAN_PROVINCE_OPTIONS } from "@/app/lib/checkout-templates/pakistan-provinces";
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
          id: "phone",
          label: "Phone number",
          type: "phone",
          required: true,
          colSpan: 2,
        },
      ],
    },
    {
      id: "delivery",
      title: "Delivery address",
      fields: [
        {
          id: "shipping_street",
          label: "Street and area",
          type: "textarea",
          placeholder: "House / street / neighbourhood",
          autoComplete: "street-address",
          required: true,
          colSpan: 2,
          meta: { locationButton: true },
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
          label: "Postal code",
          type: "text",
          autoComplete: "postal-code",
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
