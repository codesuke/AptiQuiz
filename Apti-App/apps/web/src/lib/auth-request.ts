/** Posts JSON to a mounted Better Auth endpoint, which validates the body at runtime. */
export function postAuthJson(path: string, body: object) {
  return fetch(`/api/auth${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
