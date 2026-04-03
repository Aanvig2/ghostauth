from collections import deque
import time

class RingBuffer:
    def __init__(self, size=512):
        self.buffer = deque(maxlen=size)

    def write(self, event):
        event["ts"] = event.get("ts", int(time.time() * 1000))
        self.buffer.append(event)

    def read(self):
        return list(self.buffer)

    def clear(self):
        self.buffer.clear()