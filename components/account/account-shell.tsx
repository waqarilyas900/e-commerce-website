import { Footer, Header, TopStrip } from "@/components/storefront";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopStrip />
      <Header />
      <main
        id="MainContent"
        className="main-content mx-auto w-full max-w-7xl shell-x py-6 sm:py-8"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
