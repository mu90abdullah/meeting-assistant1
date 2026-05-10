import logging
import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'
logging.basicConfig(level=logging.DEBUG)
from faster_whisper import WhisperModel

print("Loading model...")
try:
    model = WhisperModel("small", device="cpu", compute_type="int8")
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error: {e}")
