/*
 * Telegram contest: Charts
 *
 * Copyright 2019 Roman Karpov (roman.karpov@gmail.com)
 *
 * Date: 2019-03-11T09:59Z
 */

function Chart(data, container, width, height) {
  width = width || 400;
  height = height || 600;
  var view = document.createElement("canvas");
  view.className = "view";
  view.width = width;
  view.height = Math.round(height / 10 * 8);
  var viewCtx = view.getContext("2d");
  container.appendChild(view);

  var overView = document.createElement("canvas");
  overView.className = "view-overlay";
  overView.width = view.width;
  overView.height = view.height;
  container.appendChild(overView);
  var overViewCtx = overView.getContext("2d");

  var preview = document.createElement("canvas");
  preview.width = width;
  preview.height = Math.round(height / 10);
  preview.className = "preview";
  preview.style.top = view.height + "px";
  var previewCtx = preview.getContext("2d");
  container.appendChild(preview);

  var overPreview = document.createElement("canvas");
  overPreview.className = "preview-overlay";
  overPreview.width = preview.width;
  overPreview.height = preview.height;
  overPreview.style.top = preview.style.top;
  container.appendChild(overPreview);
  var overPreviewCtx = overPreview.getContext("2d");

  this.id = Date.now();
  this.container = container;
  this.view = view;
  this.viewCtx = viewCtx;
  this.overView = overView;
  this.overViewCtx = overViewCtx;
  this.preview = preview;
  this.previewCtx = previewCtx;
  this.overPreview = overPreview;
  this.overPreviewCtx = overPreviewCtx;
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
    lineWidth: 1,
    labels: 0
  };
  settings.view = {
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
  this.setViewInteraction();
  this.setPreviewInteraction();
}

