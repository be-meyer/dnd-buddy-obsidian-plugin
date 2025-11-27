# D&D Buddy - Obsidian Plugin

An AI-powered Dungeons & Dragons campaign assistant that integrates directly into your Obsidian vault. D&D Buddy helps Dungeon Masters manage their campaigns by providing intelligent context-aware assistance through a chat interface.

## Features

- **AI Chat Interface**: Interact with an AI assistant that understands your campaign context
- **Campaign File Indexing**: Automatically index your campaign notes (NPCs, lore, monsters, sessions) for semantic search
- **Real-time Streaming**: Get AI responses in real-time with streaming support
- **Session Management**: Save and load previous chat sessions
- **AWS Integration**: Secure authentication with AWS Cognito and serverless backend
- **Responsive Design**: Adapts to different sidebar widths with flexible toolbar layout

## Architecture

### Plugin Structure

```
src/
├── main.ts           # Plugin entry point and view registration
├── view.ts           # Main sidebar view with chat interface
├── ui.ts             # Reusable UI components (buttons, message frames)
├── auth.ts           # AWS Cognito authentication
├── websocket.ts      # WebSocket connection management
├── api.ts            # REST API client for indexing and sessions
├── indexing.ts       # File indexing manager
├── sessions.ts       # Session history manager
└── types.ts          # TypeScript interfaces and types
```

### Backend Integration

The plugin connects to an AWS serverless backend:
- **Authentication**: AWS Cognito for user management
- **API Gateway**: REST API for indexing and session management
- **WebSocket API**: Real-time chat with AI agent
- **Lambda Functions**: Serverless compute for agent and indexing
- **S3 Vector Store**: Semantic search over campaign files

### File Organization

Campaign files are organized in your vault:
```
vault/
├── NPCs/           # Non-player characters
├── Lore/           # World building and lore
├── Monsters/       # Monster stat blocks and notes
└── Sessions/       # Session notes and summaries
```

## Setup

### Prerequisites

- Node.js v16 or higher
- AWS account with configured backend (see backend setup in main project)
- Obsidian v1.0.0 or higher

### Installation

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone <repository-url> dnd-buddy
   ```

2. Install dependencies:
   ```bash
   cd dnd-buddy
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian settings

### Configuration

1. Open Obsidian Settings → D&D Buddy
2. Configure your AWS Cognito settings:
   - User Pool ID
   - Client ID
   - AWS Region
3. Configure your API endpoints:
   - REST API Endpoint (for indexing and sessions)
   - WebSocket Endpoint (for agent chat)

## Usage

### Opening D&D Buddy

- Click the sidebar icon in the ribbon
- Use command palette: "Open DnD Buddy"

### Indexing Your Campaign

Indexing is **manual** to avoid constant reindexing and unnecessary API calls. You control when your campaign files are indexed.

- **Index Current File**: Click the file icon to index the currently open file
- **Index Entire Vault**: Click the vault icon to reindex all campaign files
- **When to Index**: After creating or significantly updating campaign files (NPCs, lore, monsters, sessions)

> **Note**: The plugin does not automatically index files on save to prevent excessive backend calls and costs.

### Chatting with the AI

1. Type your message in the text area at the bottom
2. Press Enter to send (Shift+Enter for new line)
3. The AI will respond with context from your indexed campaign files

### Managing Sessions

- **Load Previous Session**: Click the history icon to view and load past conversations
- **New Session**: Click the trash icon to start a fresh conversation
- **Auto-save**: Sessions are automatically saved as you chat



## Development

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Project Structure

- **main.ts**: Plugin initialization and view registration
- **view.ts**: Main UI logic for the sidebar view
- **ui.ts**: Reusable UI components with CSS classes
- **auth.ts**: AWS Cognito authentication flow
- **websocket.ts**: WebSocket connection with auto-reconnect
- **api.ts**: REST API client for backend services
- **indexing.ts**: Campaign file indexing logic
- **sessions.ts**: Session history management
- **styles.css**: All plugin styles using CSS classes

### Code Style

- TypeScript with strict mode
- CSS classes instead of inline styles for maintainability
- Composition API pattern for reusable components
- Minimal dependencies following project philosophy

## Troubleshooting

### Connection Issues

- Verify your API endpoints are correct in settings
- Check that your AWS Cognito credentials are valid
- Ensure the backend services are running

### Indexing Problems

- Make sure files are in the correct folders (NPCs, Lore, Monsters, Sessions)
- Check that you have proper AWS credentials configured
- Try reindexing the entire vault

### Settings Not Updating

- The plugin automatically reconnects when settings change
- If issues persist, try reloading Obsidian

## Contributing

This plugin follows a minimal and simple architecture philosophy. When contributing:

1. Keep implementations straightforward
2. Avoid over-engineering
3. Use CSS classes instead of inline styles
4. Follow existing code patterns
5. Test with different sidebar widths

## License

See LICENSE file for details.

## Related Projects

- [D&D Buddy Backend](../../../cdk/README.md) - AWS CDK infrastructure
- [D&D Buddy Agent](../../../cdk/lambdas/dnd-buddy-agent/README.md) - LangGraph AI agent
