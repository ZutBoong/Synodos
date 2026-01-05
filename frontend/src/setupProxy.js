const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const backendUrl = 'http://localhost:8081';

  // API 프록시
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
    })
  );

  // OAuth2 인증 요청 프록시
  app.use(
    '/oauth2/authorization',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
    })
  );

  // OAuth2 콜백 프록시
  app.use(
    '/login/oauth2',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
    })
  );

  // WebSocket 프록시
  app.use(
    '/ws',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      ws: true,
    })
  );
};
