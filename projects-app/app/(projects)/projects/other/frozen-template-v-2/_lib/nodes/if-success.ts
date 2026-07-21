// ФУНКЦИЯ УЗЛА «CONDITION-SUCCESS» — ветка успеха: пропускает поток дальше только тогда, когда середина
// действительно дала результат. По закону вида узла (`_instructions/kind.condition-success.md`) выходной узел принимает
// связь ТОЛЬКО от ветки успеха, поэтому этот узел стоит между `transform` и `output`.
export function ifSuccess(input: { result: unknown }): { result: unknown } | null {
  // no result — the branch does not hold, and the flow does not reach the output node
  return input.result === undefined || input.result === null ? null : { result: input.result };
}
