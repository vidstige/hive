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

def find_contour(state):
    """Returns all contour coordinates of the hive"""
    contour = set()
    # All neighbours
    for coordinate in state.grid:
        for neighbour in neighbours(coordinate):
            contour.add(neighbour)
    # ...except non-free
    contour.difference_update(set(state.grid.keys()))
    return contour

def trace_coutour(state, coordinate, steps=1):
    """Returns the two coordinates n steps away from coordinate along
    the hive contour."""
    contour = find_contour(state)
    visited = set()
    todo = [(coordinate, 0)]
    while todo:
        c, n = todo.pop()
        for neighbour in neighbours(c):
            if neighbour in contour and neighbour not in visited:
                todo.append((neighbour, n + 1))
                visited.add(neighbour)
                if n == steps:
                    yield c

class Tile(object):
    name = None
    def moves(self, coordinate, state):
        return iter(())
    def __repr__(self):
        return "{}()".format(self.__class__.__name__)

class Queen(Tile):
    name = 'queen'
    def moves(self, coordinate, state):
        return trace_coutour(state, coordinate, steps=1)

class Spider(Tile):
    name = 'spider'
    def moves(self, coordinate, state):
        return trace_coutour(state, coordinate, steps=3)

class Beetle(Tile):
    name = 'beetle'

class Ant(Tile):
    name = 'ant'

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

def find(state, player, needle):
    for c, v in state.grid.items():
        player, tile = v
        if tile == needle:
            return c

def looser(state, player, other_player):
    q = find(state, player, queen)
    if q:
        if all(n in state.grid for n in neighbours(q)):
            return other_player
    else:
        if state.round() >= 4:
            return other_player
    return None

def winner(state):
    white, black = state.players
    white_loose = looser(state, white, black)
    black_loose = looser(state, white, black)
    #if white_loose and black_loose:
    #    return None  # tie
    if white_loose:
        return black
    if black_loose:
        return white
    return None  # game has not ended

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
    while winner(state) is None:
        for player in state.players:
            print("Player {}".format(player.name))
            the_moves = list(available_moves(state))
            if not the_moves:
                print("No available moves")
                return
            move = random.choice(the_moves)
            print("  ", move)
            state.do(move)

main()
