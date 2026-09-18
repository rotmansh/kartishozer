// Deliberately NOT including Content-Security-Policy here — Clerk's
// hosted auth UI and Next.js's own inline hydration scripts need a
// carefully researched, tested CSP (specific Clerk domains, script-src
// allowances for RSC hydration); a guessed one risks silently breaking
// sign-in/sign-up in production, which nothing here can safely verify
// before it ships. The headers below are all well-understood, low-risk
// additions that can't break existing functionality.
const securityHeaders = [
  // Blocks this site from being embedded in an <iframe> on another
  // domain (clickjacking) — nothing here legitimately needs to be framed.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stops the browser from guessing a response's content-type from its
  // body instead of trusting the declared Content-Type header.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sends the full URL as referrer only to our own origin; cross-origin
  // requests (an external link, an image load) only get the origin, not
  // the full path/query — avoids leaking, say, a listing ID unnecessarily.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disables browser features this app never uses, and opts out of
  // FLoC/Topics-style cross-site tracking cohorts.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Vercel already serves everything over HTTPS, but this tells browsers
  // to enforce it themselves too (protects against a downgrade attempt
  // on the very first request). No `preload` — that's a much harder,
  // effectively permanent commitment this isn't the moment to make.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
