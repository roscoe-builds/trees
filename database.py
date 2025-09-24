import sqlite3

conn = sqlite3.connect('trees.db')
c = conn.cursor()

c.execute('''
    CREATE TABLE IF NOT EXISTS trees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT
    )
''')

c.execute('''
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        tree_id INTEGER
    )
''')

conn.commit()
conn.close()

print("✅ Database and tables created.")