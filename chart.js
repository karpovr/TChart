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

  this.id = Date.now();
  this.container = container;
  this.canvas = canvas;
  this.overlay = overlay;
  this.ctx = ctx;
  this.overlayCtx = overlayCtx;
  this.data = data;

  var settings = {};
  this.settings = settings;
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
  settings.day = {
    label: "#96a2aa",
    yline: "#f2f4f5",
    vline: "#dfe6eb",
    zline: "#ecf0f3",
    bg: "#fff"
  };
  settings.night = {
    label: "#546778",
    yline: "#293544",
    vline: "#3b4a5a",
    zline: "#313d4d",
    bg: "#242f3e"
  };

  // Listen to mode switch event
  var self = this;
  var body = document.getElementsByTagName("body")[0];
  body.addEventListener("mode", function (e) {
    self.settings.mode = e.detail;
    self.drawChart();
  });
  settings.mode = body.className.indexOf("night") >= 0 ? "night" : "day";

  this.drawLegend();
  this.drawChart();
  this.setMainInteraction();
  this.setPreviewInteraction();
}

Chart.prototype.setPreviewInteraction = function () {
  var self = this;
  var ctx = this.overlayCtx;
  var view = this.settings.view;
  var preview = this.settings.preview;
  ctx.save();
  ctx.fillStyle = "#88a";
  ctx.globalAlpha = 0.1;
  ctx.fillRect(preview.x0, preview.y0, preview.x1 - preview.x0, preview.y1 - preview.y0);
  ctx.restore();
  ctx.stroke();

  var begin = view.transform.begin;
  var end = view.transform.end;
  var xBegin = this.data.columns[0][begin];
  var xEnd = this.data.columns[0][end];
  var x0 = applyTransform(xBegin, 0, preview.transform)[0];
  var x1 = applyTransform(xEnd, 0, preview.transform)[0];

  ctx.clearRect(x0, preview.y0, x1, preview.y1 - preview.y0);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, preview.y0);
  ctx.lineTo(x1, preview.y0);
  ctx.lineTo(x1, preview.y1);
  ctx.lineTo(x0, preview.y1);
  ctx.closePath();
  // Hole
  ctx.moveTo(x0 + 5, preview.y0 - 1);
  ctx.lineTo(x1 - 5, preview.y0 - 1);
  ctx.lineTo(x1 - 5, preview.y1 + 1);
  ctx.lineTo(x0 + 5, preview.y1 + 1);
  ctx.closePath();
  //fill
  ctx.fillStyle = "#445";
  ctx.globalAlpha = 0.2;
  ctx.fill("evenodd");
  ctx.restore();

  this.overlay.addEventListener("mousemove", function(e) {
    var rect = e.target.getBoundingClientRect();
    var x = Math.round(e.clientX - rect.left);
    var y = Math.round(e.clientY - rect.top);
    if (
      self.settings.preview.x0 <= x && x <= self.settings.preview.x1 &&
      self.settings.preview.y1 <= y && y <= self.settings.preview.y0
    ) {
      x = applyTransform(x, y, self.settings.preview.transform, true)[0];
      var column = self.data.columns[0];
      var pointerIndex = binarySearch(column, x, function (a, b) { return a - b; });
      if (pointerIndex < 0) {
        pointerIndex = Math.abs(pointerIndex) - 1;
      }
      var x1 = column[pointerIndex];
      var x2 = column[pointerIndex - 1];
      if ( Math.abs(x2 - x) < Math.abs(x1 - x) ) {
        pointerIndex = pointerIndex - 1;
      }
      console.log(pointerIndex);
    }
  });

};

