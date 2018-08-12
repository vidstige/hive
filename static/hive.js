// UI Framework
function _walk(node, offset, center, callback) {
  if (node.items) {
    const items = node.items;
    for (var i = 0; i < items.length; i++) {
      _walk(
        items[i],
        node.center ? center : offset,
        center,
        callback);
    }
  }
  if (node.position && node.draw) {
    var p = node.position();
    callback(node, {x: p.x + offset.x, y: p.y + offset.y});
  }
}

function UI(root) {
  this.root = root || {};

  this.walk = function(callback, center) {
    _walk(root, {x: 0, y: 0}, center, callback);
  };
}

function Renderer(canvas) {
  const ctx = canvas.getContext("2d");

  this.render = function(ui) {
    // Clear with background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ui.walk(function(node, p) {
      node.draw(ctx, p);
    }, {x: canvas.width/2, y: canvas.height/2});
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
  ctx.drawImage(images[tile], x - size/2, y - size/2, size, size);
}

function Label(position, text, font) {
  this.position = function() {
    return position;
  };
  this.draw = function(ctx, position) {
    const {x, y} = position;
    ctx.font = font;
    ctx.fillText(text, x, y);
  };
  this.contains = function(p, needle) {
    return false;
  }
}

function HexButton(position, size, color, tile) {
  const padding = 2;
  this.position = function() {
    return position;
  };
  this.draw = function(ctx, position) {
    const {x, y} = position;
    if (this.enabled) {
      drawTile(ctx, x, y, size, 0, "purple", tile);
    }
    drawTile(ctx, x, y, size, padding, color, tile);
  };
  this.contains = function(p, needle) {
    return inside(p.x, p.y, size, needle.x, needle.y);
  };
}

function center(p, container) {
  return {x: container.width/2 + p.x, y: container.height/2 + p.y};
}

function eq(a, b) {
  return JSON.stringify(a) == JSON.stringify(b);
}

function AvailableMoves(state) {
  const moves = [];
  const placements = [];
  for (const move_str of state.available_moves) {
    const [action, arg1, arg2] = move_str.split("|");
    if (action == "move") {
      moves.push({from: parse_cube(arg1), to: parse_cube(arg2)});
    }
    if (action == "place") {
      placements.push({tile: arg1, at: parse_cube(arg2)});
    }
  }
  this.canMoveFrom = function(coordinate) {
    for (var i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (move.action == "move" && eq(move.from, coordinate)) {
        return true;
      }
    }
    return false;
  };
  this.placeTargetsFor = function(tile) {
    return placements
      .filter(function(p) { return p.tile == tile; })
      .map(function(p) { return p.at; });
  };
}

// The UI
function createGrid(state) {
  const moves = new AvailableMoves(state);
  const size = 40;
  var items = [];
  for (const [coordinate_str, value] of Object.entries(state.grid)) {
    const cube = parse_cube(coordinate_str);
    const p = cube_to_xy(cube, size);
    const [player, tile] = value.split(" ");
    const button = new HexButton(p, size, player, tile);
    button.enabled = moves.canMoveFrom(cube);
    items.push(button);
  }
  return items;
}

function createHand(state) {
  const size = 20;
  const x = size * 2;
  var y = size * 2;
  var items = [];
  var map = {};
  for (const [player, hand] of Object.entries(state.players)) {
    map[player] = {};
    for (const [tile, count] of Object.entries(hand)) {
      const button = new HexButton({x, y}, size, player, tile);
      map[player][tile] = button;
      items.push(button);
      items.push(new Label(
        {x: x + size, y: y},
        "x" + count,
        size + "px Arial"));
      y += size * 2;
    }
    y += size;
  }

  const moves = new AvailableMoves(state);
  for (const [tile, button] of Object.entries(map[state.current])) {
    button.dragTargets = moves.placeTargetsFor(tile);
    button.enabled = button.dragTargets.length > 0;
  }
  return items;
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
  const renderer = new Renderer(canvas);

  this.draw = function() {
    renderer.render(self.ui);
  };

  this.update = function(state) {
    self.ui = new UI(
      {items: [
        {items: createHand(state)},
        {items: createGrid(state), center: true}
      ]});
    self.draw();
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

  this.mousedown = function(e) {
    self.ui.walk(function(node, p) {
      if (node.contains(p, mouse(e)) && node.enabled) {
        const targets = node.dragTargets;
        if (targets) {
          console.log(targets);
        }
      }
    }, {x: canvas.width/2, y: canvas.height/2});
  };

  this.mouseover = function(e) {
  };
}

function ready() {
  const ui = new HiveUI();
  document.getElementById('new').onclick = ui.newGame;
  document.getElementById('evaluate').onclick = ui.evaluate;
  document.getElementById('ai').onclick = ui.aiMove;
  document.getElementById('random').onclick = ui.randomMove;

  document.getElementById('target').onmousedown = ui.mousedown;
  document.getElementById('target').onmouseup = ui.mouseup;
  document.getElementById('target').onmousemove = ui.mouseover;

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
      //ctx.drawImage(img, 0, 0);
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
