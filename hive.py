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
    move_number = 0
    players = (Player('white'), Player('black'))

    def round(self):
        return self.move_number // 2

    def player(self):
        return self.players[self.move_number % len(self.players)]

    def do(self, move):
        player = self.player()
        action, tile, coordinate = move
        if action == 'place':
            self.grid[coordinate] = player, tile
            player.hand[tile] -= 1
        if action == 'move':
            pass

        self.move_number += 1

def game_over(state):
    return state.round() > 3

def placeable(state):
    """Returns all coordinates where the given player can
    _place_ a tile."""
    players = defaultdict(set)
    for coordinate, value in state.grid.items():
        player, _ = value
        for n in neighbours(coordinate):
            players[player].add(n)
    # All neighbours to any tile placed by current player...
    coordinates = players[state.player()]
    # ...except where the opponent is neighbour...
    for p in players:
        if p != state.player():
            coordinates.difference_update(players[p])
    # ...and you cannot place on top of another tile.
    coordinates.difference_update(state.grid.keys())

    return coordinates

def movements():
    return []

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
    placements = enumerate_hand(state.player(), placeable(state))
    return list(placements) + movements()


def main():
    state = State()
    while not game_over(state):
        for player in state.players:
            print("Player {}".format(player.name))
            move = random.choice(list(available_moves(state)))
            print("  ", move)
            state.do(move)

main()
