// Minimal MCP JSON-RPC handshake, shared by every L2 MCP server here.
//
// The MCP client (Hermes) calls `initialize` BEFORE `tools/list`. These servers
// originally handled only tools/list + tools/call and answered every other
// method with "Method not found", so the very first handshake step failed:
// `hermes mcp test` reported `Method not found: initialize` and Hermes
// registered 0 tools from all bridges. This adds the handshake (initialize +
// the initialized notification + ping) without changing tools behaviour.
//
// Returns true if it handled (and already answered) the request, false to let
// the caller fall through to tools/list, tools/call, etc.
export function handleMcpHandshake(rpc, res, serverName) {
  const { id, method, params } = rpc

  if (method === 'initialize') {
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: {
        // Echo the client's protocol version when given (recommended), else a
        // known-good default.
        protocolVersion: params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: serverName, version: '1.0.0' },
      },
    }))
    return true
  }

  // A notification (no id, no result expected — `notifications/initialized`,
  // `notifications/cancelled`, …) must be acknowledged with HTTP 202 Accepted
  // and an EMPTY body (streamable-HTTP transport rule). A 200 with an empty
  // JSON body breaks strict clients: Codex (rmcp) fails startup with
  // "Transport channel closed, when send initialized notification".
  if (
    method === 'notifications/initialized' || method === 'initialized' ||
    (id === undefined && typeof method === 'string' && method.startsWith('notifications/'))
  ) {
    res.writeHead(202)
    res.end()
    return true
  }

  if (method === 'ping') {
    res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }))
    return true
  }

  return false
}
