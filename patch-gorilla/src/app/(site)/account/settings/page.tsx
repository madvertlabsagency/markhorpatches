import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { addressAction } from "@/app/actions/auth";
import { AddressForm, PasswordForm, ProfileForm } from "@/components/account/SettingsForms";

async function deleteAddress(fd: FormData) {
  "use server";
  fd.set("delete", "1");
  await addressAction(undefined, fd);
}

export default async function AccountSettings() {
  const { user, customer } = await requireCustomer("/account/settings");
  const addresses = customer ? await prisma.address.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : [];
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
        <h2 className="font-display text-2xl font-extrabold uppercase">Profile</h2>
        <p className="mb-5 text-sm text-slate">{user.email}</p>
        {customer ? <ProfileForm c={{ firstName: customer.firstName ?? "", lastName: customer.lastName ?? "", phone: customer.phone ?? "", company: customer.company ?? "", marketingConsent: customer.marketingConsent }} /> : <p className="text-sm text-slate">Confirm your email to edit your profile.</p>}
      </section>
      <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
        <h2 className="mb-5 font-display text-2xl font-extrabold uppercase">Addresses</h2>
        {addresses.length > 0 && (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-xl bg-ice p-4 text-sm">
                {a.isDefault && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-patch">Default</p>}
                <p className="font-semibold">{a.firstName} {a.lastName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.city}, {a.state} {a.postalCode}</p>
                <form action={deleteAddress} className="mt-2"><input type="hidden" name="id" value={a.id} /><button className="text-xs font-semibold text-slate hover:text-danger">Remove</button></form>
              </li>
            ))}
          </ul>
        )}
        {customer ? <AddressForm /> : <p className="text-sm text-slate">Confirm your email to save addresses.</p>}
      </section>
      <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
        <h2 className="mb-5 font-display text-2xl font-extrabold uppercase">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