// Set interaction with chart
Chart.prototype.setMainInteraction = function () {
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
      x = applyTransform(x, y, self.settings.view.transform, true)[0];
      var column = self.data.columns[0];
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
      renderVRule();
      renderTooltip();
    }
  });

  var tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.id = "chart-tooltip-" + this.id;
  tooltip.style.opacity = "0";
  this.container.appendChild(tooltip);

  function renderTooltip() {
    tooltip.innerHTML = "";
    var xValue = self.data.columns[0][currentIndex];
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
    var left = applyTransform(xValue, 0, self.settings.view.transform)[0];
    left += 15;
    tooltip.style.left = "";
    tooltip.style.right = "";
    if ( left + width <= self.settings.view.x1 ) {
      tooltip.style.left = left + "px";
    } else {
      tooltip.style.right = self.settings.view.x1 - left + 30 + "px";
    }
  }

  function renderVRule(chart) {
    var colors = self.settings[self.settings.mode];
    var overlayCtx = self.overlayCtx;
    overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
    var transform = self.settings.view.transform;
    overlayCtx.save();
    overlayCtx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    overlayCtx.beginPath();
    var x = self.data.columns[0][currentIndex];
    var y0 = self.settings.view.transform.minY;
    var y1 = self.settings.view.transform.maxY;
    overlayCtx.moveTo(x, y0);
    overlayCtx.lineTo(x, y1);
    overlayCtx.restore();
    overlayCtx.strokeStyle = colors.vline;
    overlayCtx.lineWidth = 1;
    overlayCtx.stroke();

    self.data.columns.forEach(function (column) {
      var columnId = column[0];
      if ( self.settings.displayed.indexOf(columnId) >= 0 ) {
        var y = column[currentIndex];
        var canvasPoint = applyTransform(x, y, transform);
        overlayCtx.beginPath();
        overlayCtx.arc(canvasPoint[0], canvasPoint[1], 5, 0, 2 * Math.PI, false);
        var color = self.data.colors[columnId];
        overlayCtx.strokeStyle = color;
        overlayCtx.fillStyle = colors.bg;
        overlayCtx.lineWidth = 3;
        overlayCtx.fill();
        overlayCtx.stroke();
      }
    });
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
    renderViews(this);
    return;
  }

  var previewTransformDelta = this.calcTransformDelta(actualPreviewTransform, formerPreviewTransform);
  var viewTransformDelta = this.calcTransformDelta(actualViewTransform, formerViewTransform);

  var steps = this.settings.animationSteps;
  var step = 1;
  requestAnimationFrame(renderStep);

  function renderStep() {
    for (var key in actualPreviewTransform) {
      actualPreviewTransform[key] = formerPreviewTransform[key] + previewTransformDelta[key] / steps * step;
      actualViewTransform[key] = formerViewTransform[key] + viewTransformDelta[key] / steps * step;
      if (key === "begin" || key === "end") {
        actualPreviewTransform[key] = actualPreviewTransform[key] >> 0;
        actualViewTransform[key] = actualViewTransform[key] >> 0;
      }
    }
    renderViews(self);
    if (++step <= steps) {
      requestAnimationFrame(renderStep);
    }
  }

  function renderViews(chart) {
    chart.clear();
    chart.renderView(chart.settings.preview, actualPreviewTransform);
    chart.renderView(chart.settings.view, actualViewTransform);
    chart.settings.preview.transform = actualPreviewTransform;
    chart.settings.view.transform = actualViewTransform;
  }
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

  for (i = 0; column = this.data.columns[i]; i++) {
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
  var overlayCtx = this.overlayCtx;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  overlayCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  var tooltip = document.getElementById("chart-tooltip-" + this.id);
  if (tooltip) {
    tooltip.style.opacity = 0;
  }
};

// Render view / preview
Chart.prototype.renderView = function (view, transform) {
  var ctx = this.ctx;
  this.drawLabels(view, transform);

  ctx.save();
  ctx.lineWidth = view.lineWidth;
  var i, j, column_key, column, x0, y0, x, y;
  for (i = 0; column = this.data.columns[i]; i++) {
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
  var colors = this.settings[this.settings.mode];
  var ctx = this.ctx;
  ctx.save();
  ctx.font = "14px sans-serif";
  ctx.textBaseline = "bottom";
  ctx.strokeStyle = colors.yline;
  ctx.fillStyle = colors.label;
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
  var xStep = Math.floor( (transform.end - transform.begin) / view.labels );
  var x = transform.begin;
  while ( x < transform.end) {
    var value = this.data.columns[0][x];
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
