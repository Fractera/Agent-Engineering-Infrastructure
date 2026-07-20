// ФУНКЦИЯ УЗЛА «LOGIC» — срединная работа: превращает пришедший `payload` в `result`.
// Здесь живёт вся прикладная логика автоматизации; пока это честный проход без преобразования.
export function transformPayload(input: { payload: unknown }): { result: unknown } {
  return { result: input.payload };
}
