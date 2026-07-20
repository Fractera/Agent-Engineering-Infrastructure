// ФУНКЦИЯ УЗЛА «OUTPUT» — доставляет результат автоматизации: ответ, запись, публикация.
// Выходного порта у узла нет по виду `output`, поэтому функция ничего не возвращает дальше по графу.
export function deliverResult(input: { result: unknown }): void {
  // where the result goes is decided when the automation gets its real output channel
  void input.result;
}
