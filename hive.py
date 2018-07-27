import random
from collections import defaultdict

random.seed(1337)

def neighbours(c):
    """Returns cube hex neighbours"""
    x, y, z = c
    offsets = [
        (0, -1, 1), (1, -1, 0), (1, 0, -1),
        (0, 1, -1), (-1, 1, 0), (-1, 0, 1)]
    for ox, oy,oz in offsets:
        yield x + ox, y + oy, z + oz

class Player(object):
    hand = {
        'queen': 1,
        'spiders': 2,
        'beetles': 2,
        'ants': 3,
        'grasshoppers': 3,
    }
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return "Player('{name}')".format(name=self.name)

class State(object):
    """Game state"""
    # cube hex grid x+y+z=0
    grid = {}
    tile = 0  # round
    players = (Player('white'), Player('black'))

    def round(self):
        return self.tile // 2

    def player(self):
        return self.players[self.tile % len(self.players)]

    def do(self, move):
        player = self.player()
        action, tile, coordinate = move
        if action == 'place':
            self.grid[coordinate] = player, tile
            player.hand[tile] -= 1
        if action == 'move':
            pass

        self.tile += 1

def game_over(state):
    return state.round() > 3

def placeable(grid):
    """Returns all coordinates where the given player can
    _place_ a tile."""
    players = defaultdict(set)
    for coordinate, value in grid.items():
        player, _ = value
        for n in neighbours(coordinate):
            players[player].add(n)
    print(players)

def available_moves(state):
    # If nothing is placed, one must place something
    if not state.grid:
        return [('place', 'queen', (0, 0, 0))]
    for p in placeable(state.grid):
        print(p)
    return []

def main():
    state = State()
    while not game_over(state):
        for player in state.players:
            print("Player {}".format(player.name))
            move = random.choice(available_moves(state))
            state.do(move)

main()
