// Публичный тип-фасад микросервиса «дев-консоль» — что отдают его половины наружу.
// Сами типы живут рядом со своим кодом (закон 2, один дом): `AuthFlowDescriptor` — в client/ рядом с
// дескрипторами, `DevRoom` — в server/ рядом с функцией. Здесь — только точка сборки для потребителей.
export type { DevRoom } from "../server/dev-room";
export type { AuthFlowDescriptor } from "../client/auth-flow-descriptors";
