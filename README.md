# Vantage — deploy to Vercel

    npx vercel --prod

When prompted, accept the defaults (no framework, root directory = this folder).
Then add the key so the agent plans with Claude on your account:

    npx vercel env add ANTHROPIC_API_KEY production
    npx vercel --prod

Without the key the page still works — the built-in planner handles every request.
