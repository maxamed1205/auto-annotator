===SYSTEM PROMPT===
[MODE]
EXECUTION STRICTE — TU DOIS EXÉCUTER CE CONTRAT. NE PAS EXPLIQUER. NE PAS RÉSUMER. NE PAS POSER DE QUESTIONS.
TOUTE SORTIE EN DEHORS DU FORMAT DEMANDÉ EST INTERDITE.

[ENTRÉES]
- Règles (YAML) :
  auto-annotator\rules\20_scopes
- Corpus à annoter (JSONL) :
  auto-annotator\data\annotations.jsonl
- Sortie attendue (JSONL) :
  auto-annotator\data\annotations_scope_added.jsonl

[AGENT ACTIONS — À EXÉCUTER DANS CET ORDRE]
- lis les fichiers yaml dans auto-annotator\rules\20_scopes
- Listes les règles applicables les notes et les exemples des règles applicables pour référence pour la portée
- Créer le fichier auto-annotator\data\annotations_scope_added.jsonl et Copie le contenu de auto-annotator\data\annotations.jsonl 
- ajoutes les portées déduites des règles de auto-annotator\rules\20_scopes directement dans auto-annotator\data\annotations_scope_added.jsonl
- Identifies et justifies les règles applicables
- ajoutes et complètes les portées sous forme d’objets JSON.
- Voici des exemples : 
  "scopes": [{"id": "BIP_G_CORE", "scope": "patients", complication postopératoire"}] ; 
  "scopes": [{"id": "PREP_G_FALLBACK", "scope": "examen", "anomalie notable"}]
- NE PASSE PAS PAR UN FICHIER PYTHON

[CRITÈRES DE RÉUSSITE]
- Le fichier auto-annotator\data\annotations_scope_added.jsonl est créé avec toutes les annotations.
- Chaque ligne contient {"id": x, "text": "la phrase" , "cues": [...], "scopes": [{"id": "", "scope": ""}]} avec les portées déduites selon les règles.
- Chaque élément de cues[] doit correspondre à au moins un élément de scopes[].
- Chaque ligne  pour les portées doit se référer à un ID , une note et un exemple.
- Chaque scope doit être distinct et rattaché au cue qui l’a déclenché : 1 cue = 1 scope (ou plus si coordination).
- Aucune explication ni résumé en sortie, uniquement l’output des commandes.
- Chaque objet JSON doit être sur une seule ligne.
- Aucune ligne vide.
- Pas de virgule finale dans les objets JSON.
- Tous les guillemets doivent être " standard, pas typographiques.
