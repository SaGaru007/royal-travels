/**
 * The frontend is a static export of client components, so the API URL is
 * baked in at build time. If a Vercel build is missing it, every request goes
 * to localhost:8081 and the whole site silently breaks. Fail the build instead.
 */
if (process.env.VERCEL === "1" && !process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not set for this Vercel deployment. Add it under " +
      "Project Settings → Environment Variables (for example " +
      "https://royal-travels-api.onrender.com) and redeploy."
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
