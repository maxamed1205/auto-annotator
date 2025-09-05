"""
Module de gestion des annotations
Logique métier pour charger, traiter et valider les annotations
"""
import json
import os
import unicodedata
from typing import List, Dict, Any, Optional, Tuple


class AnnotationManager:
    def __init__(self, data_file: str):
        self.data_file = data_file
        
    def load_annotations(self) -> List[Dict[str, Any]]:
        """Charge les annotations depuis le fichier JSONL"""
        print(f"DEBUG: Chargement des annotations depuis: {self.data_file}")
        print(f"DEBUG: Fichier existe: {os.path.exists(self.data_file)}")
        
        items = []
        if not os.path.exists(self.data_file):
            print(f"DEBUG: Fichier non trouvé: {self.data_file}")
            return items
            
        with open(self.data_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    annotation = json.loads(line)

                    # Assurer la présence du champ scopes
                    if 'scopes' not in annotation:
                        annotation['scopes'] = []
                    
                    # Si scopes est vide MAIS qu'il y a un champ scope (ancien format), migrer
                    if not annotation['scopes'] and 'scope' in annotation and annotation['scope']:
                        # On suppose scope = string, on crée un dictionnaire
                        annotation['scopes'].append({'scope': annotation['scope'], 'positions': None})

                    text = annotation.get('text', '')
                    # Calculer les positions pour chaque scope si elles n'existent pas
                    print(f"DEBUG load_annotations: Traitement annotation ID {annotation.get('id', 'N/A')}")
                    print(f"DEBUG load_annotations: Nombre de scopes = {len(annotation['scopes'])}")
                    
                    for i, scope in enumerate(annotation['scopes']):
                        scope_text = scope.get('scope', '')
                        existing_positions = scope.get('positions')
                        print(f"DEBUG load_annotations: Scope {i+1}: '{scope_text}'")
                        print(f"DEBUG load_annotations: Positions existantes: {existing_positions}")
                        
                        if not scope.get('positions') or not isinstance(scope['positions'], list) or len(scope['positions']) == 0:
                            print(f"DEBUG load_annotations: Calcul nécessaire pour scope '{scope_text}'")
                            pos_list = self._find_scope_position(text, scope_text)
                            if pos_list:
                                scope['positions'] = pos_list
                                print(f"DEBUG load_annotations: ✅ Positions multiples calculées et assignées: {scope['positions']}")
                            else:
                                print(f"DEBUG load_annotations: ❌ Impossible de calculer les positions")
                        else:
                            print(f"DEBUG load_annotations: Positions déjà présentes, pas de calcul")
                    
                    print("DEBUG load_annotations: " + "="*50)

                    items.append(annotation)
                except json.JSONDecodeError as e:
                    print(f"Erreur ligne {line_num}: {e}")
                    continue

        
        print(f"DEBUG: Nombre total d'annotations chargées: {len(items)}")
        return items
    
    def validate_annotation(self, annotation: Dict[str, Any]) -> bool:
        """Valide la structure d'une annotation"""
        required_fields = ['id', 'text', 'cues']
        return all(field in annotation for field in required_fields)
    
    def get_annotation_stats(self, annotations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Statistiques sur les annotations"""
        total_cues = sum(len(ann.get('cues', [])) for ann in annotations)
        total_scopes = sum(len(ann.get('scopes', [])) for ann in annotations)
        
        return {
            'total_documents': len(annotations),
            'total_cues': total_cues,
            'total_scopes': total_scopes,
            'avg_cues_per_doc': total_cues / len(annotations) if annotations else 0,
            'avg_scopes_per_doc': total_scopes / len(annotations) if annotations else 0
        }

    def _normalize(self, s: str) -> str:
        """Normalise une chaîne pour comparaison (NFKC, minuscules, suppression d'espaces multiples)."""
        if s is None:
            return ''
        s = unicodedata.normalize('NFKC', s)
        s = s.strip().lower()
        s = ' '.join(s.split())
        return s

    def _find_scope_position(self, text: str, scope_label: str) -> Optional[List[List[int]]]:
        """Tente de trouver les positions de tous les candidats d'une scope_label dans le texte.

        - Si scope_label contient des virgules, on sépare et trouve chaque candidat.
        - Utilise une normalisation Unicode pour améliorer la robustesse.
        - Retourne une liste de positions [[start1, end1], [start2, end2], ...] ou None.
        """
        print(f"DEBUG _find_scope_position: Recherche de '{scope_label}' dans le texte")
        print(f"DEBUG _find_scope_position: Texte = '{text[:100]}...' (longueur: {len(text)})")
        
        if not text or not scope_label:
            print("DEBUG _find_scope_position: Texte ou scope_label vide, retour None")
            return None

        norm_text = self._normalize(text)
        print(f"DEBUG _find_scope_position: Texte normalisé = '{norm_text[:100]}...'")

        # Si la scope contient des virgules, essayer chaque élément
        candidates = [c.strip() for c in scope_label.split(',') if c.strip()]
        if not candidates:
            candidates = [scope_label]
        
        print(f"DEBUG _find_scope_position: Candidats = {candidates}")
        
        # 🔍 NOUVEAU: Collecter TOUTES les positions trouvées
        all_positions = []

        for i, cand in enumerate(candidates):
            print(f"DEBUG _find_scope_position: Traitement candidat {i+1}/{len(candidates)}: '{cand}'")
            norm_cand = self._normalize(cand)
            print(f"DEBUG _find_scope_position: Candidat normalisé = '{norm_cand}'")
            
            if not norm_cand:
                print("DEBUG _find_scope_position: Candidat normalisé vide, suivant")
                continue

            # Recherche simple: trouver l'index de la sous-chaîne normalisée
            idx = norm_text.find(norm_cand)
            print(f"DEBUG _find_scope_position: Index trouvé dans texte normalisé = {idx}")
            
            if idx >= 0:
                print(f"DEBUG _find_scope_position: Correspondance trouvée à l'index {idx}")
                # Pour retourner des positions cohérentes avec le texte original,
                # on recherche la sous-chaîne originale candidate dans le texte
                # brut en essayant une recherche qui ignore la casse et les
                # différences de normalisation.
                try:
                    # Recherche la première occurrence qui correspond à la longueur
                    # de norm_cand en parcourant les positions possibles.
                    cand_len = len(cand)
                    print(f"DEBUG _find_scope_position: Longueur candidat original = {cand_len}")
                    
                    for start in range(0, len(text) - cand_len + 1):
                        segment = self._normalize(text[start:start + cand_len])
                        if segment == norm_cand:
                            found_pos = [start, start + cand_len]  # Liste au lieu de tuple
                            print(f"DEBUG _find_scope_position: ✅ Position trouvée pour '{cand}' = {found_pos}")
                            print(f"DEBUG _find_scope_position: Texte extrait = '{text[start:start + cand_len]}'")
                            all_positions.append(found_pos)
                            break  # Prendre seulement la première occurrence de ce candidat
                            
                    if not all_positions or all_positions[-1][0] != start:
                        print(f"DEBUG _find_scope_position: Aucune correspondance exacte pour '{cand}' dans le texte original")
                    
                except Exception as e:
                    print(f"DEBUG _find_scope_position: Exception dans recherche exacte: {e}")
                    # Fallback: utiliser l'index sur le texte original (peut échouer sur unicodes)
                    try:
                        orig_idx = text.lower().find(cand.lower())
                        if orig_idx >= 0:
                            fallback_pos = [orig_idx, orig_idx + len(cand)]  # Liste au lieu de tuple
                            print(f"DEBUG _find_scope_position: ✅ Fallback position trouvée pour '{cand}' = {fallback_pos}")
                            all_positions.append(fallback_pos)
                    except Exception as e2:
                        print(f"DEBUG _find_scope_position: Exception dans fallback: {e2}")
                        continue
            else:
                print(f"DEBUG _find_scope_position: Aucune correspondance pour '{norm_cand}'")

        print(f"DEBUG _find_scope_position: 📍 TOUTES les positions trouvées: {all_positions}")
        
        if all_positions:
            # 🎯 NOUVEAU: Retourner TOUTES les positions
            print(f"DEBUG _find_scope_position: ✅ Retour de TOUTES les positions: {all_positions}")
            return all_positions
        
        print("DEBUG _find_scope_position: ❌ Aucune position trouvée, retour None")
        return None
