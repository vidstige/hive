import random
from collections import defaultdict

random.seed(1)

# Hex topology stuff
offsets = [
    (0, -1, 1), (1, -1, 0), (1, 0, -1),
    (0, 1, -1), (-1, 1, 0), (-1, 0, 1)]

def neighbours(c):
    """Returns cube hex neighbours"""
    x, y, z = c
    for ox, oy,oz in offsets:
        yield x + ox, y + oy, z + oz

def add(c1, c2):
    x1, y1, z1 = c1
    x2, y2, z2 = c2
    return x1 + x2, y1 + y2, z1 + z2

# Hive stuff
def find_contour(state, exclude=None):
    """Returns all contour coordinates of the hive"""
    contour = set()
    # All neighbours
    for coordinate in state.grid:
        if coordinate not in exclude:
            for neighbour in neighbours(coordinate):
                contour.add(neighbour)
    # ...except non-free
    contour.difference_update(set(state.grid.keys()))
    return contour

def trace_coutour(state, coordinate, steps=1):
    """Returns the two coordinates n steps away from coordinate along
    the hive contour."""
    contour = find_contour(state, exclude=(coordinate,))
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
    def __deepcopy__(self, memo):
        return self  # don't copy

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
    def moves(self, coordinate, state):
        return find_contour(state, exclude=(coordinate,))

class Grasshopper(Tile):
    name = 'grasshopper'
    def moves(self, coordinate, state):
        for direction in offsets:
            p = add(coordinate, direction)
            # Grasshopper must jump over at least one piece
            if p in state.grid:
                while p in state.grid:
                    p = add(p, direction)
                yield p

queen = Queen()
spider = Spider()
beetle = Beetle()
ant = Ant()
grasshopper = Grasshopper()

class Player(object):
    def __init__(self, name):
        self.hand = {
            queen: 1,
            spider: 2,
            beetle: 2,
            ant: 3,
            grasshopper: 3,
        }

        self.name = name

    def __repr__(self):
        return "Player('{name}')".format(name=self.name)

class State(object):
    """Game state"""
    def __init__(self):
        self.grid = {}
        self.move_number = 0
        self.players = (Player('white'), Player('black'))

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
    queen_coordinate = find(state, player, queen)
    if queen_coordinate:
        if all(n in state.grid for n in neighbours(queen_coordinate)):
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
    placements = placeable(state)
    # If queen is still on hand...
    if state.player().hand[queen] > 0:
        # ...it must be placed on round 4
        if state.round() + 1 == 4:
            return [('place', queen, c) for c in placements]
        # ...otherwise only placements...
        return list(enumerate_hand(state.player(), placements))
    # ...but normally placements and movements
    return list(enumerate_hand(state.player(), placements)) + list(movements(state))


# AI stuff
from copy import deepcopy

def evaluate(state, player):
    white, black = state.players
    other = white if player == black else black
    player_free = len([n for n in neighbours(find(state, player, queen)) if n not in state.grid])
    other_free = len([n for n in neighbours(find(state, other, queen)) if n not in state.grid])
    return player_free - other_free

def minmax(state: State, player: Player, d: int, alpha: int, beta: int):
    if d <= 0:
        return None, evaluate(state, player), 1

    the_winner = winner(state)
    if the_winner:
        return None, 1 if the_winner == player else -1, 1

    maximizing = state.player() == player 
    f = max if maximizing else min
    evaluations = {}
    nn = 0
    moves = available_moves(state)
    for move in moves:
        new_state = deepcopy(state)
        new_state.do(move)
        _, e, n = minmax(new_state, player, d - 1, alpha, beta)
        if maximizing:
            alpha = f(alpha, e)
        else:
            beta = f(beta, e)
        evaluations[move] = e
        nn += n
        if beta <= alpha:
            break

    best = f(evaluations, key=evaluations.get)
    return best, evaluations[best], nn

def main():
    state = State()
    while winner(state) is None:
        for player in state.players:
            print("Player {}".format(player.name))
            #the_moves = list(available_moves(state))
            #move = random.choice(the_moves)
            depth = 3
            inf = 2 ** 64
            move, _, n = minmax(state, player, depth, -inf, inf)
            print("  ", move, "after", n)
            state.do(move)

if __name__ == "__main__":
    main()
