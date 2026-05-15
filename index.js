export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    // Serve index.html for unknown routes so the React SPA handles routing
    if (response.status === 404) {
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", request.url), request),
      );
    }
    return response;
  },
};
