/*
 * Telegram contest: Charts
 *
 * Copyright 2019 Roman Karpov (roman.karpov@gmail.com)
 * Released under the MIT license
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
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  overlay.className = "overlay";
  var overlayCtx = overlay.getContext("2d");
  container.appendChild(overlay);

  this.container = container;
  this.canvas = canvas;
  this.overlay = overlay;
  this.ctx = ctx;
  this.overlayCtx = overlayCtx;
  this.data = data;

  var settings = {};
  settings.displayed = Object.keys(data.names);
  settings.total = data.columns[0].length - 1;
  settings.begin = settings.total - (settings.total >> 2);
  settings.end = settings.total;
  settings.preview = {
    x0: 0,
    y0: canvas.height,
    x1: canvas.width,
    y1: Math.floor(canvas.height - canvas.height / 10),
    lineWidth: 1,
    width: canvas.width,
    height: Math.floor(canvas.height / 10)
  };
  settings.view = {
    x0: 0,
    y0: canvas.height - 2 * settings.preview.height,
    x1: canvas.width,
    y1: 0,
    width: canvas.width,
    height: canvas.height - 2 * settings.preview.height,
    lineWidth: 2,
    labels: 5
  };
  this.settings = settings;

  this.renderView(this.settings.preview, 1, this.settings.total);
  this.drawLabels(this.settings.view, this.settings.begin, this.settings.end);
  this.renderView(this.settings.view, this.settings.begin, this.settings.end);
  this.drawCheckboxes();
}

Chart.prototype.drawChart = function () {
  var canvas = this.canvas;
  var overlay = this.overlay;
  var overlayCtx = this.overlayCtx;
  var transition = "opacity .5s";
  // Clear overlay and copy current chart
  overlay.style.transition = "";
  overlay.style.opacity = 1;
  overlayCtx.clearRect(0, 0, overlayCtx.canvas.width, overlayCtx.canvas.height);
  overlayCtx.drawImage(canvas, 0, 0);

  // Clear main canvas and draw renewed chart
  canvas.style.transition = "";
  canvas.style.opacity = 0;
  this.clear();
  this.renderView(this.settings.preview, 1, this.settings.total);
  this.drawLabels(this.settings.view, this.settings.begin, this.settings.end);
  this.renderView(this.settings.view, this.settings.begin, this.settings.end);

  overlay.style.transition = transition;
  overlay.style.opacity = 0;
  canvas.style.transition = transition;
  canvas.style.opacity = 1;

};

// Calculate extremes for given data range
Chart.prototype.drawCheckboxes = function () {
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

// Calculate extremes for given data range
Chart.prototype.calcTransform = function (view, begin, end) {
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
  transform.xDelta = transform.maxX - transform.minX;
  transform.yDelta = transform.maxY - transform.minY;
  transform.xRatio = view.width / transform.xDelta;
  transform.yRatio = view.height / transform.yDelta;
  transform.xOffset = -transform.minX * transform.xRatio;
  transform.yOffset = transform.maxY * transform.yRatio + view.y1;
  transform.xStep = Math.floor( (end - begin) / view.width ) || 1;
  view.transform = transform;
  return transform;
};

Chart.prototype.clear = function () {
  var ctx = this.ctx;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

Chart.prototype.renderView = function (view, begin, end) {
  var ctx = this.ctx;
  var transform = this.calcTransform(view, begin, end);

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
    ctx.setTransform(transform.xRatio, 0, 0, -transform.yRatio, transform.xOffset, transform.yOffset);
    x0 = this.data.columns[0][begin];
    y0 = column[begin];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (j = begin; j <= end; j += transform.xStep) {
      x = this.data.columns[0][j];
      y = column[j];
      ctx.lineTo(x, y);
    }
    ctx.restore();
    ctx.stroke();
  }
  ctx.restore();
};

Chart.prototype.drawLabels = function (view, begin, end) {
  var ctx = this.ctx;
  var transform = this.calcTransform(view, begin, end);

  // Draw labels
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "bottom";
  ctx.strokeStyle = "#eee";
  ctx.fillStyle = "#aaa";
  ctx.lineWidth = 1;
  var yStep = Math.round(transform.yDelta / view.labels);
  var power = Math.abs(yStep).toString().length - 1;
  yStep = Math.round( yStep / Math.pow(10, power) ) * Math.pow(10, power);
  var y = Math.round(transform.minY / yStep) * yStep;
  while ( y < transform.maxY) {
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, -transform.yRatio, transform.xOffset, transform.yOffset);
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

function applyTransform(x, y, transform) {
  return [
    x * transform.xRatio + transform.xOffset,
    -y * transform.yRatio + transform.yOffset
  ];
}
