let mediaRecorder;
let audioChunks = [];
let audioCtx, analyser, source, dataArray, animationId;

const recordBtn = document.getElementById('record');
const stopBtn = document.getElementById('stop');
const audioElement = document.getElementById('audio');
const canvas = document.getElementById('waveform');
const canvasCtx = canvas.getContext('2d');

recordBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Setup media recorder
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioElement.src = audioUrl;

    // Stop waveform animation
    cancelAnimationFrame(animationId);
  };

  mediaRecorder.start();

  // Setup waveform visualization
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);

  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  drawWaveform();

  recordBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  mediaRecorder.stop();
  audioCtx.close();
  recordBtn.disabled = false;
  stopBtn.disabled = true;
};

function drawWaveform() {
  const width = canvas.width;
  const height = canvas.height;

  animationId = requestAnimationFrame(drawWaveform);

  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = 'white';
  canvasCtx.fillRect(0, 0, width, height);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'blue';

  canvasCtx.beginPath();

  const sliceWidth = width * 1.0 / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}
