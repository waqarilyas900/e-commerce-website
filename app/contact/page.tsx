import { ContactPageContent } from "@/components/contact/contact-page-content";
import { Footer, Header, TopStrip } from "@/components/storefront";

export default function ContactPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        <ContactPageContent />
      </main>
      <Footer />
    </>
  );
}
