/** @type {import('next').NextConfig} */
const nextConfig = {
  // The embeddable form is served to your main website from this origin,
  // so the inquiry endpoint has to accept cross-origin POSTs. See
  // src/lib/cors.ts for the allow-list (ALLOWED_ORIGINS in .env).
  poweredByHeader: false,
};

export default nextConfig;
