/**
 * The kit's off-limits fence for agents, as a plain attribute.
 *
 * `@particle-academy/agent-integrations`' DOM navigation refuses every agent
 * action whose target resolves inside an element carrying
 * `data-agent-off-limits` (click, set, submit, focus, scroll, and anything that
 * activates a control inside from outside), and describes the area only as
 * "consent <role>". This package does not import agent-integrations: the
 * attribute IS the contract. Spread it onto the root of every consent control.
 *
 * Consent is the person's own act. A person approving an agent's click on
 * "Accept all" is still the agent's act, which is why a staged confirm does not
 * replace this.
 */
export const AGENT_OFF_LIMITS = { "data-agent-off-limits": "consent" } as const;
