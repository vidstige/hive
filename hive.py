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
        'spider': 2,
        'beetle': 2,
        'ant': 3,
        'grasshopper': 3,
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

def enumerate_hand(player, coordinates):
    """Fora given iterable of coordinates, enumerate all avilable tiles"""
    for tile, count in player.hand.items():
        if count > 0:
            for c in coordinates:
                yield ('place', tile, c)

def available_moves(state):
    if not state.grid:
        # If nothing is placed, one must place something
        return enumerate_hand(state.player(), [(0, 0, 0)])
    if len(state.grid) == 1:
        # If single tile is placed, opponent places at neighbour
        start_tile = next(iter(state.grid))
        return enumerate_hand(state.player(), neighbours(start_tile))
    for p in placeable(state.grid):
        print(p)
    return []

def main():
    state = State()
    while not game_over(state):
        for player in state.players:
            print("Player {}".format(player.name))
            move = random.choice(list(available_moves(state)))
            print(list(available_moves(state)))
            state.do(move)

main()
