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

function drawHands(ctx, state, size, padding) {
  const x = size * 2;
  var y = size * 2;
  for (const [player, hand] of Object.entries(state.players)) {
    for (const [tile, count] of Object.entries(hand)) {
      drawTile(ctx, x, y, size, padding, player, tile);
      ctx.font = size + "px Arial";
      ctx.fillText("x" + count, x + size, y);

      y += size * 2;
    }
    y += size;
  }
}

// The UI
function HiveUI() {
  const self = this;
  this.draw = function() {
    const state = self.state;
    console.log(state);
    const canvas = document.getElementById('target');
    const ctx = canvas.getContext("2d");
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    const size = 40;
    const padding = 2;
    for (var coordinate_str in state.grid) {
      if (state.grid.hasOwnProperty(coordinate_str)) {
        const {x, y} = cube_to_xy(parse_cube(coordinate_str), size);
        const [player, tile] = state.grid[coordinate_str].split(" ");
        drawTile(ctx, canvas.width/2 + x, canvas.height/2 + y, size, padding, player, tile);
      }
    }
  
    // draw hands
    drawHands(ctx, state, 24, padding);
  };

  this.update = function(state) {
    self.state = state;
    self.draw();
  };
  
  this.newGame = function () {
    const seed = document.getElementById('seed').value;
    fetch('/api/new', {
      method: "POST",
      body: JSON.stringify({seed}),
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }})
      .then(function(response) {
        return response.json();
      })
      .then(self.update);
  };
  
  this.evaluate = function() {
    fetch('/api/evaluation')
      .then(function(response) {
        return response.json();
      })
      .then(function(e) {
        document.getElementById('evaluation').innerHTML = e
      });
  };
  
  this.randomMove = function() {
    disable(this);
    fetch('/api/random', {method: "POST"})
      .then(function(response) {
        return response.json();
      })
      .then(self.update).then(enable(this));
  };
  
  this.aiMove = function() {
    disable(this);
    fetch('/api/ai', {method: "POST"})
      .then(function(response) {
        return response.json();
      })
      .then(self.update).then(enable(this));
  };

  this.click = function(e) {
    const size = 40;
    const mx = e.pageX - e.target.offsetLeft;
    const my = e.pageY - e.target.offsetTop;
    for (const [coordinate_str, value] of Object.entries(self.state.grid)) {
      const {x, y} = cube_to_xy(parse_cube(coordinate_str), size);
      if (inside(e.target.width/2 + x, e.target.height/2 + y, size, mx, my)) {
        console.log("WEE");
      }
    }
  };
}

function ready() {
  const ui = new HiveUI();
  document.getElementById('new').onclick = ui.newGame;
  document.getElementById('evaluate').onclick = ui.evaluate;
  document.getElementById('ai').onclick = ui.aiMove;
  document.getElementById('random').onclick = ui.randomMove;

  document.getElementById('target').onclick = ui.click;

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