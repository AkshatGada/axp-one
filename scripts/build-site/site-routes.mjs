export function siteRoutes({mvp404 = '/mvp/404.html'} = {}) {
  const security = {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'};
  return [
    {src: '^/(.*)$', headers: security, continue: true},
    {src: '^/(?:mvp/(?:first-recording/)?)?_next/static/(.*)$', headers: {'Cache-Control': 'public, max-age=31536000, immutable'}, continue: true},
    {src: '^/api(?:/.*)?$', dest: '/api/index'},
    {src: '^/mvp$', status: 308, headers: {Location: '/mvp/'}},
    {src: '^/advertiser-dashboard$', status: 308, headers: {Location: '/advertiser-dashboard/'}},
    {src: '^/publisher-demo$', status: 308, headers: {Location: '/publisher-demo/'}},
    {src: '^/sdk/?$', status: 308, headers: {Location: '/publisher-demo/integration/'}},
    {handle: 'filesystem'},
    {src: '^/$', dest: '/index.html', check: true},
    {src: '^/(.+?)/?$', dest: '/$1/index.html', check: true},
    {handle: 'error'},
    {src: '^/mvp/(.*)$', status: 404, dest: mvp404},
    {src: '^/(.*)$', status: 404, dest: '/404.html'},
  ];
}
