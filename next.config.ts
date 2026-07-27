import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB request body — the JSCPH/ECOMP
    // workbooks (9 sheets of real part/PO data each) exceed that, which was
    // rejecting uploads before ImportForm's own error handling ever ran.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
