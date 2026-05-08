const STATE_COOKIE = "citesite_oauth_state";
const ALLOWED_OPENER_ORIGIN = "https://citesite.net";

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authUrl.searchParams.set("scope", "repo,user");
      authUrl.searchParams.set("state", state);
      return new Response(null, {
        status: 302,
        headers: {
          Location: authUrl.toString(),
          "Set-Cookie": `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        },
      });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const stateParam = url.searchParams.get("state");
      const stateCookie = readCookie(request, STATE_COOKIE);
      if (!stateParam || !stateCookie || !timingSafeEqualStr(stateParam, stateCookie)) {
        return new Response("Invalid OAuth state", {
          status: 400,
          headers: {
            "Set-Cookie": `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
          },
        });
      }

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

      const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" });
      const targetOrigin = env.OAUTH_OPENER_ORIGIN || ALLOWED_OPENER_ORIGIN;

      const script = `
        <script>
          (function() {
            var TARGET_ORIGIN = ${JSON.stringify(targetOrigin)};
            function receiveMessage(e) {
              if (e.origin !== TARGET_ORIGIN) return;
              window.opener.postMessage(
                'authorization:github:success:${payload}',
                TARGET_ORIGIN
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", TARGET_ORIGIN);
          })()
        </script>
      `;
      return new Response(script, {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
