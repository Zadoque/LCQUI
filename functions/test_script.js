const { assertFails, assertSucceeds, initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const fs = require("fs");
const path = require("path");

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: "lcqui-storage-test2",
    storage: {
      rules: fs.readFileSync(path.resolve(__dirname, "../storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
  await testEnv.clearStorage();
  
  const storageProf1 = testEnv.authenticatedContext("prof1", { roles: ["Professor"] }).storage();
  const storageProf2 = testEnv.authenticatedContext("prof2", { roles: ["Professor"] }).storage();
  
  const content = Buffer.alloc(1024);
  const ref = storageProf1.ref("roteiros/rot1/doc.pdf");
  
  console.log("Upload prof1...");
  await assertSucceeds(ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }));
  console.log("Success prof1!");
  
  const ref2 = storageProf2.ref("roteiros/rot1/doc.pdf");
  console.log("Upload prof2...");
  await assertFails(ref2.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof2" } }));
  console.log("Success prof2 fail!");
  
  await testEnv.cleanup();
}
run().catch(console.error);
