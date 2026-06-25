/* === SignSpeak AI — script.js === */

// =========================================
// DATA
// =========================================
const SIGNS_DATA = [
    { key: 'aaj',        english: 'Today',          urdu: 'آج' },
    { key: 'aath',       english: 'Eight (8)',       urdu: 'آٹھ' },
    { key: 'ahista',     english: 'Slow',            urdu: 'آہستہ' },
    { key: 'anywalakal', english: 'Tomorrow',        urdu: 'آنے والا کل' },
    { key: 'behtreen',   english: 'Perfect',         urdu: 'بہترین' },
    { key: 'btana',      english: 'To Tell',         urdu: 'بتانا' },
    { key: 'bukhar',     english: 'Fever',           urdu: 'بخار' },
    { key: 'bus',        english: 'Bus',             urdu: 'بس' },
    { key: 'car',        english: 'Car',             urdu: 'کار' },
    { key: 'char',       english: 'Four (4)',        urdu: 'چار' },
    { key: 'chawal',     english: 'Rice',            urdu: 'چاول' },
    { key: 'chay',       english: 'Six (6)',         urdu: 'چھ' },
    { key: 'chaye',      english: 'Tea',             urdu: 'چائے' },
    { key: 'chini',      english: 'Sugar',           urdu: 'چینی' },
    { key: 'dard',       english: 'Pain',            urdu: 'درد' },
    { key: 'das',        english: 'Ten (10)',        urdu: 'دس' },
    { key: 'dawai',      english: 'Medicine',        urdu: 'دوائی' },
    { key: 'dekhna',     english: 'To See',          urdu: 'دیکھنا' },
    { key: 'do',         english: 'Two (2)',         urdu: 'دو' },
    { key: 'dobara',     english: 'Again',           urdu: 'دوبارہ' },
    { key: 'doctor',     english: 'Doctor',          urdu: 'ڈاکٹر' },
    { key: 'doodh',      english: 'Milk',            urdu: 'دودھ' },
    { key: 'dost',       english: 'Friend',          urdu: 'دوست' },
    { key: 'ek',         english: 'One (1)',         urdu: 'ایک' },
    { key: 'emergency',  english: 'Emergency',       urdu: 'ایمرجنسی' },
    { key: 'ghalat',     english: 'Wrong',           urdu: 'غلط' },
    { key: 'ghanta',     english: 'Hour',            urdu: 'گھنٹہ' },
    { key: 'gosht',      english: 'Meat',            urdu: 'گوشت' },
    { key: 'hafta',      english: 'Week',            urdu: 'ہفتہ' },
    { key: 'intezar',    english: 'Wait',            urdu: 'انتظار' },
    { key: 'kal',        english: 'Yesterday',       urdu: 'کل' },
    { key: 'likhna',     english: 'To Write',        urdu: 'لکھنا' },
    { key: 'mahina',     english: 'Month',           urdu: 'مہینہ' },
    { key: 'mask',       english: 'Mask',            urdu: 'ماسک' },
    { key: 'minute',     english: 'Minute',          urdu: 'منٹ' },
    { key: 'no',         english: 'Nine (9)',        urdu: 'نو' },
    { key: 'paanch',     english: 'Five (5)',        urdu: 'پانچ' },
    { key: 'parhna',     english: 'To Read',         urdu: 'پڑھنا' },
    { key: 'raasta',     english: 'Way / Path',      urdu: 'راستہ' },
    { key: 'roti',       english: 'Bread (Roti)',    urdu: 'روٹی' },
    { key: 'saat',       english: 'Seven (7)',       urdu: 'سات' },
    { key: 'sabzi',      english: 'Vegetable',       urdu: 'سبزی' },
    { key: 'sahih',      english: 'Correct',         urdu: 'صحیح' },
    { key: 'samajhna',   english: 'To Understand',  urdu: 'سمجھنا' },
    { key: 'stop',       english: 'Stop',            urdu: 'سٹاپ' },
    { key: 'sunna',      english: 'To Listen',       urdu: 'سننا' },
    { key: 'tabdeel',    english: 'Change',          urdu: 'تبدیل' },
    { key: 'teen',       english: 'Three (3)',       urdu: 'تین' },
    { key: 'tez',        english: 'Fast',            urdu: 'تیز' },
    { key: 'ticket',     english: 'Ticket',          urdu: 'ٹکٹ' },
];

