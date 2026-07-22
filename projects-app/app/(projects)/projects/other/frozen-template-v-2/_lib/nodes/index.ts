// РЕЕСТР ФУНКЦИЙ УЗЛОВ — статическая карта `имя функции (как в ядре) → сама функция`.
//
// Почему статический реестр, а не динамический import по имени: в route-group `(projects)` шаблонные
// import'ы не резолвятся в рантайме (урок v1 `_generated/executables.ts`). Поэтому обычные импорты +
// объект. Имя ключа = `function.name` узла в automation.json (публичный контракт, уникально по графу).
import type { NodeFn } from "../executor";
import { receiveRequest } from "./receive-request";
import { transformPayload } from "./transform-payload";
import { ifSuccess } from "./if-success";
import { ifFailure } from "./if-failure";
import { deliverResult } from "./deliver-result";
import { receiveFromExternal } from "./receive-from-external";
import { handToExternal } from "./hand-to-external";

export const NODE_FUNCTIONS: Record<string, NodeFn> = {
  receiveRequest,
  transformPayload,
  ifSuccess,
  ifFailure,
  deliverResult,
  receiveFromExternal,
  handToExternal,
};
