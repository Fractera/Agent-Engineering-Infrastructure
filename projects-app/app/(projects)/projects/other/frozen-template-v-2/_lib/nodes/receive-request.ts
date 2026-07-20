// ФУНКЦИЯ УЗЛА «INPUT» — принимает сырое обращение снаружи (сообщение, запрос, тик расписания)
// и отдаёт его дальше единственным портом `payload`. Своего входного порта у узла нет по виду `input`,
// поэтому сырые данные приходят аргументом, а не с предыдущего узла.
export function receiveRequest(raw: unknown): { payload: unknown } {
  // the input node does not interpret the request — it only names it for the nodes downstream
  return { payload: raw };
}
