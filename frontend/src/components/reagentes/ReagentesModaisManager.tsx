import React from "react";
import ModalRelatoriosReagentes from "@/components/reagentes/ModalRelatoriosReagentes";
import ModalEtiquetasReagentes from "@/components/reagentes/ModalEtiquetasReagentes";
import {
  ModalEntradaFrasco,
  ModalDevolucaoFrasco,
  ModalNovoReagente,
  ModalRegistrarRetirada,
  ModalNovaEspecificacao,
  ModalNovoLote,
  ModalNovaSubstancia,
  ModalQuarentena,
  ModalExtravioReencontro,
  ModalMetrologia,
  ModalPesagemRotina,
  ModalDescarteFrasco,
  ModalConfigurarEscassez,
} from "@/components/reagentes/ModaisReagentes";
import { NovaMateriaModal } from "@/components/materias/NovaMateriaModal";
import { ModalAlmoxarifado } from "@/components/almoxarifados/ModalAlmoxarifado";
import { GerenciarGestoresAlmoxarifadoModal } from "@/components/almoxarifados/GerenciarGestoresAlmoxarifadoModal";
import { NovoGestorAlmoxarifadoModal } from "@/components/almoxarifados/NovoGestorAlmoxarifadoModal";
import type { AlmoxarifadoItem } from "@/types/cadastros";
import type { CatalogoEspecificacao, FrascoOperacional, ResumoReagente } from "@/types/reagentes";

interface ReagentesModaisManagerProps {
  uid?: string;
  isChefe: boolean;
  idAlmoxarifado?: string;
  isRelatoriosOpen: boolean;
  setIsRelatoriosOpen: (v: boolean) => void;
  isEtiquetasOpen: boolean;
  setIsEtiquetasOpen: (v: boolean) => void;
  isMateriaModalOpen: boolean;
  setIsMateriaModalOpen: (v: boolean) => void;
  isNovoReagenteOpen: boolean;
  setIsNovoReagenteOpen: (v: boolean) => void;
  isNovaSubstanciaOpen: boolean;
  setIsNovaSubstanciaOpen: (v: boolean) => void;
  isNovaEspecOpen: boolean;
  setIsNovaEspecOpen: (v: boolean) => void;
  isNovoLoteOpen: boolean;
  setIsNovoLoteOpen: (v: boolean) => void;
  isAdicionarFrascoOpen: boolean;
  setIsAdicionarFrascoOpen: (v: boolean) => void;
  isRetiradaOpen: boolean;
  setIsRetiradaOpen: (v: boolean) => void;
  isDevolucaoOpen: boolean;
  setIsDevolucaoOpen: (v: boolean) => void;
  isAlmoxOpen: boolean;
  setIsAlmoxOpen: (v: boolean) => void;
  isGestoresAlmoxOpen: boolean;
  setIsGestoresAlmoxOpen: (v: boolean) => void;
  isNovoGestorAlmoxOpen: boolean;
  setIsNovoGestorAlmoxOpen: (v: boolean) => void;
  almoxSelecionado?: AlmoxarifadoItem;
  selectedResumo: ResumoReagente | null;
  selectedEspec: CatalogoEspecificacao | null;
  isQuarentenaModalOpen: boolean;
  setIsQuarentenaModalOpen: (v: boolean) => void;
  isExtravioModalOpen: boolean;
  setIsExtravioModalOpen: (v: boolean) => void;
  isMetrologiaModalOpen: boolean;
  setIsMetrologiaModalOpen: (v: boolean) => void;
  isPesagemRotinaModalOpen: boolean;
  setIsPesagemRotinaModalOpen: (v: boolean) => void;
  isDescarteModalOpen: boolean;
  setIsDescarteModalOpen: (v: boolean) => void;
  isEscassezModalOpen: boolean;
  setIsEscassezModalOpen: (v: boolean) => void;
  frascoSelecionado: FrascoOperacional | null;
  setFrascoSelecionado: (v: FrascoOperacional | null) => void;
  onSuccessCatalogo: () => void;
}

