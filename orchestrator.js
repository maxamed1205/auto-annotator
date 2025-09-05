import { readFileSync, appendFileSync } from "fs";
import { resolve, normalize } from "path";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:4141/v1",
  apiKey: "dummy"
});

// ✅ Définir un répertoire "sandbox" autorisé
const SANDBOX_DIR = normalize("C:/Users/maxam/Desktop/auto-annotator/");

// Vérifie que le chemin demandé est bien dans le sandbox
function isPathAllowed(path) {
  const resolved = resolve(path);
  return resolved.startsWith(SANDBOX_DIR);
}

// ✅ Définition des outils
const tools = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Lit un fichier texte dans le dossier sandbox et renvoie son contenu.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Chemin relatif ou absolu du fichier à lire (doit être dans le dossier sandbox)."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Ajoute du texte à la fin d’un fichier dans le dossier sandbox.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    }
  }
];

// ✅ Exécuter un tool_call en toute sécurité
function executeTool(name, args) {
  try {
    if (!isPathAllowed(args.path)) {
      return `⛔ Accès refusé : le fichier doit être dans ${SANDBOX_DIR}`;
    }

    if (name === "read_file") {
      const content = readFileSync(args.path, "utf8");
      console.log("📖 Lecture :", args.path);
      return content;
    }

    if (name === "write_file") {
      appendFileSync(args.path, "\n" + args.content);
      console.log("✍️ Écriture :", args.path);
      return "✅ Texte écrit avec succès.";
    }

    return "⛔ Outil inconnu.";
  } catch (err) {
    console.error("⚠️ Erreur pendant l’exécution :", err.message);
    return `⛔ Erreur : ${err.message}`;
  }
}

async function main() {
  let messages = [
    {
      role: "user",
      content: "Lis le fichier notes.txt et écris les réponses aux questions à la suite du fichier (une ligne par réponse)."
    }
  ];

  let steps = 0;
  const MAX_STEPS = 5; // ✅ limite de boucles

  while (steps < MAX_STEPS) {
    steps++;

    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      messages,
      tools
    });

    const message = response.choices[0].message;

    // 1. Si le modèle arrête avec du texte normal
    if (!message.tool_calls) {
      console.log("💬 Réponse finale :", message.content);
      break;
    }

    // ✅ Garder le message assistant (contenant tool_calls) dans l’historique
    messages.push(message);

    // 2. Sinon : exécution des tool_calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const call of message.tool_calls) {
        try {
          const args = JSON.parse(call.function.arguments);
          const result = executeTool(call.function.name, args);

          if (call.id) {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: result
            });
          }
        } catch (err) {
          console.error("⚠️ Erreur de parsing des arguments :", err.message);
          if (call.id) {
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: `⛔ Erreur de parsing : ${err.message}`
            });
          }
        }
      }
    }
  }

  if (steps >= MAX_STEPS) {
    console.log("⛔ Arrêt forcé : trop d’itérations (possible boucle infinie).");
  }
}

main();
