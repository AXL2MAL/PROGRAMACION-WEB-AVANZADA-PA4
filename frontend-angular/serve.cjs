const express = require("express"),
  path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express(),
  dir = path.join(__dirname, "dist/panel");
app.disable("x-powered-by");
app.use(
  createProxyMiddleware("/api", {
    target: process.env.API_ORIGIN || "http://127.0.0.1:4000",
    changeOrigin: true,
  }),
);
app.use(express.static(dir));
app.get("*", (_, res) => res.sendFile(path.join(dir, "index.html")));
app.listen(Number(process.env.PORT || 4200), process.env.BIND_HOST || "0.0.0.0");
