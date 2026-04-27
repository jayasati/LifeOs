import withBundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tree-shake-friendly transforms for known barrel-style packages. Even
  // though our imports are already named, this ensures the bundler resolves
  // each icon / fn from its own module instead of pulling the whole barrel
  // in dev (which slows HMR) and guarantees tree-shaking under any bundler
  // setting in prod. Safe no-op for packages not in the list.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },
};

// Run `npm run analyze` (or `ANALYZE=true npm run build`) to open the bundle
// treemap. Disabled by default so regular builds aren't affected.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
