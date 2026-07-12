import { assembleNode, type NodeContract } from "../../../_shared/node-contract";
import { META as findSourcesMeta } from "../_nodes/find-sources/meta";
import { FUNCTIONS as findSourcesFns } from "../_nodes/find-sources/functions";
import { INSTRUCTION as findSourcesInstruction } from "../_nodes/find-sources/instruction";
import { META as prepareMeta } from "../_nodes/prepare-content/meta";
import { FUNCTIONS as prepareFns } from "../_nodes/prepare-content/functions";
import { INSTRUCTION as prepareInstruction } from "../_nodes/prepare-content/instruction";
import { META as publishMeta } from "../_nodes/publish/meta";
import { FUNCTIONS as publishFns } from "../_nodes/publish/functions";
import { INSTRUCTION as publishInstruction } from "../_nodes/publish/instruction";

// The Master diagram of this reference automation (step 223.C.2). The nodes and their ORDER live here;
// each node's meta / functions / instruction live co-located in its own _nodes/<id>/ folder — delete
// this project and every function vanishes with zero technical debt. This is the content scenario
// (a self-contained finite process), so this Master is also what each Instance run forks from.
export const DIAGRAM_NODES: NodeContract[] = [
  assembleNode(findSourcesMeta, findSourcesFns, findSourcesInstruction),
  assembleNode(prepareMeta, prepareFns, prepareInstruction),
  assembleNode(publishMeta, publishFns, publishInstruction),
];
