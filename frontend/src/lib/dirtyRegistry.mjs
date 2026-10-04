/**
 * Registro global de formulários "sujos" (modificados).
 *
 * Usado para determinar se o usuário precisa decidir entre continuar editando
 * ou descartar alterações ao trocar de papel (S8 UI-01 L193).
 *
 * Sem dependências externas.
 */
export class DirtyRegistry {
  /** @type {Set<string>} */
  constructor() {
    this.ids = new Set();
  }

  /**
   * Marca ou desmarca um formulário como sujo.
   * @param {string} id - Identificador único do formulário.
   * @param {boolean} dirty - true para marcar como sujo, false para desmarcar.
   */
  set(id, dirty) {
    if (dirty) {
      this.ids.add(id);
    } else {
      this.ids.delete(id);
    }
  }

  /**
   * Remove um formulário do registro (ex.: ao desmontar o componente).
   * @param {string} id - Identificador único do formulário.
   */
  remove(id) {
    this.ids.delete(id);
  }

  /**
   * Retorna true se existir ao menos um formulário sujo registrado.
   * @returns {boolean}
   */
  hasDirty() {
    return this.ids.size > 0;
  }

  /** Remove todos os formulários do registro. */
  clear() {
    this.ids.clear();
  }
}
