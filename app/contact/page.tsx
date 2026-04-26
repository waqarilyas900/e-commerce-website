import { ContactPageContent } from "@/components/contact/contact-page-content";
import { Footer, Header, TopStrip } from "@/components/storefront";

export default function ContactPage() {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto max-w-3xl shell-x py-6 sm:py-10"
      >
        <ContactPageContent />
      </main>
      <Footer />
    </>
  );
}
