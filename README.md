# Website Audit Tool - Backend

This is the backend API for the EIGHT25MEDIA Website Audit Tool. It's built with Express.js and leverages Playwright, Cheerio, and the Groq API (Llama 3) to perform comprehensive audits on any webpage.

## Features

- **Web Scraping:** Uses Playwright and Cheerio to extract page content, metadata, links, images, and other critical SEO/structure metrics.
- **Page Classification & Rules:** Automatically categorizes the page and runs deterministic benchmark checks.
- **AI-Powered Insights:** Uses the Groq API to analyze the extracted metrics and provide intelligent insights and prioritized recommendations.
- **Screenshots:** Captures visual screenshots of the audited webpages.
- **Logging:** Maintains audit logs (`logs/logs.json`) for review and debugging.

## Prerequisites

- Node.js (v18 or higher recommended)
- Playwright dependencies

## Installation

1. Navigate to the backend directory.
2. Install the dependencies:
   ```bash
   npm install
   ```
   *(Playwright chromium browsers will be installed automatically via `postinstall`)*

## Configuration

Create a `.env` file in the root of the backend directory and add the necessary environment variables, for example:
```env
PORT=5000
# Add your Groq API key and other required variables
GROQ_API_KEY=your_groq_api_key_here
```

## Running the Server

Start the development server with `nodemon`:
```bash
npm run dev
```

Or run it in production mode:
```bash
npm start
```

The server will be available at `http://localhost:5000` (or the port defined in your `.env`).

## API Endpoints

- `GET /api/health` - Health check endpoint.
- `POST /api/audit` - Start an audit by providing a URL in the JSON request body: `{"url": "https://example.com"}`.
- `/api/logs` - Endpoints related to retrieving audit logs.
