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
    
    documents.forEach((doc, index) => {
      const item = document.createElement('li');
      item.className = `doc-item stagger-child ${index === currentIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div class="doc-id">#${doc.id}</div>
        <div class="doc-preview">${doc.text.substring(0, 100)}...</div>
      `;
      item.addEventListener('click', () => window.app?.showDocument(index));
      list.appendChild(item);
    });
  }

  /**
   * Mettre en évidence le texte avec marqueurs et portées
   */
  highlightText(text, cues = [], scopes = []) {
    // Créer une liste de toutes les positions avec leurs métadonnées
    const positions = [];

    // Ajouter les marqueurs
    cues.forEach((cue, cueIndex) => {
      if (cue.positions && cue.positions.length > 0) {
        cue.positions.forEach((pos, posIndex) => {
          positions.push({ 
            start: pos[0], 
            end: pos[1], 
            type: 'cue', 
            data: cue, 
            index: cueIndex,
            posIndex: posIndex,
            id: `cue-${cueIndex}-${posIndex}`
          });
        });
      }
    });

    // Ajouter les portées
    scopes.forEach((scope, index) => {
      positions.push({ 
        start: scope.start, 
        end: scope.end, 
        type: 'scope', 
        data: scope, 
        index: index,
        id: `scope-${index}`
      });
    });

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
      const scopeText = text.slice(scope.start, scope.end);
      item.innerHTML = `
        <div class="annotation-content">
          <div class="annotation-label">${scopeText.substring(0, 50)}${scopeText.length > 50 ? '...' : ''}</div>
          <div class="annotation-meta">[${scope.start}-${scope.end}] • ${scope.end - scope.start} chars</div>
        </div>
        <div class="annotation-actions">
          <button class="btn btn-sm btn-ghost" onclick="window.app?.deleteScope(${index})">🗑️</button>
        </div>
      `;
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
