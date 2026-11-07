# VerbaCraft AI — Intelligent Article Generation & Humanization

VerbaCraft AI is an AI-powered article writing web application that helps users transform their ideas into professional, well-structured, and natural-sounding articles.

Built with **Next.js, React, TypeScript, and MongoDB Atlas**, VerbaCraft provides a guided writing workflow, AI-powered content generation, article humanization, editing, analysis, history management, and document exports.

## Features

- **User Authentication** — Create an account, sign in, and manage your private articles.
- **AI Title Generation** — Enter an idea and generate six professional article title suggestions.
- **Title Locking** — Select one title and keep it fixed throughout the entire writing process.
- **Guided Article Creation** — Answer questions about audience, tone, purpose, and target word count.
- **Keyword Suggestions** — Discover relevant keywords and add your own phrases.
- **Article Outline** — Review article sections, headings, and frequently asked questions.
- **Media and References** — Add relevant images, videos, and trusted sources.
- **AI Article Generation** — Generate structured article drafts from your selected title and preferences.
- **Article Humanization** — Rewrite stiff or machine-sounding sentences into more natural language.
- **Content Analysis** — Analyze article readability and writing quality.
- **Interactive Editor** — Edit content and preview your article before downloading.
- **Article History** — Save, search, reopen, update, and delete your articles.
- **Multiple Export Formats** — Download articles as PDF, Word (.docx), HTML, or TXT.
- **Responsive Interface** — Access the writing studio through a modern web interface.

## How It Works

1. **Enter Your Idea** — Provide a topic or rough article idea.
2. **Choose a Title** — Generate six title suggestions and select one.
3. **Answer Guided Questions** — Specify your audience, tone, purpose, and desired length.
4. **Select Keywords** — Review suggested keywords and add custom phrases.
5. **Review the Outline** — Check the proposed headings, sections, and FAQs.
6. **Choose Media and References** — Add relevant images, videos, and sources.
7. **Generate Your Article** — Create the first draft using your selected preferences.
8. **Humanize Your Content** — Improve the natural flow and readability of your writing.
9. **Edit and Analyze** — Make changes, review the content, and preview the final article.
10. **Save and Export** — Store your article in My Articles and download it in your preferred format.

## Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide React

### Backend

- Next.js App Router
- Next.js API Routes
- Node.js

### Database

- MongoDB Atlas
- MongoDB Node.js Driver

### AI Integration

- Configurable AI providers through environment variables
- OpenAI
- Groq
- OpenRouter
- Google Gemini

### Document Export

- PDF generation with pdf-lib
- Word document generation with docx
- HTML and TXT exports

## Project Structure

```text
VerbaCraft-AI/
│
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── articles/
│   │   │   ├── auth/
│   │   │   ├── export/
│   │   │   ├── health/
│   │   │   └── workflow/
│   │   ├── login/
│   │   ├── register/
│   │   ├── studio/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   ├── lib/
│   └── types/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── next.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20.9 or later
- npm
- MongoDB Atlas account

### 1. Clone the Repository

```bash
git clone https://github.com/mariafarooq55/VerbaCraft-AI.git
```

### 2. Navigate to the Project

```bash
cd VerbaCraft-AI
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and add:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=verbacraft_ai
AUTH_SECRET=your_private_random_secret

OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
GROQ_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
LLM_MODEL=gpt-4o-mini
```

Add your MongoDB Atlas connection string and a strong private authentication secret.

Configure an AI provider key if you want to use its live AI generation services.

**Never upload your `.env` file or expose your database credentials and API keys.**

### 5. Run the Development Server

```bash
npx next dev --webpack
```

Open your browser at:

```text
http://localhost:3000
```

### 6. Build for Production

```bash
npm run build
```

### 7. Start the Production Server

```bash
npm run start
```

## Database

VerbaCraft uses MongoDB Atlas to store user accounts and articles.

The application keeps article records associated with their owners, providing private article histories for registered users.

For local development, the application also supports local fallback storage when MongoDB is not configured. For cloud deployment and persistent multi-user storage, configure MongoDB Atlas.

## Deployment

VerbaCraft can be deployed using **Vercel**.

1. Push the project to GitHub.
2. Import the GitHub repository into Vercel.
3. Configure the required environment variables in Vercel.
4. Deploy the application.
5. Test registration, login, article generation, saving, and exports.
