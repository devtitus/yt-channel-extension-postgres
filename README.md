# YouTube Channel ID Extension

A browser extension that finds YouTube channel IDs from YouTube video pages and adds them to a PostgreSQL database for further processing and analysis.

## Project Structure

```
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .env
└── extension/
    ├── manifest.json
    ├── assets/
    ├── css/
    │   └── styles.css
    └── js/
        ├── content.js
        ├── data-extractor.js
        └── inject.js
```

## Features

- Seamlessly extracts YouTube channel IDs from video pages using multiple robust methods:
  - From the "About" link near the video player
  - From localStorage for persistent tracking between page views
  - From YouTube's internal data structures as fallback
  - Handles custom URLs (e.g., /@username) and dynamic navigation
- Automatically detects page navigation and updates UI without requiring a page refresh
- UI buttons (**Find ID** and **Add to DB**) appear near the video creator's information
- Copy button to easily copy channel IDs to clipboard
- Toast notifications with success/error feedback
- Backend API integration for storing channel IDs in a PostgreSQL database
- Backend ensures the required table exists before inserting and provides a health check endpoint
- Docker Compose support for easy backend deployment
- Secure environment variable usage for database credentials

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/products/docker-desktop/) and [Docker Compose](https://docs.docker.com/compose/install/) (optional, for containerized setup)
- [PostgreSQL](https://www.postgresql.org/) database
- Google Chrome or another Chromium-based browser

### Backend Setup

1. **Environment Configuration**

   Create an `.env` file in the `backend` directory with your PostgreSQL connection details:

   ```
   PGHOST=your_postgres_host
   PGPORT=your_postgres_port
   PGUSER=your_postgres_username
   PGPASSWORD=your_postgres_password
   PGDATABASE=your_database_name
   ```

   Example with placeholder values:

   ```
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=your_secure_password
   PGDATABASE=youtube_channels
   ```

   All sensitive and environment-specific configuration is now managed via the `backend/.env` file.

   **N8N webhook settings** (host, port, path, and full URL) must be set in `.env`:

   ```
   N8N_HOST=host.docker.internal
   N8N_PORT=5678
   N8N_PATH=/webhook/channel/process
   N8N_WEBHOOK_URL=http://${N8N_HOST}:${N8N_PORT}${N8N_PATH}
   ```

   The backend will use these variables for all webhook calls.

2. **Database Setup**

   Create the required table in your PostgreSQL database:

   ```sql
   CREATE TABLE IF NOT EXISTS channel_fetch_queue (
     id SERIAL PRIMARY KEY,
     channel_id TEXT UNIQUE NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     processed BOOLEAN DEFAULT FALSE
   );
   ```

3. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

4. **Running the Backend**

   **Option 1: Using Node.js directly**

   ```bash
   cd backend
   node server.js
   ```

   **Option 2: Using Docker Compose**

   From the project root:

   ```bash
   docker-compose up -d
   ```

   The API will be available at `http://localhost:3000`.

### Chrome Extension Setup

1. **Load the extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click on "Load unpacked"
   - Select the `extension` folder from this project

2. **Verify Installation**:

   - The extension should appear in your extensions list
   - Navigate to any YouTube video page to see the extension in action

3. **Configuration**:

   The extension is pre-configured to connect to `http://localhost:3000`. If you need to change this:

   - Open `extension/js/inject.js`
   - Find the `fetch` function call
   - Update the URL to your API endpoint

## Usage

1. Navigate to any YouTube video page (URLs starting with `youtube.com/watch`)

2. The extension will display two buttons near the video creator's information:

   - **Find ID**: Shows the channel's unique identifier with a copy button
   - **Add to DB**: Adds the channel ID to your PostgreSQL database

3. When you click "Find ID", a toast notification will appear showing the channel ID with a copy button

4. When you click "Add to DB", the extension sends the channel ID to your local API server, which adds it to the database.

5. You can navigate between videos without refreshing - the buttons will automatically appear on the new video page

## Technical Notes

- The extension gets channel IDs directly from the "About" link in video pages for efficiency
- IDs are stored in localStorage to prevent redundant extractions
- Multiple fallback methods ensure the channel ID can be found even when the page structure changes
- The extension does not inject buttons on channel pages to improve performance

## Troubleshooting

- **Extension buttons don't appear**: Refresh the YouTube page or try navigating to a different video
- **API connection errors**: Check if your backend server is running on port 3000
- **Database errors**: Verify your PostgreSQL connection details in the `.env` file
- **Channel ID not found**: Some videos might use custom structures that make ID extraction difficult

## Development

- After making changes to extension files, go to `chrome://extensions/` and click the reload icon on the extension card
- After changing backend code without Docker, restart the Node.js server
- When using Docker, restart the container with `docker-compose restart api`

## Security Notes

- Keep your `.env` file secure and never commit it to public repositories
- The extension communicates with a local API server, which is suitable for development but not for production use without additional security measures

## Logging

The backend now only logs essential information (such as database connection status and errors). Unnecessary log statements have been removed for a cleaner production output.
