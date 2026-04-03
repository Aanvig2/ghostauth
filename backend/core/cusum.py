def mean(arr):
    return sum(arr) / len(arr) if arr else 0

class CUSUMDetector:
    def __init__(self, k=0.5, h=5):
        self.k = k
        self.h = h
        self.S_pos = 0
        self.S_neg = 0
        self.history = []

    def update(self, score):
        self.history.append(score)
        avg = mean(self.history[-20:])

        self.S_pos = max(0, self.S_pos + score - avg - self.k)
        self.S_neg = max(0, self.S_neg - score + avg - self.k)

        return self.S_pos > self.h or self.S_neg > self.h

    def reset(self):
        self.S_pos = 0
        self.S_neg = 0
        self.history = []