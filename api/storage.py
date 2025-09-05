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
        self.last_backup_time = None  # 🔄 NOUVEAU: Tracker le dernier backup
        self.backup_interval_minutes = 5  # 🔄 NOUVEAU: Intervalle minimum entre backups
        
    def ensure_directories(self):
        """Créer les répertoires nécessaires"""
        os.makedirs(self.validated_dir, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def should_create_backup(self) -> bool:
        """Déterminer s'il faut créer un backup"""
        if not os.path.exists(self.validated_file):
            return False  # Pas de fichier existant = pas besoin de backup
            
        now = datetime.now()
        
        # Si aucun backup précédent, créer un
        if self.last_backup_time is None:
            return True
            
        # Vérifier l'intervalle de temps
        time_diff = (now - self.last_backup_time).total_seconds() / 60  # en minutes
        return time_diff >= self.backup_interval_minutes
    
    def create_backup(self) -> Optional[str]:
        """Créer une sauvegarde avant modification (seulement si nécessaire)"""
        if not self.should_create_backup():
            print("DEBUG: Backup ignoré (trop récent ou inutile)")
            return None
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(self.backup_dir, f'annotations_validated_{timestamp}.jsonl')
        
        try:
            shutil.copy2(self.validated_file, backup_file)
            self.last_backup_time = datetime.now()  # 🔄 NOUVEAU: Mettre à jour le timestamp
            print(f"DEBUG: Backup créé: {backup_file}")
            return backup_file
        except Exception as e:
            print(f"Erreur backup: {e}")
            return None
    
    def force_backup(self) -> Optional[str]:
        """Forcer la création d'un backup (ignorer l'intervalle de temps)"""
        if not os.path.exists(self.validated_file):
            return None
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(self.backup_dir, f'annotations_validated_{timestamp}_manual.jsonl')
        
        try:
            shutil.copy2(self.validated_file, backup_file)
            self.last_backup_time = datetime.now()
            print(f"DEBUG: Backup manuel créé: {backup_file}")
            return backup_file
        except Exception as e:
            print(f"Erreur backup manuel: {e}")
            return None

    def save_annotation(self, annotation: Dict[str, Any]) -> bool:
        """Sauvegarder une annotation unique"""
        return self.save_annotations([annotation])
    
    def save_annotations(self, annotations: List[Dict[str, Any]]) -> bool:
        """Sauvegarder plusieurs annotations"""
        self.ensure_directories()
        
        try:
            # 🔄 NOUVEAU: Créer backup seulement si nécessaire
            backup_file = self.create_backup()
            if backup_file:
                print(f"DEBUG: Backup créé avant sauvegarde: {backup_file}")
            else:
                print("DEBUG: Aucun backup créé (pas nécessaire)")
            
            with open(self.validated_file, 'a', encoding='utf-8') as f:
                for annotation in annotations:
                    # 🔄 NOUVEAU: Réorganiser les champs dans l'ordre souhaité
                    ordered_annotation = self._reorder_annotation_fields(annotation)
                    f.write(json.dumps(ordered_annotation, ensure_ascii=False) + '\n')
            
            print(f"DEBUG: {len(annotations)} annotation(s) sauvegardée(s)")
            return True
        except Exception as e:
            print(f"Erreur sauvegarde: {e}")
            return False
    
    def _reorder_annotation_fields(self, annotation: Dict[str, Any]) -> Dict[str, Any]:
        """Réorganiser les champs dans l'ordre souhaité : id, text, cues, scopes, validated_at"""
        ordered = {}
        
        # Ordre souhaité
        field_order = ['id', 'text', 'cues', 'scopes']
        
        # Ajouter les champs dans l'ordre spécifié
        for field in field_order:
            if field in annotation:
                ordered[field] = annotation[field]
        
        # Ajouter timestamp de validation
        ordered['validated_at'] = datetime.now().isoformat()
        
        # Ajouter tout autre champ restant (au cas où)
        for key, value in annotation.items():
            if key not in ordered:
                ordered[key] = value
        
        return ordered
    
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
