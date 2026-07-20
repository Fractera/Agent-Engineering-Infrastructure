import { assembleNode, type NodeContract } from "../_types/node-contract";
import { META as parseMeta } from "../_nodes/parse-request/meta";
import { FUNCTIONS as parseFns } from "../_nodes/parse-request/functions";
import { INSTRUCTION as parseInstruction } from "../_nodes/parse-request/instruction";
import { META as lookupMeta } from "../_nodes/lookup-price/meta";
import { FUNCTIONS as lookupFns } from "../_nodes/lookup-price/functions";
import { INSTRUCTION as lookupInstruction } from "../_nodes/lookup-price/instruction";
import { META as recordMeta } from "../_nodes/record-result/meta";
import { FUNCTIONS as recordFns } from "../_nodes/record-result/functions";
import { INSTRUCTION as recordInstruction } from "../_nodes/record-result/instruction";
import { META as ifSuccessMeta } from "../_nodes/if-success/meta";
import { FUNCTIONS as ifSuccessFns } from "../_nodes/if-success/functions";
import { META as ifNotExistsMeta } from "../_nodes/if-not-exists/meta";
import { FUNCTIONS as ifNotExistsFns } from "../_nodes/if-not-exists/functions";

// STARTING PATTERN (step 243) — a REAL, working Stream automation, not empty drafts. Read
// app/(projects)/README.md "The activation (launch console) standard" first, then ADAPT these nodes for the
// owner's actual task (rename them, change what they do) — keep the SHAPE: sequential, a multi-function node,
// a plain external call, a write gated by success. The two CONDITION nodes (2026-07-15) branch off the lookup:
// "If success" carries the flow into the output node, "If not exists" is a dead end (for now) — they read the
// automation's control flow ON the diagram. They are visual no-ops today (pass-through); the real success/
// failure gating still comes from lookup-price throwing on no price, so a failed ask never records a row.
export const DIAGRAM_NODES: NodeContract[] = [
  assembleNode(parseMeta, parseFns, parseInstruction),
  assembleNode(lookupMeta, lookupFns, lookupInstruction),
  assembleNode(ifSuccessMeta, ifSuccessFns),
  assembleNode(ifNotExistsMeta, ifNotExistsFns),
  assembleNode(recordMeta, recordFns, recordInstruction),
];
