// UI Framework
function getItems(node) {
  const items = node.items;
  if (typeof items === 'function') {
    return items();
  }
  return items;
}

function _walk(node, parent, callback, options) {
  if (node.items) {
    const items = getItems(node)
    for (var i = 0; i < items.length; i++) {
      _walk(items[i], node, callback, options);
    }
  } else {
    callback(node, parent, options);
  }
}

function UI(root, canvas) {
  const self = this;
  const ctx = canvas.getContext("2d");
  
  function walk(callback) {
    const boundingBox = {
      topLeft: {x: 0, y: 0},
      size: {width: canvas.width, height: canvas.height}};
    _walk(root, null, function(node, parent, options) {
        const p = parent.positionOf(node, options.boundingBox);
        callback(node, p);
      }, {boundingBox: boundingBox});
  };

  var drag = null;
  this.mousedown = function(e) {
    walk(function(node, p) {
      const m = mouse(e);
      if (node.contains(p, m) && node.enabled) {
        if (node.startDrag) {
          drag = {
            from: minus(p, m),
            item: node.startDrag()
          }
        }
      }
    });
  };

  this.mousemove = function(e) {
    if (drag) {
      self.render();
      drag.item.draw(ctx, plus(mouse(e), drag.from));
    }
  };

  this.mouseup = function(e) {
    if (drag) {
      if (drag.item.startDrag) {
        drag.item.endDrag(drag.item);
        self.render();
      }
    }
    drag = null;
  };
  
  canvas.onmousedown = this.mousedown;
  canvas.onmouseup = this.mouseup;
  canvas.onmousemove = this.mousemove;

  this.render = function() {
    // Clear with background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    walk(function(node, p) {
      if (node.visible) {
        node.draw(ctx, p);
      }
    });
  };
}

// hex grid stuff
function cube_to_oddr(cube) {
    return {
      column: cube.x + Math.floor((cube.z - (cube.z & 1)) / 2),
      row: cube.z
    };
}

function cube_to_xy(cube, size) {
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const oddr = cube_to_oddr(cube);
  return {
    x: oddr.column * w + (oddr.row & 1) * w / 2,
    y: oddr.row * (h * 3/4)
  };
}

function parse_cube(cube_str) {
  const c = cube_str.replace("(","").replace(")","").split(',');
  return {
    x: parseInt(c[0], 10), y: parseInt(c[1], 10), z: parseInt(c[2], 10)
  };
}

// Checks whether the point x,y is inside the pointy-top hexagon at hx, hy, size
function inside(hx, hy, size, x, y) {
  // translate & scale to normalized coordinate system
  x -= hx; 
  y -= hy;
  x /= size;
  y /= size;
  // Check length (squared) against inner and outer radius
  const l2 = x * x + y * y;
  if (l2 > 1.0) return false;
  if (l2 < 0.75) return true; // (sqrt(3)/2)^2 = 3/4

  // Check against borders
  const px = x * 1.15470053838; // 2/sqrt(3)
  if (px > 1.0 || px < -1.0) return false;

  const py = 0.5 * px + y;
  if (py > 1.0 || py < -1.0) return false;

  if (px - py > 1.0 || px - py < -1.0) return false;

  return true;
}

// Global :-(
var images = {};

// General UI stuff
function disable(element) {
  element.disabled = true;
}

function enable(element) {
  return function() {
    element.disabled = false;
  };
}


