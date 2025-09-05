/**
 * Auto Annotator v1.1 - Application principale
 * Orchestration des modules et gestion des événements
 */

class AutoAnnotatorApp {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialiser l'application
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Charger les données
      await window.annotations.loadAnnotations();
      
      // Mettre à jour les statistiques
      const stats = await window.annotations.loadStats();
      window.ui.updateStats(stats);
      
      // Afficher le premier document
      this.showDocument(0);
      
      // Attacher les événements
      this.attachEventListeners();
      
      this.isInitialized = true;
      
      window.ui.showFeedback('Application initialisée', 'success');
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
      window.ui.showFeedback('Erreur d\'initialisation', 'error');
    }
  }

  /**
   * Afficher un document par son index
   */
  showDocument(index) {
    if (!window.annotations.navigateToDocument(index)) {
      return false;
    }

    const annotation = window.annotations.getCurrentAnnotation();
    if (!annotation) return false;

    // Mettre à jour l'interface
    this.updateDocumentDisplay(annotation);
    this.updateNavigationState();
    
    return true;
  }

  /**
   * Mettre à jour l'affichage du document
   */
  updateDocumentDisplay(annotation) {
    // Mettre à jour le compteur
    window.ui.updateDocCounter(
      window.annotations.currentIndex,
      window.annotations.annotations.length
    );

    // Mettre à jour la liste des documents
    window.ui.renderDocumentList(
      window.annotations.annotations,
      window.annotations.currentIndex
    );

    // Afficher le texte avec mise en évidence
    const textViewer = document.getElementById('text-viewer');
    if (textViewer) {
      textViewer.innerHTML = window.ui.highlightText(
        annotation.text,
        annotation.cues || [],
        annotation.scopes || []
      );
      window.ui.animateElement(textViewer, 'animate-fade-in');
    }

    // Mettre à jour les listes d'annotations
    window.ui.renderCuesList(annotation.cues || []);
    window.ui.renderScopesList(annotation.scopes || [], annotation.text);

    // Nettoyer les champs de saisie
    this.clearScopeInputs();
  }

  /**
   * Mettre à jour l'état des boutons de navigation
   */
  updateNavigationState() {
    const prevBtn = document.getElementById('prev-doc');
    const nextBtn = document.getElementById('next-doc');
    
    if (prevBtn) {
      prevBtn.disabled = window.annotations.currentIndex === 0;
    }
    
    if (nextBtn) {
      nextBtn.disabled = window.annotations.currentIndex >= window.annotations.annotations.length - 1;
    }
  }

  /**
   * Nettoyer les champs de saisie de portée
   */
  clearScopeInputs() {
    const startInput = document.getElementById('scope-start');
    const endInput = document.getElementById('scope-end');
    
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
  }

  /**
   * Ajouter une portée
   */
  addScope() {
    const startInput = document.getElementById('scope-start');
    const endInput = document.getElementById('scope-end');
    
    if (!startInput || !endInput) return false;

    const start = parseInt(startInput.value, 10);
    const end = parseInt(endInput.value, 10);

    if (window.annotations.addScope(start, end)) {
      this.refreshCurrentDocument();
      this.clearScopeInputs();
      return true;
    }
    
    return false;
  }

  /**
   * Supprimer une portée
   */
  deleteScope(index) {
    if (window.annotations.deleteScope(index)) {
      this.refreshCurrentDocument();
      return true;
    }
    return false;
  }

  /**
   * Supprimer un marqueur
   */
  deleteCue(index) {
    if (window.annotations.deleteCue(index)) {
      this.refreshCurrentDocument();
      return true;
    }
    return false;
  }

  /**
   * Rafraîchir l'affichage du document actuel
   */
  refreshCurrentDocument() {
    const annotation = window.annotations.getCurrentAnnotation();
    if (annotation) {
      this.updateDocumentDisplay(annotation);
    }
  }

  /**
   * Sauvegarder l'annotation actuelle
   */
  async saveCurrentAnnotation() {
    const success = await window.annotations.saveCurrentAnnotation();
    if (success) {
      // Rafraîchir les statistiques
      const stats = await window.annotations.loadStats();
      window.ui.updateStats(stats);
    }
    return success;
  }

  /**
   * Sauvegarder toutes les annotations éditées
   */
  async saveAllEdited() {
    const success = await window.annotations.saveAllEdited();
    if (success) {
      // Rafraîchir les statistiques
      const stats = await window.annotations.loadStats();
      window.ui.updateStats(stats);
    }
    return success;
  }

  /**
   * Réinitialiser les modifications
   */
  resetEdits() {
    if (window.annotations.resetEdits()) {
      this.refreshCurrentDocument();
      return true;
    }
    return false;
  }

  /**
   * Attacher les événements
   */
  attachEventListeners() {
    // Navigation
    const prevBtn = document.getElementById('prev-doc');
    const nextBtn = document.getElementById('next-doc');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (window.annotations.previousDocument()) {
          this.refreshCurrentDocument();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (window.annotations.nextDocument()) {
          this.refreshCurrentDocument();
        }
      });
    }

    // Ajout de portée
    const addScopeBtn = document.getElementById('add-scope');
    if (addScopeBtn) {
      addScopeBtn.addEventListener('click', () => {
        this.addScope();
      });
    }

    // Raccourcis clavier pour ajout de portée
    const startInput = document.getElementById('scope-start');
    const endInput = document.getElementById('scope-end');
    
    [startInput, endInput].forEach(input => {
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.addScope();
          }
        });
      }
    });

    // Sauvegarde
    const saveCurrentBtn = document.getElementById('save-current');
    const saveBatchBtn = document.getElementById('save-batch');
    
    if (saveCurrentBtn) {
      saveCurrentBtn.addEventListener('click', async () => {
        const btn = saveCurrentBtn;
        btn.disabled = true;
        
        const success = await this.saveCurrentAnnotation();
        if (success) {
          window.ui.animateSuccess(btn);
        }
        
        btn.disabled = false;
      });
    }
    
    if (saveBatchBtn) {
      saveBatchBtn.addEventListener('click', async () => {
        const btn = saveBatchBtn;
        btn.disabled = true;
        
        const success = await this.saveAllEdited();
        if (success) {
          window.ui.animateSuccess(btn);
        }
        
        btn.disabled = false;
      });
    }

    // Reset
    const resetBtn = document.getElementById('reset-current');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetEdits();
      });
    }

    // Raccourcis clavier globaux
    document.addEventListener('keydown', (e) => {
      // Navigation avec Ctrl + flèches
      if (e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentAnnotation();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (window.annotations.previousDocument()) {
              this.refreshCurrentDocument();
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (window.annotations.nextDocument()) {
              this.refreshCurrentDocument();
            }
            break;
        }
      }
      // Navigation avec flèches simples (seulement si aucun input n'est focus)
      else if (!this.isInputFocused()) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            if (window.annotations.previousDocument()) {
              this.refreshCurrentDocument();
              this.scrollToActiveDocument();
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (window.annotations.nextDocument()) {
              this.refreshCurrentDocument();
              this.scrollToActiveDocument();
            }
            break;
        }
      }
    });
  }

  /**
   * Vérifier si un input/textarea a le focus
   */
  isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );
  }

  /**
   * Faire défiler la sidebar pour montrer le document actif
   */
  scrollToActiveDocument() {
    const activeItem = document.querySelector('.doc-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }
}

// Initialisation de l'application
window.app = new AutoAnnotatorApp();

// Démarrer l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
