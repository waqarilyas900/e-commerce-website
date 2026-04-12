import { ContactForm } from "@/components/contact/ContactForm";
import { Footer, Header, TopStrip } from "@/components/storefront";

export default function ContactPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main id="MainContent" className="main-content mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Need Help?</h1>
        <p className="mt-2 text-neutral-600">
          Generic support page template for your e-commerce business.
        </p>

        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
