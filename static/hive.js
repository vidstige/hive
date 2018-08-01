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

function draw(state) {
  const canvas = document.getElementById('target');
  const ctx = canvas.getContext("2d");
  const size = 40;
  const padding = 2;
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  for (var coordinate_str in state.grid) {
    if (state.grid.hasOwnProperty(coordinate_str)) {
      const oddr = cube_to_oddr(parse_cube(coordinate_str));
      const x = oddr.column * w + (oddr.row & 1) * w / 2;
      const y = oddr.row * (h * 3/4);
      ctx.fillStyle = '#000';
      drawHexagon(ctx, 320+x, 240+y, size - padding);
    }
  }
}

function ready() {
  fetch('/api/state')
    .then(function(response) {
      return response.json();
    })
    .then(draw);
}

document.addEventListener('DOMContentLoaded', ready);