import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { X } from "lucide-react";

interface NovaTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaTurmaModal({ isOpen, onClose }: NovaTurmaModalProps) {
  const { user, roles } = useAuth();
  const [nome, setNome] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semestre, setSemestre] = useState(1);
  const [capacidade, setCapacidade] = useState(40);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isChefeGeral = roles.includes("Chefe_Geral");
  
  // Data states
  const [professores, setProfessores] = useState<{id: string, nome: string}[]>([]);
  const [materiasDb, setMateriasDb] = useState<{id: string, nome: string, codigo: string}[]>([]);
  const [profMateriasRel, setProfMateriasRel] = useState<{id_materia: string}[]>([]);
  
  // Selection states
  const [selectedProfId, setSelectedProfId] = useState("");
  const [idMateria, setIdMateria] = useState("");

  // 1. Fetch Professores (if Chefe Geral) and all Materias
  useEffect(() => {
    if (!isOpen) return;

    let unsubProf = () => {};
    if (isChefeGeral) {
      const qProf = query(collection(db, "Professor"));
      unsubProf = onSnapshot(qProf, (snap) => {
        const lista = snap.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome
        }));
        setProfessores(lista);
      });
    }

    const qMat = query(collection(db, "Materia"), orderBy("nome", "asc"));
    const unsubMat = onSnapshot(qMat, (snap) => {
      const lista = snap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        codigo: doc.data().codigo_materia
      }));
      setMateriasDb(lista);
    });

    return () => {
      unsubProf();
      unsubMat();
    };
  }, [isOpen, isChefeGeral]);

  // 2. Fetch Professor_x_Materia when Professor changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Resolve which professor ID to look up
    const profIdToLookup = isChefeGeral ? selectedProfId : user?.uid;
    
    if (!profIdToLookup) {
      setProfMateriasRel([]);
      setIdMateria("");
      return;
    }

    const qRel = query(
      collection(db, "Professor_x_Materia"), 
      where("id_usuario", "==", profIdToLookup)
    );
    
    const unsubRel = onSnapshot(qRel, (snap) => {
      const rels = snap.docs.map(doc => ({ id_materia: doc.data().id_materia }));
      setProfMateriasRel(rels);
      
      // Auto-select first materia if none selected or if current is invalid
      if (rels.length > 0) {
        const hasCurrent = rels.some(r => r.id_materia === idMateria);
        if (!hasCurrent) {
          setIdMateria(rels[0].id_materia);
        }
      } else {
        setIdMateria("");
      }
    });

    return () => unsubRel();
  }, [isOpen, isChefeGeral, selectedProfId, user?.uid, idMateria]);

  if (!isOpen) return null;

  // Filter matters that the selected professor actually teaches
  const allowedMateriaIds = profMateriasRel.map(r => r.id_materia);
  const selectableMaterias = materiasDb.filter(m => allowedMateriaIds.includes(m.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!idMateria) {
      setError("Selecione uma matéria.");
      return;
    }
    
    if (isChefeGeral && !selectedProfId) {
      setError("Selecione um professor.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const functions = getFunctions();
      const criarTurmaFn = httpsCallable(functions, "criarTurma");
      
      const materiaObj = materiasDb.find(m => m.id === idMateria);
      
      const payload: any = {
        idMateria,
        nomeMateria: materiaObj ? materiaObj.nome : "Desconhecida",
        nomeTurma: nome,
        ano,
        semestre,
        capacidade
      };

      if (isChefeGeral) {
        payload.idProfessor = selectedProfId;
      }
      
      await criarTurmaFn(payload);
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao criar turma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold">Nova Turma</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20 font-medium">
              {error}
            </div>
          )}

          {isChefeGeral && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <label className="block text-sm font-semibold mb-1 text-primary">Professor Responsável</label>
              <select 
                required
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="">Selecione um Professor...</option>
                {professores.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === user?.uid}>
                    {p.nome} {p.id === user?.uid ? "(Você - Proibido)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-primary/70 mt-1">O Chefe Geral não pode criar uma turma para si mesmo.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Matéria</label>
            <select 
              required
              value={idMateria}
              onChange={(e) => setIdMateria(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={selectableMaterias.length === 0}
            >
              <option value="">{selectableMaterias.length === 0 ? "Nenhuma matéria vinculada" : "Selecione a Matéria..."}</option>
              {selectableMaterias.map(m => (
                <option key={m.id} value={m.id}>{m.codigo} - {m.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Nome da Turma</label>
            <input 
              required
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Turma A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Ano</label>
              <input 
                required
                type="number" 
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Semestre</label>
              <select 
                value={semestre}
                onChange={(e) => setSemestre(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Capacidade de Alunos</label>
            <input 
              required
              type="number" 
              min="1"
              max="200"
              value={capacidade}
              onChange={(e) => setCapacidade(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold hover:bg-foreground/5 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || selectableMaterias.length === 0}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar Turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function IngressarTurmaModal({ isOpen, onClose }: NovaTurmaModalProps) {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const functions = getFunctions();
      const ingressarFn = httpsCallable(functions, "ingressarEmTurmaPorCodigo");
      
      await ingressarFn({ codigoTurma: codigo });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao ingressar na turma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold">Ingressar em Turma</h2>
          <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg border border-red-500/20 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Código da Turma</label>
            <input 
              required
              type="text" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-center text-xl tracking-widest bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase font-bold"
              placeholder="CÓDIGO"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold hover:bg-foreground/5 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !codigo.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Processando..." : "Ingressar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
