"""
Module de gestion des annotations
Logique métier pour charger, traiter et valider les annotations
"""
import json
import os
from typing import List, Dict, Any


class AnnotationManager:
    def __init__(self, data_file: str):
        self.data_file = data_file
        
    def load_annotations(self) -> List[Dict[str, Any]]:
        """Charge les annotations depuis le fichier JSONL"""
        items = []
        if not os.path.exists(self.data_file):
            return items
            
        with open(self.data_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    annotation = json.loads(line)
                    # Assurer la compatibilité avec les scopes
                    if 'scopes' not in annotation:
                        annotation['scopes'] = []
                    items.append(annotation)
                except json.JSONDecodeError as e:
                    print(f"Erreur ligne {line_num}: {e}")
                    continue
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
