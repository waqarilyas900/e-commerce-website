import { ProfileForm } from "./profile-form";

export default function AccountProfilePage() {
  return (
    <>
      <p className="text-xs font-normal capitalize tracking-wide text-neutral-500">
        <a href="/account" className="hover:underline">
          Account
        </a>{" "}
        / Profile
      </p>
      <h1 className="mt-2 text-3xl font-normal tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Keep your details up to date for checkout and support.
      </p>
      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
        <ProfileForm />
      </div>
    </>
  );
}
