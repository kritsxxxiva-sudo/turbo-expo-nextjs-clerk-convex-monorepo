# Augment CLI Configuration

This directory contains configuration files for the Augment CLI, an AI-powered coding assistant.

## Files

### Core Configuration

- **`mcp-config.json`** - Model Context Protocol (MCP) server configuration
- **`mcp-servers.md`** - Documentation for MCP servers and their usage

### AI Model Configurations

- **`claude-4-sonnet-agent-prompts.txt`** - Custom prompts for Claude Sonnet 4
- **`claude-4-sonnet-tools.json`** - Tool definitions for Claude Sonnet 4
- **`gpt-5-agent-prompts.txt`** - Custom prompts for GPT-5
- **`gpt-5-tools.json`** - Tool definitions for GPT-5

### Commands

The `commands/` directory contains specialized command definitions:

- `analyze.md` - Code analysis commands
- `clarify.md` - Clarification and understanding commands
- `constitution.md` - Constitutional AI principles
- `implement.md` - Implementation commands
- `plan.md` - Planning and architecture commands
- `specify.md` - Specification commands
- `tasks.md` - Task management commands

## MCP (Model Context Protocol)

MCP allows Augment CLI to connect to various services and tools through standardized server interfaces. This provides capabilities like:

- **Filesystem access** - Read/write project files
- **Browser automation** - Chrome DevTools integration
- **Git operations** - Version control
- **API calls** - HTTP requests
- **Database access** - PostgreSQL, SQLite
- **Web search** - Brave Search
- **Knowledge base** - Persistent memory

### Quick Start

1. **Review enabled servers**:

   ```bash
   cat .augment/mcp-config.json
   ```

2. **Enable optional servers** (if needed):

   - Set up required environment variables
   - Change `"enabled": false` to `"enabled": true`

3. **Test MCP server**:
   ```bash
   npx @modelcontextprotocol/server-filesystem .
   ```

### Environment Variables

Some MCP servers require environment variables:

```bash
# GitHub (optional)
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token

# Brave Search (optional)
export BRAVE_API_KEY=your_key
```

Add these to your shell profile (`.bashrc`, `.zshrc`, etc.) or `.env` file.

## Project-Specific Configuration

This Augment configuration is tailored for a **Turborepo monorepo** with:

- **Web**: Next.js 15 + Tailwind CSS + Clerk
- **Native**: Expo + React Native
- **Backend**: Convex (serverless database and functions)
- **Language**: TypeScript
- **Package Manager**: Yarn

The AI assistant is configured to understand:

- Monorepo structure and workspace management
- Convex backend patterns
- Clerk authentication flow
- React Native and Next.js best practices
- TypeScript strict typing

## Customization

### Adding Custom Prompts

Add project-specific instructions to the agent prompt files:

- `.augment/claude-4-sonnet-agent-prompts.txt`
- `.augment/gpt-5-agent-prompts.txt`

### Adding Custom Tools

Define new tools in the tools JSON files:

- `.augment/claude-4-sonnet-tools.json`
- `.augment/gpt-5-tools.json`

### Adding MCP Servers

1. Add server entry to `mcp-config.json`
2. Document in `mcp-servers.md`
3. Restart Augment CLI

## Best Practices

1. **Keep sensitive data out of configs** - Use environment variables
2. **Document custom changes** - Update this README
3. **Version control** - Commit `.augment/` to git (except secrets)
4. **Test MCP servers** - Verify they work before enabling
5. **Review generated code** - Always check AI outputs

## Support

- [Augment Documentation](https://docs.augmentcode.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Convex Documentation](https://docs.convex.dev/)

## Security Notes

⚠️ **Never commit secrets to version control**:

- API keys
- Access tokens
- Passwords
- Private keys

Use environment variables or secure secret management solutions instead.
