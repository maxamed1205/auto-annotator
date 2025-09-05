/**
 * Auto Annotator v1.1 - Module Annotations
 * Logique métier pour la gestion des annotations
 */

class AnnotationManager {
  constructor() {
    this.annotations = [];
    this.currentIndex = 0;
    this.editedAnnotations = new Map();
  }

  /**
   * Charger les annotations depuis l'API
   */
  async loadAnnotations() {
    try {
      const response = await fetch('/api/annotations');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      this.annotations = await response.json();
      
      // Assurer la compatibilité des portées
      this.annotations.forEach(annotation => {
        if (!annotation.scopes) {
          annotation.scopes = [];
        }
      });
      
      window.ui?.showFeedback('Annotations chargées', 'success');
      return this.annotations;
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      window.ui?.showFeedback('Erreur de chargement', 'error');
      return [];
    }
  }

  /**
   * Charger les statistiques
   */
  async loadStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      return {};
    }
  }

  /**
   * Obtenir l'annotation actuelle (éditée ou originale)
   */
  getCurrentAnnotation() {
    if (this.currentIndex < 0 || this.currentIndex >= this.annotations.length) {
      return null;
    }

    const original = this.annotations[this.currentIndex];
    const edited = this.editedAnnotations.get(this.currentIndex);
    
    return edited ? { ...edited } : { ...original };
  }

  /**
   * Marquer une annotation comme éditée
   */
  markAsEdited(annotation) {
    this.editedAnnotations.set(this.currentIndex, { ...annotation });
  }

  /**
   * Naviguer vers un document
   */
  navigateToDocument(index) {
    if (index < 0 || index >= this.annotations.length) {
      return false;
    }
    
    this.currentIndex = index;
    return true;
  }

  /**
   * Document suivant
   */
  nextDocument() {
    return this.navigateToDocument(this.currentIndex + 1);
  }

  /**
   * Document précédent
   */
  previousDocument() {
    return this.navigateToDocument(this.currentIndex - 1);
  }

  /**
   * Ajouter une portée
   */
  addScope(start, end) {
    const annotation = this.getCurrentAnnotation();
    if (!annotation) return false;

    // Validation
    if (isNaN(start) || isNaN(end) || start < 0 || end <= start || end > annotation.text.length) {
      window.ui?.showFeedback('Indices de portée invalides', 'error');
      return false;
    }

    // Vérifier les chevauchements
    const newScope = { start, end };
    const existingScopes = annotation.scopes || [];
    
    for (const scope of existingScopes) {
      if (this.scopesOverlap(newScope, scope)) {
        window.ui?.showFeedback('Chevauchement avec une portée existante', 'warning');
        return false;
      }
    }

    // Ajouter la portée
    annotation.scopes = annotation.scopes || [];
    annotation.scopes.push(newScope);
    annotation.scopes.sort((a, b) => a.start - b.start);
    
    this.markAsEdited(annotation);
    window.ui?.showFeedback('Portée ajoutée', 'success');
    
    return true;
  }

  /**
   * Supprimer une portée
   */
  deleteScope(index) {
    const annotation = this.getCurrentAnnotation();
    if (!annotation || !annotation.scopes || index < 0 || index >= annotation.scopes.length) {
      return false;
    }

    annotation.scopes.splice(index, 1);
    this.markAsEdited(annotation);
    window.ui?.showFeedback('Portée supprimée', 'success');
    
    return true;
  }

  /**
   * Supprimer un marqueur
   */
  deleteCue(index) {
    const annotation = this.getCurrentAnnotation();
    if (!annotation || !annotation.cues || index < 0 || index >= annotation.cues.length) {
      return false;
    }

    annotation.cues.splice(index, 1);
    this.markAsEdited(annotation);
    window.ui?.showFeedback('Marqueur supprimé', 'success');
    
    return true;
  }

  /**
   * Réinitialiser les modifications
   */
  resetEdits() {
    this.editedAnnotations.delete(this.currentIndex);
    window.ui?.showFeedback('Modifications annulées', 'success');
    return true;
  }

  /**
   * Sauvegarder l'annotation actuelle
   */
  async saveCurrentAnnotation() {
    const annotation = this.getCurrentAnnotation();
    if (!annotation) {
      window.ui?.showFeedback('Aucune annotation à sauvegarder', 'warning');
      return false;
    }

    return await this.saveAnnotations([annotation]);
  }

  /**
   * Sauvegarder toutes les annotations éditées
   */
  async saveAllEdited() {
    const editedList = Array.from(this.editedAnnotations.values());
    
    if (editedList.length === 0) {
      window.ui?.showFeedback('Aucune modification à sauvegarder', 'warning');
      return false;
    }

    return await this.saveAnnotations(editedList);
  }

  /**
   * Sauvegarder des annotations via l'API
   */
  async saveAnnotations(annotations) {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotations)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        window.ui?.showFeedback(
          `${result.saved_count} annotation(s) sauvegardée(s). Total validé: ${result.total_validated}`,
          'success'
        );
        
        // Nettoyer les éditions sauvegardées si c'était toutes les éditions
        if (annotations.length === this.editedAnnotations.size) {
          this.editedAnnotations.clear();
        }
        
        return true;
      } else {
        throw new Error(result.message || 'Erreur de sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      window.ui?.showFeedback(`Erreur: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Vérifier si deux portées se chevauchent
   */
  scopesOverlap(scope1, scope2) {
    return !(scope1.end <= scope2.start || scope2.end <= scope1.start);
  }

  /**
   * Obtenir les statistiques courantes
   */
  getCurrentStats() {
    const annotation = this.getCurrentAnnotation();
    if (!annotation) return {};

    return {
      cues_count: annotation.cues?.length || 0,
      scopes_count: annotation.scopes?.length || 0,
      text_length: annotation.text?.length || 0,
      has_edits: this.editedAnnotations.has(this.currentIndex)
    };
  }
}

// Instance globale
window.annotations = new AnnotationManager();
