import { redirect } from 'next/navigation';

/**
 * This app's job is the venue pages, not a homepage — your homepage already
 * exists at nogreaterlovephoto.com. Sending / straight to the venue index
 * avoids publishing a second, competing landing page on the same brand.
 */
export default function Home() {
  redirect('/wedding-photographer');
}