// =========================================
// STATE
// =========================================
let currentMode = 'webcam';       // 'webcam' | 'upload'
let stream = null;                // MediaStream
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let uploadedFile = null;
let isRecording = false;
let recordTimer = null;
let cameraStarted = false;

// =========================================
// INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    buildSignsGrid();
});

// =========================================
// SIGNS GRID
// =========================================
function buildSignsGrid() {
    const grid = document.getElementById('signs-grid');
    if (!grid) return;
    grid.innerHTML = SIGNS_DATA.map(s => `
        <div class="sign-chip" title="${s.english}">
            <span class="sign-english">${s.english}</span>
            <span class="sign-urdu">${s.urdu}</span>
        </div>
    `).join('');
}

// =========================================
// MODE SWITCHING
// =========================================
function switchMode(mode) {
    currentMode = mode;

    document.getElementById('btn-webcam').classList.toggle('active', mode === 'webcam');
    document.getElementById('btn-upload').classList.toggle('active', mode === 'upload');
    document.getElementById('webcam-panel').classList.toggle('hidden', mode !== 'webcam');
    document.getElementById('upload-panel').classList.toggle('hidden', mode !== 'upload');

    // Stop camera if switching away
    if (mode !== 'webcam') {
        stopCamera();
    }

    resetPredictState();
    updatePredictBtn();
}

// =========================================
// CAMERA
// =========================================
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });

        const preview = document.getElementById('webcam-preview');
        preview.srcObject = stream;
        preview.style.display = 'block';
        document.getElementById('camera-placeholder').classList.add('hidden');

        document.getElementById('start-camera-btn').innerHTML = '<i class="fa-solid fa-check"></i> Camera On';
        document.getElementById('start-camera-btn').disabled = true;
        document.getElementById('record-btn').disabled = false;

        cameraStarted = true;
    } catch (err) {
        showToast('❌ Camera access denied: ' + err.message, 'error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    cameraStarted = false;

    const preview = document.getElementById('webcam-preview');
    preview.srcObject = null;
    preview.style.display = 'none';
    document.getElementById('camera-placeholder').classList.remove('hidden');

    const startBtn = document.getElementById('start-camera-btn');
    startBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Start Camera';
    startBtn.disabled = false;

    document.getElementById('record-btn').disabled = true;
}

// =========================================
// RECORDING
// =========================================
function toggleRecord() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!stream) return;

    recordedChunks = [];
    recordedBlob = null;

    // Choose best supported codec
    const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
    ];
    let mimeType = '';
    for (const mt of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const type = mimeType || 'video/webm';
        recordedBlob = new Blob(recordedChunks, { type });
        showRecordedPreview(recordedBlob);
        updatePredictBtn();
    };

    mediaRecorder.start(100); // collect data every 100ms
    isRecording = true;

    // Update UI
    const recBtn = document.getElementById('record-btn');
    recBtn.classList.add('recording');
    document.getElementById('rec-icon').className = 'fa-solid fa-stop';
    document.getElementById('rec-label').textContent = 'Stop';

    // Show recording overlay with countdown
    let secs = 5;
    document.getElementById('rec-timer').textContent = secs;
    document.getElementById('recording-overlay').classList.remove('hidden');

    recordTimer = setInterval(() => {
        secs--;
        document.getElementById('rec-timer').textContent = secs;
        if (secs <= 0) {
            clearInterval(recordTimer);
            stopRecording();
        }
    }, 1000);

    // Hide old preview
    document.getElementById('recorded-preview-wrap').classList.add('hidden');
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;

    clearInterval(recordTimer);
    document.getElementById('recording-overlay').classList.add('hidden');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    // Reset record button
    const recBtn = document.getElementById('record-btn');
    recBtn.classList.remove('recording');
    document.getElementById('rec-icon').className = 'fa-solid fa-circle';
    document.getElementById('rec-label').textContent = 'Record';
}

function showRecordedPreview(blob) {
    const url = URL.createObjectURL(blob);
    const vid = document.getElementById('recorded-preview');
    vid.src = url;
    document.getElementById('recorded-preview-wrap').classList.remove('hidden');
}

// =========================================
// FILE UPLOAD
// =========================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploadFile(file);
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('upload-zone').classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-zone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        setUploadFile(file);
    }
}

