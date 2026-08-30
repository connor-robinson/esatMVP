"""Development-only preview of homepage camera-distance curves. Not used in production."""

import numpy as np
import matplotlib.pyplot as plt

u = np.linspace(0, 1, 500)

A = 1 / (1 + 4 * u)
B = 1 - 0.8 * u
C = np.exp(-4 * u)
D = 0.08 + 0.85 * u**2

plt.figure(figsize=(8, 5))
plt.plot(u, A, label="A")
plt.plot(u, B, label="B")
plt.plot(u, C, label="C")
plt.plot(u, D, label="D")
plt.xlabel("d (normalized distance)")
plt.ylabel("H (normalized image height)")
plt.legend()
plt.title("Camera distance graph curves (dev preview)")
plt.tight_layout()
plt.show()
