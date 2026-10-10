# Deployment guides

These guides deploy the two AptiQuiz runtimes as separate Dokploy applications:

- [Deploy AptiQuiz on Dokploy](dokploy.md) configures the web app, the Socket.IO Game Server, PostgreSQL access, environment variables, domains, and health checks.
- [Set up DNS and nameservers](dns-and-nameservers.md) delegates a domain to a DNS provider and points the required hostnames at the Dokploy server.
- [Deployment-guide verification](verification.md) records the repository and Dokploy sources behind these instructions.

Start with DNS when the domain is not already pointing at the Dokploy server. Then follow the Dokploy guide from top to bottom.
