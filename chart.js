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

  var overlay = document.createElement("canvas");
  overlay.className = "overlay";
  container.appendChild(overlay);
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  var overlayCtx = overlay.getContext("2d");

  this.container = container;
  this.canvas = canvas;
  this.overlay = overlay;
  this.ctx = ctx;
  this.overlayCtx = overlayCtx;
  this.data = data;

  var settings = {};
  settings.animationSteps = 10;
  settings.displayed = Object.keys(data.names);
  settings.total = data.columns[0].length - 1;
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
  this.settings = settings;

  this.drawLegend();
  this.drawChart();
  this.bindMouseEvents();
}

// Bind mouse events
Chart.prototype.bindMouseEvents = function () {
  var self = this;
  var currentIndex;
  this.overlay.addEventListener("mousemove", function(e) {
    var rect = e.target.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    if (
      self.settings.view.x0 <= x && x <= self.settings.view.x1 &&
      self.settings.view.y1 <= y && y <= self.settings.view.y0
    ) {
      var viewPoint = applyTransform(x, y, self.settings.view.transform, true);
      var pointerIndex = binarySearch(self.data.columns[0], viewPoint[0], function (a, b) { return a - b; });
      if (pointerIndex < 0) {
        pointerIndex = Math.abs(pointerIndex) - 1;
      }
      if (pointerIndex === currentIndex) { return; }
      currentIndex = pointerIndex;
      renderVRule();
      renderTooltip();
    }
  });

  var tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.style.opacity = "0";
  this.container.appendChild(tooltip);

  function renderTooltip() {
    tooltip.innerHTML = "";
    tooltip.style.opacity = "1";
    var xValue = self.data.columns[0][currentIndex];
    var xCaption = document.createElement("div");
    xCaption.textContent = new Date(xValue).toDateString();
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
    var width = tooltip.offsetWidth;
    var left = applyTransform(xValue, 0, self.settings.view.transform)[0];
    left -= width / 2;
    tooltip.style.left = "";
    tooltip.style.right = "";
    if (left <= 0) {
      tooltip.style.left = 0;
    } else if (left + width >= self.settings.view.x1) {
      tooltip.style.right = 0;
    } else {
      tooltip.style.left = left + "px";
    }
  }

  function renderVRule() {
    var overlayCtx = self.overlayCtx;
    overlayCtx.save();
    overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
    overlayCtx.strokeStyle = "#aaa";
    overlayCtx.save();
    var transform = self.settings.view.transform;
    overlayCtx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    overlayCtx.beginPath();
    var x = self.data.columns[0][currentIndex];
    var y0 = self.settings.view.transform.minY;
    var y1 = self.settings.view.transform.maxY;
    overlayCtx.moveTo(x, y0);
    overlayCtx.lineTo(x, y1);
    overlayCtx.restore();
    overlayCtx.stroke();
    overlayCtx.restore();
  }
};

// Draw chart with animation effect
Chart.prototype.drawChart = function () {

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
    this.clear();
    this.renderView(this.settings.preview, actualPreviewTransform);
    this.renderView(this.settings.view, actualViewTransform);
    this.settings.preview.transform = actualPreviewTransform;
    this.settings.view.transform = actualViewTransform;
    return;
  }

  var previewTransformDelta = this.calcTransformDelta(actualPreviewTransform, formerPreviewTransform);
  var viewTransformDelta = this.calcTransformDelta(actualViewTransform, formerViewTransform);

  var steps = this.settings.animationSteps;
  var step = 1;
  function renderStep() {
    for (var key in actualPreviewTransform) {
      actualPreviewTransform[key] = formerPreviewTransform[key] + previewTransformDelta[key] / steps * step;
      actualViewTransform[key] = formerViewTransform[key] + viewTransformDelta[key] / steps * step;
      if (key === "begin" || key === "end") {
        actualPreviewTransform[key] = actualPreviewTransform[key] >> 0;
        actualViewTransform[key] = actualViewTransform[key] >> 0;
      }
    }
    self.clear();
    self.renderView(self.settings.preview, actualPreviewTransform);
    self.renderView(self.settings.view, actualViewTransform);
    self.settings.preview.transform = actualPreviewTransform;
    self.settings.view.transform = actualViewTransform;
    if (++step <= steps) {
      requestAnimationFrame(renderStep);
    }
  }
  requestAnimationFrame(renderStep);
};

Chart.prototype.calcTransformDelta = function (actual, former) {
  var delta = {};
  for (var key in actual) {
    delta[key] = actual[key] - former[key];
  }
  return delta;
};

// Draw legend with column controls
Chart.prototype.drawLegend = function () {
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
    label.className = "checkbox-round-label";
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
Chart.prototype.calcTransform = function (view, begin, end) {
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

  for (i = 0, column; (column = this.data.columns[i]); i++) {
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

Chart.prototype.clear = function () {
  var ctx = this.ctx;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

// Render view / preview
Chart.prototype.renderView = function (view, transform) {
  var ctx = this.ctx;
  this.drawLabels(view, transform);

  ctx.save();
  ctx.lineWidth = view.lineWidth;
  var i, j, column_key, column, x0, y0, x, y;
  for (i = 0, column; (column = this.data.columns[i]); i++) {
    column_key = column[0];
    if (column_key === "x" || this.settings.displayed.indexOf(column_key) < 0) {
      continue;
    }
    ctx.strokeStyle = this.data.colors[column_key];
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    x0 = this.data.columns[0][transform.begin];
    y0 = column[transform.begin];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (j = transform.begin; j <= transform.end; j += transform.xStep) {
      x = this.data.columns[0][j];
      y = column[j];
      ctx.lineTo(x, y);
    }
    ctx.restore();
    ctx.stroke();
  }
  ctx.restore();
};

// Draw labels in view
Chart.prototype.drawLabels = function (view, transform) {
  if (!view.labels) { return; }

  var ctx = this.ctx;
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "bottom";
  ctx.strokeStyle = "#eee";
  ctx.fillStyle = "#aaa";
  ctx.lineWidth = 1;
  var yStep = Math.round( (transform.maxY - transform.minY) / view.labels);
  var power = Math.abs(yStep).toString().length - 1;
  yStep = Math.round( yStep / Math.pow(10, power) ) * Math.pow(10, power);
  var y = Math.round(transform.minY / yStep) * yStep;
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
      ctx.strokeStyle = "#aaa";
    } else {
      ctx.strokeStyle = "#eee";
    }
    ctx.stroke();
    var labelPosition = applyTransform(x0, y, transform);
    ctx.fillText(y, labelPosition[0], labelPosition[1] - 5);
    y = y + yStep;
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

// Binary search helper
function binarySearch(arr, el, fn) {
  var m = 0;
  var n = arr.length - 1;
  while (m <= n) {
    var k = (n + m) >> 1;
    var cmp = fn(el, arr[k]);
    if (cmp > 0) {
      m = k + 1;
    } else if(cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return -m - 1;
}
