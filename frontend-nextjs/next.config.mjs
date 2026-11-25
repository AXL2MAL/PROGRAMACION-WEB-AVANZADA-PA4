const api = process.env.API_ORIGIN || "http://127.0.0.1:4000";
const panel = process.env.PANEL_ORIGIN;
export default {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: api + "/api/:path*" },
      ...(panel
        ? [{ source: "/admin/:path*", destination: panel + "/:path*" }]
        : []),
    ];
  },
};
