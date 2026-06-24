const http = require('http');
const httpProxy = require('http-proxy');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('../src/utils/logger');

// Load env configuration
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PROXY_PORT || 8000;
const targets = (process.env.BACKEND_TARGETS || 'http://localhost:5000').split(',');

// Create proxy server instance
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  xfwd: true // Add X-Forwarded headers
});

let currentTargetIndex = 0;

const server = http.createServer((req, res) => {
  // Simple round-robin load balancing
  const target = targets[currentTargetIndex];
  currentTargetIndex = (currentTargetIndex + 1) % targets.length;

  logger.info(`[Proxy] Routing ${req.method} ${req.url} -> ${target}`);

  // Forward request
  proxy.web(req, res, { target }, (err) => {
    logger.error(`[Proxy] Error forwarding request to ${target}: %s`, err.message);
    
    // Respond with 502 Bad Gateway
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      name: 'BadGateway',
      message: 'Proxy error: Upstream server is unavailable or timed out.'
    }));
  });
});

// Listen on proxy port
server.listen(PORT, () => {
  logger.info(`[Proxy] Reverse Proxy server running on port ${PORT}`);
  logger.info(`[Proxy] Load balancing targets: ${targets.join(', ')}`);
});
