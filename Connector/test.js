import https from "https";

console.log("Test de connexion Firebase...");

const start = Date.now();

https.get("https://pointages-mobil-default-rtdb.firebaseio.com", res => {
  console.log("Réponse Firebase:", res.statusCode);
  console.log("Délai:", Date.now() - start, "ms");
}).on("error", err => {
  console.error("Erreur:", err.message);
});
