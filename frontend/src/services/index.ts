/**
 * Barrel export da camada de serviços.
 *
 * Importe sempre a partir de "@/services" para manter o acoplamento mínimo
 * e facilitar substituições (mock, emulador, versão futura da API).
 *
 * Nunca importe firebase/firestore ou firebase/functions diretamente
 * em componentes ou hooks — use este módulo intermediário.
 */

export * from "./usuarios/usuariosService";
export * from "./reagentes/reagentesService";
export * from "./turmas/turmasService";
