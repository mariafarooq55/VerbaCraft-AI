# VerbaCraft — Two ways to write

VerbaCraft includes two separate apps. Both welcome visitors, offer sign-up and sign-in,
and give each account its own private article history.

- **A — Streamlit app:** the separate Python project in `python_app/`. Run it with
  `streamlit run app.py` from that folder. It has its own simple writing desk and
  optional MongoDB Atlas support.
- **B — Next.js app:** the main app in this project root. It contains the full article
  creation studio and the advanced PDF, Word, HTML and TXT exports. It does not show
  Python or Streamlit pages.

The steps and exports described below are for **B**, the main Next.js app.

## What it does, step by step

1. **Choose your title** — Type an idea and get six title options. Pick one and lock it.
   The locked title is used in every later step, so it never changes by accident.
2. **Answer a few questions** — Who is the article for, how should it sound, how long
   should it be, and what is it for. A few optional questions make the article personal.
3. **Pick key phrases** — Words and phrases readers may search for. Add your own too.
4. **Check the outline** — The sections and common questions (FAQs) for the article.
5. **Add pictures and links** — Choose photos, videos and trusted sources.
6. **Write the first draft** — The article is written for you and checked for how easy
   it is to read. The draft is **saved to “My articles” automatically**.
7. **Make it sound human** — Stiff, machine-sounding lines are rewritten into natural
   writing. You see the before and after side by side. The finished version is
   **saved to “My articles” automatically** as well.
8. **Edit, save and download** — Change any wording in the editor, preview the layout,
   and download your article to your computer as **PDF, Word (.docx), HTML or TXT**.

## Where your articles live

- **My articles** keeps every finished article. You can search it, reopen an article
  to keep editing, compare the first draft with the rewritten version, download it,
  or delete it.
- Saving happens on its own when a draft or a rewritten version is finished, and you
  can also press **Save to My articles** whenever you like.

## Accounts and saved articles

Visitors first see the public welcome page, which explains the app. Choose **I want to create an article** to make an account, or sign in if you already have one. The writing studio and article downloads are available after signing in.

Passwords are stored as secure one-way hashes. Each account has its own private article history; users cannot open, change, download, or delete another person's articles. Sign-in sessions last seven days and are kept in an HTTP-only cookie.

## Light and dark mode

Use the toggle in the top bar to switch between the light and dark theme. Your choice
is remembered the next time you open the app.

## Downloads

Every download button writes a real file straight to your computer (usually the
`Downloads` folder). Pictures are embedded in PDF and Word files, and the HTML file
contains its own copy of each picture. HTML also has videos you can play while online.
PDF and Word files include video preview pictures with clickable watch links; TXT
includes picture captions and all the relevant links. If a browser blocks the first
attempt, a “Download … again” link appears so you can save the file with one more click.

## Where are my articles saved?

You do not need a database to use the app.

- If `DATABASE_URL` is set and the database is reachable, articles are saved there.
- If it is missing or cannot be reached, articles are saved to a small local file at
  `.data/articles.json` inside the project folder, and the app tells you
  “Saved on This computer” in **My articles**. Nothing is lost and no error appears.

Once your database is running, set `DATABASE_URL` in `.env` — the table is created
automatically the first time the app saves something.

## Running the project

```bash
npm install
npm run dev            # start the app on http://localhost:3000
```

Environment variables live in `.env`:

| Key | What it is for |
| --- | --- |
| `DATABASE_URL` | Optional PostgreSQL connection. If omitted, articles are saved to `.data/articles.json` |
| `OPENAI_API_KEY` | Optional. Adds live AI writing (OpenAI, Groq, OpenRouter or Gemini) |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY` | Optional alternatives to OpenAI |
| `LLM_MODEL` | Optional model name for the provider above |

If no AI key is set, the app still works end to end using its built-in writing and
rewriting engine — you will simply see the built-in assistant name in the sidebar.

## Built with

- Next.js (App Router) and React with Tailwind CSS
- PostgreSQL with Drizzle ORM for saved articles
- Native document builders for PDF (`pdf-lib`) and Word (`docx`), plus HTML and TXT
- A built-in writing-quality checker (reading ease, sentence variety, repeated words,
  robotic phrases and keyword coverage)
