import type { Metadata } from 'next';
import Link from 'next/link';
import { business } from '@config/business';
import { websiteJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(business.siteUrl),
  title: {
    default: `${business.name} — ${business.region} Wedding Photography`,
    template: `%s`,
  },
  description: `Wedding photography in ${business.region} and the surrounding area.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <JsonLd data={websiteJsonLd()} />

        <header className="site-header">
          <div className="site-header__inner">
            <Link className="site-header__brand" href="/">
              {business.shortName}
            </Link>
            <nav className="site-header__nav">
              <Link href="/wedding-photographer">Venues</Link>
              <a href={business.siteUrl}>Main site</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="wrap">
            <p>
              {business.name} — wedding photography in {business.region}.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
