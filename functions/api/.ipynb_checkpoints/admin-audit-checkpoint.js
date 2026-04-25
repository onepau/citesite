export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch("https://citesite-api.onepau.workers.dev/api/audit/full", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": env.ADMIN_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}