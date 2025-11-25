# Plugin Architecture

The plugin has been refactored from a single 1300+ line file into focused modules:

## Module Structure

### `types.ts`
- Type definitions and interfaces
- Plugin settings
- Message and session types
- Constants like `VIEW_TYPE_SIDEBAR`

### `auth.ts`
- Cognito authentication logic
- Session ID generation
- Login and password change flows
- Session validation

### `websocket.ts`
- WebSocket connection management
- Auto-reconnection logic
- Connection status tracking
- Message sending/receiving

### `api.ts`
- REST API client
- Session fetching
- Session history retrieval
- Generic API call wrapper

### `ui.ts`
- UI component helpers
- Button creation utilities
- Message frame rendering
- Connection status UI updates
- Markdown rendering helpers

### `indexing.ts`
- File indexing operations
- Vault-wide indexing
- Category detection from file paths
- Progress tracking

### `sessions.ts`
- Session list display
- Session loading
- Session history rendering
- Session UI overlay

### `settings.ts`
- Plugin settings tab
- Cognito configuration
- API endpoint configuration
- Campaign settings

### `view.ts`
- Main sidebar view
- Chat interface
- Login/password forms
- WebSocket message handling
- Streaming message display

### `main.ts`
- Plugin entry point
- View registration
- Command registration
- Settings initialization

## Benefits

- **Maintainability**: Each module has a single responsibility
- **Testability**: Modules can be tested independently
- **Readability**: Easier to find and understand specific functionality
- **Reusability**: Components can be reused across the plugin
- **Type Safety**: Better TypeScript support with focused interfaces
