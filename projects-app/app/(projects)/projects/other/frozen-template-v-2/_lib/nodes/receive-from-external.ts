// ФУНКЦИЯ УЗЛА «INPUT-CONNECTOR» — принимает данные от узла ДРУГОЙ автоматизации: это дверь, через
// которую автоматизация входит в групповую. По закону вида узла (`_instructions/kind.input-connector.md`) коннектор
// присутствует всегда; в одиночной автоматизации он просто скрыт и не исполняется.
export function receiveFromExternal(handover: unknown): { payload: unknown } {
  // the connector does not interpret the handover — it only names it for this automation
  return { payload: handover };
}
