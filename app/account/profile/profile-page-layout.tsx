import Link from "next/link";

export function ProfilePageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="text-xs font-normal capitalize tracking-wide text-neutral-500">
        <Link href="/account" className="hover:underline">
          Account
        </Link>{" "}
        / Profile
      </p>
      <h1 className="mt-2 text-[1.50rem] font-normal tracking-tight sm:text-3xl">Profile</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Keep your details up to date for checkout and support.
      </p>
      <div className="mt-8 space-y-8">{children}</div>
    </>
  );
}