function setUploadFile(file) {
    uploadedFile = file;
    const url = URL.createObjectURL(file);
    const vid = document.getElementById('upload-preview');
    vid.src = url;
    // Hide the upload zone so video preview takes its place (no double height)
    document.getElementById('upload-zone').classList.add('hidden');
    document.getElementById('upload-preview-wrap').classList.remove('hidden');
    updatePredictBtn();
}

// =========================================
// PREDICT BUTTON STATE
// =========================================
function updatePredictBtn() {
    const btn = document.getElementById('predict-btn');
    const hasVideo = currentMode === 'webcam' ? !!recordedBlob : !!uploadedFile;
    btn.disabled = !hasVideo;
}

// =========================================
// PREDICTION
// =========================================
async function runPrediction() {
    const videoBlob = currentMode === 'webcam' ? recordedBlob : uploadedFile;
    if (!videoBlob) return;

    const mirrorOpt = currentMode === 'webcam'
        ? document.getElementById('mirror-opt').checked
        : document.getElementById('mirror-opt-upload').checked;

    const rotateOpt = currentMode === 'webcam'
        ? document.getElementById('rotate-opt').checked
        : document.getElementById('rotate-opt-upload').checked;

    showResultState('loading');

    const formData = new FormData();
    const filename = currentMode === 'upload' && uploadedFile ? uploadedFile.name : 'recording.webm';
    formData.append('video', videoBlob, filename);

    try {
        const url = `/predict?mirror=${mirrorOpt}&rotate90=${rotateOpt}`;
        const res = await fetch(url, { method: 'POST', body: formData });

        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
            showSuccess(data);
        } else {
            showError(data.error || 'Unknown error occurred.');
        }
    } catch (err) {
        showError('Connection error: ' + err.message);
    }
}

// =========================================
// RESULT STATES
// =========================================
function showResultState(state) {
    const states = ['idle', 'loading', 'success', 'error'];
    states.forEach(s => {
        const el = document.getElementById(`result-${s}`);
        if (el) el.classList.toggle('hidden', s !== state);
    });
}

function showSuccess(data) {
    document.getElementById('result-urdu').textContent = data.urdu;
    document.getElementById('result-english').textContent = data.english;

    const pct = data.confidence;
    document.getElementById('confidence-pct').textContent = `${pct}%`;

    // Animate confidence bar
    const fill = document.getElementById('confidence-fill');
    fill.style.width = '0%';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            fill.style.width = `${pct}%`;
        });
    });

    showResultState('success');
}

function showError(message) {
    document.getElementById('error-text').textContent = message;
    showResultState('error');
}

// =========================================
// RESET
// =========================================
function resetAll() {
    // Stop recording if active
    if (isRecording) stopRecording();

    // Clear blobs
    recordedBlob = null;
    uploadedFile = null;
    recordedChunks = [];

    // Reset previews
    document.getElementById('recorded-preview-wrap').classList.add('hidden');
    document.getElementById('recorded-preview').src = '';
    document.getElementById('upload-preview-wrap').classList.add('hidden');
    document.getElementById('upload-preview').src = '';
    document.getElementById('file-input').value = '';
    // Show upload zone again
    document.getElementById('upload-zone').classList.remove('hidden');

    // Reset checkboxes
    document.getElementById('mirror-opt').checked = false;
    document.getElementById('rotate-opt').checked = false;
    document.getElementById('mirror-opt-upload').checked = false;
    document.getElementById('rotate-opt-upload').checked = false;

    // Reset result
    showResultState('idle');
    resetPredictState();
    updatePredictBtn();
}

function resetPredictState() {
    showResultState('idle');
}

// =========================================
// COPY RESULT
// =========================================
function copyResult() {
    const urdu = document.getElementById('result-urdu').textContent;
    const english = document.getElementById('result-english').textContent;
    const pct = document.getElementById('confidence-pct').textContent;
    const text = `${urdu}\n${english}\nConfidence: ${pct}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Result copied to clipboard!');
    }).catch(() => {
        showToast('❌ Could not copy. Please copy manually.', 'error');
    });
}

// =========================================
// TOAST
// =========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    if (type === 'error') {
        toast.style.background = 'rgba(244,63,94,0.15)';
        toast.style.borderColor = 'rgba(244,63,94,0.4)';
        toast.style.color = '#fb7185';
    } else {
        toast.style.background = 'rgba(16,185,129,0.15)';
        toast.style.borderColor = 'rgba(16,185,129,0.4)';
        toast.style.color = '#6ee7b7';
    }

    setTimeout(() => toast.classList.add('hidden'), 3000);
}