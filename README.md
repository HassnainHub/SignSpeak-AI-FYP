---
title: SignSpeak AI
emoji: 🤟
colorFrom: indigo
colorTo: purple
sdk: docker
app_file: app.py
pinned: false
---

# SignSpeak AI 🤟

**Pakistani Sign Language (PSL) Translator using Deep Learning**

Upload or record a short video of a PSL gesture and get instant translation in Urdu & English.

## Features
- 50 Pakistani Sign Language signs supported
- Webcam recording + video upload
- Urdu & English translation with confidence score
- Built with TensorFlow, FastAPI, and Vanilla JS

## How It Works
1. Record a 3–5 second sign gesture video or upload an existing one
2. AI model extracts 16 key frames and analyzes motion
3. Get instant Urdu + English translation with confidence score

## Tech Stack
- **Model**: MobileNetV2 + BiLSTM (TensorFlow/Keras)
- **Backend**: FastAPI + Uvicorn
- **Frontend**: HTML, CSS, Vanilla JS
