import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal surfaces: no business value to a crawler, and the admin
        // panel should never appear in search results.
        disallow: ["/admin", "/account", "/driver", "/confirmation", "/track"],
      },
    ],
  };
}
