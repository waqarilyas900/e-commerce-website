import Link from "next/link";


export default function NotFound() {
  return (
    <>
      <main
        id="MainContent"
        className="main-content mx-auto max-w-lg shell-x py-20 text-center"
      >
        <p className="text-sm font-medium text-neutral-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-neutral-600">
          The page you are looking for does not exist or was moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white"
        >
          Back to home
        </Link>
      </main>
    </>
  );
}
