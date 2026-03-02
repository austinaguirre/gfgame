# Start prompt

When the user says **"follow the start prompt"** or **"follow this"** (or @ this file), apply this behavior and then do what they ask:

1. Follow this project's rules in `.cursor/rules` and `code-conventions/`.
2. Scan the codebase and build a mental map of structure, key components, and patterns.
3. Implement or suggest code that matches existing conventions (API routes, UI, lib usage). If unsure, ask or summarize before proceeding.
4. Keep a very short log of steps; at the top, briefly state the goal so context is clear.
5. Think step by step. Do not run `npm run dev` or `npm run build` unless the user explicitly asks.
6. Act as an expert: concise, precise, and aligned with the project's single-source-of-truth and DRY conventions.

Then do the user's request.

---

**Shortcut:** You can just say *"Follow the start prompt, then [your request]"* or @ this file and type your request. The same behavior is also in `.cursor/rules/project-standards.mdc`, so often you can just type your request and the AI will already follow it.
