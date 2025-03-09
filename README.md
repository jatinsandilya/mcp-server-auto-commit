# MCP Server to Auto commit changes  🛠️

 This implementation provides a Git changes analyzer that generates commit messages using OpenAI's GPT models.

## Demo

![](./assets/auto_commit_demo_with_ai.gif)

## Features

- Analyzes git changes in your repository
- Generates conventional commit messages using OpenAI
- Provides detailed summaries of modified, added, and deleted files
- Built with [@modelcontextprotocol/sdk](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)

## Project Structure

```
mcp-server-auto-commit/
├── index.ts        # Main server implementation with git analysis tool
├── package.json    # Project dependencies
├── tsconfig.json   # TypeScript configuration
└── build/         # Compiled JavaScript output
```

## Prerequisites

- Node.js installed
- OpenAI API key
- Git repository to analyze

## Getting Started

1. Clone this template:
```bash
git clone [your-repo-url] my-mcp-server
cd mcp-server-auto-commit
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your OpenAI API key:
   - Either set it as an environment variable: `OPENAI_API_KEY=your-api-key`
   - Or prepare to pass it as a command line argument: `--key your-api-key`

4. Build the project:
```bash
pnpm run build
```

This will generate the `/build/index.js` file - your compiled MCP server script.

## Using with Cursor

1. Go to Cursor Settings -> MCP -> Add new MCP server
2. Configure your MCP:
   - Name: git-changes-summary
   - Type: command
   - Command: `node ABSOLUTE_PATH_TO_MCP_SERVER/build/index.js --key your-api-key`
   (Replace `your-api-key` with your actual OpenAI API key if not set in environment)

## Using with Claude Desktop

Add the following MCP config to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "git-changes-summary": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO_MCP_SERVER/build/index.js", "--key", "your-api-key"]
    }
  }
}
```

## Available Tools

### git-changes-commit-message

This tool analyzes the current git changes in your repository and generates a commit message using OpenAI. It provides:

- List of modified files
- List of newly added files
- List of deleted files
- Detailed changes for each file (up to 10 lines per file)
- A generated commit message following conventional commits format

Usage parameters:
- `input`: Optional path to analyze specific directory/file. If not provided, uses current working directory.

## Development

The implementation in `index.ts` showcases:

1. Setting up the MCP server with proper configuration
2. Handling command line arguments and environment variables
3. Integrating with OpenAI's API
4. Git operations using child processes
5. Error handling and fallback mechanisms

To modify or extend the implementation:

1. Update the server configuration in `index.ts`:
```typescript
const server = new McpServer({
  name: "git-changes-summary",
  version: "0.0.1",
});
```

2. The tool is defined using `server.tool()` with proper parameter validation using Zod schema.

3. Build and test your changes:
```bash
pnpm run build
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
