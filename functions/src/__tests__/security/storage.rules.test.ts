/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Inicializa o ambiente de teste apontando para o emulador
  testEnv = await initializeTestEnvironment({
    projectId: "lcqui-storage-test",
    storage: {
      rules: fs.readFileSync(path.resolve(__dirname, "../../../../storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Storage Security Rules", () => {
  
  // Helpers
  const unauthedStorage = () => testEnv.unauthenticatedContext().storage();
  const authedStorage = (uid: string, roles: string[] = [], ativo: boolean = true) => 
    testEnv.authenticatedContext(uid, { roles, ativo }).storage();

  describe("Acessos Básicos", () => {
    it("não deve permitir leitura ou escrita se não estiver autenticado", async () => {
      const storage = unauthedStorage();
      await assertFails(storage.ref("qualquer_coisa/arquivo.png").getDownloadURL());
      await assertFails(storage.ref("fotos_perfil/user/foto.png").put(Buffer.from("fake image")) as any);
    });
  });

  describe("Fotos de Perfil", () => {
    it("deve permitir que o próprio usuário faça upload de imagem até 5MB", async () => {
      const storage = authedStorage("alice");
      const ref = storage.ref("fotos_perfil/alice/minha_foto.png");
      const content = Buffer.alloc(1024); // 1KB
      await assertSucceeds(ref.put(content, { contentType: "image/png" }) as any);
    });

    it("não deve permitir que um usuário altere a foto de outro", async () => {
      const storage = authedStorage("bob");
      const ref = storage.ref("fotos_perfil/alice/minha_foto.png");
      const content = Buffer.alloc(1024);
      await assertFails(ref.put(content, { contentType: "image/png" }) as any);
    });

    it("não deve permitir upload se não for uma imagem (ex: PDF)", async () => {
      const storage = authedStorage("alice");
      const ref = storage.ref("fotos_perfil/alice/minha_foto.pdf");
      const content = Buffer.alloc(1024);
      await assertFails(ref.put(content, { contentType: "application/pdf" }) as any);
    });

    it("outro usuário autenticado NÃO lê a foto do dono (read escopado)", async () => {
      const aliceStorage = authedStorage("alice");
      const ref = aliceStorage.ref("fotos_perfil/alice/x.png");
      const content = Buffer.alloc(1024);
      await assertSucceeds(ref.put(content, { contentType: "image/png" }) as any);

      const bobStorage = authedStorage("bob");
      await assertFails(bobStorage.ref("fotos_perfil/alice/x.png").getDownloadURL());
    });
  });

  describe("Patrimônio e Requisições", () => {
    it("um gestor de patrimônio pode fazer upload de foto de patrimônio (com owner correto)", async () => {
      const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const ref = storage.ref("patrimonio/item1/foto.png");
      const content = Buffer.alloc(1024);
      await assertSucceeds(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "gestor1" } }) as any);
    });

    it("não deve permitir criar patrimônio se owner no metadata for de outra pessoa", async () => {
      const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const ref = storage.ref("patrimonio/item1/foto.png");
      const content = Buffer.alloc(1024);
      await assertFails(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "outrapessoa" } }) as any);
    });

    it("um professor PODE fazer upload de foto nas requisições (com owner)", async () => {
      const storage = authedStorage("prof1", ["Professor"]);
      const ref = storage.ref("requisicoes/req1/foto.png");
      const content = Buffer.alloc(1024);
      await assertSucceeds(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "prof1" } }) as any);
    });
    
    it("não deve permitir alterar owner de uma foto existente (update malicioso)", async () => {
      const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const ref = storage.ref("patrimonio/item1/foto.png");
      const content = Buffer.alloc(1024);
      // Cria o arquivo corretamente
      await assertSucceeds(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "gestor1" } }) as any);
      
      // Tenta dar update alterando o owner
      const hackerStorage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      await assertFails(hackerStorage.ref("patrimonio/item1/foto.png").put(content, { contentType: "image/jpeg", customMetadata: { owner: "hacker" } }) as any);
    });

    it("Aluno NÃO lê patrimônio; Professor LÊ; Gestor LÊ", async () => {
      // Seed um arquivo de patrimônio
      const gestorStorage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      await assertSucceeds(
        gestorStorage.ref("patrimonio/item1/foto.png").put(
          Buffer.alloc(1024),
          { contentType: "image/jpeg", customMetadata: { owner: "gestor1" } }
        ) as any
      );

      const alunoStorage = authedStorage("aluno1", ["Aluno"]);
      await assertFails(alunoStorage.ref("patrimonio/item1/foto.png").getDownloadURL());

      const profStorage = authedStorage("prof1", ["Professor"]);
      await assertSucceeds(profStorage.ref("patrimonio/item1/foto.png").getDownloadURL());

      await assertSucceeds(gestorStorage.ref("patrimonio/item1/foto.png").getDownloadURL());
    });

    it("Aluno NÃO lê requisições", async () => {
      // Seed um arquivo de requisição
      const profStorage = authedStorage("prof1", ["Professor"]);
      await assertSucceeds(
        profStorage.ref("requisicoes/req1/foto.png").put(
          Buffer.alloc(1024),
          { contentType: "image/jpeg", customMetadata: { owner: "prof1" } }
        ) as any
      );

      const alunoStorage = authedStorage("aluno1", ["Aluno"]);
      await assertFails(alunoStorage.ref("requisicoes/req1/foto.png").getDownloadURL());
    });
  });

  describe("Baixas Patrimoniais", () => {
    it("apenas gestor (ou admin) pode fazer upload de PDF para baixa (com owner)", async () => {
      const storageProf = authedStorage("prof1", ["Professor"]);
      const storageGestor = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      
      const content = Buffer.alloc(1024);
      
      await assertFails(storageProf.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);
      await assertSucceeds(storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "gestor1" } }) as any);
    });

    it("Gestor cria PDF OK; DELETE pelo Gestor → assertFails (retenção)", async () => {
      const storageGestor = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const content = Buffer.alloc(1024);
      await assertSucceeds(
        storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").put(
          content,
          { contentType: "application/pdf", customMetadata: { owner: "gestor1" } }
        ) as any
      );
      // Delete deve falhar — comprovante não pode ser removido após vinculação (S11)
      await assertFails(storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").delete());
    });

    it("Gestor LÊ baixas; Aluno NÃO lê", async () => {
      const storageGestor = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
      const content = Buffer.alloc(1024);
      await assertSucceeds(
        storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").put(
          content,
          { contentType: "application/pdf", customMetadata: { owner: "gestor1" } }
        ) as any
      );
      await assertSucceeds(storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").getDownloadURL());

      const alunoStorage = authedStorage("aluno1", ["Aluno"]);
      await assertFails(alunoStorage.ref("baixas_patrimoniais/item1/doc.pdf").getDownloadURL());
    });
  });

  describe("Token sem ativo", () => {
    it("Gestor sem ativo=true NÃO consegue criar em patrimonio", async () => {
      const storageSemAtivo = testEnv.authenticatedContext("x", { roles: ["Gestor_Bens_Patrimoniais"] }).storage();
      const content = Buffer.alloc(1024);
      await assertFails(
        storageSemAtivo.ref("patrimonio/item1/foto.png").put(
          content,
          { contentType: "image/jpeg", customMetadata: { owner: "x" } }
        ) as any
      );
    });
  });

  describe("Roteiros", () => {
    it("apenas professor ou admin pode fazer upload de roteiro em PDF (com owner)", async () => {
      const storageAluno = authedStorage("aluno1", ["Aluno"]);
      const storageProf = authedStorage("prof1", ["Professor"]);
      
      const content = Buffer.alloc(1024);
      
      await assertFails(storageAluno.ref("roteiros/aluno1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "aluno1" } }) as any);
      await assertSucceeds(storageProf.ref("roteiros/prof1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);
    });

    it("professor NÃO cria fora do próprio namespace", async () => {
      const storageProf1 = authedStorage("prof1", ["Professor"]);
      const storageProf2 = authedStorage("prof2", ["Professor"]);
      const content = Buffer.from("%PDF-1.4\n");

      // Criar no próprio namespace e com owner correto é permitido.
      await assertSucceeds(storageProf1.ref("roteiros/prof1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);

      // Criar no namespace de outro professor, mesmo com owner prÃ³prio, deve falhar.
      await assertFails(storageProf1.ref("roteiros/prof2/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);
      await assertFails(storageProf2.ref("roteiros/prof1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof2" } }) as any);
    });

    it("um professor não deve conseguir atualizar o roteiro de outro professor (update/sobrescrita maliciosa)", async () => {
      const storageProf1 = authedStorage("prof1", ["Professor"]);
      const storageProf2 = authedStorage("prof2", ["Professor"]);
      
      const content = Buffer.alloc(1024);
      const ref = storageProf1.ref("roteiros/prof1/doc.pdf");
      
      // Prof1 envia seu roteiro
      await assertSucceeds(ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);
      
      const ref2 = storageProf2.ref("roteiros/prof1/doc.pdf");
      // Download mediado por endpoint: leitura direta via Storage Rules deve falhar
      await assertFails(ref2.getDownloadURL());
      
      // Prof2 tenta atualizar os metadados
      await assertFails(ref2.updateMetadata({ customMetadata: { owner: "prof2" } })); // Tenta roubar posse via updateMetadata
      // Prof2 tenta deletar o roteiro do Prof1
      await assertFails(ref2.delete());
    });

    it("não deve permitir roteiro acima de 15MB", async () => {
      const storage = authedStorage("prof1", ["Professor"]);
      const ref = storage.ref("roteiros/prof1/doc.pdf");
      const content = Buffer.alloc(16 * 1024 * 1024); // 16MB
      await assertFails(ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }) as any);
    });

    it("deve fechar read para TODOS, inclusive o próprio dono", async () => {
      const storageProf = authedStorage("prof1", ["Professor"]);
      const ref = storageProf.ref("roteiros/prof1/doc.pdf");
      const content = Buffer.from("%PDF-1.4\n");
      await ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } } as any);

      // Dono não pode obter URL de download direta.
      await assertFails(ref.getDownloadURL());

      // Usuário não autenticado também não pode ler.
      const unauthedRef = unauthedStorage().ref("roteiros/prof1/doc.pdf");
      await assertFails(unauthedRef.getDownloadURL());
    });

    it("deve proibir update e delete mesmo para o próprio dono", async () => {
      const storageProf = authedStorage("prof1", ["Professor"]);
      const ref = storageProf.ref("roteiros/prof1/doc.pdf");
      const content = Buffer.from("%PDF-1.4\n");
      await ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } } as any);

      await assertFails(ref.updateMetadata({ customMetadata: { owner: "prof1" } }) as any);
      await assertFails(ref.delete());
    });
  });

});
