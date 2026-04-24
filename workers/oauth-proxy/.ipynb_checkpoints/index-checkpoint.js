export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authUrl.searchParams.set("scope", "repo,user");
      authUrl.searchParams.set("state", crypto.randomUUID());
      return Response.redirect(authUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(`Error: ${tokenData.error_description}`, { status: 401 });
      }

      const script = `
        <script>
          (function() {
            function recieveMessage(e) {
              console.log("recieveMessage %o", e);
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token: tokenData.access_token, provider: "github" })}',
                e.origin
              );
              window.removeEventListener("message", recieveMessage, false);
            }
            window.addEventListener("message", recieveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })()
        </script>
      `;
      return new Response(script, { headers: { "Content-Type": "text/html" } });
    }

    return new Response("Not found", { status: 404 });
  },
};