FROM python:3.10-slim

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Hugging Face Spaces runs as non-root user 1000
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER 1000

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Launch FastAPI with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
