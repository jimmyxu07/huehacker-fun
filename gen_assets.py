from PIL import Image, ImageDraw, ImageFont
import os

assets_dir = "/Users/leyantech/huehacker-fun/assets"
os.makedirs(assets_dir, exist_ok=True)

characters = [
    {"name": "Cyan Surfer", "base": (0, 180, 220), "accent": (255, 200, 50)},
    {"name": "Magenta Mage", "base": (220, 50, 180), "accent": (100, 255, 200)},
    {"name": "Lime Ninja", "base": (150, 220, 50), "accent": (50, 50, 50)},
    {"name": "Coral Pilot", "base": (255, 120, 100), "accent": (50, 150, 255)},
    {"name": "Violet Bot", "base": (140, 80, 220), "accent": (0, 255, 150)},
    {"name": "Amber Monk", "base": (255, 180, 50), "accent": (80, 50, 150)},
    {"name": "Teal Hacker", "base": (0, 160, 140), "accent": (255, 80, 80)},
]

for i, ch in enumerate(characters, 1):
    img = Image.new("RGB", (400, 400), (20, 20, 35))
    draw = ImageDraw.Draw(img)
    base = ch["base"]
    accent = ch["accent"]
    
    draw.ellipse([50, 50, 350, 350], fill=(base[0]//3, base[1]//3, base[2]//3))
    draw.ellipse([100, 100, 300, 300], fill=base)
    draw.ellipse([140, 160, 170, 190], fill=(255, 255, 255))
    draw.ellipse([230, 160, 260, 190], fill=(255, 255, 255))
    draw.ellipse([150, 170, 162, 182], fill=(30, 30, 40))
    draw.ellipse([240, 170, 252, 182], fill=(30, 30, 40))
    draw.arc([160, 220, 240, 260], start=0, end=180, fill=(30, 30, 40), width=4)
    
    if i % 3 == 0:
        draw.rectangle([80, 120, 110, 280], fill=accent, outline=(255,255,255), width=2)
        draw.rectangle([290, 120, 320, 280], fill=accent, outline=(255,255,255), width=2)
    elif i % 3 == 1:
        draw.arc([90, 60, 310, 140], start=0, end=180, fill=accent, width=12)
    else:
        draw.polygon([(200, 50), (130, 130), (270, 130)], fill=accent)
    
    img.save(os.path.join(assets_dir, f"ch{i}.jpg"), "JPEG", quality=90)
    print(f"Generated ch{i}.jpg")

og = Image.new("RGB", (1200, 630), (15, 10, 30))
og_draw = ImageDraw.Draw(og)
for y in range(630):
    r = int(15 + (40-15) * y / 630)
    g = int(10 + (20-10) * y / 630)
    b = int(30 + (60-30) * y / 630)
    og_draw.line([(0, y), (1200, y)], fill=(r, g, b))

try:
    font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
    font_medium = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
except:
    font_large = ImageFont.load_default()
    font_medium = ImageFont.load_default()
    font_small = ImageFont.load_default()

og_draw.text((120, 200), "HueHacker", fill=(255, 255, 255), font=font_large)
og_draw.text((120, 340), "Daily Color Memory Challenge", fill=(200, 200, 220), font=font_medium)
og_draw.text((120, 430), "AI-generated characters · HSB sliders · Beat the hue", fill=(150, 150, 180), font=font_small)
og_draw.rectangle([0, 580, 1200, 630], fill=(124, 92, 255))
og_draw.text((120, 592), "huehacker.fun", fill=(255, 255, 255), font=font_small)
og.save("/Users/leyantech/huehacker-fun/og-image.jpg", "JPEG", quality=95)
print("Generated og-image.jpg")

for f in sorted(os.listdir(assets_dir)):
    path = os.path.join(assets_dir, f)
    size = os.path.getsize(path)
    print(f"  {f}: {size/1024:.1f} KB")
print("All assets ready!")
