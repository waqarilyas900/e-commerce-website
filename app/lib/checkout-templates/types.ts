/**
 * Declarative checkout field templates — swap `pakistan-standard` vs `guest-minimal`
 * (or add your own) to change labels, grouping, or which inputs appear per scenario.
 */

export type CheckoutFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select";

export type CheckoutSelectOption = { value: string; label: string };

export type CheckoutFieldDef = {
  id: string;
  label: string;
  type: CheckoutFieldType;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  /** Tailwind grid: 1 = half width on sm+, 2 = full row */
  colSpan?: 1 | 2;
  options?: CheckoutSelectOption[];
  /** e.g. show “Use my location” next to street */
  meta?: {
    locationButton?: boolean;
  };
};

export type CheckoutSectionDef = {
  id: string;
  title: string;
  description?: string;
  fields: CheckoutFieldDef[];
};

export type CheckoutTemplateDef = {
  id: string;
  title: string;
  sections: CheckoutSectionDef[];
};
