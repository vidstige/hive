function cube_to_oddr(cube) {
    return {
      column: cube.x + Math.floor((cube.z - (cube.z & 1)) / 2),
      row: cube.z
    };
}

function parse_cube(cube_str) {
  const c = cube_str.replace("(","").replace(")","").split(',');
  return {
    x: parseInt(c[0], 10), y: parseInt(c[1], 10), z: parseInt(c[2], 10)
  };
}

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

var images = {};

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

function draw(state) {
  console.log(state);
  const canvas = document.getElementById('target');
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "gray";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const size = 40;
  const padding = 2;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  for (var coordinate_str in state.grid) {
    if (state.grid.hasOwnProperty(coordinate_str)) {
      const oddr = cube_to_oddr(parse_cube(coordinate_str));
      const x = oddr.column * w + (oddr.row & 1) * w / 2;
      const y = oddr.row * (h * 3/4);
      const [player, tile] = state.grid[coordinate_str].split(" ");
      drawTile(ctx, canvas.width/2 + x, canvas.height/2 + y, size, padding, player, tile);
    }
  }

  // draw hands
  drawHands(ctx, state, 24, padding);
}

function newGame() {
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
    .then(draw);
}

function evaluate() {
  fetch('/api/evaluation')
    .then(function(response) {
      return response.json();
    })
    .then(function(e) {
      document.getElementById('evaluation').innerHTML = e
    });
}

function randomMove() {
  disable(this);
  fetch('/api/random', {method: "POST"})
    .then(function(response) {
      return response.json();
    })
    .then(draw).then(enable(this));
}

function disable(element) {
  element.disabled = true;
}
function enable(element) {
  return function() {
    element.disabled = false;
  };
}

function aiMove() {
  disable(this);
  fetch('/api/ai', {method: "POST"})
    .then(function(response) {
      return response.json();
    })
    .then(draw).then(enable(this));
}

function ready() {
  document.getElementById('new').onclick = newGame;
  document.getElementById('evaluate').onclick = evaluate;
  document.getElementById('ai').onclick = aiMove;
  document.getElementById('random').onclick = randomMove;

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

}

document.addEventListener('DOMContentLoaded', ready);