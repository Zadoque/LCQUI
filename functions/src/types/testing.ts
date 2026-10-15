import type { CallableRequest } from "firebase-functions/v2/https";

/** Request mínimo usado pelos testes unitários de callables. */
export type RequestDeTeste<T = unknown> = CallableRequest<T>;

export type DadosDeTeste = Record<string, unknown>;

/**
 * Adaptador único para os testes: o runtime fornece o token decodificado e o
 * Express Request, enquanto os testes só precisam dos claims normativos.
 */
export function criarRequestDeTeste<T>(data: T, uid?: string, roles: string[] = [], versaoPermissoes = 1): RequestDeTeste<T> {
  const auth: NonNullable<RequestDeTeste<T>["auth"]> | undefined = uid
    ? {
        uid,
        token: { roles, versao_permissoes: versaoPermissoes } as unknown as NonNullable<RequestDeTeste<T>["auth"]>["token"],
      }
    : undefined;
  return {
    data,
    auth,
    rawRequest: {} as RequestDeTeste<T>["rawRequest"],
  };
}
