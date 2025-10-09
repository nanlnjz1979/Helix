const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // API代理配置，将/api请求转发到后端服务器
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request: ${req.method} ${req.originalUrl} -> http://localhost:5000${req.originalUrl}`);
      },
      onError: (err, req, res) => {
        console.error(`Proxy error: ${err.message}`);
        res.status(500).json({ error: 'Proxy error: Could not connect to backend server' });
      }
    })
  );
};