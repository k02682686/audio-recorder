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

  // Reset previous audio chunks
  audioChunks = [];

  // Setup media recorder
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  // Important: define onstop ONCE for this recorder
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioElement.src = audioUrl;

    // Create a new audio element for this recording
const audioItem = document.createElement('div');
audioItem.className = 'recording-item';

const audio = document.createElement('audio');
audio.controls = true;
audio.src = audioUrl;

const meta = document.createElement('p');
meta.textContent = `Duration: ${duration}s | Size: ${formatBytes(audioBlob.size)}`;

audioItem.appendChild(audio);
audioItem.appendChild(meta);

document.getElementById('recordings-list').appendChild(audioItem);


    cancelAnimationFrame(animationId);
    document.getElementById('size').textContent = formatBytes(audioBlob.size);

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtxForDecode = new AudioContext();
      const audioBuffer = await audioCtxForDecode.decodeAudioData(arrayBuffer);

      const duration = audioBuffer.duration.toFixed(2);
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);

      const rms = Math.sqrt(
        channelData.reduce((sum, val) => sum + val * val, 0) / channelData.length
      );
      const peak = Math.max(...channelData.map(Math.abs));

      document.getElementById('duration').textContent = duration;
      document.getElementById('sample-rate').textContent = sampleRate;
      document.getElementById('rms').textContent = rms.toFixed(4);
      document.getElementById('peak').textContent = peak.toFixed(4);

    } catch (e) {
      console.error('Audio decoding failed:', e);
    }
  };

  // Start recording
  mediaRecorder.start();

  // Start visualization
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
  canvasCtx.strokeStyle = 'black';

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
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}
