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

function draw(state) {
  console.log(state);
  const canvas = document.getElementById('target');
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "gray";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const size = 32;
  const padding = 2;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  for (var coordinate_str in state.grid) {
    if (state.grid.hasOwnProperty(coordinate_str)) {
      const oddr = cube_to_oddr(parse_cube(coordinate_str));
      const x = oddr.column * w + (oddr.row & 1) * w / 2;
      const y = oddr.row * (h * 3/4);
      const parts = state.grid[coordinate_str].split(" ");
      ctx.fillStyle = parts[0];
      drawHexagon(ctx, 320 + x, 240 + y, size - padding);
      const img = images[parts[1]];
      ctx.drawImage(img, 320 + x - size/2, 240 + y - size/2, size, size);
    }
  }
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

function randomMove() {
  fetch('/api/random', {method: "POST"})
    .then(function(response) {
      return response.json();
    })
    .then(draw);
}

function ready() {
  document.getElementById('new').onclick = newGame;
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