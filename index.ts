import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import minimist from "minimist";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Get API key from command line argument or fall back to environment variable
const apiKey = argv.key || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error(
    "No API key provided. Please set OPENAI_API_KEY environment variable or use --key argument"
  );
  process.exit(1);
}

dotenv.config();

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

// Create server instance
const server = new McpServer({
  name: "git-changes-summary",
  version: "0.0.1",
});

// Function to get git changes
async function getGitChanges(input: string) {
  try {
    // Get staged and unstaged changes
    const cwd = input || process.cwd();
    console.log("cwd", cwd);
    await execAsync(`cd ${cwd}`);
    const { stdout: diffOutput } = await execAsync('git diff HEAD', { cwd });
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd });
    
    // Process the changes
    const changes = {
      modified: [] as string[],
      added: [] as string[],
      deleted: [] as string[],
      details: {} as Record<string, string[]>
    };

    // Process status output to categorize files
    statusOutput.split('\n').filter(Boolean).forEach(line => {
      const [status, file] = [line.slice(0, 2).trim(), line.slice(3)];
      if (status.includes('M')) changes.modified.push(file);
      if (status.includes('A')) changes.added.push(file);
      if (status.includes('D')) changes.deleted.push(file);
    });

    // Process diff output to get detailed changes
    let currentFile = '';
    diffOutput.split('\n').forEach(line => {
      if (line.startsWith('diff --git')) {
        currentFile = line.split(' b/')[1];
        changes.details[currentFile] = [];
      } else if (line.startsWith('+') || line.startsWith('-')) {
        if (currentFile && !line.startsWith('+++') && !line.startsWith('---')) {
          changes.details[currentFile].push(line);
        }
      }
    });

    return changes;
  } catch (error: any) {
    throw new Error(`Failed to get git changes: ${error.message}`);
  }
}

// Function to generate commit message using OpenAI
async function generateCommitMessage(summary: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise and descriptive git commit messages based on code changes. Follow conventional commits format."
        },
        {
          role: "user",
          content: `Generate a concise commit message for these changes:\n${summary}`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "chore: update codebase";
  } catch (error) {
    console.error("Error generating commit message:", error);
    return "chore: update codebase";
  }
}

// Define the git changes summary tool
server.tool(
  "git-changes-commit-message",
  "Analyzes current git changes and provides a commit message",
  {
    input: z.string().describe("Optional path to analyze specific directory/file"),
  },
  async ({ input }) => {
    try {
      const changes = await getGitChanges(input);
      
      // Create a human-readable summary
      let summary = "Git Changes Summary:\n\n";
      
      if (changes.modified.length > 0) {
        summary += "📝 Modified Files:\n" + changes.modified.map(f => `  - ${f}`).join('\n') + '\n\n';
      }
      
      if (changes.added.length > 0) {
        summary += "✨ New Files:\n" + changes.added.map(f => `  - ${f}`).join('\n') + '\n\n';
      }
      
      if (changes.deleted.length > 0) {
        summary += "🗑️ Deleted Files:\n" + changes.deleted.map(f => `  - ${f}`).join('\n') + '\n\n';
      }

      summary += "📄 Detailed Changes:\n";
      Object.entries(changes.details).forEach(([file, fileChanges]) => {
        if (fileChanges.length > 0) {
          summary += `\n${file}:\n`;
          summary += fileChanges.slice(0, 10).map(line => `  ${line}`).join('\n');
          if (fileChanges.length > 10) {
            summary += '\n  ... and more changes';
          }
        }
      });

      const generatedMessage = await generateCommitMessage(summary);
      const commitMessage = generatedMessage.split('\n').filter(msg => msg.trim().length > 0) || [];
      return {
        content: [
          {
            type: "text",
            text: `git add . && git commit ${commitMessage.map(msg => `-m "${msg}"`).join(' ')}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
