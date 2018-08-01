function cube_to_oddr(cube) {
    return {
      column: cube.x + Math.floor((cube.z - (cube.z & 1)) / 2),
      row: cube.z
    };
}

function draw(state) {
  const canvas = document.getElementById('target');
  const ctx = canvas.getContext("2d");
  console.log(state);
}

function ready() {
  fetch('/api/state')
    .then(function(response) {
      return response.json();
    })
    .then(draw);
}

document.addEventListener('DOMContentLoaded', ready);