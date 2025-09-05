# Auto Annotator v1.1 🚀

Interface web moderne pour l'annotation de négations et portées dans des textes médicaux.

![Version](https://img.shields.io/badge/version-1.1-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![Flask](https://img.shields.io/badge/flask-2.3+-red.svg)

## ✨ Nouveautés v1.1

- 🎨 **Interface moderne** avec animations fluides
- 🔧 **Architecture modulaire** (backend + frontend séparés)
- 📊 **Statistiques en temps réel**
- 💾 **Système de sauvegarde amélioré** avec historique
- ⌨️ **Raccourcis clavier** pour navigation rapide
- 📱 **Design responsive** pour différentes tailles d'écran
- 🎯 **Tooltips informatifs** sur les marqueurs
- ✅ **Validation robuste** des données

## 📋 Fonctionnalités

### Affichage et Navigation
- Liste des documents avec aperçu
- Navigation fluide entre documents (← →)
- Compteur de progression
- Mise en évidence des marqueurs (bleu) et portées (vert)

### Édition des Annotations
- **Marqueurs de négation** : Visualisation et suppression
- **Portées** : Ajout/suppression avec validation des chevauchements
- **Tooltips** : Informations détaillées au survol
- **Validation** : Vérification automatique des indices

### Gestion des Données
- Sauvegarde individuelle ou en lot
- Stockage sécurisé dans `data/validated/`
- Système de backup automatique
- Statistiques détaillées (documents, marqueurs, portées validées)

## 🛠️ Installation

### Prérequis
- Python 3.8+
- pip

### Configuration
```bash
# Installer les dépendances
pip install -r requirements.txt

# Démarrer l'application
python app.py
```

L'application sera accessible sur http://127.0.0.1:5000

## 📁 Structure du Projet

```
auto-annotator/
├── app.py                    # Serveur Flask principal
├── api/                      # Modules backend
│   ├── annotations.py        # Gestion des annotations
│   └── storage.py           # Persistance des données
├── static/
│   ├── css/                 # Styles modulaires
│   │   ├── main.css         # Styles de base + layout
│   │   ├── animations.css   # Animations et transitions
│   │   └── components.css   # Composants UI
│   └── js/                  # Scripts modulaires
│       ├── app.js           # Application principale
│       ├── annotations.js   # Logique métier
│       └── ui.js            # Gestion interface
├── templates/
│   └── index.html           # Template principal
├── data/
│   ├── annotations_step1.jsonl  # Données source
│   └── validated/               # Annotations validées
│       ├── annotations_validated.jsonl
│       └── backups/             # Sauvegardes automatiques
└── requirements.txt
```

## 🎯 Utilisation

### Démarrage Rapide
1. Lancez `python app.py`
2. Ouvrez http://127.0.0.1:5000
3. Naviguez entre les documents avec les boutons ou Ctrl+← →
4. Ajoutez des portées en spécifiant début/fin
5. Sauvegardez individuellement (Ctrl+S) ou en lot

### Raccourcis Clavier
- `Ctrl + S` : Sauvegarder le document actuel
- `Ctrl + ←` : Document précédent  
- `Ctrl + →` : Document suivant
- `Enter` : Ajouter une portée (dans les champs de saisie)

### Format des Données

**Annotations source** (`annotations_step1.jsonl`) :
```json
{
  "id": 1,
  "text": "Les patients n'ont pas signalé de douleur...",
  "cues": [
    {
      "id": "NE_BIPARTITE_EXTENDED",
      "cue_label": "n' pas",
      "start": 13,
      "end": 22,
      "group": "bipartite"
    }
  ]
}
```

**Annotations validées** (ajout automatique du champ `scopes`) :
```json
{
  "id": 1,
  "text": "Les patients n'ont pas signalé de douleur...",
  "cues": [...],
  "scopes": [
    {
      "start": 13,
      "end": 45
    }
  ],
  "validated_at": "2025-09-01T19:14:32.123456"
}
```

## 🎨 Personnalisation

### Couleurs et Thème
Modifiez les variables CSS dans `static/css/main.css` :
```css
:root {
  --accent: #60A5FA;        /* Couleur d'accent */
  --success: #10B981;       /* Couleur de succès */
  --bg-primary: #0A0E1A;    /* Arrière-plan principal */
  /* ... */
}
```

### Animations
Désactivez les animations dans `static/css/animations.css` ou ajoutez :
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

## 🔧 API Endpoints

- `GET /` : Interface principale
- `GET /api/annotations` : Récupérer toutes les annotations
- `GET /api/stats` : Statistiques (documents, marqueurs, validées)
- `POST /api/save` : Sauvegarder des annotations validées
- `GET /Simed.png` : Logo de l'application

## 🐛 Dépannage

### Le serveur ne démarre pas
- Vérifiez que Python 3.8+ est installé
- Installez Flask : `pip install flask`

### Erreurs de chargement des annotations
- Vérifiez que `data/annotations_step1.jsonl` existe
- Vérifiez le format JSON de chaque ligne

### Interface ne répond pas
- Ouvrez la console développeur (F12)
- Vérifiez les erreurs JavaScript
- Rechargez la page (Ctrl+F5)

## 🚀 Améliorations Futures

- [ ] Intégration LLM pour suggestion automatique de portées
- [ ] Sélection WYSIWYG de texte pour créer des portées
- [ ] Système d'annotations collaboratives
- [ ] Export vers différents formats (CSV, XML, CoNLL)
- [ ] Mode sombre/clair
- [ ] Gestion des utilisateurs et permissions

## 📝 License

Ce projet est sous license MIT. Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Ouvrir des issues pour signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

---

**Développé avec ❤️ pour l'annotation de textes médicaux**
