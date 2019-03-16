/*
 * Telegram contest: Charts
 *
 * Copyright 2019 Roman Karpov (roman.karpov@gmail.com)
 * Released under the MIT license
 *
 * Date: 2019-03-11T09:59Z
 */

function ChartsApp() {

  init();

  drawDefaultHandler();

  function init () {
    var appContainer = document.getElementById("charts-app");

    var buttonsContainer = document.createElement("div");
    buttonsContainer.id = "buttons-container";
    appContainer.appendChild(buttonsContainer);

    var chartsContainer = document.createElement("div");
    chartsContainer.id = "charts-container";
    appContainer.appendChild(chartsContainer);

    var drawDefault = document.createElement("input");
    drawDefault.type = "button";
    drawDefault.value = "Draw default";
    drawDefault.addEventListener("click", drawDefaultHandler);
    buttonsContainer.appendChild(drawDefault);

    var uploadData = document.createElement("input");
    uploadData.type = "file";
    uploadData.addEventListener("change", uploadDataHandler);
    buttonsContainer.appendChild(uploadData);

    var clear = document.createElement("input");
    clear.type = "button";
    clear.value = "Clear";
    clear.addEventListener("click", clearHandler);
    buttonsContainer.appendChild(clear);
  }

  function clearHandler (e) {
    var chartsContainer = document.getElementById("charts-container");
    chartsContainer.innerHTML = "";
  }

  function drawDefaultHandler (e) {
    var defaultData = [
      {
        "columns":[
          ["x",1542412800000,1542499200000,1542585600000,1542672000000,1542758400000,1542812800000,1542999200000,1543085600000,1543172000000,1543258400000,1543312800000,1543499200000,1543585600000,1543672000000,1543758400000,1543812800000,1543999200000,1544085600000,1544172000000,1544258400000],
          ["y0",-37,20,32,39,32,-17,23,12,31,2,-3,12,31,13,43,-7,30,20,1,20],
          ["y1",22,12,30,40,55,1,6,39,25,5,12,21,13,14,5,10,6,19,5,50]
        ],
        "types":{
          "y0":"line","y1":"line","x":"x"
        },
        "names":{
          "y0":"Первый график","y1":"Второй график"
        },
        "colors":{
          "y0":"#3DC23F","y1":"#F34C44"
        }
      },
    ];
    drawChart(defaultData);
  }

  function uploadDataHandler (e) {
    try {
      var input = e.target;
      var file = input.files[0];
      var fileReader = new FileReader();
      fileReader.onload = processData;
      fileReader.readAsText(file);
      input.value = "";
    } catch (error) {
      alert("Something is wrong");
      console.log(error);
    }
  }

  function processData(e) {
    var content = e.target.result;
    var data = JSON.parse(content);
    drawChart(data);
  }

  function drawChart(data) {
    var chartsContainer = document.getElementById("charts-container");
    chartsContainer.innerHTML = "";
    var width = 350;
    var height = 500;
    data.forEach(function (item) {
      var chart = document.createElement("div");
      chart.className = "chart";
      chartsContainer.appendChild(chart);
      var chartItem = new Chart(item, chart);
    });
  }
}
