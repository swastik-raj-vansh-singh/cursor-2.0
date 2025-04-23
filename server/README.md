# AI Assistant Backend Service

This is a backend service for the AI Assistant in Game Code Forge IDE. It uses OpenAI's API to generate responses and modify code based on user prompts.

## Setup

1. Clone the repository and navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the server directory with the following content:

```
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
```

4. Replace `your_openai_api_key_here` with your actual OpenAI API key.

5. Start the server:

```bash
npm start
```

## API Endpoints

The server provides the following API endpoints:

- `GET /api/health` - Health check endpoint
- `POST /api/ai/generate` - Generate AI responses
- `POST /api/ai/modify-code` - Modify code based on instructions

## Security Considerations

- The OpenAI API key is stored in a `.env` file which is not committed to the repository.
- In a production environment, you should consider additional security measures such as:
  - Environment-specific configuration
  - API key rotation
  - Rate limiting
  - Request validation

## Features

- Generate responses to user prompts using OpenAI's models
- Modify code based on user instructions
- Context-aware responses based on current code in the editor
