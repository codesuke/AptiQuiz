# 11. Technologies

This page explains each technology in AptiQuiz. For each one, it tells you what it is, what it does here, and why we chose it.

## Language

### TypeScript

- **What it is:** JavaScript with types. The compiler finds many errors before the code runs.
- **What it does here:** We write all code in TypeScript: the pages, the Game Server, the rules, and the tests.
- **Why:** One language for all parts. The browser, the server, and the test script share the same message types.

## Pages and accounts

### Next.js

- **What it is:** A framework for React web applications. It renders pages on the server and in the browser.
- **What it does here:** It gives all pages, such as `/host`, `/join`, and `/league`. It also gives small server routes, such as `/api/socket-ticket`.
- **Why:** Pages load fast because the server renders them. Server code and secrets stay on the server.

### React

- **What it is:** A library to build user interfaces from components.
- **What it does here:** It draws the Lobby, the Question, the countdown, the Leaderboard, and the results.
- **Why:** The screen updates quickly when a live message arrives.

### Tailwind CSS

- **What it is:** A set of small style classes that you put directly on elements.
- **What it does here:** It gives the layout, colours, and spacing on phones and laptops.
- **Why:** Fast to build, and the design stays consistent.

### Framer Motion and GSAP

- **What they are:** Animation libraries.
- **What they do here:** They animate changes on screen, for example when the Leaderboard moves.
- **Why:** Movement helps players see what changed. Both respect the reduced-motion setting of the device.

### Zustand

- **What it is:** A small library to keep shared state in the browser.
- **What it does here:** It keeps the state of the connection to the Game Server, for example "online" or "offline". Many components read this state.
- **Why:** It is simple and small.

### Lucide icons and qrcode.react

- **What they are:** An icon set and a QR code component.
- **What they do here:** The icons are used in buttons and labels. The QR code lets a player join a Room with a phone camera.

### Better Auth

- **What it is:** An authentication library.
- **What it does here:** It controls sign-up, sign-in, sign-out, Google sign-in, email verification, and password reset.
- **Why:** It is safe and complete, and it keeps the user data in our own database.

### Nodemailer and Gmail SMTP

- **What they are:** A library to send email, and the Gmail mail server.
- **What they do here:** They send the verification email and the password reset email.

## Live game

### Node.js

- **What it is:** A program that runs JavaScript on a server.
- **What it does here:** It runs the Game Server, the web application, and the test script.
- **Why:** It can hold many open connections at the same time with low cost.

### Socket.IO

- **What it is:** A library for live, two-way messages between the browser and a server. It uses WebSocket.
- **What it does here:** It sends each Question, answer, reveal, and Leaderboard in real time. It groups players by Room.
- **Why:** It reconnects automatically. It supports acknowledgements, so each command gets a clear reply.

### WebSocket

- **What it is:** A connection that stays open between the browser and the server.
- **What it does here:** The server can send a message to all players at once, without a request from them.
- **Why:** All players see the Question at the same time.

### jose (JSON Web Tokens)

- **What it is:** A library to sign and check tokens.
- **What it does here:** It signs the 60-second connection tickets and the Room registration messages.
- **Why:** The Game Server can trust a ticket without a database query.

### Pino

- **What it is:** A fast logging library.
- **What it does here:** The Game Server writes logs of connections, refused commands, and errors.

## Data

### PostgreSQL

- **What it is:** A relational database.
- **What it does here:** It keeps accounts, colleges, Question Sets, Rooms, players, and Match results.
- **Why:** It is reliable. Unique keys stop duplicate data, for example two answers from one player in one Round.

### Prisma

- **What it is:** A tool to define the database schema and to query it from TypeScript.
- **What it does here:** The schema is in `Apti-App/packages/database/prisma/schema.prisma`. Prisma makes the database changes (migrations) and the typed queries.
- **Why:** Queries have types, so many errors show before the code runs.

### Zod

- **What it is:** A library that checks data against a schema while the program runs.
- **What it does here:** It checks each message from the browser and each HTTP request. Bad data gets a clear error.
- **Why:** TypeScript types do not check data from the network. Zod does.

## Tools

### pnpm

- **What it is:** A package manager for JavaScript.
- **What it does here:** It installs all libraries for all applications and packages.
- **Why:** It is fast and it uses little disk space.

### Turborepo

- **What it is:** A tool that runs tasks in a repository with many packages.
- **What it does here:** It runs build, test, and check tasks in the correct order, and it skips work that did not change.

### Biome

- **What it is:** A formatter and a linter.
- **What it does here:** It keeps the code style the same everywhere and finds common errors.

### Vitest

- **What it is:** A test runner.
- **What it does here:** It runs the behaviour tests, for example the scoring, answer, reveal, and reconnection tests.

### tsx

- **What it is:** A tool that runs TypeScript files directly.
- **What it does here:** It runs the Game Server in development and the 50-player test script.

## Deployment

### Docker

- **What it is:** A tool that packs an application and all its parts into a container.
- **What it does here:** One `Dockerfile` builds two containers: the web application and the Game Server.

### Dokploy

- **What it is:** A self-hosted platform to deploy containers.
- **What it does here:** It builds and runs both containers and the PostgreSQL database.

### Traefik

- **What it is:** A reverse proxy.
- **What it does here:** It gives HTTPS for both addresses and passes WebSocket connections to the Game Server.

### Redis (not used yet)

- **What it is:** A fast in-memory data store.
- **Status:** It is available on the server, but AptiQuiz does not use it yet. We will use it only when we need more than one Game Server.
