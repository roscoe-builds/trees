from flask import Flask, render_template, request, jsonify, json
from models import db, Note, Tree
import os


app = Flask(__name__)

# asdflasdf
# database config
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'trees.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
  db.create_all()

@app.route("/save_note", methods=["POST"])
def save_note():
  data = request.json
  content = data.get("content")
  user_id = data.get("userId")

  if not user_id:
    return jsonify({"error": "Missing userId"}), 400
  
  # create and save new note
  note = Note.query.filter_by(user_id=user_id).first()

  if note:
    note.content = content
  else:
    note = Note(content=content, user_id=user_id)
    db.session.add(note)

  db.session.commit()

  return jsonify({'message': 'Note saved successfully'})


@app.route('/get_notes', methods=['GET'])
def get_notes():
  user_id = request.args.get("userId")

  if not user_id:
    return jsonify([])
  
  note = Note.query.filter_by(user_id=user_id).first()

  if note:
    return jsonify([{"id": note.id, "content": note.content}])
  
  return jsonify([])

@app.route("/")
def tree():
  return render_template("tree.html")


@app.route("/save_tree", methods=["POST"])
def save_tree():
  data = request.get_json()
  print("Received save_tree request data: ", data)
  tree_data = data.get("treeData")
  user_id = data.get("userId")

  if not user_id or not tree_data:
    return jsonify({"error": "Missing userId or tree data"}), 400
  
  tree = Tree.query.filter_by(user_id=user_id).first()

  tree_data_json = json.dumps(tree_data)

  if tree:
    tree.data = tree_data_json

  else:
    tree = Tree(user_id=user_id, data=tree_data_json)
    db.session.add(tree)

  db.session.commit()

  return jsonify({"message": "Tree saved successfully"}), 200

@app.route("/get_tree", methods=["GET"])
def get_tree():
  user_id = request.args.get("userId")

  if not user_id:
    return jsonify({"error": "Missing userId"}), 400
  
  tree = Tree.query.filter_by(user_id=user_id).first()

  if tree:
    return jsonify({ "id": tree.id, "data": json.loads(tree.data)})
  
  return jsonify({})

@app.route("/about")
def about():
  return render_template("about.html")

if __name__ == '__main__':
    app.run(debug=True)