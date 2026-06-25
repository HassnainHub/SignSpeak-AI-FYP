import os
import cv2
import numpy as np
import tensorflow as tf
import pickle
import time
import tempfile
import subprocess
import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.requests import Request

# --- CONFIGURATION ---
IMG_SIZE = 224
SEQUENCE_LENGTH = 16
CONFIDENCE_THRESHOLD = 0.55
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, 'SignSpeak_Model_Final.keras')
LABEL_PATH = os.path.join(BASE_DIR, 'master_label_map.pkl')

# --- LOAD ASSETS ---
model = None
inv_label_map = {}

def build_model():
    base_model = tf.keras.applications.MobileNetV2(
        weights=None, include_top=False, pooling='avg',
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )
    base_model._name = 'mobilenetv2_1.00_224'
    
    inputs = tf.keras.Input(shape=(SEQUENCE_LENGTH, IMG_SIZE, IMG_SIZE, 3), name='input_layer_1')
    x = tf.keras.layers.TimeDistributed(base_model, name='time_distributed')(inputs)
    x = tf.keras.layers.TimeDistributed(tf.keras.layers.Dropout(0.25), name='time_distributed_2')(x)
    x = tf.keras.layers.Bidirectional(
        tf.keras.layers.LSTM(128, return_sequences=False, dropout=0.25, recurrent_dropout=0.2),
        name='bidirectional'
    )(x)
    x = tf.keras.layers.BatchNormalization(momentum=0.99, name='batch_normalization')(x)
    x = tf.keras.layers.Dense(256, activation='relu', kernel_regularizer=tf.keras.regularizers.L2(0.0001), name='dense')(x)
    x = tf.keras.layers.Dropout(0.4, name='dropout_1')(x)
    outputs = tf.keras.layers.Dense(50, activation='softmax', name='dense_1')(x)
    
    return tf.keras.Model(inputs=inputs, outputs=outputs)

try:
    print("Loading model weights from:", MODEL_PATH)
    model = build_model()
    model.load_weights(MODEL_PATH)
    with open(LABEL_PATH, 'rb') as f:
        label_map = pickle.load(f)
        inv_label_map = {int(v): k for k, v in label_map.items()}
    print("Model and Labels loaded successfully!")
except Exception as e:
    print(f"CRITICAL ERROR LOADING ASSETS: {e}")

# --- LABEL MAPS ---
URDU_LABELS = {
    'aaj': 'آج', 'aath': 'آٹھ', 'ahista': 'آہستہ', 'anywalakal': 'آنے والا کل',
    'behtreen': 'بہترین', 'btana': 'بتانا', 'bukhar': 'بخار', 'bus': 'بس',
    'car': 'کار', 'char': 'چار', 'chawal': 'چاول', 'chay': 'چھ',
    'chaye': 'چائے', 'chini': 'چینی', 'dard': 'درد', 'das': 'دس',
    'dawai': 'دوائی', 'dekhna': 'دیکھنا', 'do': 'دو', 'dobara': 'دوبارہ',
    'doctor': 'ڈاکٹر', 'doodh': 'دودھ', 'dost': 'دوست', 'ek': 'ایک',
    'emergency': 'ایمرجنسی', 'ghalat': 'غلط', 'ghanta': 'گھنٹہ',
    'gosht': 'گوشت', 'hafta': 'ہفتہ', 'intezar': 'انتظار', 'kal': 'کل',
    'likhna': 'لکھنا', 'mahina': 'مہینہ', 'mask': 'ماسک', 'minute': 'منٹ',
    'no': 'نو', 'paanch': 'پانچ', 'parhna': 'پڑھنا', 'raasta': 'راستہ',
    'roti': 'روٹی', 'saat': 'سات', 'sabzi': 'سبزی', 'sahih': 'صحیح',
    'samajhna': 'سمجھنا', 'stop': 'سٹاپ', 'sunna': 'سننا', 'tabdeel': 'تبدیل',
    'teen': 'تین', 'tez': 'تیز', 'ticket': 'ٹکٹ'
}

