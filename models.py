from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Note(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  content = db.Column(db.Text)
  user_id = db.Column(db.String(100))

class Tree(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.String(100))
  data = db.Column(db.Text)
  name = db.Column(db.String(100))
