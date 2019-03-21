/*
 * Telegram contest: Charts
 *
 * Copyright 2019 Roman Karpov (roman.karpov@gmail.com)
 *
 * Date: 2019-03-11T09:59Z
 */

function Chart(data, container) {
  var canvas = document.createElement("canvas");
  canvas.width = 350;
  canvas.height = 500;
  var ctx = canvas.getContext("2d");
  container.appendChild(canvas);

  var over = document.createElement("canvas");
  over.className = "overlay";
  container.appendChild(over);
  over.width = canvas.width;
  over.height = canvas.height;
  var overCtx = over.getContext("2d");

  this.id = Date.now();
  this.container = container;
  this.canvas = canvas;
  this.over = over;
  this.ctx = ctx;
  this.overCtx = overCtx;
  this.data = data;

  var settings = {};
  this.settings = settings;
  this.data.columns.forEach(function (column, i) {
    if (column[0] === "x") {
      settings.xColumn = i;
    }
  });
  settings.animationSteps = 10;
  settings.displayed = Object.keys(data.names);
  settings.total = data.columns[settings.xColumn].length - 1;
  settings.begin = settings.total - (settings.total >> 2);
  settings.end = settings.total;
  settings.preview = {
    x0: 0,
    y0: canvas.height,
    x1: canvas.width,
    y1: Math.floor(canvas.height - canvas.height / 10),
    width: canvas.width,
    height: Math.floor(canvas.height / 10),
    lineWidth: 1,
    labels: 0
  };
  settings.view = {
    x0: 0,
    y0: canvas.height - 2 * settings.preview.height,
    x1: canvas.width,
    y1: 0,
    width: canvas.width,
    height: canvas.height - 2 * settings.preview.height,
    lineWidth: 3,
    labels: 5
  };
  settings.day = {
    label: "#96a2aa",
    yline: "#f2f4f5",
    vline: "#dfe6eb",
    zline: "#ecf0f3",
    bg: "#fff",
    previewMask: "#eef5f9",
    previewMaskA: 0.7,
    previewFrame: "#49b",
    previewFrameA: 0.2
  };
  settings.night = {
    label: "#546778",
    yline: "#293544",
    vline: "#3b4a5a",
    zline: "#313d4d",
    bg: "#242f3e",
    previewMask: "#1f2936",
    previewMaskA: 0.7,
    previewFrame: "#49b",
    previewFrameA: 0.2
  };

  // Listen to mode switch event
  var self = this;
  var body = document.getElementsByTagName("body")[0];
  body.addEventListener("mode", function (e) {
    self.settings.mode = e.detail;
    self.drawChart();
  });
  settings.mode = body.className.indexOf("night-mode") >= 0 ? "night" : "day";

  this.drawChart();
  this.drawLegend();
  this.setMainInteraction();
  this.setPreviewInteraction();
}

