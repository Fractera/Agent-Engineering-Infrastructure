// ФУНКЦИЯ УЗЛА «INPUT-CONNECTOR» — принимает данные от узла ДРУГОЙ автоматизации: это дверь, через
// которую автоматизация входит в групповую. По закону дерева узлов (`NODE-TREE-RULES.md` §8) коннектор
// присутствует всегда; в одиночной автоматизации он просто скрыт и не исполняется.
export function receiveFromExternal(handover: unknown): { payload: unknown } {
  // the connector does not interpret the handover — it only names it for this automation
  return { payload: handover };
}
