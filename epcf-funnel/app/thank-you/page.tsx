import type { Metadata } from 'next';
import ThankYou from './ThankYou';

export const metadata: Metadata = { title: 'Your Quote Request Is In! | EPCF', robots: { index: false } };

export default function Page() {
  return (
    <main className="bgpd" style={{ background: 'var(--navy)', minHeight: '100vh', padding: '48px 16px' }}>
      <ThankYou />
    </main>
  );
}
