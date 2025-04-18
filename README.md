# YouTube Channel ID Extension

A browser extension that finds YouTube channel IDs and adds them to a PostgreSQL database for further processing.

## Project Structure

```
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── .env
└── extension/
    ├── content.js
    ├── data-extractor.js
    ├── inject.js
    ├── manifest.json
    └── styles.css
```

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

   ![Chrome extension loading](https://developer.chrome.com/docs/extensions/mv3/getstarted/extensions-interface.png)

2. **Verify Installation**:

   - The extension should appear in your extensions list
   - You will see the extension icon in your browser toolbar

3. **Configuration**:

   The extension is pre-configured to connect to `http://localhost:3000`. If you need to change this:

   - Open `extension/inject.js`
   - Find the `fetch` function call
   - Update the URL to your API endpoint

## Usage

1. Navigate to any YouTube channel page (URLs starting with `youtube.com/channel/`, `youtube.com/c/`, or `youtube.com/@username`)

2. The extension will display two buttons:

   - **Find ID**: Shows the channel's unique identifier
   - **Add to DB**: Adds the channel ID to your PostgreSQL database

3. When you click "Add to DB", the extension sends the channel ID to your local API server, which adds it to the database.

## Troubleshooting

- **Extension buttons don't appear**: Refresh the YouTube page or navigate to a different channel
- **API connection errors**: Check if your backend server is running on port 3000
- **Database errors**: Verify your PostgreSQL connection details in the `.env` file

## Development

- After making changes to extension files, go to `chrome://extensions/` and click the reload icon on the extension card
- After changing backend code without Docker, restart the Node.js server
- When using Docker, restart the container with `docker-compose restart api`

## Security Notes

- Keep your `.env` file secure and never commit it to public repositories
- The extension communicates with a local API server, which is suitable for development but not for production use without additional security measures
