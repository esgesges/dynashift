const client = mqtt.connect('ws://localhost:9001');
const speedValue = document.getElementById('speedValue');
const angleValue = document.getElementById('angleValue');
const pressureValue = document.getElementById('pressureValue');
const timeValue = document.getElementById('timeValue');
const powerButtonImage = document.getElementById('powerImage') 
var speed = 0;
var angle = 0;
var pressure = 0;

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
    speed = Number(message)
    speedValue.textContent = "speed:\t" + message.toString() + " km/h";
    timeValue.textContent = "time:\t" + new Date().getHours().toString() + ":" + new Date().getMinutes().toString() + ":" + new Date().getSeconds().toString();
  }

  if (topic === 'test/angle') {
    angle = Number(message)
    angleValue.textContent = "angle:\t" + message.toString() + " deg";
  }

  if (topic === 'test/pressure') {
    pressure = Number(message)
    pressureValue.textContent = "pressure:\t" + message.toString() + " bar";
  }

  if (topic === 'test/power') {
    if (message.toString() === 'off') {
      powerButtonImage.src = 'offswitch.png';
    } else if (message.toString() === 'on') {
      powerButtonImage.src = 'onswitch.png';
    } else {
      powerButtonImage.src = 'offswitch.png';
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

  const ctx = document.getElementById('graph1').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{ label: 'Angle', data: [], borderColor: 'rgb(75, 192, 192)' }]
    },
    options: {scales: {y: { min: 0, max: 200 }}}
  });

  n = 0;
  setInterval(() => {
    n += 1;
    const hours = new Date().getHours().toString();
    const minutes = new Date().getMinutes().toString();
    const seconds = new Date().getSeconds().toString();
    const now = minutes + ":" + seconds;
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(speed);

    // Keep only last 20 points
    if (chart.data.labels.length > 20) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.update("none");
  }, 100);


  const ctx2 = document.getElementById('graph2').getContext('2d');
  const chart2 = new Chart(ctx2, {
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
    chart2.data.labels.push(now);
    chart2.data.datasets[0].data.push(angle);
    chart2.data.datasets[1].data.push(pressure);

    // Keep only last 20 points
    if (chart2.data.labels.length > 20) {
      chart2.data.labels.shift();
      chart2.data.datasets[0].data.shift();
      chart2.data.datasets[1].data.shift();
    }

    chart2.update("none");
  }, 100);

// BLE
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

let bleDevice = null;
let bleTxCharacteristic = null;
let bleRxCharacteristic = null;
let bleUserDisconnected = false;
let bleDisconnectsSinceConnect = 0;
let bleReconnectAttempts = 0;
let bleReconnectTimer = null;
const BLE_MAX_RECONNECT_ATTEMPTS = 15;
const BLE_RECONNECT_DELAY_MS = 1500;

function bleLog(message) {
  console.log('[BLE]', message);
}

function handleBleNotification(event) {
  const value = new TextDecoder().decode(event.target.value);
  for (const line of value.split('\n')) {
    const msg = line.trim();
    if (msg) {
      bleLog(msg);
    }
  }
}

async function attachToBleDevice(dev) {
  bleDevice = dev;
  bleDevice.removeEventListener('gattserverdisconnected', onBleDisconnected);
  bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);

  const server = await bleDevice.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  bleTxCharacteristic = await service.getCharacteristic(TX_UUID);

  try {
    bleRxCharacteristic = await service.getCharacteristic(RX_UUID);
  } catch (err) {
    bleRxCharacteristic = null;
  }

  await bleTxCharacteristic.startNotifications();
  bleTxCharacteristic.addEventListener('characteristicvaluechanged', handleBleNotification);
}

async function connectBle() {
  if (!navigator.bluetooth) {
    console.error('[BLE] Web Bluetooth not supported in this browser');
    return;
  }

  try {
    bleUserDisconnected = false;
    bleDisconnectsSinceConnect = 0;
    bleReconnectAttempts = 0;
    if (bleReconnectTimer) {
      clearTimeout(bleReconnectTimer);
      bleReconnectTimer = null;
    }

    bleLog('Searching for ASTRAKOON...');
    const dev = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'ASTRAKOON' }],
      optionalServices: [SERVICE_UUID]
    });

    bleLog('Connecting...');
    await attachToBleDevice(dev);
    bleLog('Connected to ' + bleDevice.name);
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      console.error('[BLE] Connection error:', err.message);
    }
  }
}

async function tryBleReconnect() {
  if (bleUserDisconnected || !bleDevice) {
    return;
  }

  if (bleReconnectAttempts >= BLE_MAX_RECONNECT_ATTEMPTS) {
    bleLog('Reconnect failed after ' + BLE_MAX_RECONNECT_ATTEMPTS + ' attempts');
    return;
  }

  bleReconnectAttempts += 1;
  bleLog('Reconnect attempt ' + bleReconnectAttempts + '/' + BLE_MAX_RECONNECT_ATTEMPTS);

  try {
    await attachToBleDevice(bleDevice);
    bleReconnectAttempts = 0;
    bleLog('Reconnected');
  } catch (err) {
    bleReconnectTimer = setTimeout(tryBleReconnect, BLE_RECONNECT_DELAY_MS);
  }
}

function onBleDisconnected() {
  if (bleUserDisconnected) {
    bleLog('Disconnected');
    return;
  }

  bleDisconnectsSinceConnect += 1;

  if (bleDisconnectsSinceConnect === 1) {
    bleLog('Disconnected, waiting for device authorization...');
    if (bleReconnectTimer) {
      clearTimeout(bleReconnectTimer);
    }
    bleReconnectTimer = setTimeout(tryBleReconnect, BLE_RECONNECT_DELAY_MS);
  } else {
    bleLog('Disconnected, reload the page to connect again');
  }
}

connectBle();