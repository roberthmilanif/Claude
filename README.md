# Claude

Personal Claude configuration. Project-scoped MCP servers live in [`.mcp.json`](.mcp.json), which Claude Code picks up automatically when a session starts in this repository.

## Pierre Finance MCP server

[`.mcp.json`](.mcp.json) connects Claude to the Pierre Finance MCP endpoint (`https://pierre.finance/mcp`) through [`mcp-remote`](https://www.npmjs.com/package/mcp-remote), which bridges the remote HTTP server to stdio and attaches an `Authorization` header. Requires Node.js (for `npx`).

### Setup

1. Get your Pierre Finance API key (`sk-...`).
2. Export it in the environment Claude Code launches from, e.g. in `~/.bashrc` or `~/.zshrc`:

   ```bash
   export PIERRE_FINANCE_API_KEY="sk-..."
   ```

3. Start Claude Code in this repository and approve the project MCP server when prompted. `claude mcp list` should then show **Pierre Finance** as connected.

The committed config never contains a real key. `.mcp.json` reads it via `${PIERRE_FINANCE_API_KEY:-sk-your-api-key-here}` [environment variable expansion](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json), so until the variable is set the placeholder is used and authentication simply fails. Never replace the placeholder with a real key in this tracked file.

### How the header is assembled

Claude Code expands `${PIERRE_FINANCE_API_KEY}` inside the server's `env` block, producing `PIERRE_FINANCE_AUTH="Bearer sk-..."` in the spawned process. The `--header Authorization:${PIERRE_FINANCE_AUTH}` argument is then interpolated by `mcp-remote` itself from that environment — the [documented pattern](https://www.npmjs.com/package/mcp-remote#custom-headers) for keeping spaces out of client args.

On Claude Code you could alternatively drop `mcp-remote` and use the native HTTP transport (`"type": "http"` with a `headers` map); the stdio bridge is kept for parity with clients that lack remote support.

### Claude Desktop

Claude Desktop doesn't read `.mcp.json` and performs no variable expansion. Add the server to `claude_desktop_config.json` with the token inline — that file lives outside this repository, but still treat it as a secret:

```json
{
  "mcpServers": {
    "Pierre Finance": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://pierre.finance/mcp",
        "--header",
        "Authorization:${TOKEN}"
      ],
      "env": {
        "TOKEN": "Bearer sk-your-api-key-here"
      }
    }
  }
}
```
