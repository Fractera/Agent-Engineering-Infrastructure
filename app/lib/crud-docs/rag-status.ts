import { readFile } from "fs/promises"

// Whether the LightRAG service has an OpenAI embedding key set — the thing that decides
// if an activated document actually gets indexed, or is accepted and then silently fails
// (LightRAG uses an openai binding for both embedding and graph extraction; with an empty
// key it returns 200 on submit but the document ends in "failed" with KeyError
// 'OPENAI_API_KEY'). We read the rag service env (the same file the admin app reads via
// RAG_ENV_PATH), read-only, and return ONLY the boolean — never the key value.
// null = could not determine (file not present, e.g. dev).
const RAG_ENV_PATH = process.env.RAG_ENV_PATH ?? "/opt/fractera/services/rag/.env"

export async function ragEmbeddingConfigured(): Promise<boolean | null> {
  try {
    const text = await readFile(RAG_ENV_PATH, "utf8")
    const m = text.match(/^EMBEDDING_BINDING_API_KEY=(.*)$/m)
    if (!m) return false
    return m[1].trim().length > 0
  } catch {
    return null
  }
}
