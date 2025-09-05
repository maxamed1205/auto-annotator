/**
 * Auto Annotator v1.2 - Module UI
 * Gestion des interactions utilisateur et animations
 * Version corrigée pour gérer les cues multi-segments
 */

class UIManager {
  constructor() {
    this.feedbackTimeout = null;
  }

  /**
   * Afficher un message de feedback
   */
  showFeedback(message, type = 'success', duration = 3000) {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = `alert alert-${type}`;
    feedback.style.display = 'block';
    feedback.classList.add('animate-slide-in');

    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);

    this.feedbackTimeout = setTimeout(() => {
      feedback.style.display = 'none';
      feedback.classList.remove('animate-slide-in');
    }, duration);
  }

  /**
   * Animer l'apparition d'un élément
   */
  animateElement(element, animation = 'animate-fade-in') {
    if (!element) return;
    element.classList.add(animation);
    setTimeout(() => element.classList.remove(animation), 1000);
  }

  /**
   * Mettre à jour le compteur de documents
   */
  updateDocCounter(current, total) {
    const counter = document.getElementById('doc-counter');
    if (counter) counter.textContent = total > 0 ? `${current + 1} / ${total}` : '-';
  }

  /**
   * Mettre à jour les statistiques
   */
  updateStats(stats) {
    const container = document.getElementById('stats-container');
    if (!container) return;

    container.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${stats.total_documents || 0}</div>
        <div class="stat-label">Documents</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.total_cues || 0}</div>
        <div class="stat-label">Marqueurs</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.total_scopes || 0}</div>
        <div class="stat-label">Portées</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.validated_count || 0}</div>
        <div class="stat-label">Validées</div>
      </div>
    `;

    this.animateElement(container, 'animate-fade-in');
  }

  /**
   * Mettre à jour la liste des fichiers disponibles
   */
  updateFileList(files, currentFile = null) {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;

    // Vider la liste
    fileList.innerHTML = '';

    if (files.length === 0) {
      fileList.innerHTML = '<option value="">Aucun fichier trouvé</option>';
      return;
    }

    // Ajouter les options
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file.filename;
      option.textContent = `${file.filename} (${file.line_count} docs)`;
      
      if (file.is_current || file.filename === currentFile) {
        option.selected = true;
      }
      
      fileList.appendChild(option);
    });

    // Mettre à jour les informations du fichier actuel
    this.updateCurrentFileInfo(files, currentFile);
  }

  /**
   * Mettre à jour les informations du fichier actuel
   */
  updateCurrentFileInfo(files, currentFile = null) {
    const infoDiv = document.getElementById('current-file-info');
    if (!infoDiv) return;

    const current = files.find(f => f.is_current || f.filename === currentFile);
    if (!current) {
      infoDiv.innerHTML = '';
      return;
    }

    const sizeKB = (current.size / 1024).toFixed(1);
    infoDiv.innerHTML = `
      <strong>Fichier actuel:</strong> ${current.filename}<br>
      <strong>Documents:</strong> ${current.line_count}<br>
      <strong>Taille:</strong> ${sizeKB} KB
    `;
  }

  /**
   * Fusionner les positions contiguës pour éviter chevauchement
   */
  mergeContiguousPositions(positions) {
    if (!positions || positions.length === 0) return [];
    positions.sort((a, b) => a[0] - b[0]);
    const merged = [positions[0].slice()];
    for (let i = 1; i < positions.length; i++) {
      const last = merged[merged.length - 1];
      if (positions[i][0] <= last[1]) {
        last[1] = Math.max(last[1], positions[i][1]);
      } else {
        merged.push(positions[i].slice());
      }
    }
    return merged;
  }

  /**
   * Rendu de la liste des documents
   */
  renderDocumentList(documents, currentIndex = 0) {
    const list = document.getElementById('doc-list');
    if (!list) return;

    list.innerHTML = '';
    
    if (!documents || !Array.isArray(documents)) {
      console.warn('renderDocumentList: documents is not an array', documents);
      return;
    }
    
    documents.forEach((doc, index) => {
      const item = document.createElement('li');
      item.className = `doc-item stagger-child ${index === currentIndex ? 'active' : ''}`;
      
      // Vérifier que doc et doc.text existent
      const docId = doc?.id || 'N/A';
      const docText = doc?.text || 'Texte non disponible';
      const preview = docText.length > 100 ? docText.substring(0, 100) + '...' : docText;
      
      item.innerHTML = `
        <div class="doc-id">#${docId}</div>
        <div class="doc-preview">${this.escapeHtml(preview)}</div>
      `;
      item.addEventListener('click', () => window.app?.showDocument(index));
      list.appendChild(item);
    });
  }

  /**
   * Mettre en évidence le texte avec marqueurs et portées
   */
  highlightText(text, cues = [], scopes = []) {
    // Vérifier que le texte existe
    if (!text || typeof text !== 'string') {
      console.warn('highlightText: texte invalide', text);
      return text || '';
    }

    // Créer une liste de toutes les positions avec leurs métadonnées
    const positions = [];

    // Ajouter les marqueurs
    if (Array.isArray(cues)) {
      cues.forEach((cue, cueIndex) => {
        if (cue && cue.positions && Array.isArray(cue.positions) && cue.positions.length > 0) {
          cue.positions.forEach((pos, posIndex) => {
            if (Array.isArray(pos) && pos.length >= 2) {
              positions.push({ 
                start: pos[0], 
                end: pos[1], 
                type: 'cue', 
                data: cue, 
                index: cueIndex,
                posIndex: posIndex,
                id: `cue-${cueIndex}-${posIndex}`
              });
            }
          });
        }
      });
    }

    // Ajouter les portées
    if (Array.isArray(scopes)) {
      scopes.forEach((scope, index) => {
        if (scope && scope.positions && Array.isArray(scope.positions)) {
          // 🔄 NOUVEAU: Gérer les positions multiples [[start1, end1], [start2, end2], ...]
          scope.positions.forEach((position, posIndex) => {
            if (Array.isArray(position) && position.length === 2) {
              positions.push({ 
                start: position[0], 
                end: position[1], 
                type: 'scope', 
                data: scope, 
                index: index,
                posIndex: posIndex,
                id: `scope-${index}-${posIndex}`
              });
            }
          });
        }
      });
    }

    // Trier par position de début, puis par longueur (plus long en premier pour éviter les imbrications)
    positions.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    let result = '';
    let lastPos = 0;
    const activeSpans = [];

    // Traiter chaque caractère
    for (let i = 0; i <= text.length; i++) {
      // Fermer les spans qui se terminent à cette position
      while (activeSpans.length > 0 && activeSpans[activeSpans.length - 1].end === i) {
        result += '</span>';
        activeSpans.pop();
      }

      // Ouvrir les nouveaux spans qui commencent à cette position
      const newSpans = positions.filter(pos => pos.start === i);
      newSpans.forEach(span => {
        const tooltip = this.createTooltip(span);
        result += `<span class="${span.type} marker-appear" data-start="${span.start}" data-end="${span.end}" data-index="${span.index}" data-id="${span.id}">${tooltip}`;
        activeSpans.push(span);
      });

      // Ajouter le caractère actuel (si ce n'est pas la fin)
      if (i < text.length) {
        result += this.escapeHtml(text[i]);
      }
    }

    // Fermer tous les spans restants
    while (activeSpans.length > 0) {
      result += '</span>';
      activeSpans.pop();
    }

    return result;
  }

  /**
   * Créer un tooltip pour un marqueur
   */
  createTooltip(span) {
    if (span.type === 'cue') {
      return `<div class="marker-tooltip">
        <div>${span.data.id}</div>
        <div>[${span.start}-${span.end}] ${span.data.group}</div>
      </div>`;
    }
    return `<div class="marker-tooltip">
      <div>Portée</div>
      <div>[${span.start}-${span.end}]</div>
    </div>`;
  }

  /**
   * Échapper le HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Rendu de la liste des marqueurs
   */
  renderCuesList(cues = []) {
    const list = document.getElementById('cues-list');
    if (!list) return;
    list.innerHTML = '';
    
    cues.forEach((cue, index) => {
      // const mergedPositions = this.mergeContiguousPositions(cue.positions || []);
      // const positionInfo = mergedPositions.map(pos => `${pos[0]}-${pos[1]}`).join(', ') || '[?]';
      const positions = cue.positions || [];
      const positionInfo = positions.map(pos => `${pos[0]}-${pos[1]}`).join(', ') || '[?]';

      const item = document.createElement('li');
      item.className = 'annotation-item';
      item.innerHTML = `
        <div class="annotation-content">
          <div class="annotation-label">${cue.cue_label}</div>
          <div class="annotation-meta">${cue.id} • [${positionInfo}] • ${cue.group}</div>
        </div>
        <div class="annotation-actions">
          <button class="btn btn-sm btn-ghost" onclick="window.app?.deleteCue(${index})">🗑️</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  /**
   * Rendu de la liste des portées
   */
  renderScopesList(scopes = [], text = '') {
    const list = document.getElementById('scopes-list');
    if (!list) return;
    list.innerHTML = '';

    scopes.forEach((scope, index) => {
      const item = document.createElement('li');
      item.className = 'annotation-item';
      
      let content = '';
      let isCalculated = scope.calculated || false;
      
      if (scope.positions && Array.isArray(scope.positions) && scope.positions.length > 0) {
        // 🔄 NOUVEAU: Gérer les positions multiples
        const isValidPositions = scope.positions.every(pos => Array.isArray(pos) && pos.length === 2);
        
        if (isValidPositions) {
          // Construire le texte à partir de toutes les positions
          const textParts = scope.positions.map(pos => text.slice(pos[0], pos[1]));
          const scopeText = textParts.join(', ');
          const calculatedIcon = isCalculated ? ' 🔧' : '';
          const calculatedClass = isCalculated ? ' calculated-scope' : '';
          
          // Calculer les informations de position
          const positionInfos = scope.positions.map(pos => `[${pos[0]}-${pos[1]}]`).join(', ');
          const totalChars = scope.positions.reduce((sum, pos) => sum + (pos[1] - pos[0]), 0);
          
          content = `
            <div class="annotation-content${calculatedClass}">
              <div class="annotation-label">${this.escapeHtml(scopeText.substring(0, 50))}${scopeText.length > 50 ? '...' : ''}${calculatedIcon}</div>
              <div class="annotation-meta">${positionInfos} • ${totalChars} chars total • ID: ${scope.id || 'N/A'}</div>
              ${scope.scope ? `<div class="annotation-scope-original">Portée originale: "${this.escapeHtml(scope.scope)}"</div>` : ''}
            </div>
            <div class="annotation-actions">
              ${isCalculated ? `<button class="btn btn-sm btn-warning" onclick="window.app?.recalculateScope(${index})" title="Recalculer">🔄</button>` : ''}
              <button class="btn btn-sm btn-ghost" onclick="window.app?.deleteScope(${index})" title="Supprimer">🗑️</button>
            </div>
          `;
        } else {
          // Positions malformées
          content = `
            <div class="annotation-content error-scope">
              <div class="annotation-label">⚠️ "${this.escapeHtml(scope.scope || 'Portée inconnue')}"</div>
              <div class="annotation-meta">Positions malformées • ID: ${scope.id || 'N/A'}</div>
            </div>
            <div class="annotation-actions">
              <button class="btn btn-sm btn-warning" onclick="window.app?.recalculateScope(${index})" title="Recalculer">🔄</button>
              <button class="btn btn-sm btn-ghost" onclick="window.app?.deleteScope(${index})" title="Supprimer">🗑️</button>
            </div>
          `;
        }
      } else {
        // Portée sans positions calculées
        content = `
          <div class="annotation-content error-scope">
            <div class="annotation-label">❌ "${this.escapeHtml(scope.scope || 'Portée inconnue')}"</div>
            <div class="annotation-meta">Positions non calculées • ID: ${scope.id || 'N/A'}</div>
          </div>
          <div class="annotation-actions">
            <button class="btn btn-sm btn-warning" onclick="window.app?.recalculateScope(${index})" title="Recalculer">🔄</button>
            <button class="btn btn-sm btn-ghost" onclick="window.app?.deleteScope(${index})" title="Supprimer">🗑️</button>
          </div>
        `;
      }
      
      item.innerHTML = content;
      list.appendChild(item);
    });
  }

  /**
   * Animation de succès pour un bouton
   */
  animateSuccess(button) {
    if (!button) return;
    button.classList.add('success-ping');
    setTimeout(() => button.classList.remove('success-ping'), 600);
  }

  /**
   * Animation d'erreur pour un élément
   */
  animateError(element) {
    if (!element) return;
    element.classList.add('error-shake');
    setTimeout(() => element.classList.remove('error-shake'), 500);
  }
}

// Instance globale
window.ui = new UIManager();
