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
      // Charger la liste des fichiers disponibles
      const files = await window.annotations.loadAvailableFiles();
      window.ui.updateFileList(files);
      
      // Charger les données du fichier actuel
      const annotations = await window.annotations.loadAnnotations();
      
      // Vérifier que les annotations sont bien chargées
      if (annotations && annotations.length > 0) {
        // Mettre à jour la liste des documents dans la sidebar
        window.ui.renderDocumentList(annotations, 0);
        
        // Afficher le premier document
        this.showDocument(0);
      } else {
        console.warn('Aucune annotation chargée');
        window.ui.showFeedback('Aucune annotation trouvée', 'warning');
      }
      
      // Mettre à jour les statistiques
      const stats = await window.annotations.loadStats();
      window.ui.updateStats(stats);
      
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
   * Changer vers un autre fichier de données
   */
  async switchToFile(filename) {
    try {
      console.log('switchToFile appelée avec:', filename); // Debug
      window.ui.showFeedback('Changement de fichier...', 'info');
      
      const success = await window.annotations.switchToFile(filename);
      console.log('switchToFile result:', success); // Debug
      
      if (success) {
        // Recharger les statistiques
        const stats = await window.annotations.loadStats();
        window.ui.updateStats(stats);
        
        // Mettre à jour la liste des documents dans la sidebar
        window.ui.renderDocumentList(window.annotations.annotations, 0);
        
        // Afficher le premier document du nouveau fichier
        this.showDocument(0);
        
        // Mettre à jour la liste des fichiers
        const files = await window.annotations.loadAvailableFiles();
        window.ui.updateFileList(files, filename);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du changement de fichier:', error);
      window.ui.showFeedback('Erreur lors du changement de fichier', 'error');
      return false;
    }
  }

  /**
   * Afficher un document par son index
   */
  showDocument(index) {
    console.log('showDocument appelé avec index:', index);
    console.log('Annotations disponibles:', window.annotations.annotations.length);
    
    if (!window.annotations.navigateToDocument(index)) {
      console.warn('Impossible de naviguer vers le document', index);
      return false;
    }

    const annotation = window.annotations.getCurrentAnnotation();
    console.log('Annotation récupérée:', annotation);
    
    if (!annotation) {
      console.warn('Aucune annotation trouvée pour l\'index', index);
      return false;
    }

    // Mettre à jour l'interface
    this.updateDocumentDisplay(annotation);
    this.updateNavigationState();
    
    return true;
  }

  /**
   * Mettre à jour l'affichage du document
   */
  updateDocumentDisplay(annotation) {
    // Vérifier que l'annotation est valide
    if (!annotation) {
      console.warn('updateDocumentDisplay: annotation invalide', annotation);
      return;
    }

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
      const text = annotation.text || '';
      const cues = annotation.cues || [];
      const scopes = annotation.scopes || [];
      
      console.log('DEBUG updateDocumentDisplay:');
      console.log('- annotation:', annotation);
      console.log('- text existe:', !!annotation.text);
      console.log('- text length:', annotation.text ? annotation.text.length : 0);
      console.log('- text content:', annotation.text ? annotation.text.substring(0, 100) : 'UNDEFINED');
      console.log('- cues count:', cues.length);
      console.log('- scopes count:', scopes.length);
      
      if (text) {
        console.log('Affichage du texte avec highlightText');
        textViewer.innerHTML = window.ui.highlightText(text, cues, scopes);
      } else {
        console.log('PROBLÈME: Texte vide, affichage du message d\'erreur');
        textViewer.innerHTML = '<p class="text-muted">Aucun texte disponible</p>';
      }
      window.ui.animateElement(textViewer, 'animate-fade-in');
    }

    // Mettre à jour les listes d'annotations
    window.ui.renderCuesList(annotation.cues || []);
    window.ui.renderScopesList(annotation.scopes || [], annotation.text || '');

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
   * Recalculer les positions d'une portée
   */
  recalculateScope(index) {
    const annotation = window.annotations.getCurrentAnnotation();
    if (!annotation || !annotation.scopes || index >= annotation.scopes.length) {
      window.ui.showFeedback('Portée non trouvée', 'error');
      return false;
    }

    const scope = annotation.scopes[index];
    if (!scope.scope) {
      window.ui.showFeedback('Impossible de recalculer: texte de portée manquant', 'error');
      return false;
    }

    // Supprimer les positions existantes pour forcer le recalcul
    delete scope.positions;
    delete scope.calculated;

    // Recalculer les positions
    const recalculatedScopes = window.annotations.calculateScopePositions(annotation.text, [scope]);
    if (recalculatedScopes.length > 0 && recalculatedScopes[0].positions) {
      annotation.scopes[index] = recalculatedScopes[0];
      window.annotations.markAsEdited(annotation);
      this.refreshCurrentDocument();
      window.ui.showFeedback('Portée recalculée avec succès', 'success');
      return true;
    } else {
      window.ui.showFeedback('Impossible de recalculer la portée', 'error');
      return false;
    }
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
      // Mettre à jour la liste des documents dans la sidebar
      window.ui.renderDocumentList(
        window.annotations.annotations, 
        window.annotations.currentIndex
      );
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
    // Sélection de fichier - Version avec délai pour être sûr que le DOM est prêt
    setTimeout(() => {
      const loadFileBtn = document.getElementById('load-file');
      const fileList = document.getElementById('file-list');
      console.log('LoadFileBtn trouvé:', loadFileBtn); // Debug
      console.log('FileList trouvé:', fileList); // Debug
      
      if (loadFileBtn) {
        // Supprimer les anciens événements s'il y en a
        loadFileBtn.replaceWith(loadFileBtn.cloneNode(true));
        const newLoadFileBtn = document.getElementById('load-file');
        
        newLoadFileBtn.addEventListener('click', async (event) => {
          event.preventDefault();
          console.log('Bouton charger cliqué!'); // Debug
          
          const currentFileList = document.getElementById('file-list');
          console.log('FileList au clic:', currentFileList, 'Value:', currentFileList?.value); // Debug
          
          if (currentFileList && currentFileList.value) {
            console.log('Tentative de changement vers:', currentFileList.value); // Debug
            await this.switchToFile(currentFileList.value);
          } else {
            console.log('Aucun fichier sélectionné'); // Debug
          }
        });
        
        console.log('Événement attaché au bouton'); // Debug
      } else {
        console.log('Bouton load-file non trouvé!'); // Debug
      }
    }, 100); // Délai de 100ms pour être sûr que le DOM est prêt

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
