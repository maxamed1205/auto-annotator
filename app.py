"""
Auto Annotator v1.1 - Backend Flask modulaire
Interface moderne pour annotation de négations et portées
"""
from flask import Flask, jsonify, request, render_template, send_from_directory
import os

# Import des modules métier
from api.annotations import AnnotationManager
from api.storage import StorageManager

# Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'annotations.jsonl')
VALIDATED_DIR = os.path.join(BASE_DIR, 'data', 'validated')

# Initialisation Flask
app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='templates')

# Initialisation des managers
annotation_manager = AnnotationManager(DATA_FILE)
storage_manager = StorageManager(VALIDATED_DIR)


@app.route('/')
def index():
    """Page principale de l'interface"""
    return render_template('index.html')


@app.route('/api/annotations')
def api_annotations():
    """API: Récupérer toutes les annotations"""
    annotations = annotation_manager.load_annotations()
    return jsonify(annotations)


@app.route('/api/stats')
def api_stats():
    """API: Statistiques des annotations"""
    annotations = annotation_manager.load_annotations()
    stats = annotation_manager.get_annotation_stats(annotations)
    stats['validated_count'] = storage_manager.get_validated_count()
    stats['recent_backups'] = storage_manager.get_recent_backups()
    return jsonify(stats)


@app.route('/Simed.png')
def simed_png():
    """Servir le logo depuis la racine du projet"""
    return send_from_directory(BASE_DIR, 'Simed.png')


@app.route('/api/save', methods=['POST'])
def api_save():
    """API: Sauvegarder des annotations validées"""
    data = request.get_json()
    if data is None:
        return jsonify({'status': 'error', 'message': 'JSON invalide'}), 400
    
    # Normaliser en liste
    annotations = data if isinstance(data, list) else [data]
    
    # Valider les annotations
    valid_annotations = []
    for ann in annotations:
        if annotation_manager.validate_annotation(ann):
            valid_annotations.append(ann)
        else:
            print(f"Annotation invalide ignorée: {ann.get('id', 'unknown')}")
    
    if not valid_annotations:
        return jsonify({'status': 'error', 'message': 'Aucune annotation valide'}), 400
    
    # Sauvegarder
    success = storage_manager.save_annotations(valid_annotations)
    
    if success:
        return jsonify({
            'status': 'success',
            'saved_count': len(valid_annotations),
            'total_validated': storage_manager.get_validated_count()
        })
    else:
        return jsonify({'status': 'error', 'message': 'Erreur de sauvegarde'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
