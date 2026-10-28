"""Mapa otoczenia (equirectangular 2048x1024): niebo, chmury, horyzont, ziemia – do realistycznego oświetlenia i odbić."""
import sys, math
import numpy as np
from PIL import Image
sys.path.insert(0, 'hq'); import tekstury as tx
W, H = 2048, 1024
v = (np.arange(H) + 0.5) / H; el = (0.5 - v) * math.pi            # wysokość nad horyzontem
u = (np.arange(W) + 0.5) / W; az = (u - 0.5) * 2 * math.pi
EL, AZ = np.meshgrid(el, az, indexing="ij")
zen, hor = np.array([78, 128, 196]), np.array([206, 220, 232])
t = np.clip(EL / (math.pi / 2), 0, 1) ** 0.55
sky = hor + (zen - hor) * t[..., None]
# słońce (az 40°, wys. 38°) z poświatą
sa, se = math.radians(40), math.radians(38)
cosd = np.sin(EL) * math.sin(se) + np.cos(EL) * math.cos(se) * np.cos(AZ - sa)
glow = np.clip(cosd, 0, 1) ** 60 * 90 + np.clip(cosd, 0, 1) ** 2000 * 255
sky = sky + glow[..., None] * np.array([1.0, 0.95, 0.85])
# chmury
c = tx.fbm(1024, 77, 6, 1024 / 5); c = np.tile(c, (1, 2))[:H, :W]
cl = np.clip((c - 0.55) * 3, 0, 1) * (EL > 0.02) * np.clip(1 - EL / 1.2, 0, 1)
sky = sky * (1 - cl[..., None] * 0.75) + np.array([245, 245, 248]) * cl[..., None] * 0.75
# ziemia: trawa/pole przy horyzoncie, ciemniej w dół
g = tx.fbm(1024, 5, 5, 1024 / 30); g = np.tile(g, (1, 2))[:H, :W]
gt = np.clip(-EL / (math.pi / 2), 0, 1)
ground = np.array([112, 128, 84]) * (1 - gt[..., None] * 0.55) * (0.85 + 0.25 * g[..., None])
band = np.exp(-np.abs(EL) / 0.02)[..., None]
ground = ground * (1 - band) + np.array([170, 180, 170]) * band
img = np.where((EL > 0)[..., None], sky, ground)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(sys.argv[1], quality=88)
print("ok")