ENGLISH_MAP = {
    'aaj': 'Today', 'aath': 'Eight (8)', 'ahista': 'Slow', 'anywalakal': 'Tomorrow',
    'behtreen': 'Perfect', 'btana': 'To Tell', 'bukhar': 'Fever', 'bus': 'Bus',
    'car': 'Car', 'char': 'Four (4)', 'chawal': 'Rice', 'chay': 'Six (6)',
    'chaye': 'Tea', 'chini': 'Sugar', 'dard': 'Pain', 'das': 'Ten (10)',
    'dawai': 'Medicine', 'dekhna': 'To See', 'do': 'Two (2)', 'dobara': 'Again',
    'doctor': 'Doctor', 'doodh': 'Milk', 'dost': 'Friend', 'ek': 'One (1)',
    'emergency': 'Emergency', 'ghalat': 'Wrong', 'ghanta': 'Hour',
    'gosht': 'Meat', 'hafta': 'Week', 'intezar': 'Wait', 'kal': 'Yesterday',
    'likhna': 'To Write', 'mahina': 'Month', 'mask': 'Mask', 'minute': 'Minute',
    'no': 'Nine (9)', 'paanch': 'Five (5)', 'parhna': 'To Read',
    'raasta': 'Way / Path', 'roti': 'Bread (Roti)', 'saat': 'Seven (7)',
    'sabzi': 'Vegetable', 'sahih': 'Correct', 'samajhna': 'To Understand',
    'stop': 'Stop', 'sunna': 'To Listen', 'tabdeel': 'Change',
    'teen': 'Three (3)', 'tez': 'Fast', 'ticket': 'Ticket'
}

# --- FASTAPI APP ---
app = FastAPI(title="SignSpeak AI")

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


# --- AUTO-ROTATION HELPER ---
def get_video_rotation_degrees(video_path: str) -> int:
    """
    Reads rotation metadata from video file using ffprobe.
    Returns rotation in degrees (0, 90, 180, 270).
    Falls back to 0 if ffprobe is unavailable or fails.
    """
    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'quiet',
                '-print_format', 'json',
                '-show_streams',
                video_path
            ],
            capture_output=True, text=True, timeout=5
        )
        info = json.loads(result.stdout)
        for stream in info.get('streams', []):
            tags = stream.get('tags', stream.get('side_data_list', [{}])[0] if stream.get('side_data_list') else {})
            # Check rotation in tags
            for key in ('rotate', 'ROTATE', 'Rotate'):
                if key in tags:
                    return int(tags[key])
            # Check side_data_list (newer ffprobe format)
            for side in stream.get('side_data_list', []):
                if 'rotation' in side:
                    return abs(int(side['rotation']))
    except Exception:
        pass
    return 0


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
async def predict(
    video: UploadFile = File(...),
    rotate90: bool = False,
    mirror: bool = False
):
    if model is None:
        raise HTTPException(status_code=503, detail="AI Model not initialized. Please restart the server.")

    # Save uploaded video to temp file
    suffix = os.path.splitext(video.filename)[-1] if video.filename else ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        time.sleep(0.3)  # small buffer for file flush

        # --- AUTO-DETECT ROTATION FROM VIDEO METADATA ---
        # OpenCV 4.11.0 auto-applies rotation, so we skip manual ffprobe rotation to avoid double-rotation
        auto_rotation = 0
        
        cap = cv2.VideoCapture(tmp_path)
        
        # Tell OpenCV to auto-apply rotation metadata (OpenCV 4.5+)
        try:
            cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
        except Exception:
            pass

        frames = []

        if not cap.isOpened():
            return JSONResponse({"success": False, "error": "Could not open video stream."})

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if mirror:
                frame = cv2.flip(frame, 1)
            # Manual override OR auto-detected rotation (only if CAP_PROP_ORIENTATION_AUTO didn't work)
            if rotate90:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            elif auto_rotation == 90:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            elif auto_rotation == 270:
                frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            elif auto_rotation == 180:
                frame = cv2.rotate(frame, cv2.ROTATE_180)
            frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = frame.astype(np.float32) / 255.0
            frames.append(frame)

        cap.release()

        if len(frames) < SEQUENCE_LENGTH:
            return JSONResponse({
                "success": False,
                "error": f"Only {len(frames)} frames captured. Need at least {SEQUENCE_LENGTH}. Record for at least 3 seconds."
            })

        indices = np.linspace(0, len(frames) - 1, SEQUENCE_LENGTH, dtype=int)
        sampled = np.array([frames[i] for i in indices], dtype=np.float32)

        predictions = model.predict(np.expand_dims(sampled, axis=0), verbose=0)[0]
        idx = int(np.argmax(predictions))
        conf = float(predictions[idx])

        if conf < CONFIDENCE_THRESHOLD:
            return JSONResponse({
                "success": False,
                "error": f"Low confidence ({conf*100:.1f}%). Move closer to camera and ensure clear lighting."
            })

        label_key = inv_label_map.get(idx, "Unknown")
        return JSONResponse({
            "success": True,
            "label_key": label_key,
            "urdu": URDU_LABELS.get(label_key, label_key),
            "english": ENGLISH_MAP.get(label_key, label_key),
            "confidence": round(conf * 100, 1)
        })

    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)})
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=False)