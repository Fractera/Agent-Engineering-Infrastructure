# Installing the Fractera MCP server (for Cline)

Fractera is a **remote / hosted** MCP server. There is nothing to install or build locally and no Docker image — you only add its URL to Cline's MCP settings.

## One-step setup

Add this entry to Cline's MCP settings file (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "fractera": {
      "type": "streamableHttp",
      "url": "https://www.fractera.ai/api/mcp"
    }
  }
}
```

That is the entire installation. No API key, token, or environment variable is required — the connector is open.

## Verify

After saving, Cline should show the `fractera` server as connected and list its tools:
`register_and_deploy`, `retry_deploy`, `check_status`, `get_vps_recommendation`, `get_subdomain`, `get_project_info`.

A quick read-only check: ask Cline to call `get_project_info` — it returns the project's architecture and FAQ and needs no credentials.

## What it does

Fractera deploys a private AI coding workspace (5 AI engines + an autonomous Hermes agent + private LightRAG memory) onto the user's own Ubuntu VPS in about 10 minutes, straight from chat. The deploy is IP-first: it finishes on plain HTTP at `http://<your-ip>:3002`. `register_and_deploy` is destructive by design (it wipes the target server before installing). Read-only tools need no credentials.

Knowledge base & security FAQ: https://www.fractera.ai/mcp-info