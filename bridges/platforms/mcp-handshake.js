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

  // `notifications/initialized` is a fire-and-forget notification (no id, no
  // result expected) — acknowledge with an empty 200 so the client proceeds.
  if (method === 'notifications/initialized' || method === 'initialized') {
    res.end()
    return true
  }

  if (method === 'ping') {
    res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }))
    return true
  }

  return false
}
