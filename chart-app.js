/*
 * Telegram contest: Charts
 * Copyright 2019 Roman Karpov (roman.karpov@gmail.com)
 * Date: 2019-03-11T09:59Z
 */

(function (global) {

  global.ChartsApp = function ChartsApp() {

    var charts = [];

    var appContainer = document.getElementById("charts-app");

    var buttonsContainer = document.createElement("div");
    buttonsContainer.id = "buttons-container";
    appContainer.appendChild(buttonsContainer);

    var chartsContainer = document.createElement("div");
    chartsContainer.id = "charts-container";
    appContainer.appendChild(chartsContainer);

    var loadDataButton = document.createElement("input");
    loadDataButton.type = "button";
    loadDataButton.value = "Load default data";
    loadDataButton.addEventListener("click", loadData.bind(undefined, "chart_data.json"));
    buttonsContainer.appendChild(loadDataButton);

    var load1000Button = document.createElement("input");
    load1000Button.type = "button";
    load1000Button.value = "Load 1 000";
    load1000Button.addEventListener("click", loadData.bind(undefined, "1000.json"));
    buttonsContainer.appendChild(load1000Button);

    var load10000Button = document.createElement("input");
    load10000Button.type = "button";
    load10000Button.value = "Load 10 000";
    load10000Button.addEventListener("click", loadData.bind(undefined, "10000.json"));
    buttonsContainer.appendChild(load10000Button);

    var load100000Button = document.createElement("input");
    load100000Button.type = "button";
    load100000Button.value = "Load 100 000";
    load100000Button.addEventListener("click", loadData.bind(undefined, "100000.json"));
    buttonsContainer.appendChild(load100000Button);

    var uploadDataButton = document.createElement("input");
    uploadDataButton.type = "file";
    uploadDataButton.addEventListener("change", uploadData);
    buttonsContainer.appendChild(uploadDataButton);

    var clearChartsButton = document.createElement("input");
    clearChartsButton.type = "button";
    clearChartsButton.value = "Clear";
    clearChartsButton.addEventListener("click", clearCharts);
    buttonsContainer.appendChild(clearChartsButton);

    var modeSwitch = document.createElement("a");
    modeSwitch.id = "mode-switch";
    modeSwitch.className = "mode-switch";
    modeSwitch.href = "#";
    modeSwitch.textContent = "Switch to Night Mode";
    modeSwitch.addEventListener("click", function (e) {
      var body = document.getElementsByTagName("body")[0];
      e.preventDefault();
      var cmd = e.target.textContent;
      if (cmd === "Switch to Night Mode") {
        body.className = "night-mode";
        e.target.textContent = "Switch to Day Mode";
        body.dispatchEvent(new CustomEvent("mode", { "detail": "night" }));
      } else {
        body.className = "day-mode";
        e.target.textContent = "Switch to Night Mode";
        body.dispatchEvent(new CustomEvent("mode", { "detail": "day" }));
      }
    });
    appContainer.appendChild(modeSwitch);

    loadData("chart_data.json");

    function clearCharts () {
      charts.forEach(function (chart) {
        chart.destroy();
      });
      charts = [];
    }

    function loadData (file) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function () {
        charts = drawChart(JSON.parse(this.responseText));
      };
      xhr.open("get", file, true);
      xhr.send();
    }

    function uploadData (e) {
      try {
        var input = e.target;
        var file = input.files[0];
        var fileReader = new FileReader();
        fileReader.onload = processData;
        fileReader.readAsText(file);
        input.value = "";
      } catch (error) {
        alert("Something is wrong with the data");
        console.log(error);
      }
    }

    function processData (e) {
      var content = e.target.result;
      var data = JSON.parse(content);
      drawChart(data);
    }

    function drawChart(data) {
      clearCharts();
      var chartsContainer = document.getElementById("charts-container");
      return data.map(function (data, i) {
        var chart = new Chart({
          title: "Followers (###)".replace("###", i + 1),
          data: data,
          container: chartsContainer
        });
        return chart;
      });
    }
  };

})(this);
