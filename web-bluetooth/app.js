const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID = "0000fff4-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff5-0000-1000-8000-00805f9b34fb";

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const rotateBtn = document.getElementById("rotateBtn");
const sweepBtn = document.getElementById("sweepBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const logEl = document.getElementById("log");
const clearLogBtn = document.getElementById("clearLogBtn");

const yawInput = document.getElementById("yaw");
const pitchInput = document.getElementById("pitch");
const rollInput = document.getElementById("roll");
const timeInput = document.getElementById("time");
const modeInput = document.getElementById("mode");
const nameFilterInput = document.getElementById("nameFilter");

let device = null;
let server = null;
let notifyChar = null;
let writeChar = null;
let sweepTimer = null;
let sweepDir = 1;

function setStatus(connected, text) {
  statusDot.classList.toggle("connected", connected);
  statusText.textContent = text;
  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
  rotateBtn.disabled = !connected;
  sweepBtn.disabled = !connected;
}

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  logEl.textContent = `[${timestamp}] ${message}\n` + logEl.textContent;
}

function toHex(byteArray) {
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

async function connect() {
  if (!navigator.bluetooth) {
    log("Web Bluetooth not supported in this browser.");
    return;
  }

  const nameFilter = nameFilterInput.value.trim();
  const options = {
    optionalServices: [SERVICE_UUID],
  };

  if (nameFilter) {
    options.filters = [{ namePrefix: nameFilter }];
  } else {
    options.acceptAllDevices = true;
  }

  try {
    device = await navigator.bluetooth.requestDevice(options);
    device.addEventListener("gattserverdisconnected", onDisconnected);

    server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    notifyChar = await service.getCharacteristic(NOTIFY_UUID);
    writeChar = await service.getCharacteristic(WRITE_UUID);

    await notifyChar.startNotifications();
    notifyChar.addEventListener("characteristicvaluechanged", handleNotify);

    setStatus(true, `Connected to ${device.name || "device"}`);
    log("Connected");
  } catch (err) {
    log(`Connect failed: ${err.message || err}`);
    setStatus(false, "Disconnected");
  }
}

async function disconnect() {
  stopSweep();
  if (notifyChar) {
    try {
      await notifyChar.stopNotifications();
    } catch (err) {
      log(`Stop notify failed: ${err.message || err}`);
    }
  }
  if (device?.gatt?.connected) {
    device.gatt.disconnect();
  }
  setStatus(false, "Disconnected");
}

function onDisconnected() {
  stopSweep();
  setStatus(false, "Disconnected");
  log("Device disconnected.");
}

function handleNotify(event) {
  const value = new Uint8Array(event.target.value.buffer);
  // log(`Notify: ${toHex(value)}`);
}

function int16LE(value) {
  const view = new DataView(new ArrayBuffer(2));
  view.setInt16(0, value, true);
  return [view.getUint8(0), view.getUint8(1)];
}

function crc16(packet) {
  const tbl = [
    0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf,
    0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7,
    0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e,
    0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876,
    0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd,
    0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5,
    0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c,
    0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974,
    0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb,
    0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3,
    0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a,
    0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72,
    0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9,
    0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
    0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738,
    0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70,
    0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7,
    0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
    0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036,
    0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e,
    0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5,
    0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd,
    0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226, 0xd0bd, 0xc134,
    0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c,
    0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3,
    0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb,
    0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232,
    0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
    0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1,
    0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9,
    0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330,
    0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78,
    0x8808, 0x9981, 0xab1a, 0xba93, 0xce2c, 0xdfa5, 0xed3e, 0xfcb7,
    0x0440, 0x15c9, 0x2752, 0x36db, 0x4264, 0x53ed, 0x6176, 0x70ff,
    0x9809, 0x8980, 0xbb1b, 0xaa92, 0xde2d, 0xcfa4, 0xfd3f, 0xecb6,
    0x1441, 0x05c8, 0x3753, 0x26da, 0x5265, 0x43ec, 0x7177, 0x60fe,
    0xa90a, 0xb883, 0x8a18, 0x9b91, 0xef2e, 0xfea7, 0xcc3c, 0xddb5,
    0x2542, 0x34cb, 0x0650, 0x17d9, 0x6366, 0x72ef, 0x4074, 0x51fd,
    0xb90b, 0xa882, 0x9a19, 0x8b90, 0xff2f, 0xeea6, 0xdc3d, 0xcdb4,
    0x3543, 0x24ca, 0x1651, 0x07d8, 0x7367, 0x62ee, 0x5075, 0x41fc,
    0xc69b, 0xd712, 0xe589, 0xf400, 0x80bf, 0x9136, 0xa3ad, 0xb224,
    0x4ad3, 0x5b5a, 0x69c1, 0x7848, 0x0cf7, 0x1d7e, 0x2fe5, 0x3e6c,
    0xd69a, 0xc713, 0xf588, 0xe401, 0x90be, 0x8137, 0xb3ac, 0xa225,
    0x5ad2, 0x4b5b, 0x79c0, 0x6849, 0x1cf6, 0x0d7f, 0x3fe4, 0x2e6d,
    0xe79b, 0xf612, 0xc489, 0xd500, 0xa1bf, 0xb036, 0x82ad, 0x9324,
    0x6bd3, 0x7a5a, 0x48c1, 0x5948, 0x2df7, 0x3c7e, 0x0ee5, 0x1f6c,
    0xf79a, 0xe613, 0xd488, 0xc501, 0xb1be, 0xa037, 0x92ac, 0x8325,
    0x7bd2, 0x6a5b, 0x58c0, 0x4949, 0x3df6, 0x2c7f, 0x1ee4, 0x0f6d,
  ];

  let crc = 0xdf0c;
  for (let i = 0; i < packet.length; i += 1) {
    crc = (crc >> 8) ^ tbl[(packet[i] ^ crc) & 0xff];
  }
  return crc;
}

function buildRotateMessage({ yaw, pitch, roll, time, mode }) {
  const header = [0x55, 0x15, 0x04, 0xa9];
  const body = [0x02, 0x04, 0x01, 0x00, 0x00, 0x04];
  const isSpeed = mode === "speed";
  body.push(isSpeed ? 0x0c : 0x14);

  const modeByte = mode === "relative" ? 0x04 : mode === "absolute" ? 0x05 : 0x80;
  const payload = [
    ...int16LE(yaw),
    ...int16LE(roll),
    ...int16LE(pitch),
    modeByte,
    time & 0xff,
  ];

  const crc = crc16(Uint8Array.from([...body, ...payload]));
  const crcBytes = [crc & 0xff, (crc >> 8) & 0xff];

  return Uint8Array.from([...header, ...body, ...payload, ...crcBytes]);
}

async function writeMessage(message) {
  if (!writeChar) {
    log("Write characteristic not available.");
    return;
  }

  const chunkSize = 20;
  for (let offset = 0; offset < message.length; offset += chunkSize) {
    const chunk = message.slice(offset, offset + chunkSize);
    if (writeChar.properties.writeWithoutResponse) {
      await writeChar.writeValueWithoutResponse(chunk);
    } else {
      await writeChar.writeValue(chunk);
    }
  }
}

async function sendRotate() {
  const yaw = Math.round((parseFloat(yawInput.value) || 0) * 10);
  const pitch = Math.round((parseFloat(pitchInput.value) || 0) * 10);
  const roll = Math.round((parseFloat(rollInput.value) || 0) * 10);
  const time = Math.max(
    0,
    Math.min(255, Math.round((parseFloat(timeInput.value) || 0) * 10))
  );
  const mode = modeInput.value;

  const msg = buildRotateMessage({ yaw, pitch, roll, time, mode });
  try {
    await writeMessage(msg);
    log(`Tx: ${toHex(msg)}`);
  } catch (err) {
    log(`Write failed: ${err.message || err}`);
  }
}

function startSweep() {
  if (sweepTimer) {
    return;
  }
  sweepBtn.textContent = "Stop Sweep";
  sweepTimer = setInterval(async () => {
    const yaw = sweepDir > 0 ? 450 : -450;
    sweepDir *= -1;
    const msg = buildRotateMessage({ yaw, pitch: 0, roll: 0, time: 10, mode: "relative" });
    try {
      await writeMessage(msg);
      log(`Tx: ${toHex(msg)}`);
    } catch (err) {
      log(`Sweep failed: ${err.message || err}`);
    }
  }, 1500);
}

function stopSweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
    sweepBtn.textContent = "Start Sweep";
  }
}

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);
rotateBtn.addEventListener("click", sendRotate);
clearLogBtn.addEventListener("click", () => {
  logEl.textContent = "";
});


sweepBtn.addEventListener("click", () => {
  if (sweepTimer) {
    stopSweep();
  } else {
    startSweep();
  }
});

setStatus(false, "Disconnected");
