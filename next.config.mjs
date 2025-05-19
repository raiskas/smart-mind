// next.config.mjs (Plugin reativado)
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin(
  './i18n.ts' 
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config options go here, if any
  // Example:
  // reactStrictMode: true,
};

export default withNextIntl(nextConfig); // Usar wrapper novamente
// export default nextConfig; // Comentar export direto 