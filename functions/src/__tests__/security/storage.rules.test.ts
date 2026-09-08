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
  const authedStorage = (uid: string, claims?: Record<string, boolean>) => 
    testEnv.authenticatedContext(uid, claims).storage();

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

    it("não deve permitir upload acima de 5MB", async () => {
      const storage = authedStorage("alice");
      const ref = storage.ref("fotos_perfil/alice/minha_foto.png");
      const content = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await assertFails(ref.put(content, { contentType: "image/png" }) as any);
    });
  });

  describe("Patrimônio e Requisições", () => {
    it("qualquer usuário autenticado pode ler fotos de patrimônio", async () => {
      // Pre-upload by admin to ensure object exists
      const adminStorage = authedStorage("admin1", { admin: true });
      await adminStorage.ref("patrimonio/item1/foto.png").put(Buffer.alloc(1024), { contentType: "image/jpeg" });

      const storage = authedStorage("aluno1", { aluno: true });
      await assertSucceeds(storage.ref("patrimonio/item1/foto.png").getDownloadURL());
    });

    it("um gestor de patrimônio pode fazer upload de foto de patrimônio", async () => {
      const storage = authedStorage("gestor1", { gestorPatrimonio: true });
      const ref = storage.ref("patrimonio/item1/foto.png");
      const content = Buffer.alloc(1024);
      await assertSucceeds(ref.put(content, { contentType: "image/jpeg" }) as any);
    });

    it("um professor NÃO pode fazer upload direto no patrimônio", async () => {
      const storage = authedStorage("prof1", { professor: true });
      const ref = storage.ref("patrimonio/item1/foto.png");
      const content = Buffer.alloc(1024);
      await assertFails(ref.put(content, { contentType: "image/jpeg" }) as any);
    });

    it("um professor PODE fazer upload de foto nas requisições", async () => {
      const storage = authedStorage("prof1", { professor: true });
      const ref = storage.ref("requisicoes/req1/foto.png");
      const content = Buffer.alloc(1024);
      await assertSucceeds(ref.put(content, { contentType: "image/jpeg" }) as any);
    });
  });

  describe("Baixas Patrimoniais", () => {
    it("apenas gestor (ou admin) pode fazer upload de PDF para baixa", async () => {
      const storageProf = authedStorage("prof1", { professor: true });
      const storageGestor = authedStorage("gestor1", { gestorPatrimonio: true });
      
      const content = Buffer.alloc(1024);
      
      await assertFails(storageProf.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf" }) as any);
      await assertSucceeds(storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf" }) as any);
    });

    it("não deve permitir o upload se não for um PDF", async () => {
      const storage = authedStorage("gestor1", { gestorPatrimonio: true });
      const ref = storage.ref("baixas_patrimoniais/item1/doc.jpg");
      const content = Buffer.alloc(1024);
      await assertFails(ref.put(content, { contentType: "image/jpeg" }) as any);
    });
  });

  describe("Roteiros", () => {
    it("apenas professor ou admin pode fazer upload de roteiro em PDF", async () => {
      const storageAluno = authedStorage("aluno1", { aluno: true });
      const storageProf = authedStorage("prof1", { professor: true });
      
      const content = Buffer.alloc(1024);
      
      await assertFails(storageAluno.ref("roteiros/rot1/doc.pdf").put(content, { contentType: "application/pdf" }) as any);
      await assertSucceeds(storageProf.ref("roteiros/rot1/doc.pdf").put(content, { contentType: "application/pdf" }) as any);
    });

    it("não deve permitir roteiro acima de 15MB", async () => {
      const storage = authedStorage("prof1", { professor: true });
      const ref = storage.ref("roteiros/rot1/doc.pdf");
      const content = Buffer.alloc(16 * 1024 * 1024); // 16MB
      await assertFails(ref.put(content, { contentType: "application/pdf" }) as any);
    });
  });

});
