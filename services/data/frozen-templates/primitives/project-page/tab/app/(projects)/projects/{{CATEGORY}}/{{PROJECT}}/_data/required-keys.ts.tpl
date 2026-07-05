// The env keys this project's automation needs (step 186.3). Generated at compose
// time from the project's DECLARED integrations ({{PROJECT_INTEGRATIONS}} — the same
// JSON that goes into the README fractera:meta block). The native missing-keys modal
// (missing-keys-modal.client.tsx) reads REQUIRED_ENV_KEYS on mount: any declared key
// absent from the runtime env prompts the user to supply it through the slot env
// setter (/api/project-config/env). Empty array → the modal renders nothing.
export type ProjectIntegration = { name: string; envKeys: string[] };

export const PROJECT_INTEGRATIONS: ProjectIntegration[] = {{PROJECT_INTEGRATIONS}};

export const REQUIRED_ENV_KEYS: string[] = Array.from(
  new Set(PROJECT_INTEGRATIONS.flatMap((integration) => integration.envKeys ?? [])),
);
