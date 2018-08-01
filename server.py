from flask import Flask, jsonify, render_template
import hive

app = Flask(__name__)

# debug hax
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route('/')
def hello_world():
    return render_template('index.html')

def state2dict(state):
    return {
        'grid': {repr(c): repr(v[0]) for c, v in state.grid.items()}
    }

@app.route('/api/state')
def state():
    state = hive.State()
    return jsonify(state2dict(state))
