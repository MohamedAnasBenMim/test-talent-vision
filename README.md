# BECARTHAI TalentVision

BECARTHAI TalentVision is a modern interview management and video evaluation platform built for **BECARTH.AI Consulting**.

The application helps consulting, recruiting, and technical evaluation teams coordinate candidate interviews, host live video sessions, and capture review outcomes in one focused workspace.

![BECARTHAI TalentVision](pub.png)

## Overview

BECARTHAI TalentVision supports the interview lifecycle from scheduling to final review:

- Schedule interviews with candidates and one or more interviewers.
- Run secure video interviews with Stream-powered calls.
- Support screen sharing and recorded interview sessions.
- Manage candidate and interviewer access through Clerk authentication.
- Track interview status across upcoming, completed, successful, and failed outcomes.
- Add reviewer comments for structured candidate evaluation.
- Use Convex for real-time application data and backend functions.

## Built For BECARTH.AI Consulting

BECARTH.AI Consulting uses TalentVision as a tailored talent assessment workspace for high-signal hiring and client-facing evaluation workflows. The product is designed to make interview operations clearer, faster, and easier to review across distributed teams.

## Tech Stack

- **Next.js 14** and **TypeScript** for the application framework.
- **Tailwind CSS** and **shadcn/ui** for the interface.
- **Clerk** for authentication and role-aware access.
- **Convex** for backend data, queries, mutations, and webhooks.
- **Stream Video** for live interview calls, screen sharing, and recording support.

## Environment Setup

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_STREAM_API_KEY=
STREAM_SECRET_KEY=
```

You need accounts or projects for:

- **Clerk**: authentication keys and user management.
- **Convex**: deployment name and public URL.
- **Stream**: video API key and secret.

If the Clerk webhook in `convex/http.ts` is enabled, also set `CLERK_WEBHOOK_SECRET` in Convex:

```shell
npx convex env set CLERK_WEBHOOK_SECRET your_webhook_secret
```

For AI CV screening, set your Gemini credentials in Convex:

```shell
npx convex env set GEMINI_API_KEY
npx convex env set GEMINI_MODEL gemini-3.6-flash
```

## Run Locally

Install dependencies:

```shell
npm install
```

Start the Next.js development server:

```shell
npm run dev
```

In a second terminal, start Convex development:

```shell
npx convex dev
```

Open the local app from the URL printed by Next.js, usually `http://localhost:3000`.

## Available Scripts

```shell
npm run dev
npm run build
npm run start
npm run lint
```

## Project Name

This project is branded as **BECARTHAI TalentVision** and maintained for **BECARTH.AI Consulting**.
