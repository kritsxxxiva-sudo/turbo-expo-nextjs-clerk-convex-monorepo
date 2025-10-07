# MCP Servers Configuration

This document describes the Model Context Protocol (MCP) servers configured for this project.

## Enabled Servers

### 1. Filesystem Server

**Status**: ✅ Enabled  
**Package**: `@modelcontextprotocol/server-filesystem`  
**Description**: Provides access to the local filesystem for reading and writing files within the project directory.

**Use cases**:

- Reading project files
- Writing/editing files
- File operations (create, delete, move)

---

### 2. Chrome DevTools Server

**Status**: ✅ Enabled  
**Package**: `@executeautomation/mcp-chrome-devtools`  
**Description**: Chrome DevTools integration for browser automation, performance testing, and web debugging.

**Use cases**:

- Performance profiling of web applications
- Browser automation and testing
- Network request analysis
- Console log monitoring
- Screenshot capture

---

### 3. Git Server

**Status**: ✅ Enabled  
**Package**: `@modelcontextprotocol/server-git`  
**Description**: Git version control operations.

**Use cases**:

- Viewing git history
- Creating commits
- Branch management
- Diff viewing
- Git status checks

---

### 4. Fetch Server

**Status**: ✅ Enabled  
**Package**: `@modelcontextprotocol/server-fetch`  
**Description**: HTTP fetch capabilities for making API calls.

**Use cases**:

- Calling external APIs
- Fetching documentation
- Testing webhooks
- HTTP requests/responses

---

### 5. Memory Server

**Status**: ✅ Enabled  
**Package**: `@modelcontextprotocol/server-memory`  
**Description**: Persistent knowledge base for storing context across sessions.

**Use cases**:

- Storing project-specific knowledge
- Remembering user preferences
- Maintaining conversation context
- Saving important findings

---

## Optional/Disabled Servers

### GitHub Server

**Status**: ⚠️ Disabled (requires API token)  
**Package**: `@modelcontextprotocol/server-github`  
**Required**: `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable

**To enable**:

1. Create a GitHub Personal Access Token at https://github.com/settings/tokens
2. Add to your environment: `export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here`
3. Set `"enabled": true` in `mcp-config.json`

**Use cases**:

- Creating/managing issues
- Pull request operations
- Repository management
- Code search across GitHub

---

### Brave Search Server

**Status**: ⚠️ Disabled (requires API key)  
**Package**: `@modelcontextprotocol/server-brave-search`  
**Required**: `BRAVE_API_KEY` environment variable

**To enable**:

1. Get API key from https://brave.com/search/api/
2. Add to your environment: `export BRAVE_API_KEY=your_key_here`
3. Set `"enabled": true` in `mcp-config.json`

**Use cases**:

- Web search capabilities
- Finding documentation
- Research queries

---

### Puppeteer Server

**Status**: ⚠️ Disabled  
**Package**: `@modelcontextprotocol/server-puppeteer`  
**Note**: More heavyweight than Chrome DevTools server

**To enable**: Set `"enabled": true` in `mcp-config.json`

**Use cases**:

- Advanced browser automation
- PDF generation
- Complex web scraping

---

### Database Servers (PostgreSQL & SQLite)

**Status**: ⚠️ Disabled  
**Packages**:

- `@modelcontextprotocol/server-postgres`
- `@modelcontextprotocol/server-sqlite`

**To enable**:

1. Update connection strings in `mcp-config.json`
2. Set `"enabled": true` for the desired database server

**Use cases**:

- Direct database queries
- Schema inspection
- Data analysis

---

## Configuration

MCP servers are configured in `.augment/mcp-config.json`. Each server entry includes:

```json
{
  "command": "npx",
  "args": ["-y", "@package/name", ...options],
  "env": { "ENV_VAR": "value" },
  "description": "What this server does",
  "enabled": true/false,
  "note": "Additional information"
}
```

## Usage with Augment CLI

The Augment CLI automatically loads MCP servers from this configuration. Enabled servers will be available for use during conversations.

To manually manage servers:

```bash
# Install a specific MCP server globally (optional)
npm install -g @modelcontextprotocol/server-filesystem

# Test a server manually
npx @modelcontextprotocol/server-filesystem .
```

## Adding Custom MCP Servers

To add a custom MCP server:

1. Add entry to `mcpServers` in `mcp-config.json`:

```json
"my-custom-server": {
  "command": "npx",
  "args": ["-y", "@company/my-mcp-server"],
  "description": "My custom server",
  "enabled": true
}
```

2. Restart Augment CLI to load the new configuration

## Troubleshooting

### Server fails to start

- Check if required environment variables are set
- Verify the package name is correct
- Try installing the package globally: `npm install -g @package/name`

### Permission errors

- Ensure the filesystem server has access to the project directory
- Check file permissions

### Network issues

- Verify internet connection for npx downloads
- Check if corporate firewall is blocking npm registry

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Augment CLI Documentation](https://docs.augmentcode.com/)
