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
        'grid': {
            repr(c): "{} {}".format(v[0].name, v[1].name) for c, v in state.grid.items()
        },
        'players': {
            player.name: {tile.name: count for tile, count in player.hand.items()} for player in state.players
        }

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

@app.route('/api/evaluation')
def evaluation():
    return jsonify(hive.evaluate(state, state.player()))

@app.route('/api/random', methods=("POST",))
def random_move():
    the_moves = list(hive.available_moves(state))
    move = random.choice(the_moves)
    print("{}: {}".format(state.player(), move))
    state.do(move)
    return send_state()

@app.route('/api/ai', methods=("POST",))
def ai_move():
    depth = 3
    inf = 2 ** 64
    move, _, n = hive.minmax(state, state.player(), depth, -inf, inf)
    print("{}: {}".format(state.player(), move))
    state.do(move)
    return send_state()
