"""
Auto Annotator v1.1 - Backend Flask modulaire
Interface moderne pour annotation de négations et portées
"""
from flask import Flask, jsonify, request, render_template, send_from_directory
import os
import glob

# Import des modules métier
from api.annotations import AnnotationManager
from api.storage import StorageManager

# Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DEFAULT_DATA_FILE = os.path.join(DATA_DIR, 'annotations_scope_added.jsonl')
VALIDATED_DIR = os.path.join(BASE_DIR, 'data', 'validated')

# Initialisation Flask
app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='templates')

# Initialisation des managers
current_data_file = DEFAULT_DATA_FILE
annotation_manager = AnnotationManager(current_data_file)
storage_manager = StorageManager(VALIDATED_DIR)


@app.route('/')
def index():
    """Page principale de l'interface"""
    return render_template('index.html')


@app.route('/api/files')
def api_files():
    """API: Lister tous les fichiers JSONL disponibles"""
    try:
        # Chercher tous les fichiers .jsonl dans le dossier data
        pattern = os.path.join(DATA_DIR, '*.jsonl')
        jsonl_files = glob.glob(pattern)
        
        files_info = []
        for file_path in jsonl_files:
            filename = os.path.basename(file_path)
            # Obtenir la taille du fichier et le nombre de lignes
            try:
                line_count = 0
                with open(file_path, 'r', encoding='utf-8') as f:
                    for _ in f:
                        line_count += 1
                
                file_size = os.path.getsize(file_path)
                
                files_info.append({
                    'filename': filename,
                    'path': file_path,
                    'size': file_size,
                    'line_count': line_count,
                    'is_current': file_path == annotation_manager.data_file
                })
            except Exception as e:
                print(f"Erreur lors de la lecture de {file_path}: {e}")
                continue
        
        # Trier par nom de fichier
        files_info.sort(key=lambda x: x['filename'])
        
        return jsonify(files_info)
    except Exception as e:
        print(f"Erreur lors de la liste des fichiers: {e}")
        return jsonify([])


@app.route('/api/switch-file', methods=['POST'])
def api_switch_file():
    """API: Changer le fichier de données actuel"""
    global annotation_manager
    
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({'status': 'error', 'message': 'Nom de fichier requis'}), 400
    
    filename = data['filename']
    new_file_path = os.path.join(DATA_DIR, filename)
    
    # Vérifier que le fichier existe
    if not os.path.exists(new_file_path):
        return jsonify({'status': 'error', 'message': 'Fichier non trouvé'}), 404
    
    # Créer un nouveau manager avec le nouveau fichier
    annotation_manager = AnnotationManager(new_file_path)
    
    # Charger les annotations du nouveau fichier
    annotations = annotation_manager.load_annotations()
    
    return jsonify({
        'status': 'success',
        'message': f'Fichier changé vers {filename}',
        'current_file': filename,
        'annotation_count': len(annotations)
    })


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
