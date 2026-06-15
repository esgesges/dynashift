const client = mqtt.connect('ws://localhost:9001');
const slider = document.getElementById('slider');
const powerButtonText = document.getElementById('power-button-text');
const powerButtonImage = document.getElementById('power-button-image');
const speedValue = document.getElementById('speedValue');
const angleValue = document.getElementById('angleValue');
const pressureValue = document.getElementById('pressureValue');

function modeToSliderValue(mode) {
  switch (mode) {
    case '1':
      return '100';
    case '2':
      return '50';
    case '3':
      return '0';
    default:
      return null;
  }
}

function sliderValueToMode(value) {
  switch (value) {
    case '100':
      return '1';
    case '50':
      return '2';
    case '0':
      return '3';
    default:
      return null;
  }
}

client.on('connect', () => {
  client.subscribe('test/#');
});

client.on('message', (topic, message) => {
  console.log(`[${topic}] ${message.toString()}`);
  if (topic === 'test/mode') {
    const sliderValue = modeToSliderValue(message.toString());
    if (sliderValue !== null) {
      slider.value = sliderValue;
    }
  }

  if (topic === 'test/speed') {
    speedValue.textContent = "speed: " + message.toString() + " km/h";
  }

  if (topic === 'test/angle') {
    angleValue.textContent = "angle: " + message.toString() + " deg";
  }

  if (topic === 'test/pressure') {
    pressureValue.textContent = "pressure: " + message.toString() + " bar";
  }

  if (topic === 'test/power') {
    if (message.toString() === 'off') {
      powerButtonText.textContent = "ready";
    } else if (message.toString() === 'on') {
      powerButtonText.textContent = "on";
    } else {
      powerButtonText.textContent = "error";
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

powerButtonImage.addEventListener('click', () => {
  if (powerButtonText.textContent === "ready") {
    client.publish('test/power', 'on');
    console.log("on");
  } else {
    client.publish('test/power', 'off');
    console.log("off");
  }
});

slider.addEventListener('input', () => {
  const mode = sliderValueToMode(slider.value);
  if (mode === null) {
    return;
  }
  client.publish('test/mode', mode);
  console.log("mode: " + mode);
});

  const ctx = document.getElementById('myChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{ label: 'Angle', data: [], borderColor: 'rgb(75, 192, 192)' }, { label: 'Pressure', data: [], borderColor: 'rgb(255, 99, 132)' }]
    }
  });

  n = 0;
  setInterval(() => {
    n += 1;
    const hours = new Date().getHours().toString();
    const minutes = new Date().getMinutes().toString();
    const seconds = new Date().getSeconds().toString();
    const now = minutes + ":" + seconds;
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(Math.random() * 100);
    chart.data.datasets[1].data.push(Math.random() * 100);

    // Keep only last 20 points
    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
      chart.data.datasets[1].data.shift();
    }

    chart.update("none");
  }, 100);