// drawing stuff
function drawHexagon(ctx, x, y, size) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var angle_deg = 60 * i - 30;
    var angle_rad = Math.PI / 180 * angle_deg;
    const px = x + size * Math.cos(angle_rad);
    const py = y + size * Math.sin(angle_rad);
    if (i == 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawTile(ctx, x, y, size, padding, player, tile) {
  ctx.fillStyle = player;
  drawHexagon(ctx, x, y, size - padding);
  if (tile) {
    ctx.drawImage(images[tile], x - size/2, y - size/2, size, size);
  }
}

// GridXY - Container where you specify item locations with x, y
var _id = 1;
function GridXY() {
  this._id = _id++;
  this.items = [];
  const positions = {};
  this.add = function(p, item) {
    this.items.push(item);
    positions[item._id] = p;
  };
  this.positionOf = function(item) {
    return positions[item._id];
  };
}

// Layouts items in hex grid using cube coordinates
function HexGrid(size) {
  this._id = _id++;
  this._items = {};
  const self = this;
  this.add = function(p, item) {
    if (!item) console.warn("Bad item");
    self._items[JSON.stringify(p)] = item;
  };
  this.items = function() {
    return Object.values(self._items);
  };
  this.positionOf = function(item, boundingBox) {
    for (const [coordinate_str, i] of Object.entries(self._items)) {
      if (i._id == item._id) {
        const p = cube_to_xy(JSON.parse(coordinate_str), size);
        return center(p, boundingBox.size);
      }
    }
    console.error("No such item!");
  };
  this.lookup = function(p) {
    const key = JSON.stringify(p);
    if (!key in self._items) console.warn("No such key", p);
    return self._items[key];
  };
}

function Label(text, font) {
  this._id = _id++;
  this.visible = true;
  this.draw = function(ctx, position) {
    const {x, y} = position;
    ctx.font = font;
    ctx.fillText(text, x, y);
  };
  this.contains = function(p, needle) {
    return false;
  };
}

function HexButton(size, color, tile) {
  // This stuff should be in a base class
  this._id = _id++;
  this.visible = true;

  const padding = 2;

  this.draw = function(ctx, position) {
    const {x, y} = position;
    if (this.enabled) {
      //drawTile(ctx, x, y, size, 0, "purple", tile);
      ctx.fillStyle = "purple";
      drawHexagon(ctx, x, y, size);
    }
    drawTile(ctx, x, y, size, padding, color, tile);
  };
  this.contains = function(p, needle) {
    return inside(p.x, p.y, size, needle.x, needle.y);
  };
}

function minus(a, b) {
  return {x: a.x - b.x, y: a.y - b.y};
}
function plus(a, b) {
  return {x: a.x + b.x, y: a.y + b.y};
}
function center(p, container) {
  return {x: container.width/2 + p.x, y: container.height/2 + p.y};
}

function eq(a, b) {
  return JSON.stringify(a) == JSON.stringify(b);
}

function AvailableMoves(state) {
  this.moves = [];
  this.placements = [];
  for (const move_str of state.available_moves) {
    const [action, arg1, arg2] = move_str.split("|");
    if (action == "move") {
      this.moves.push({from: parse_cube(arg1), to: parse_cube(arg2)});
    }
    if (action == "place") {
      this.placements.push({tile: arg1, at: parse_cube(arg2)});
    }
  }
  this.moveTargetsFrom = function(coordinate) {
    return this.moves
      .filter(function(move) { return eq(move.from, coordinate); })
      .map(function(move) { return move.to; });
  };
  this.placeTargetsFor = function(tile) {
    return this.placements
      .filter(function(p) { return p.tile == tile; })
      .map(function(p) { return p.at; });
  };
}

function startDragTile() {
  const source = this;
  source.visible = false;
  return source;
}

function endDragTile(item) {
  item.visible = true;
}

// The UI
function createGrid(state) {
  const moves = new AvailableMoves(state);
  const size = 40;
  const grid = new HexGrid(size);

  for (var i = 0; i < moves.moves.length; i++) {
    const button = new HexButton(size, "rgba(0, 0, 180, 0.5)", null);
    grid.add(moves.moves[i].to, button);
  }
  for (var i = 0; i < moves.placements.length; i++) {
    const button = new HexButton(size, "rgba(180, 0, 0, 0.5)", null);
    grid.add(moves.placements[i].at, button);    
  }

  for (const [coordinate_str, value] of Object.entries(state.grid)) {
    const cube = parse_cube(coordinate_str);
    const [player, tile] = value.split(" ");
    const button = new HexButton(size, player, tile);
    button.dragTargets = moves.moveTargetsFrom(cube).map(grid.lookup);
    button.enabled = button.dragTargets.length > 0;
    button.startDrag = startDragTile;
    button.endDrag = endDragTile;
    grid.add(cube, button);
  }
  return grid;
}

function createHand(state, hexGrid) {
  const size = 20;
  const x = size * 2;
  var y = size * 2;
  const grid = new GridXY();
  var map = {};
  for (const [player, hand] of Object.entries(state.players)) {
    map[player] = {};
    for (const [tile, count] of Object.entries(hand)) {
      const button = new HexButton(size, player, tile);
      map[player][tile] = button;
      grid.add({x, y: y + 0}, button);
      grid.add({x: x + size, y: y}, new Label(
        "x" + count,
        size + "px Arial"));
      y += size * 2;
    }
    y += size;
  }

  const moves = new AvailableMoves(state);
  for (const [tile, button] of Object.entries(map[state.current])) {
    button.dragTargets = moves.placeTargetsFor(tile).map(hexGrid.lookup);
    button.enabled = button.dragTargets.length > 0;
    //button.startDrag = dragTile;
  }
  return grid;
}

function parseJson(response) {
  return response.json();
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }})
    .then(parseJson);
}

function mouse(e) {
  return {
    x: e.pageX - e.target.offsetLeft,
    y: e.pageY - e.target.offsetTop};
}

function HiveUI() {
  const self = this;
  const canvas = document.getElementById('target');

  this.update = function(state) {
    const gridView = createGrid(state);
    const handView = createHand(state, gridView);
    const ui = new UI({items: [ handView, gridView ]}, canvas);
    ui.render();
  };
  
  this.newGame = function () {
    const seed = document.getElementById('seed').value;
    postJson('/api/new', {seed}).then(self.update);      
  };
  
  this.evaluate = function() {
    fetch('/api/evaluation')
      .then(parseJson)
      .then(function(e) {
        document.getElementById('evaluation').innerHTML = e
      });
  };
  
  this.randomMove = function() {
    disable(this);
    postJson('/api/random')
      .then(self.update)
      .finally(enable(this));
  };
  
  this.aiMove = function() {
    disable(this);
    postJson('/api/ai')
      .then(self.update)
      .finally(enable(this));
  };
}

function ready() {
  const ui = new HiveUI();
  document.getElementById('new').onclick = ui.newGame;
  document.getElementById('evaluate').onclick = ui.evaluate;
  document.getElementById('ai').onclick = ui.aiMove;
  document.getElementById('random').onclick = ui.randomMove;

  // load images
  const urls = {
    queen: 'static/images/honeybee.svg',
    spider: 'static/images/spider.svg',
    beetle: 'static/images/beetle.svg',
    ant: 'static/images/ant.svg',
    grasshopper: 'static/images/cockroach.svg',
  }
  for (const [name, url] of Object.entries(urls)) {
    images[name] = new Image();
    images[name].onload = function() {
      console.log('loaded', name);
    }
    images[name].src = url;
  }

  // load current state
  fetch('/api/state')
    .then(function(response) {
      return response.json();
    })
    .then(ui.update);
}

document.addEventListener('DOMContentLoaded', ready);
