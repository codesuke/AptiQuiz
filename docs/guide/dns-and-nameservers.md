# Set up DNS and nameservers

This guide makes the public web app and Game Server reachable at two hostnames:

| Purpose | Example hostname | Destination |
| --- | --- | --- |
| Web app | `app.example.com` | Dokploy server public IPv4 address |
| Game Server | `game.example.com` | Dokploy server public IPv4 address |

Use the same hostnames in [the Dokploy guide](dokploy.md). The examples use subdomains so the site can coexist with another service at the apex domain. You can instead use `example.com` for the web app; in that case, create the web record at `@`.

## Decide where DNS is hosted

Your registrar is where the domain was purchased. Your DNS host is where DNS records are edited. They can be the same company.

If your registrar already hosts the DNS zone, leave nameservers unchanged and create the records in its DNS panel. Change nameservers only when you deliberately want another DNS provider, such as Cloudflare, to host the zone. Changing nameservers without recreating existing records can break email, verification, and other services.

## Option A: keep DNS at the registrar

1. Sign in to the registrar's DNS management page.
2. Find the server's public IPv4 address in the Dokploy host or VPS provider.
3. Create these A records:

   | Type | Name / host | Value | TTL |
   | --- | --- | --- | --- |
   | A | `app` | `YOUR_DOKPLOY_SERVER_IPV4` | Auto or 300 seconds |
   | A | `game` | `YOUR_DOKPLOY_SERVER_IPV4` | Auto or 300 seconds |

4. Save the records and wait until DNS queries return the server IP.

## Option B: delegate the domain to another DNS provider

1. Add the domain to the new DNS provider. It will show two or more authoritative nameservers, such as `ns1.provider.example` and `ns2.provider.example`.
2. At the registrar, open the domain's **Nameservers** or **DNS delegation** page. Choose custom nameservers and replace the existing nameservers with every value supplied by the new DNS provider.
3. Wait for the delegation to become active. This can take from minutes to 48 hours, depending on the registrar and previous TTLs.
4. In the new DNS provider's zone, create the `app` and `game` A records from Option A.

Do not copy example nameservers from this guide. Use only the values your selected DNS provider assigns to your domain.

## Verify before configuring domains in Dokploy

From a terminal, replace the hostname and check that it resolves to the Dokploy server's public IP:

```bash
dig +short A app.example.com
dig +short A game.example.com
```

On Windows PowerShell, use:

```powershell
Resolve-DnsName app.example.com -Type A
Resolve-DnsName game.example.com -Type A
```

Both results must be the Dokploy server's public address before adding the domains in Dokploy. This lets Traefik complete the HTTP validation needed for a Let's Encrypt certificate.

## Finish in Dokploy

Add `app.example.com` to the web application on port `3000`, then add `game.example.com` to the Game Server application on port `3001`. Enable HTTPS for both. Keep inbound ports 80 and 443 open on the server firewall and cloud security group so Dokploy's Traefik proxy can receive traffic and obtain certificates.

If you use Cloudflare or another proxying DNS provider, start with records set to DNS-only while issuing the first certificates and verifying the deployment. Once both URLs work, proxying can be enabled if the provider supports WebSockets; preserve end-to-end HTTPS and do not rewrite the `Origin` header.

## Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Dokploy cannot issue a certificate | The hostname does not resolve to the server, or port 80 is blocked. | Correct the A record and open ports 80 and 443, then retry after DNS has propagated. |
| Web app works but socket connection fails | The browser bundle points to the wrong Game Server URL or CORS rejects the web origin. | Rebuild the web image with the correct `NEXT_PUBLIC_GAME_SERVER_URL`; set `GAME_SERVER_ORIGIN` to the exact HTTPS web origin. |
| Existing email or site stopped working after a nameserver change | The new DNS zone lacks old records. | Recreate every required MX, TXT, CNAME, A, and AAAA record at the new DNS provider. |
| One hostname resolves to an unexpected server | A stale or duplicate record exists. | Remove the incorrect record, then wait for its TTL to expire. |

Dokploy requires a domain to point at the server before it can configure HTTPS. See its [domain troubleshooting guidance](https://docs.dokploy.com/docs/core/troubleshooting/domains) for current platform details.
