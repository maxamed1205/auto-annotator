/**
 * Auto Annotator v1.1 - Module Annotations
 * Logique métier pour la gestion des annotations
 */

class AnnotationManager {
  constructor() {
    this.annotations = [];
    this.currentIndex = 0;
    this.editedAnnotations = new Map();
    this.availableFiles = [];
    this.currentFile = null;
  }

  /**
   * Charger la liste des fichiers disponibles
   */
  async loadAvailableFiles() {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      this.availableFiles = await response.json();
      return this.availableFiles;
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      window.ui?.showFeedback('Erreur de chargement des fichiers', 'error');
      return [];
    }
  }

  /**
   * Changer le fichier de données actuel
   */
  async switchToFile(filename) {
    try {
      console.log('annotations.switchToFile appelée avec:', filename); // Debug
      
      const response = await fetch('/api/switch-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename })
      });

      console.log('Response status:', response.status); // Debug

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('Response result:', result); // Debug
      
      if (result.status === 'success') {
        this.currentFile = filename;
        // Réinitialiser l'état
        this.currentIndex = 0;
        this.editedAnnotations.clear();
        
        // Recharger les annotations
        await this.loadAnnotations();
        
        window.ui?.showFeedback(`Fichier changé: ${filename}`, 'success');
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur lors du changement de fichier:', error);
      window.ui?.showFeedback('Erreur lors du changement de fichier', 'error');
      return false;
    }
  }

  /**
   * Charger les annotations depuis l'API
   */
  async loadAnnotations() {
    try {
      console.log('loadAnnotations: Début du chargement depuis l\'API');
      
      const response = await fetch('/api/annotations');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const rawData = await response.json();
      console.log('loadAnnotations: Données brutes reçues:', rawData);
      console.log('loadAnnotations: Nombre d\'annotations:', rawData.length);
      
      if (rawData.length > 0) {
        console.log('loadAnnotations: Première annotation:', rawData[0]);
        console.log('loadAnnotations: Premier text existe:', !!rawData[0].text);
        console.log('loadAnnotations: Premier text content:', rawData[0].text ? rawData[0].text.substring(0, 100) : 'UNDEFINED');
      }
      
      this.annotations = rawData;
      
      // Assurer la compatibilité des portées et calculer les positions
      this.annotations.forEach((annotation, index) => {
        console.log(`loadAnnotations: Traitement annotation ${index + 1}:`, annotation.id);
        console.log(`loadAnnotations: Text existe avant traitement:`, !!annotation.text);
        
        if (!annotation.scopes) {
          annotation.scopes = [];
        } else {
          // Calculer les positions des portées si elles n'existent pas
          annotation.scopes = this.calculateScopePositions(annotation.text, annotation.scopes);
        }
        
        console.log(`loadAnnotations: Text existe après traitement:`, !!annotation.text);
      });
      
      console.log('loadAnnotations: Annotations finales:', this.annotations);
      
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
   * Calculer les positions des portées à partir du texte
   */
  calculateScopePositions(text, scopes) {
    if (!scopes || !Array.isArray(scopes)) return [];
    
    return scopes.map((scope, index) => {
      // Si les positions existent déjà et sont bien formées, les garder
      if (scope.positions && Array.isArray(scope.positions) && scope.positions.length > 0) {
        const isValidPositions = scope.positions.every(pos => Array.isArray(pos) && pos.length === 2);
        if (isValidPositions) {
          return { ...scope };
        }
      }
      
      // Sinon, calculer les positions à partir du texte de la portée
      if (scope.scope && typeof scope.scope === 'string') {
        const scopeText = scope.scope.trim();
        
        // Gérer les portées multiples séparées par des virgules
        const scopeParts = scopeText.split(',').map(part => part.trim()).filter(part => part.length > 0);
        
        // 🔄 NOUVEAU: Collecter TOUTES les positions pour chaque partie
        const allFoundPositions = [];
        
        // Pour chaque partie de la portée, trouver sa position
        for (const part of scopeParts) {
          const positions = this.findAllOccurrences(text, part);
          
          if (positions.length > 0) {
            const position = this.selectBestScopePosition(positions, scope, text);
            allFoundPositions.push(position);
          } else {
            // Si aucune correspondance exacte, essayer avec des mots-clés
            const keywords = this.extractKeywords(part);
            for (const keyword of keywords) {
              if (keyword.length >= 3) {
                const keywordPositions = this.findAllOccurrences(text, keyword);
                if (keywordPositions.length > 0) {
                  const position = this.selectBestScopePosition(keywordPositions, scope, text);
                  allFoundPositions.push(position);
                  break;
                }
              }
            }
          }
        }
        
        if (allFoundPositions.length > 0) {
          return {
            ...scope,
            positions: allFoundPositions, // 🔄 NOUVEAU: Retourner toutes les positions
            calculated: true // Marquer comme calculé automatiquement
          };
        }
      }
      
      // Si impossible de calculer, retourner la portée sans positions
      console.warn(`Impossible de calculer les positions pour la portée: ${scope.scope}`);
      return { ...scope };
    });
  }

  /**
   * Extraire les mots-clés d'une portée
   */
  extractKeywords(scopeText) {
    // Supprimer la ponctuation et diviser en mots
    return scopeText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .sort((a, b) => b.length - a.length); // Trier par longueur décroissante
  }

  /**
   * Calculer un score pour une position de portée
   */
  calculateScopeScore(position, scopeText, fullText) {
    if (!position || position.length < 2) return 0;
    
    const [start, end] = position;
    const length = end - start;
    const textLength = fullText.length;
    
    // Score basé sur:
    // - Longueur du texte (plus c'est long, mieux c'est)
    // - Position relative (préférer le début)
    // - Correspondance exacte vs partielle
    const lengthScore = length / scopeText.length; // 1.0 pour correspondance exacte
    const positionScore = 1 - (start / textLength); // Préférer le début
    
    return lengthScore * 0.7 + positionScore * 0.3;
  }

  /**
   * Trouver toutes les occurrences d'un texte dans le document
   */
  findAllOccurrences(text, searchText) {
    const positions = [];
    let startIndex = 0;
    
    while (true) {
      const index = text.indexOf(searchText, startIndex);
      if (index === -1) break;
      
      positions.push([index, index + searchText.length]);
      startIndex = index + 1; // Permettre les chevauchements
    }
    
    return positions;
  }

  /**
   * Sélectionner la meilleure position pour une portée
   */
  selectBestScopePosition(positions, scope, text) {
    if (positions.length === 1) {
      return positions[0];
    }
    
    // Si plusieurs positions, utiliser des heuristiques:
    // 1. Préférer les positions qui ne sont pas dans des marqueurs existants
    // 2. Préférer les positions plus proches du début du texte
    // Pour l'instant, on prend simplement la première
    return positions[0];
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
