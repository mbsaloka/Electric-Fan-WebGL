"use strict";

var canvas;
var gl;
var program;

var projectionMatrix;
var modelViewMatrix;

var instanceMatrix;

var modelViewMatrixLoc;

var vertices = [
  vec4(-0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, 0.5, 0.5, 1.0),
  vec4(0.5, 0.5, 0.5, 1.0),
  vec4(0.5, -0.5, 0.5, 1.0),
  vec4(-0.5, -0.5, -0.5, 1.0),
  vec4(-0.5, 0.5, -0.5, 1.0),
  vec4(0.5, 0.5, -0.5, 1.0),
  vec4(0.5, -0.5, -0.5, 1.0),
];

var bodyId = 0;
var headId = 1;
var headPanId = 1;
var headTiltId = 2;
var bladeId = 3;

var bodyHeight = 10.0;
var bodyWidth = 5.0;
var headHeight = 2.0;
var headWidth = 1.0;
var bladeRadius = 4.0;

var numNodes = 4;
var numAngles = 4;
var angle = 0;

var theta = [0, 0, 0, 0];

var numVertices = 24;

var stack = [];

var figure = [];

for (var i = 0; i < numNodes; i++)
  figure[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;

var pointsArray = [];

var isFanOn = false;

init();

//-------------------------------------------

function scale4(a, b, c) {
  var result = mat4();
  result[0] = a;
  result[5] = b;
  result[10] = c;
  return result;
}

//--------------------------------------------

function createNode(transform, render, sibling, child) {
  var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
  };
  return node;
}

function initNodes(Id) {
  var m = mat4();

  switch (Id) {
    case bodyId:
      m = rotate(theta[bodyId], vec3(0, 1, 0));
      figure[bodyId] = createNode(m, body, null, headId);
      break;

    case headId:
    case headPanId:
    case headTiltId:
      m = translate(0.0, bodyHeight + 0.5 * headHeight, 0.0);
      m = mult(m, rotate(theta[headPanId], vec3(1, 0, 0)));
      m = mult(m, rotate(theta[headTiltId], vec3(0, 1, 0)));
      m = mult(m, translate(0.0, -0.5 * headHeight, 0.0));
      figure[headId] = createNode(m, head, bladeId, null);
      break;

    case bladeId:
      m = translate(0.0, 0.9 * bodyHeight, bodyWidth);
      m = mult(m, rotate(theta[bladeId], vec3(1, 0, 0)));
      figure[bladeId] = createNode(
        m,
        leftUpperArm,
        rightUpperArmId,
        leftLowerArmId
      );
      break;
  }
}

function traverse(Id) {
  if (Id == null) return;
  stack.push(modelViewMatrix);
  modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
  figure[Id].render();
  if (figure[Id].child != null) traverse(figure[Id].child);
  modelViewMatrix = stack.pop();
  if (figure[Id].sibling != null) traverse(figure[Id].sibling);
}

function body() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * bodyHeight, 0.0));
  instanceMatrix = mult(
    instanceMatrix,
    scale(bodyWidth, bodyHeight, bodyWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function head() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0));
  instanceMatrix = mult(
    instanceMatrix,
    scale(headWidth, headHeight, headWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function blade() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0));
  instanceMatrix = mult(
    instanceMatrix,
    scale(headWidth, headHeight, headWidth)
  );
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4 * i, 4);
}

function quad(a, b, c, d) {
  pointsArray.push(vertices[a]);
  pointsArray.push(vertices[b]);
  pointsArray.push(vertices[c]);
  pointsArray.push(vertices[d]);
}

function cube() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
}

function init() {
  canvas = document.getElementById("gl-canvas");

  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL 2.0 isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //
  //  Load shaders and initialize attribute buffers
  //
  program = initShaders(gl, "vertex-shader", "fragment-shader");

  gl.useProgram(program);

  instanceMatrix = mat4();

  projectionMatrix = ortho(-10.0, 10.0, -10.0, 10.0, -10.0, 10.0);
  modelViewMatrix = mat4();

  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "modelViewMatrix"),
    false,
    flatten(modelViewMatrix)
  );
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "projectionMatrix"),
    false,
    flatten(projectionMatrix)
  );

  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

  cube();

  vBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var positionLoc = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  document.getElementById("slider0").onchange = function (event) {
    theta[bodyId] = event.target.value;
    initNodes(bodyId);
  };
  document.getElementById("slider1").onchange = function (event) {
    theta[headPanId] = event.target.value;
    initNodes(headPanId);
  };

  document.getElementById("slider2").onchange = function (event) {
    theta[headTiltId] = event.target.value;
    initNodes(headTiltId);
  };

  document.getElementById("checkbox0").onchange = function (event) {
    if (event.target.checked) {
      isFanOn = true;
    } else {
      isFanOn = false;
    }
    initNodes(bladeId);
  };

  for (i = 0; i < numNodes; i++) initNodes(i);

  render();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  traverse(bodyId);
  requestAnimationFrame(render);
}
