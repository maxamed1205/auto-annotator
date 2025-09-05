"""
Module de stockage et persistance des données
Gestion des sauvegardes, historique et validation
"""
import json
import os
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional


class StorageManager:
    def __init__(self, validated_dir: str):
        self.validated_dir = validated_dir
        self.validated_file = os.path.join(validated_dir, 'annotations_validated.jsonl')
        self.backup_dir = os.path.join(validated_dir, 'backups')
        
    def ensure_directories(self):
        """Créer les répertoires nécessaires"""
        os.makedirs(self.validated_dir, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def create_backup(self) -> Optional[str]:
        """Créer une sauvegarde avant modification"""
        if not os.path.exists(self.validated_file):
            return None
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(self.backup_dir, f'annotations_validated_{timestamp}.jsonl')
        
        try:
            shutil.copy2(self.validated_file, backup_file)
            return backup_file
        except Exception as e:
            print(f"Erreur backup: {e}")
            return None
    
    def save_annotation(self, annotation: Dict[str, Any]) -> bool:
        """Sauvegarder une annotation unique"""
        return self.save_annotations([annotation])
    
    def save_annotations(self, annotations: List[Dict[str, Any]]) -> bool:
        """Sauvegarder plusieurs annotations"""
        self.ensure_directories()
        
        try:
            # Créer backup avant modification
            self.create_backup()
            
            with open(self.validated_file, 'a', encoding='utf-8') as f:
                for annotation in annotations:
                    # Ajouter timestamp de validation
                    annotation['validated_at'] = datetime.now().isoformat()
                    f.write(json.dumps(annotation, ensure_ascii=False) + '\n')
            
            return True
        except Exception as e:
            print(f"Erreur sauvegarde: {e}")
            return False
    
    def get_validated_count(self) -> int:
        """Compter les annotations validées"""
        if not os.path.exists(self.validated_file):
            return 0
            
        try:
            with open(self.validated_file, 'r', encoding='utf-8') as f:
                return sum(1 for line in f if line.strip())
        except Exception:
            return 0
    
    def get_recent_backups(self, limit: int = 5) -> List[str]:
        """Liste des sauvegardes récentes"""
        if not os.path.exists(self.backup_dir):
            return []
            
        try:
            backups = [f for f in os.listdir(self.backup_dir) if f.endswith('.jsonl')]
            backups.sort(reverse=True)  # Plus récent en premier
            return backups[:limit]
        except Exception:
            return []
