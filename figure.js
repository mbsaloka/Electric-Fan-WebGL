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

var bodyHeight = 6.0;
var bodyWidth = 1.0;
var plateHeight = 0.5;
var plateWidth = 5.0;
var headHeight = 1.5;
var headWidth = 2.0;
var headLength = 3.0;
var bladeRadius = 4.0;

var numNodes = 4;
var numAngles = 4;
var angle = 0;

var theta = [0, 0, 0, 0];

var numVertices = 36;

var stack = [];

var figure = [];

for (var i = 0; i < numNodes; i++)
  figure[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;

var pointsArray = [];

var isFanOn = false;
var isPanningOn = false;
var fanSpeed = 5;
var headPanSpeed = 1;

// texture
var texSize = 64;

// Create a checkerboard pattern using floats

var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++)
        for ( var j = 0; j < texSize; j++)
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8) == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture

var image2 = new Uint8Array(4*texSize*texSize);

    for (var i = 0; i < texSize; i++)
        for (var j = 0; j < texSize; j++)
           for(var k =0; k<4; k++)
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];

var colorsArray = [];
var texCoordsArray = [];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

var vertexColors = [
  vec4(0.0, 0.0, 0.0, 1.0),  // black
  vec4(1.0, 0.0, 0.0, 1.0),  // red
  vec4(1.0, 1.0, 0.0, 1.0),  // yellow
  vec4(0.0, 1.0, 0.0, 1.0),  // green
  vec4(0.0, 0.0, 1.0, 1.0),  // blue
  vec4(1.0, 0.0, 1.0, 1.0),  // magenta
  vec4(0.0, 1.0, 1.0, 1.0),  // white
  vec4(0.0, 1.0, 1.0, 1.0)   // cyan
];

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
      m = mult(m, rotate(theta[headPanId], vec3(0, 1, 0)));
      m = mult(m, rotate(theta[headTiltId], vec3(1, 0, 0)));
      m = mult(m, translate(0.0, -0.5 * headHeight, 0.0));
      figure[headId] = createNode(m, head, null, bladeId);
      break;

    case bladeId:
      m = translate(0.0, 0.0, headLength - 0.2);
      m = mult(m, rotate(theta[bladeId], vec3(0, 0, 1)));
      figure[bladeId] = createNode(m, blade, null, null);
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
  // draw upper body
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * bodyHeight, 0.0));
  instanceMatrix = mult(instanceMatrix, scale(bodyWidth, bodyHeight, bodyWidth));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 0, numVertices);

  // draw bottom plate
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.0));
  instanceMatrix = mult(instanceMatrix, scale(plateWidth, plateHeight, plateWidth));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function head() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, 0.2));
  instanceMatrix = mult(instanceMatrix, scale(headWidth, headHeight, headLength));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function blade() {
  instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.0, -1.0));
  instanceMatrix = mult(instanceMatrix, scale(bladeRadius, bladeRadius, 0.05));
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
  for (var i = 0; i < 6; i++) gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

function configureTexture(image) {
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
      gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function quad(a, b, c, d) {
  pointsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[0]);

  pointsArray.push(vertices[b]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[1]);

  pointsArray.push(vertices[c]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[2]);

  pointsArray.push(vertices[a]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[0]);

  pointsArray.push(vertices[c]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[2]);

  pointsArray.push(vertices[d]);
  colorsArray.push(vertexColors[a]);
  texCoordsArray.push(texCoord[3]);
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

  gl.enable(gl.DEPTH_TEST);

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

  var cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
  var colorLoc =gl.getAttribLocation(program, "aColor");
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  vBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

  var positionLoc = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  var tBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
  var texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texCoordLoc);

  configureTexture(image2);
  gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

  document.getElementById("slider0").addEventListener("input", (event) => {
    theta[bodyId] = event.target.value;
    initNodes(bodyId);
  });

  document.getElementById("slider1").addEventListener("input", (event) => {
    theta[headTiltId] = event.target.value;
    initNodes(headTiltId);
  });

  document.getElementById("slider2").addEventListener("input", (event) => {
    theta[headPanId] = event.target.value;
    initNodes(headPanId);
  });

  document.getElementById("checkbox0").addEventListener("change", (event) => {
    isFanOn = event.target.checked;
    initNodes(bladeId);
  });

  document.getElementById("checkbox1").addEventListener("change", (event) => {
    theta[headPanId] = 0;
    isPanningOn = event.target.checked;
    initNodes(headPanId);

    document.getElementById("slider2").disabled = isPanningOn;
  });

  for (i = 0; i < numNodes; i++) initNodes(i);

  render();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (isFanOn) {
    theta[bladeId] += fanSpeed;
    if (theta[bladeId] > 360) theta[bladeId] -= 360;
    initNodes(bladeId);
  }

  if (isPanningOn) {
    theta[headPanId] += headPanSpeed;
    if (theta[headPanId] > 70 || theta[headPanId] < -70) {
      headPanSpeed = -headPanSpeed;
    }
    initNodes(headPanId);
  }

  traverse(bodyId);
  requestAnimationFrame(render);
}
