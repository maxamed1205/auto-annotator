// fichier: readFile.js
import { readFileSync } from "fs";

const path = "./notes.txt"; // mets le chemin de ton fichier
const content = readFileSync(path, "utf8");
console.log("📖 Contenu du fichier :");
console.log(content);