Chart.prototype.setPreviewInteraction = function setPreviewInteraction() {
  //console.log( arguments.callee.name );
  var self = this;
  var preview = this.preview;
  var overPreview = this.overPreview;
  var previewFrame = this.previewFrame;

  var threshold = 10;
  var column = this.data.columns[this.settings.xColumn];

  overPreview.addEventListener("mousedown", setMove);
  overPreview.addEventListener("touchstart", setMove);

  var target;
  var prevPointerX;

  function unsetMove(e) {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("touchmove", move);
    document.removeEventListener("mouseup", unsetMove);
    document.removeEventListener("touchend", unsetMove);
  }

  function setMove(e) {
    e.preventDefault();
    var rect = e.target.getBoundingClientRect();
    var clientX;
    if (e.type === "mousedown") {
      clientX = e.clientX;
    } else {
      clientX = e.changedTouches[0].clientX;
    }
    var x = Math.round(clientX - rect.left);
    prevPointerX = x;
    if ( Math.abs(x - previewFrame.x0) <= threshold ) {
      target = "begin";
    } else if ( Math.abs(x - previewFrame.x1) <= threshold ) {
      target = "end";
    } else if (previewFrame.x0 < x && x < previewFrame.x1) {
      target = "frame";
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("touchmove", move, {passive: false});
    document.addEventListener("mouseup", unsetMove);
    document.addEventListener("touchend", unsetMove);
  }

  function move(e) {
    e.preventDefault();
    var rect = overPreview.getBoundingClientRect();
    var clientX;
    if (e.type === "mousemove") {
      clientX = e.clientX;
    } else {
      clientX = e.changedTouches[0].clientX;
    }
    var x = Math.round(clientX - rect.left);
    var deltaX = x - prevPointerX;
    prevPointerX = x;

    var prevBegin = self.settings.begin;
    var prevEnd = self.settings.end;
    var chartBeginX, chartEndX, chartBeginIndex, chartEndIndex;

    if (target === "begin") {
      if (Math.abs(previewFrame.x1 - previewFrame.x0 - deltaX) < threshold * 4) { return; }
      previewFrame.x0 += deltaX;
      if (previewFrame.x0 < 0) {
        previewFrame.x0 = 0;
      }
      chartBeginX = applyTransform(previewFrame.x0, 0, preview, true)[0];
      chartBeginIndex = Math.abs(binarySearch(column, chartBeginX, function (a, b) { return a - b; }));
      self.settings.begin = chartBeginIndex;
      if (self.settings.begin < 1) {
        self.settings.begin = 1;
      }
    } else if (target === "end") {
      if ( Math.abs(previewFrame.x1 + deltaX - previewFrame.x0) < threshold * 4 ) { return; }
      previewFrame.x1 += deltaX;
      if (previewFrame.x1 > preview.width) {
        previewFrame.x1 = preview.width;
      }
      chartEndX = applyTransform(previewFrame.x1, 0, preview, true)[0];
      chartEndIndex = Math.abs(binarySearch(column, chartEndX, function (a, b) { return a - b; }));
      self.settings.end = chartEndIndex;
      if (self.settings.end > self.settings.total) {
        self.settings.end = self.settings.total;
      }
    } else if (target === "frame") {
      var previewFrameWidth = previewFrame.x1 - previewFrame.x0;
      if (previewFrame.x0 + deltaX < 0) {
        previewFrame.x0 = 0;
        previewFrame.x1 = previewFrameWidth;
      } else if (previewFrame.x1 + deltaX > preview.width) {
        previewFrame.x1 = preview.width;
        previewFrame.x0 = preview.width - previewFrameWidth;
      } else {
        previewFrame.x0 += deltaX;
        previewFrame.x1 += deltaX;
      }
      var indexDelta = self.settings.end - self.settings.begin;
      chartBeginX = applyTransform(previewFrame.x0, 0, preview, true)[0];
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
};

Chart.prototype.drawPreviewControl = function drawPreviewControl() {
  //console.log( arguments.callee.name );
  var self = this;
  var ctx = this.overPreviewCtx;
  var preview = this.preview;
  var colors = this.settings[this.settings.mode];

  ctx.save();
  ctx.fillStyle = colors.previewMask;
  ctx.globalAlpha = colors.previewMaskA;
  ctx.fillRect(0, 0, preview.width, preview.height);
  ctx.restore();

  var x0, x1;

  if (!this.previewFrame) {
    var xColumn = this.settings.xColumn;
    var begin = this.settings.begin;
    var end = this.settings.end;
    var xBegin = this.data.columns[xColumn][begin];
    var xEnd = this.data.columns[xColumn][end];
    x0 = applyTransform(xBegin, 0, preview)[0];
    x1 = applyTransform(xEnd, 0, preview)[0];
    this.previewFrame = {
      x0: x0,
      x1: x1,
    };
  }
  x0 = this.previewFrame.x0;
  x1 = this.previewFrame.x1;

  ctx.clearRect(x0, 0, x1 - x0, preview.height);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, preview.height);
  ctx.lineTo(x1, preview.height);
  ctx.lineTo(x1, 0);
  ctx.lineTo(x0, 0);
  ctx.closePath();
  ctx.moveTo(x0 + 5, preview.height - 1);
  ctx.lineTo(x1 - 5, preview.height - 1);
  ctx.lineTo(x1 - 5, 1);
  ctx.lineTo(x0 + 5, 1);
  ctx.closePath();
  ctx.fillStyle = colors.previewFrame;
  ctx.globalAlpha = colors.previewFrameA;
  ctx.fill("evenodd");
  ctx.restore();
};

Chart.prototype.setViewInteraction = function setViewInteraction() {
  //console.log( arguments.callee.name );
  var self = this;
  var xColumn = this.settings.xColumn;
  var column = this.data.columns[xColumn];
  var view = this.view;
  var currentIndex;
  this.overView.addEventListener("mousemove", showInfo);
  this.overView.addEventListener("touchmove", showInfo);

  var tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.id = "chart-tooltip-" + this.id;
  tooltip.style.opacity = "0";
  this.container.appendChild(tooltip);

  function showInfo(e) {
    var rect = e.target.getBoundingClientRect();
    var clientX;
    if (e.type === "mousemove") {
      clientX = e.clientX;
    } else {
      clientX = e.changedTouches[0].clientX;
    }
    var x = Math.round(clientX - rect.left);
    x = Math.round(applyTransform(x, 0, view, true)[0]);
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

  function renderTooltip(currentIndex) {
    tooltip.innerHTML = "";
    var xValue = column[currentIndex];
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
    var left = Math.round(applyTransform(xValue, 0, view)[0]);
    left += 15;
    tooltip.style.left = "";
    tooltip.style.right = "";

    if ( left + width <= view.width || width >= left - 30) {
      tooltip.style.left = left + "px";
    } else {
      tooltip.style.right = view.width - left + 30 + "px";
    }
  }

  function renderRuler(currentIndex) {
    var colors = self.settings[self.settings.mode];
    var view = self.view;
    var ctx = self.overViewCtx;
    ctx.clearRect(0, 0, view.width, view.height);
    var transform = view.transform;
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    ctx.beginPath();
    var x = self.data.columns[xColumn][currentIndex];
    var y0 = view.transform.minY;
    var y1 = view.transform.maxY;
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.restore();
    ctx.strokeStyle = colors.vline;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    self.data.columns.forEach(function (column) {
      var columnId = column[0];
      if ( self.settings.displayed.indexOf(columnId) >= 0 ) {
        var y = column[currentIndex];
        var canvasPoint = applyTransform(x, y, view);
        ctx.beginPath();
        ctx.arc(canvasPoint[0], canvasPoint[1], 5, 0, 2 * Math.PI, false);
        var color = self.data.colors[columnId];
        ctx.strokeStyle = color;
        ctx.fillStyle = colors.bg;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();
  }
};

// Draw chart with animation effect
Chart.prototype.drawChart = function drawChart() {
  //console.log( arguments.callee.name );
  var self = this;
  var formerPreviewTransform = this.preview.transform;
  var formerViewTransform = this.view.transform;

  var actualPreviewTransform = this.calcTransform(this.preview, 1, this.settings.total);
  var actualViewTransform = this.calcTransform(this.view, this.settings.begin, this.settings.end);

  if (!actualPreviewTransform) {
    this.clear();
    return;
  }
  if (!formerPreviewTransform) {
    renderViews(this);
    return;
  }

  var previewTransformDelta = calcTransformDelta(actualPreviewTransform, formerPreviewTransform);
  var viewTransformDelta = calcTransformDelta(actualViewTransform, formerViewTransform);

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
    chart.renderView(chart.view, actualViewTransform);
    chart.view.transform = actualViewTransform;
    chart.renderView(chart.preview, actualPreviewTransform);
    chart.preview.transform = actualPreviewTransform;
    chart.drawPreviewControl();
  }

  function calcTransformDelta(actual, former) {
    var delta = {};
    for (var key in actual) {
      delta[key] = actual[key] - former[key];
    }
    return delta;
  }

};

Chart.prototype.drawLegend = function drawLegend() {
  //console.log( arguments.callee.name );
  var self = this;
  var legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.style.width = this.view.width + "px";
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
  transform.yOffset = -transform.maxY * transform.yRatio;
  transform.xStep = Math.floor( (end - begin) / view.width ) || 1;
  return transform;
};

Chart.prototype.clear = function clear() {
  //console.log( arguments.callee.name );
  var viewCtx = this.viewCtx;
  var overViewCtx = this.overViewCtx;
  var previewCtx = this.previewCtx;
  var overPreviewCtx = this.overPreviewCtx;
  this.viewCtx.clearRect(0, 0, this.viewCtx.canvas.width, this.viewCtx.canvas.height);
  this.overViewCtx.clearRect(0, 0, this.overViewCtx.canvas.width, this.overViewCtx.canvas.height);
  this.previewCtx.clearRect(0, 0, this.previewCtx.canvas.width, this.previewCtx.canvas.height);
  this.overPreviewCtx.clearRect(0, 0, this.overPreviewCtx.canvas.width, this.overPreviewCtx.canvas.height);
  var tooltip = document.getElementById("chart-tooltip-" + this.id);
  if (tooltip) {
    tooltip.style.opacity = 0;
  }
};

// Render view / preview
Chart.prototype.renderView = function renderView(view, transform) {
  //console.log( arguments.callee.name );
  var ctx = view.getContext("2d");
  this.drawLabels(view, transform);
  var columns = this.data.columns;
  var xColumn = columns[this.settings.xColumn];
  var displayed = this.settings.displayed;
  var colors = this.data.colors;

  ctx.save();
  ctx.lineWidth = view.lineWidth || 1;
  var i, j, column_key, column, x0, y0, x, y;
  for (i = 0; (column = columns[i]); i++) {
    column_key = column[0];
    if (column_key === "x" || displayed.indexOf(column_key) < 0) {
      continue;
    }
    ctx.strokeStyle = colors[column_key];
    ctx.save();
    ctx.setTransform(transform.xRatio, 0, 0, transform.yRatio, transform.xOffset, transform.yOffset);
    x0 = xColumn[transform.begin];
    y0 = column[transform.begin];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (j = transform.begin; j <= transform.end; j += transform.xStep) {
      x = xColumn[j];
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
  var xColumn = this.data.columns[this.settings.xColumn];

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
    var value = xColumn[x];
    var labelX = applyTransform(value, 0, transform)[0];
    value = new Date(value).toDateString().split(" ").slice(1, 3).join(" ");
    ctx.fillText(value, labelX, view.y0 + 10);
    x += xStep;
  }
  ctx.restore();
};

// Transform helper
function applyTransform(x, y, view, reverse) {
  var xRatio = view.transform.xRatio;
  var yRatio = view.transform.yRatio;
  var xOffset = view.transform.xOffset;
  var yOffset = view.transform.yOffset;
  var result;
  if (reverse) {
    result = [
      x / xRatio - xOffset / xRatio,
      y / yRatio - yOffset / yRatio
    ];
  } else {
    result = [
      x * xRatio + xOffset,
      y * yRatio + yOffset
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
  var i = 1, j, k = array.length - 1, cmp_res;
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
