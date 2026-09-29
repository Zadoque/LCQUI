# Notificações — Lacunas de UI identificadas

**Data:** 2026-09-29  
**Status:** DOCUMENTADO (não resolver nesta rodada)  
**Contexto:** Auditoria visual do componente `NotificacoesDropdown` (`frontend/src/components/layout/NotificacoesDropdown.tsx`). As lacunas abaixo não impedem a funcionalidade, mas comprometem a experiência do usuário e a acessibilidade. Serão corrigidas em rodada posterior de UI.

---

## Problema 1 — Background do dropdown/painel sem contraste

O painel suspenso (dropdown) de notificações utiliza `bg-card` como cor de fundo (linha 144):

```tsx
<div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-foreground/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
```

Em temas onde `bg-card` coincide com o fundo da página (`bg-background` ou `bg-background/50`), o painel perde a distinção visual e aparenta transparência ou continuidade com o conteúdo subjacente. A sombra (`shadow-2xl`) e a borda fina (`border border-foreground/10`) não são suficientes para estabelecer contraste adequado em todos os contextos de layout.

**Sugestão de correção futura:** Substituir `bg-card` por um fundo mais opaco ou contrastante, ex.: `bg-popover`, ou adicionar `backdrop-blur`/`bg-opacity` explícito que garanta separação visual independentemente do tema.

---

## Problema 2 — Background dos itens de notificação sem separação visual

Cada item de notificação utiliza o mesmo fundo do painel (`bg-card`) no estado lido (linha 202):

```tsx
className={`p-3 rounded-xl border transition-all ${
  !notif.lida && !expirada
    ? "bg-primary/5 border-primary/20"
    : "bg-card border-foreground/5 opacity-80"
}`}
```

Para notificações genéricas (linha 265), não há classe de background explícita:

```tsx
<div key={notif.id} className="p-3 rounded-xl border border-foreground/5 text-xs space-y-1">
```

Isso faz com que o item herde `bg-card` do painel, tornando a borda sutil (`border-foreground/5`) o único elemento de separação. Itens não lidos têm fundo `bg-primary/5`, que se destaca, mas os lidos e os genéricos perdem a hierarquia visual.

**Sugestão de correção futura:** Aplicar um fundo alternado ou sutilmente diferente em cada item (ex.: `bg-muted/50`), ou ao menos garantir que o painel e os itens tenham planos visuais distintos.

---

## Problema 3 — Mensagens genéricas sem detalhes do conteúdo

Para notificações que não são do tipo `CONVITE_PARA_TURMA` (bloco `else` genérico, linhas 263–271), a exibição se limita ao nome do tipo com underscores substituídos por espaços:

```tsx
<p className="font-semibold text-foreground">{notif.tipo.replace(/_/g, " ")}</p>
{notif.mensagem_customizada && (
  <p className="text-foreground/70">{notif.mensagem_customizada}</p>
)}
```

Uma notificação do tipo `"COMENTARIO"` é exibida simplesmente como **"COMENTARIO"**, sem informar:
- Em qual post/turma o comentário foi feito.
- Quem comentou.
- O conteúdo ou trecho do comentário.

O único campo opcional disponível é `mensagem_customizada`, que nem sempre é preenchido pelo emissor. Sem contexto, o usuário não consegue decidir se a notificação é relevante sem abrir cada uma.

**Sugestão de correção futura:** Enriquecer o payload de notificações com campos contextuais (`id_turma`, `id_post`, `id_comentario`, texto-resumo) e renderizar uma mensagem descritiva no dropdown,类似 ao que já é feito para `CONVITE_PARA_TURMA`.

---

## Observações

- Nenhuma destas lacunas afeta a lógica de negócio, as regras de autorização (Firestore Rules) ou a integridade dos dados.
- O contrato formal de notificações (M13) continua válido; estas são lacunas exclusivamente de apresentação (UI).
- Correção planejada para rodada posterior de refinamento de interface, após a conclusão das features pendentes da matriz de implementação.