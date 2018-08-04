import random
from flask import Flask, jsonify, render_template, request
import hive

app = Flask(__name__)

# debug hax
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

state = None

@app.route('/')
def hello_world():
    return render_template('index.html')

def state2dict(state):
    return {
        'grid': {repr(c): v[0].name for c, v in state.grid.items()}
    }


def send_state():
    if not state:
        return jsonify(None)
    return jsonify(state2dict(state))

@app.route('/api/state')
def get_state():
    return send_state()

@app.route('/api/new', methods=("POST",))
def new_game():
    seed = request.get_json()['seed']
    random.seed(seed)

    global state
    state = hive.State()
    print(state.grid)
    return send_state()

@app.route('/api/random', methods=("POST",))
def random_move():
    the_moves = list(hive.available_moves(state))
    move = random.choice(the_moves)
    print("{}: {}".format(state.player(), move))
    state.do(move)
    return send_state()
