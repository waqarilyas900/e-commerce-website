import { Footer, Header, TopStrip } from "@/components/storefront";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
