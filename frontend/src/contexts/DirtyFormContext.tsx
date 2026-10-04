"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { DirtyRegistry } from "@/lib/dirtyRegistry.mjs";

interface DirtyFormContextType {
  register(id: string, dirty: boolean): void;
  unregister(id: string): void;
  hasDirty(): boolean;
}

const DirtyFormContext = createContext<DirtyFormContextType>({
  register: () => {},
  unregister: () => {},
  hasDirty: () => false,
});

export const useDirtyForms = () => useContext(DirtyFormContext);

export const DirtyFormsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const registryRef = useRef(new DirtyRegistry());

  const register = useCallback((id: string, dirty: boolean) => {
    registryRef.current.set(id, dirty);
  }, []);

  const unregister = useCallback((id: string) => {
    registryRef.current.remove(id);
  }, []);

  const hasDirty = useCallback((): boolean => {
    return registryRef.current.hasDirty();
  }, []);

  const value = useMemo(
    () => ({ register, unregister, hasDirty }),
    [register, unregister, hasDirty],
  );

  return (
    <DirtyFormContext.Provider value={value}>
      {children}
    </DirtyFormContext.Provider>
  );
};

/**
 * Hook para registrar/desregistrar um formulário no registro global de sujeira.
 *
 * Chame em qualquer componente de formulário passando um id estável e o
 * estado `isDirty` atual.  Quando `isDirty` for true, o formulário fica
 * registrado; ao desmontar ou `isDirty` voltar a false, ele é removido.
 */
export function useDirtyForm(id: string, isDirty: boolean) {
  const { register, unregister } = useDirtyForms();

  useEffect(() => {
    register(id, isDirty);
  }, [id, isDirty, register]);

  useEffect(() => {
    return () => {
      unregister(id);
    };
  }, [id, unregister]);
}
