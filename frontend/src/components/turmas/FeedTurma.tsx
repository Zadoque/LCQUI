import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma: string;
  status: string;
}

interface FeedTurmaProps {
  turma: Turma | null;
}

interface Post {
  id: string;
  titulo: string;
  descricao: string;
  criado_em: any;
  id_professor: string;
}

export default function FeedTurma({ turma }: FeedTurmaProps) {
  const { roles } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const isProfessor = roles.includes("Professor") || roles.includes("Chefe_Geral");

  useEffect(() => {
    if (!turma) return;

    const q = query(
      collection(db, "Turma", turma.id, "Posts"),
      orderBy("criado_em", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [turma]);

  if (!turma) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-semibold text-foreground/70">
            Selecione uma turma ao lado para começarmos
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background/50">
      <div className="p-6 border-b border-border bg-card">
        <h1 className="text-2xl font-bold">{turma.nome_turma}</h1>
        <p className="text-sm text-muted-foreground">Código: {turma.codigo_turma}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isProfessor && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <h3 className="font-medium mb-2">Criar nova postagem</h3>
            <input 
              type="text" 
              placeholder="Título da postagem..." 
              className="w-full bg-background border border-input rounded-md px-3 py-2 mb-2"
            />
            <textarea 
              placeholder="Escreva as instruções ou recados para a turma..."
              className="w-full bg-background border border-input rounded-md px-3 py-2 h-24 mb-3 resize-none"
            />
            <div className="flex justify-between items-center">
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                📎 Anexar Roteiro PDF
              </button>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
                Postar
              </button>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
            Nenhuma postagem ainda nesta turma.
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold">{post.titulo}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {post.criado_em?.toDate ? post.criado_em.toDate().toLocaleString() : "Agora mesmo"}
              </p>
              <p className="whitespace-pre-wrap">{post.descricao}</p>
              
              <hr className="my-4 border-border" />
              
              {/* Espaço para Comentários (Simplificado para V1 Inicial) */}
              <div className="text-sm">
                <button className="text-muted-foreground hover:text-foreground font-medium">
                  💬 Ver comentários
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
