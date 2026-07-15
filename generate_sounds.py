import wave
import struct
import math
import os

# Frequencies for notes C4, D4, E4, F4, G4
notes = {
    'note_c': 261.63,
    'note_d': 293.66,
    'note_e': 329.63,
    'note_f': 349.23,
    'note_g': 392.00
}

sample_rate = 44100.0
duration = 0.8 # Seconds (increased from 0.3 to 0.8)

os.makedirs('assets/sounds', exist_ok=True)

for name, freq in notes.items():
    wavef = wave.open(f'assets/sounds/{name}.wav','w')
    wavef.setnchannels(1) # mono
    wavef.setsampwidth(2) 
    wavef.setframerate(sample_rate)

    for i in range(int(duration * sample_rate)):
        # Apply exponential decay envelope so it fades out nicely
        envelope = math.exp(-3.0 * i / (sample_rate * duration))
        value = int(envelope * 32767.0 * math.sin(2.0 * math.pi * freq * i / sample_rate))
        data = struct.pack('<h', value)
        wavef.writeframesraw(data)

    wavef.close()
    print(f"Generated {name}.wav")
