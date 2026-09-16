/** @type {import('next').NextConfig} */
const nextConfig = {
  // `typescript.ignoreBuildErrors` was on. It hides exactly the class of bug
  // that shipped here — a query selecting a column that does not exist. If the
  // build is red, that is information, not an obstacle.
  images: {
    // Cloudinary already serves f_auto,q_auto — Next's optimizer would be a
    // second resize on top of an optimised image, so leave it off.
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
}

export default nextConfig
