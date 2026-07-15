import { assembleNode, type NodeContract } from "../../../_shared/node-contract";
import { META as parseMeta } from "../_nodes/parse-request/meta";
import { FUNCTIONS as parseFns } from "../_nodes/parse-request/functions";
import { INSTRUCTION as parseInstruction } from "../_nodes/parse-request/instruction";
import { META as lookupMeta } from "../_nodes/lookup-price/meta";
import { FUNCTIONS as lookupFns } from "../_nodes/lookup-price/functions";
import { INSTRUCTION as lookupInstruction } from "../_nodes/lookup-price/instruction";
import { META as recordMeta } from "../_nodes/record-result/meta";
import { FUNCTIONS as recordFns } from "../_nodes/record-result/functions";
import { INSTRUCTION as recordInstruction } from "../_nodes/record-result/instruction";

// The Master diagram of this reference automation (step 243). The nodes and their ORDER live here; each
// node's meta/functions/instruction live co-located in its own _nodes/<id>/ folder — delete this project and
// every function vanishes with zero technical debt. STREAM type: no fork, one straight run per ask.
export const DIAGRAM_NODES: NodeContract[] = [
  assembleNode(parseMeta, parseFns, parseInstruction),
  assembleNode(lookupMeta, lookupFns, lookupInstruction),
  assembleNode(recordMeta, recordFns, recordInstruction),
];