Chart.prototype.setPreviewInteraction = function setPreviewInteraction() {
  //console.log( arguments.callee.name );
  var self = this;
  var over = this.over;
  var ctx = this.overCtx;
  var view = this.settings.view;
  var preview = this.settings.preview;
  var previewFrame = this.previewFrame;

  var threshold = 10;
  var column = this.data.columns[this.settings.xColumn];

  var prevX;

  over.addEventListener("mousedown", setupMove);
  over.addEventListener("touchstart", setupMove);

  function setupMove(e) {
    var rect = e.target.getBoundingClientRect();
    var clientX, clientY;
    if (e.type === "mousedown") {
      clientX = e.clientX;
      clientY = e.clientY;
      e.preventDefault();
    } else {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    var x = Math.round(clientX - rect.left);
    var y = Math.round(clientY - rect.top);
    if (
      preview.x0 <= x && x <= preview.x1 &&
      preview.y1 <= y && y <= preview.y0
    ) {
      prevX = x;
      if ( Math.abs(x - previewFrame.x0) <= threshold ) {
        document.addEventListener("mousemove", moveBegin);
        document.addEventListener("touchmove", moveBegin);
        document.addEventListener("mouseup", upBegin);
        document.addEventListener("touchend", upBegin);
      } else if ( Math.abs(x - previewFrame.x1) <= threshold ) {
        document.addEventListener("mousemove", moveEnd);
        document.addEventListener("touchmove", moveEnd);
        document.addEventListener("mouseup", upEnd);
        document.addEventListener("touchend", upEnd);
      } else if (previewFrame.x0 < x && x < previewFrame.x1) {
        document.addEventListener("mousemove", moveFrame);
        document.addEventListener("touchmove", moveFrame);
        document.addEventListener("mouseup", upFrame);
        document.addEventListener("touchend", upFrame);
      }
    }
  }

  function move(e, what) {
    var rect = over.getBoundingClientRect();
    var clientX, clientY;
    if (e.type === "mousemove") {
      clientX = e.clientX;
      clientY = e.clientY;
      e.preventDefault();
    } else {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    var x = Math.round(clientX - rect.left);
    var y = Math.round(clientY - rect.top);
    var deltaX = x - prevX;
    prevX = x;

    var prevBegin = self.settings.begin;
    var prevEnd = self.settings.end;
    var chartBeginX, chartEndX, chartBeginIndex, chartEndIndex;

    if (what === "begin") {
      if (Math.abs(previewFrame.x1 - previewFrame.x0 - deltaX) < threshold * 4) { return; }
      previewFrame.x0 += deltaX;
      if (previewFrame.x0 < preview.x0) {
        previewFrame.x0 = preview.x0;
      }
      chartBeginX = applyTransform(previewFrame.x0, 0, preview.transform, true)[0];
      chartBeginIndex = Math.abs(binarySearch(column, chartBeginX, function (a, b) { return a - b; }));
      self.settings.begin = chartBeginIndex;
      if (self.settings.begin < 1) {
        self.settings.begin = 1;
      }
    } else if (what === "end") {
      if ( Math.abs(previewFrame.x1 + deltaX - previewFrame.x0) < threshold * 4 ) { return; }
      self.previewFrame.x1 += deltaX;
      if (previewFrame.x1 > preview.x1) {
        previewFrame.x1 = preview.x1;
      }
      chartEndX = applyTransform(previewFrame.x1, 0, preview.transform, true)[0];
      chartEndIndex = Math.abs(binarySearch(column, chartEndX, function (a, b) { return a - b; }));
      self.settings.end = chartEndIndex;
      if (self.settings.end > self.settings.total) {
        self.settings.end = self.settings.total;
      }
    } else {
      var previewFrameWidth = previewFrame.x1 - previewFrame.x0;
      if (previewFrame.x0 + deltaX < preview.x0) {
        previewFrame.x0 = preview.x0;
        previewFrame.x1 = preview.x0 + previewFrameWidth;
      } else if (previewFrame.x1 + deltaX > preview.x1) {
        previewFrame.x1 = preview.x1;
        previewFrame.x0 = preview.x1 - previewFrameWidth;
      } else {
        previewFrame.x0 += deltaX;
        previewFrame.x1 += deltaX;
      }
      var indexDelta = self.settings.end - self.settings.begin;
      chartBeginX = applyTransform(previewFrame.x0, 0, preview.transform, true)[0];
      chartBeginIndex = Math.abs(binarySearch(column, chartBeginX, function (a, b) { return a - b; }));
      self.settings.begin = chartBeginIndex;
      if (self.settings.begin < 1) {
        self.settings.begin = 1;
      }
      self.settings.end = self.settings.begin + indexDelta;
      if (self.settings.end > self.settings.total) {
        self.settings.end = self.settings.total;
      }
    }
    if (self.settings.begin !== prevBegin || self.settings.end !== prevEnd) {
      self.drawChart();
    }
  }

  function moveBegin(e) {
    move(e, "begin");
  }
  function upBegin(e) {
    document.removeEventListener("mousemove", moveBegin);
    document.removeEventListener("touchmove", moveBegin);
    document.removeEventListener("mouseup", upBegin);
    document.removeEventListener("touchend", upBegin);
  }
  function moveEnd(e) {
    move(e, "end");
  }
  function upEnd(e) {
    document.removeEventListener("mousemove", moveEnd);
    document.removeEventListener("touchmove", moveEnd);
    document.removeEventListener("mouseup", upEnd);
    document.removeEventListener("touchend", upEnd);
  }
  function moveFrame(e) {
    move(e, "frame");
  }
  function upFrame(e) {
    document.removeEventListener("mousemove", moveFrame);
    document.removeEventListener("touchmove", moveFrame);
    document.removeEventListener("mouseup", upFrame);
    document.removeEventListener("touchend", upFrame);
  }
};

Chart.prototype.drawPreviewControl = function drawPreviewControl() {
  //console.log( arguments.callee.name );
  var self = this;
  var ctx = this.overCtx;
  var view = this.settings.view;
  var preview = this.settings.preview;
  var colors = self.settings[self.settings.mode];

  ctx.save();
  ctx.fillStyle = colors.previewMask;
  ctx.globalAlpha = colors.previewMaskA;
  ctx.fillRect(preview.x0, preview.y0, preview.x1 - preview.x0, preview.y1 - preview.y0);
  ctx.restore();

  var x0, x1;

  if (!this.previewFrame) {
    var xColumn = this.settings.xColumn;
    var begin = view.transform.begin;
    var end = view.transform.end;
    var xBegin = this.data.columns[xColumn][begin];
    var xEnd = this.data.columns[xColumn][end];
    x0 = applyTransform(xBegin, 0, preview.transform)[0];
    x1 = applyTransform(xEnd, 0, preview.transform)[0];
    this.previewFrame = {
      x0: x0,
      x1: x1,
    };
  }
  x0 = this.previewFrame.x0;
  x1 = this.previewFrame.x1;

  ctx.clearRect(x0, preview.y0, x1 - x0, preview.y1 - preview.y0);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, preview.y0);
  ctx.lineTo(x1, preview.y0);
  ctx.lineTo(x1, preview.y1);
  ctx.lineTo(x0, preview.y1);
  ctx.closePath();
  ctx.moveTo(x0 + 5, preview.y0 - 1);
  ctx.lineTo(x1 - 5, preview.y0 - 1);
  ctx.lineTo(x1 - 5, preview.y1 + 1);
  ctx.lineTo(x0 + 5, preview.y1 + 1);
  ctx.closePath();
  ctx.fillStyle = colors.previewFrame;
  ctx.globalAlpha = colors.previewFrameA;
  ctx.fill("evenodd");
  ctx.restore();
};

// Set interaction with chart
Chart.prototype.setMainInteraction = function setMainInteraction() {
  //console.log( arguments.callee.name );
  var self = this;
  var xColumn = this.settings.xColumn;
  var currentIndex;
  this.over.addEventListener("mousemove", showTooltip);
  this.over.addEventListener("touchmove", showTooltip);

  function showTooltip(e) {
    var rect = e.target.getBoundingClientRect();
    var clientX, clientY;
    if (e.type === "mousemove") {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    var x = Math.round(clientX - rect.left);
    var y = Math.round(clientY - rect.top);
    if (
      self.settings.view.x0 <= x && x <= self.settings.view.x1 &&
      self.settings.view.y1 <= y && y <= self.settings.view.y0
    ) {
      x = applyTransform(x, y, self.settings.view.transform, true)[0];
      var column = self.data.columns[xColumn];
      var pointerIndex = binarySearch(column, x, function (a, b) { return a - b; });
      if (pointerIndex < 0) {
        pointerIndex = Math.abs(pointerIndex) - 1;
      }
      var x1 = column[pointerIndex];
      var x2 = column[pointerIndex - 1];
      if ( Math.abs(x2 - x) < Math.abs(x1 - x) ) {
        pointerIndex = pointerIndex - 1;
      }
      if (pointerIndex === currentIndex) { return; }
      currentIndex = pointerIndex;
      renderRuler(currentIndex);
      renderTooltip(currentIndex);
    }
  }

  var tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.id = "chart-tooltip-" + this.id;
  tooltip.style.opacity = "0";
  this.container.appendChild(tooltip);

  function renderTooltip(currentIndex) {
    tooltip.innerHTML = "";
    var xValue = self.data.columns[xColumn][currentIndex];
    var xCaption = document.createElement("div");
    xCaption.textContent = new Date(xValue).toDateString().split(" ").slice(0, -1).join(" ").replace(" ", ", ");
    tooltip.appendChild(xCaption);
    self.data.columns.forEach(function (column) {
      var columnId = column[0];
      if (self.settings.displayed.indexOf(columnId) >= 0) {
        var item = document.createElement("div");
        item.className = "item";
        item.style.color = self.data.colors[columnId];
        tooltip.appendChild(item);
        var value = document.createElement("div");
        value.className = "value";
        item.appendChild(value);
        var label = document.createElement("div");
        label.className = "label";
        item.appendChild(label);
        var yValue = column[currentIndex];
        value.textContent = yValue;
        var yLabel = self.data.names[columnId];
        label.textContent = yLabel;
      }
    });
    tooltip.style.opacity = "1";
    var width = tooltip.offsetWidth;
    var left = Math.round(applyTransform(xValue, 0, self.settings.view.transform)[0]);
    left += 15;
    tooltip.style.left = "";
    tooltip.style.right = "";

    //if ( left + width > self.settings.view.x1 && ) {
    //
    //} else

    if ( left + width <= self.settings.view.x1 || width >= left - 30) {
      tooltip.style.left = left + "px";
    } else {
      tooltip.style.right = self.settings.view.x1 - left + 30 + "px";
    }
  }

  function renderRuler(currentIndex) {
    var colors = self.settings[self.settings.mode];
    var view = self.settings.view;
    var overCtx = self.overCtx;
    overCtx.clearRect(view.x0, view.y1, view.x1, view.y0);
    var transform = self.settings.view.transform;
    overCtx.save();
    overCtx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    overCtx.beginPath();
    var x = self.data.columns[xColumn][currentIndex];
    var y0 = self.settings.view.transform.minY;
    var y1 = self.settings.view.transform.maxY;
    overCtx.moveTo(x, y0);
    overCtx.lineTo(x, y1);
    overCtx.restore();
    overCtx.strokeStyle = colors.vline;
    overCtx.lineWidth = 1;
    overCtx.stroke();

    overCtx.save();
    self.data.columns.forEach(function (column) {
      var columnId = column[0];
      if ( self.settings.displayed.indexOf(columnId) >= 0 ) {
        var y = column[currentIndex];
        var canvasPoint = applyTransform(x, y, transform);
        overCtx.beginPath();
        overCtx.arc(canvasPoint[0], canvasPoint[1], 5, 0, 2 * Math.PI, false);
        var color = self.data.colors[columnId];
        overCtx.strokeStyle = color;
        overCtx.fillStyle = colors.bg;
        overCtx.lineWidth = 3;
        overCtx.fill();
        overCtx.stroke();
      }
    });
    overCtx.restore();
  }
};

// Draw chart with animation effect
Chart.prototype.drawChart = function drawChart() {
  //console.log( arguments.callee.name );
  var self = this;
  var formerPreviewTransform = this.settings.preview.transform;
  var formerViewTransform = this.settings.view.transform;

  var actualPreviewTransform = this.calcTransform(this.settings.preview, 1, this.settings.total);
  var actualViewTransform = this.calcTransform(this.settings.view, this.settings.begin, this.settings.end);

  if (!actualPreviewTransform) {
    this.clear();
    return;
  }
  if (!formerPreviewTransform) {
    renderViews(this);
    return;
  }

  var previewTransformDelta = this.calcTransformDelta(actualPreviewTransform, formerPreviewTransform);
  var viewTransformDelta = this.calcTransformDelta(actualViewTransform, formerViewTransform);

  var steps = this.settings.animationSteps;
  var step = 1;
  if (this.animationRequest) {
    cancelAnimationFrame(this.animationRequest);
  }
  this.animationRequest = requestAnimationFrame(renderStep);

  function renderStep() {
    for (var key in actualPreviewTransform) {
      actualPreviewTransform[key] = formerPreviewTransform[key] + previewTransformDelta[key] / steps * step;
      actualViewTransform[key] = formerViewTransform[key] + viewTransformDelta[key] / steps * step;
      if (key === "begin" || key === "end") {
        actualPreviewTransform[key] = Math.round(actualPreviewTransform[key]);
        actualViewTransform[key] = Math.round(actualViewTransform[key]);
      }
    }
    renderViews(self);
    if (++step <= steps) {
      self.animationRequest = requestAnimationFrame(renderStep);
    }
  }

  function renderViews(chart) {
    chart.clear();
    chart.renderView(chart.settings.view, actualViewTransform);
    chart.settings.view.transform = actualViewTransform;
    chart.renderView(chart.settings.preview, actualPreviewTransform);
    chart.settings.preview.transform = actualPreviewTransform;
    chart.drawPreviewControl();
  }
};

Chart.prototype.calcTransformDelta = function calcTransformDelta(actual, former) {
  //console.log( arguments.callee.name );
  var delta = {};
  for (var key in actual) {
    delta[key] = actual[key] - former[key];
  }
  return delta;
};

// Draw legend with column controls
Chart.prototype.drawLegend = function drawLegend() {
  //console.log( arguments.callee.name );
  var self = this;
  var legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.style.width = this.canvas.width + "px";
  this.container.appendChild(legend);
  this.settings.displayed.forEach(function (columnId) {
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = self.data.names[columnId];
    checkbox.id = columnId;
    checkbox.checked = true;
    checkbox.className = "checkbox-round";
    var color = self.data.colors[columnId];
    checkbox.style.backgroundColor = color;
    checkbox.style.borderColor = color;
    var label = document.createElement("label");
    var name = document.createTextNode(checkbox.name);
    label.appendChild(checkbox);
    label.appendChild(name);
    label.className = "checkbox-round-label ripple";
    legend.appendChild(label);
    checkbox.addEventListener("change", function (e) {
      if (e.target.checked) {
        self.settings.displayed.push(columnId);
      } else {
        self.settings.displayed = self.settings.displayed.filter(function (item) {
          return item !== columnId;
        });
      }
      self.drawChart();
    });
  });
};

// Calculate extremes and transform params for given data range and view
Chart.prototype.calcTransform = function calcTransform(view, begin, end) {
  //console.log( arguments.callee.name );
  if (this.settings.displayed.length == 0) { return; }
  var i,
      j,
      column,
      column_key,
      value,
      minY = 0,
      maxY = 0,
      transform = {
        begin: begin,
        end: end
      };

  for (i = 0; (column = this.data.columns[i]); i++) {
    column_key = column[0];
    if (column_key === "x") {
      transform.minX = column[begin];
      transform.maxX = column[end];
      continue;
    } else if (this.settings.displayed.indexOf(column_key) < 0) {
      continue;
    }
    for (j = begin; j <= end; j++) {
      value = column[j];
      minY = value < minY ? value : minY;
      maxY = value > maxY ? value : maxY;
    }
  }
  transform.begin = begin;
  transform.end = end;
  transform.minY = minY;
  transform.maxY = maxY;
  transform.xRatio = view.width / (transform.maxX - transform.minX);
  transform.yRatio = -view.height / (transform.maxY - transform.minY);
  transform.xOffset = -transform.minX * transform.xRatio;
  transform.yOffset = -transform.maxY * transform.yRatio + view.y1;
  transform.xStep = Math.floor( (end - begin) / view.width ) || 1;
  return transform;
};

Chart.prototype.clear = function clear() {
  //console.log( arguments.callee.name );
  var ctx = this.ctx;
  var overCtx = this.overCtx;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  overCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  var tooltip = document.getElementById("chart-tooltip-" + this.id);
  if (tooltip) {
    tooltip.style.opacity = 0;
  }
};

// Render view / preview
Chart.prototype.renderView = function renderView(view, transform) {
  //console.log( arguments.callee.name );
  var ctx = this.ctx;
  this.drawLabels(view, transform);
  var xColumn = this.settings.xColumn;

  ctx.save();
  ctx.lineWidth = view.lineWidth;
  var i, j, column_key, column, x0, y0, x, y;
  for (i = 0; (column = this.data.columns[i]); i++) {
    column_key = column[0];
    if (column_key === "x" || this.settings.displayed.indexOf(column_key) < 0) {
      continue;
    }
    ctx.strokeStyle = this.data.colors[column_key];
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    x0 = this.data.columns[xColumn][transform.begin];
    y0 = column[transform.begin];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (j = transform.begin; j <= transform.end; j += transform.xStep) {
      x = this.data.columns[xColumn][j];
      y = column[j];
      ctx.lineTo(x, y);
    }
    ctx.restore();
    ctx.stroke();
  }
  ctx.restore();
};

// Draw labels in view
Chart.prototype.drawLabels = function drawLabels(view, transform) {
  //console.log( arguments.callee.name );
  if (!view.labels) { return; }
  var colors = this.settings[this.settings.mode];
  var xColumn = this.settings.xColumn;

  var ctx = this.ctx;
  ctx.save();
  ctx.font = "14px sans-serif";
  ctx.textBaseline = "bottom";
  ctx.strokeStyle = colors.yline;
  ctx.fillStyle = colors.label;
  ctx.lineWidth = 1;
  var yStep = Math.round( (transform.maxY - transform.minY) / view.labels);
  var exp = Math.floor(Math.log10(yStep));
  yStep = Math.round( yStep / Math.pow(10, exp) ) * Math.pow(10, exp) || 1;
  var y = Math.round(transform.minY / yStep) * yStep;
  var i = 0, j = 0;
  while ( y < transform.maxY) {
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    ctx.beginPath();
    var x0 = transform.minX;
    var x1 = transform.maxX;
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.restore();
    if (y === 0) {
      ctx.strokeStyle = colors.zline;
    } else {
      ctx.strokeStyle = colors.yline;
    }
    ctx.stroke();
    var labelPosition = applyTransform(x0, y, transform);
    ctx.fillText(y, labelPosition[0], labelPosition[1] - 5);
    y += yStep;
  }

  ctx.textBaseline = "top";
  var xStep = Math.floor( (transform.end - transform.begin) / view.labels ) || 1;
  var x = transform.begin;
  while ( x < transform.end) {
    var value = this.data.columns[xColumn][x];
    var labelX = applyTransform(value, 0, transform)[0];
    value = new Date(value).toDateString().split(" ").slice(1, 3).join(" ");
    ctx.fillText(value, labelX, view.y0 + 10);
    x += xStep;
  }
  ctx.restore();
};

// Transform helper
function applyTransform(x, y, transform, reverse) {
  var result;
  if (reverse) {
    result = [
      x / transform.xRatio - transform.xOffset / transform.xRatio,
      y / transform.yRatio - transform.yOffset / transform.yRatio
    ];
  } else {
    result = [
      x * transform.xRatio + transform.xOffset,
      y * transform.yRatio + transform.yOffset
    ];
  }
  return result;
}

function canvas2view (x, y, view) {
  return applyTransform(x, y, view.transform, true);
}

function view2canvas (x, y, view) {
  return applyTransform(x, y, view.transform, false);
}

// Binary search helper
function binarySearch(array, value, compare) {
  var i = 0, j, k = array.length - 1, cmp_res;
  while (i <= k) {
    j = (k + i) >> 1;
    cmp_res = compare(value, array[j]);
    if (cmp_res > 0) {
      i = j + 1;
    } else if (cmp_res < 0) {
      k = j - 1;
    } else {
      return j;
    }
  }
  return -i - 1;
}
