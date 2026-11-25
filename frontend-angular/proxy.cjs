module.exports = {
  "/api": {
    target: process.env.API_ORIGIN || "http://127.0.0.1:4000",
    changeOrigin: true,
  },
};
