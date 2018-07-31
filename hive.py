import random
from collections import defaultdict

random.seed(1)

def neighbours(c):
    """Returns cube hex neighbours"""
    x, y, z = c
    offsets = [
        (0, -1, 1), (1, -1, 0), (1, 0, -1),
        (0, 1, -1), (-1, 1, 0), (-1, 0, 1)]
    for ox, oy,oz in offsets:
        yield x + ox, y + oy, z + oz

class Tile(object):
    name = None
    def moves(self, coordinate, state):
        return iter(())
    def __repr__(self):
        return "{}()".format(self.__class__.__name__)

class Queen(Tile):
    name = 'queen'
    def moves(self, coordinate, state):
        for neighbour in neighbours(coordinate):
            if neighbour not in state.grid:
                yield neighbour
    
class Spider(Tile):
    name = 'spider'

class Beetle(Tile):
    name = 'beetle'

class Ant(Tile):
    name = 'ant'
    def moves(self, coordinate, state):
        targets = set()
        # All neighbours
        for coordinate in state.grid:
            for neighbour in neighbours(coordinate):
                targets.add(neighbour)
        # ...except non-free
        targets.difference_update(set(state.grid.keys()))
        return targets

class Grasshopper(Tile):
    name = 'grasshopper'

queen = Queen()
spider = Spider()
beetle = Beetle()
ant = Ant()
grasshopper = Grasshopper()

class Player(object):
    hand = {
        queen: 1,
        spider: 2,
        beetle: 2,
        ant: 3,
        grasshopper: 3,
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
        action, arg1, arg2 = move
        if action == 'place':
            tile, coordinate = arg1, arg2
            self.grid[coordinate] = player, tile
            player.hand[tile] -= 1
        elif action == 'move':
            value = self.grid.pop(arg1)
            self.grid[arg2] = value
        else:
            print("UNKNOWN MOVE")

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

def one_hive(coordinates):
    unvisited = set(coordinates)
    todo = [unvisited.pop()]
    while todo:
        node = todo.pop()
        for neighbour in neighbours(node):
            if neighbour in unvisited:
                unvisited.remove(neighbour)
                todo.append(neighbour)
    return not unvisited

def movements(state):
    for coordinate, value in state.grid.items():
        player, tile = value
        if player == state.player():
            coordinates = set(state.grid.keys())
            coordinates.remove(coordinate)
            if one_hive(coordinates):
                for target in tile.moves(coordinate, state):
                    yield ('move', coordinate, target)

def enumerate_hand(player, coordinates):
    """Fora given iterable of coordinates, enumerate all avilable tiles"""
    for tile, count in player.hand.items():
        if count > 0:
            for c in coordinates:
                yield ('place', tile, c)

def available_moves(state):
    if not state.grid:
        # If nothing is placed, one must place something anywhere
        anywhere = (0, 0, 0)
        return enumerate_hand(state.player(), [anywhere])
    if len(state.grid) == 1:
        # If single tile is placed, opponent places at neighbour
        start_tile = next(iter(state.grid))
        return enumerate_hand(state.player(), neighbours(start_tile))
    placements = enumerate_hand(state.player(), placeable(state))
    tmp = list(movements(state))
    print(tmp)
    return list(placements) + tmp


def main():
    state = State()
    while not game_over(state):
        for player in state.players:
            print("Player {}".format(player.name))
            move = random.choice(list(available_moves(state)))
            print("  ", move)
            state.do(move)

main()