export function ReagentesModaisManager({
  uid,
  isChefe,
  idAlmoxarifado,
  isRelatoriosOpen,
  setIsRelatoriosOpen,
  isEtiquetasOpen,
  setIsEtiquetasOpen,
  isMateriaModalOpen,
  setIsMateriaModalOpen,
  isNovoReagenteOpen,
  setIsNovoReagenteOpen,
  isNovaSubstanciaOpen,
  setIsNovaSubstanciaOpen,
  isNovaEspecOpen,
  setIsNovaEspecOpen,
  isNovoLoteOpen,
  setIsNovoLoteOpen,
  isAdicionarFrascoOpen,
  setIsAdicionarFrascoOpen,
  isRetiradaOpen,
  setIsRetiradaOpen,
  isDevolucaoOpen,
  setIsDevolucaoOpen,
  isAlmoxOpen,
  setIsAlmoxOpen,
  isGestoresAlmoxOpen,
  setIsGestoresAlmoxOpen,
  isNovoGestorAlmoxOpen,
  setIsNovoGestorAlmoxOpen,
  almoxSelecionado,
  selectedResumo,
  selectedEspec,
  isQuarentenaModalOpen,
  setIsQuarentenaModalOpen,
  isExtravioModalOpen,
  setIsExtravioModalOpen,
  isMetrologiaModalOpen,
  setIsMetrologiaModalOpen,
  isPesagemRotinaModalOpen,
  setIsPesagemRotinaModalOpen,
  isDescarteModalOpen,
  setIsDescarteModalOpen,
  isEscassezModalOpen,
  setIsEscassezModalOpen,
  frascoSelecionado,
  setFrascoSelecionado,
  onSuccessCatalogo,
}: ReagentesModaisManagerProps) {
  return (
    <>
      {uid && (
        <ModalRelatoriosReagentes
          isOpen={isRelatoriosOpen}
          onClose={() => setIsRelatoriosOpen(false)}
          uid={uid}
          isChefe={isChefe}
        />
      )}
      {isEtiquetasOpen && (
        <ModalEtiquetasReagentes
          isOpen={isEtiquetasOpen}
          onClose={() => setIsEtiquetasOpen(false)}
        />
      )}
      <NovaMateriaModal
        isOpen={isMateriaModalOpen}
        onClose={() => setIsMateriaModalOpen(false)}
      />
      <ModalNovaSubstancia
        isOpen={isNovaSubstanciaOpen}
        onClose={() => setIsNovaSubstanciaOpen(false)}
        onSuccess={() => {}}
      />
      <ModalNovoReagente
        isOpen={isNovoReagenteOpen}
        onClose={() => setIsNovoReagenteOpen(false)}
        onSuccess={onSuccessCatalogo}
      />
      <ModalNovaEspecificacao
        isOpen={isNovaEspecOpen}
        onClose={() => setIsNovaEspecOpen(false)}
        onSuccess={() => {}}
        idResumoReagente={selectedResumo?.id}
        resumoSelecionado={selectedResumo ?? undefined}
      />
      <ModalNovoLote
        isOpen={isNovoLoteOpen}
        onClose={() => setIsNovoLoteOpen(false)}
        onSuccess={() => {}}
        idResumoReagente={selectedResumo?.id}
        idEspecificacaoReagente={selectedEspec?.id}
      />
      <ModalEntradaFrasco
        isOpen={isAdicionarFrascoOpen}
        onClose={() => setIsAdicionarFrascoOpen(false)}
        onSuccess={() => {}}
        idResumoReagente={selectedResumo?.id}
        idEspecificacaoReagente={selectedEspec?.id}
        idAlmoxarifado={idAlmoxarifado}
      />
      <ModalRegistrarRetirada
        isOpen={isRetiradaOpen}
        onClose={() => setIsRetiradaOpen(false)}
      />
      <ModalDevolucaoFrasco
        isOpen={isDevolucaoOpen}
        onClose={() => setIsDevolucaoOpen(false)}
        frascoId=""
      />
      <ModalAlmoxarifado
        key={`modal-almox-${almoxSelecionado?.id ?? "novo"}`}
        isOpen={isAlmoxOpen}
        onClose={() => setIsAlmoxOpen(false)}
        onSuccess={() => setIsAlmoxOpen(false)}
        item={almoxSelecionado}
      />
      <GerenciarGestoresAlmoxarifadoModal
        key={`gestores-almox-${almoxSelecionado?.id ?? "gestores"}-${isGestoresAlmoxOpen ? "aberto" : "fechado"}`}
        isOpen={isGestoresAlmoxOpen}
        onClose={() => setIsGestoresAlmoxOpen(false)}
        onSuccess={() => setIsGestoresAlmoxOpen(false)}
        item={almoxSelecionado}
      />
      <NovoGestorAlmoxarifadoModal
        isOpen={isNovoGestorAlmoxOpen}
        onClose={() => setIsNovoGestorAlmoxOpen(false)}
      />

      {frascoSelecionado && (
        <>
          <ModalQuarentena
            isOpen={isQuarentenaModalOpen}
            onClose={() => {
              setIsQuarentenaModalOpen(false);
              setFrascoSelecionado(null);
            }}
            frascoId={frascoSelecionado.id}
            emQuarentena={Boolean(frascoSelecionado.em_quarentena)}
            onSuccess={onSuccessCatalogo}
          />
          <ModalExtravioReencontro
            isOpen={isExtravioModalOpen}
            onClose={() => {
              setIsExtravioModalOpen(false);
              setFrascoSelecionado(null);
            }}
            frascoId={frascoSelecionado.id}
            isExtraviado={frascoSelecionado.situacao_localizacao === "EXTRAVIADO"}
            onSuccess={onSuccessCatalogo}
          />
          <ModalMetrologia
            isOpen={isMetrologiaModalOpen}
            onClose={() => {
              setIsMetrologiaModalOpen(false);
              setFrascoSelecionado(null);
            }}
            idFrasco={frascoSelecionado.id}
            idEmprestimo={frascoSelecionado.id_ultimo_emprestimo ?? undefined}
            pesoRetornoOriginal={frascoSelecionado.peso_retorno ?? undefined}
            pesoSaidaOriginal={frascoSelecionado.peso_saida ?? undefined}
            tara={frascoSelecionado.peso_frasco_vazio ?? undefined}
            onSuccess={onSuccessCatalogo}
          />
          <ModalPesagemRotina
            isOpen={isPesagemRotinaModalOpen}
            onClose={() => {
              setIsPesagemRotinaModalOpen(false);
              setFrascoSelecionado(null);
            }}
            frascoId={frascoSelecionado.id}
            onSuccess={onSuccessCatalogo}
          />
      <ModalDescarteFrasco
            isOpen={isDescarteModalOpen}
            onClose={() => {
              setIsDescarteModalOpen(false);
              setFrascoSelecionado(null);
            }}
            frascoId={frascoSelecionado.id}
        onSuccess={onSuccessCatalogo}
      />
        </>
      )}
      <ModalConfigurarEscassez
        isOpen={isEscassezModalOpen}
        onClose={() => setIsEscassezModalOpen(false)}
        idAlmoxarifado={idAlmoxarifado}
        idResumoReagente={selectedResumo?.id}
        idEspecificacaoReagente={selectedEspec?.id}
        descricao={selectedEspec?.descricao}
        onSuccess={onSuccessCatalogo}
      />
    </>
  );
}
