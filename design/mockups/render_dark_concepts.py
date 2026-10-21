import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent
FONT = ROOT / "assets/fonts/Rubik-SemiBold.ttf"
ICON_ROOT = ROOT / "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons"
GLYPHS = json.loads((ICON_ROOT / "glyphmaps/Ionicons.json").read_text())
ICON_FONT = ICON_ROOT / "Fonts/Ionicons.ttf"
SCALE = 3

PALETTES = [
    {
        "slug": "carbon-ice", "name": "Carbon & Ice", "number": "02",
        "note": ["Cool, neutral dark surfaces", "Pale-blue actions and navigation", "Green/red financial states"],
        "bg": "#14171B", "surface": "#232830", "field": "#191E25", "line": "#4B5969",
        "text": "#EDF3FA", "muted": "#AFBECE", "primary": "#91C7FF", "onPrimary": "#102B48",
        "selected": "#253D57", "income": "#75D8AE", "expense": "#F39AAA", "blue": "#91C7FF", "gold": "#E8C47C",
        "iconBg": "#18212B", "iconFront": "#91C7FF", "iconBack": "#DCEAF7", "iconInk": "#173653",
    },
    {
        "slug": "obsidian-amber", "name": "Obsidian & Amber", "number": "03",
        "note": ["Near-black, neutral surfaces", "Warm-gold actions and navigation", "Green/red financial states"],
        "bg": "#171719", "surface": "#27272B", "field": "#1E1E21", "line": "#5A5650",
        "text": "#F7F3EB", "muted": "#C3BBAF", "primary": "#F0C56B", "onPrimary": "#352708",
        "selected": "#4B3D24", "income": "#7ED7B0", "expense": "#F394A6", "blue": "#94BDF0", "gold": "#F0C56B",
        "iconBg": "#201D18", "iconFront": "#F0C56B", "iconBack": "#F5E7C8", "iconInk": "#3A2B0E",
    },
]


class Canvas:
    def __init__(self, width, height, background):
        self.image = Image.new("RGB", (width * SCALE, height * SCALE), background)
        self.draw = ImageDraw.Draw(self.image)

    def box(self, coordinates, fill, outline=None, radius=0, width=1):
        rectangle = tuple(round(value * SCALE) for value in coordinates)
        if radius:
            self.draw.rounded_rectangle(rectangle, radius=radius * SCALE, fill=fill, outline=outline, width=width * SCALE)
        else:
            self.draw.rectangle(rectangle, fill=fill, outline=outline, width=width * SCALE)

    def line(self, coordinates, fill, width=1):
        self.draw.line(tuple(round(value * SCALE) for value in coordinates), fill=fill, width=width * SCALE)

    def text(self, position, value, size, color, anchor="lt"):
        self.draw.text(tuple(round(value * SCALE) for value in position), value, font=ImageFont.truetype(str(FONT), size * SCALE), fill=color, anchor=anchor)

    def icon(self, position, name, size, color):
        self.draw.text(tuple(round(value * SCALE) for value in position), chr(GLYPHS[name]), font=ImageFont.truetype(str(ICON_FONT), size * SCALE), fill=color, anchor="mm")

    def output(self, size=None):
        return self.image.resize(size or (self.image.width // SCALE, self.image.height // SCALE), Image.Resampling.LANCZOS)


def luminance(color):
    channels = [int(color[position:position + 2], 16) / 255 for position in (1, 3, 5)]
    linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels]
    return sum(channel * weight for channel, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(foreground, background):
    lighter, darker = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def validate_palette(palette):
    pairs = [("text", "bg"), ("text", "surface"), ("muted", "bg"), ("muted", "surface"), ("primary", "selected"), ("onPrimary", "primary")]
    ratios = [contrast(palette[foreground], palette[background]) for foreground, background in pairs]
    assert min(ratios) >= 4.5, (palette["name"], ratios)
    return min(ratios)


def app_icon(palette):
    canvas = Canvas(512, 512, palette["iconBg"])
    canvas.draw.ellipse((112 * SCALE, 112 * SCALE, 326 * SCALE, 326 * SCALE), outline=palette["iconBack"], width=17 * SCALE)
    canvas.draw.ellipse((180 * SCALE, 184 * SCALE, 407 * SCALE, 411 * SCALE), fill=palette["iconFront"])
    for top, right in [(247, 350), (287, 326), (327, 304)]:
        canvas.box((235, top, right, top + 18), palette["iconInk"], radius=9)
    return canvas.output()


def status(canvas, palette):
    canvas.text((20, 12), "9:41", 12, palette["text"])
    canvas.icon((286, 20), "cellular", 13, palette["text"])
    canvas.icon((307, 20), "wifi", 15, palette["text"])
    canvas.icon((334, 20), "battery-full", 20, palette["text"])


def navigation(canvas, palette):
    canvas.box((0, 716, 360, 800), palette["surface"])
    canvas.line((0, 716, 360, 716), palette["line"])
    canvas.box((62, 729, 118, 762), palette["selected"], radius=16)
    canvas.icon((90, 746), "wallet", 23, palette["primary"])
    canvas.icon((270, 746), "construct-outline", 23, palette["muted"])
    canvas.text((90, 769), "Finance", 12, palette["text"], "mt")
    canvas.text((270, 769), "Tools", 12, palette["muted"], "mt")
    canvas.box((143, 791, 217, 794), palette["muted"], radius=2)


def home_screen(palette):
    canvas = Canvas(360, 800, palette["bg"])
    status(canvas, palette)
    canvas.image.paste(app_icon(palette).resize((28 * SCALE, 28 * SCALE), Image.Resampling.LANCZOS), (20 * SCALE, 57 * SCALE))
    canvas.text((57, 60), "Purplecoins", 23, palette["text"])
    canvas.icon((292, 73), "search-outline", 21, palette["muted"])
    canvas.icon((334, 73), "settings-outline", 22, palette["muted"])
    canvas.text((20, 121), "Finance", 16, palette["text"])
    tiles = [
        ("Transactions", "128 entries", "swap-horizontal", "primary"),
        ("Sources", "4 accounts", "wallet-outline", "blue"),
        ("Categories", "12 categories", "pricetags-outline", "gold"),
        ("Trips", "2 active trips", "airplane-outline", "blue"),
        ("Investments", "6 holdings", "trending-up", "income"),
        ("Analysis", "This month", "pie-chart-outline", "expense"),
    ]
    for index, (title, detail, glyph, accent) in enumerate(tiles):
        left, top = 20 + (index % 2) * 167, 156 + (index // 2) * 151
        canvas.box((left, top, left + 153, top + 135), palette["surface"], palette["line"], radius=8)
        canvas.icon((left + 29, top + 32), glyph, 25, palette[accent])
        canvas.text((left + 15, top + 73), title, 16, palette["text"])
        canvas.text((left + 15, top + 101), detail, 11, palette["muted"])
    navigation(canvas, palette)
    return canvas.output((480, 1067))


def compact(canvas, palette, left, top, label, width, calendar=False):
    canvas.box((left, top, left + width, top + 35), palette["field"], palette["line"], radius=7)
    canvas.text((left + 11, top + 10), label, 12, palette["text"])
    canvas.icon((left + width - 14, top + 18), "calendar-outline" if calendar else "chevron-down", 13, palette["muted"])


def transaction_screen(palette):
    canvas = Canvas(360, 800, palette["bg"])
    status(canvas, palette)
    canvas.icon((22, 72), "chevron-back", 23, palette["text"])
    canvas.text((45, 62), "New transaction", 17, palette["text"])
    canvas.box((249, 51, 340, 89), palette["selected"], radius=7)
    canvas.icon((265, 70), "add", 18, palette["primary"])
    canvas.text((280, 63), "Add item", 12, palette["primary"])
    canvas.line((0, 103, 360, 103), palette["line"])
    compact(canvas, palette, 20, 120, "General", 91)
    compact(canvas, palette, 119, 120, "Debit", 77)
    compact(canvas, palette, 204, 120, "Bank", 79)
    compact(canvas, palette, 20, 163, "21 Oct 2026", 124, calendar=True)
    compact(canvas, palette, 152, 163, "No trip", 91)
    canvas.text((20, 226), "AMOUNT (INR)", 11, palette["muted"])
    canvas.text((190, 226), "CATEGORY", 11, palette["muted"])
    canvas.box((20, 249, 172, 304), palette["surface"], palette["line"], radius=8)
    canvas.box((188, 249, 340, 304), palette["surface"], palette["line"], radius=8)
    canvas.text((34, 268), "1,250.00", 19, palette["text"])
    canvas.text((201, 270), "Groceries", 14, palette["text"])
    canvas.icon((324, 278), "chevron-down", 16, palette["muted"])
    canvas.text((20, 339), "REASON (OPTIONAL)", 11, palette["muted"])
    canvas.box((20, 362, 340, 437), palette["surface"], palette["line"], radius=8)
    canvas.text((34, 382), "Weekly groceries", 14, palette["text"])
    canvas.box((0, 712, 360, 800), palette["surface"])
    canvas.line((0, 712, 360, 712), palette["line"])
    canvas.text((20, 728), "Total", 11, palette["muted"])
    canvas.text((20, 750), "INR 1,250.00", 17, palette["text"])
    canvas.box((181, 730, 340, 777), palette["primary"], radius=8)
    canvas.text((260, 746), "Save transaction", 13, palette["onPrimary"], "mt")
    canvas.box((143, 791, 217, 794), palette["muted"], radius=2)
    return canvas.output((480, 1067))


def render_board(palette):
    canvas = Canvas(1800, 1420, "#EDF1F5")
    for horizontal in range(0, 1800, 48):
        canvas.line((horizontal, 0, horizontal, 1420), "#E5EAF0")
    for vertical in range(0, 1420, 48):
        canvas.line((0, vertical, 1800, vertical), "#E5EAF0")
    canvas.text((60, 52), palette["number"] + " / " + palette["name"], 44, "#192636")
    canvas.text((62, 115), "Purplecoins  |  Dark-only visual concept  |  Fictional data", 20, "#526479")
    image = canvas.output()
    draw = ImageDraw.Draw(image)
    for left, title, screen in [(64, "Home / Finance", home_screen(palette)), (614, "Transaction entry", transaction_screen(palette))]:
        draw.rounded_rectangle((left - 9, 189, left + 489, 1275), radius=29, fill="#1B222A")
        image.paste(screen, (left, 198))
        draw.text((left, 1310), title, font=ImageFont.truetype(str(FONT), 22), fill="#34485F")
    icon = app_icon(palette)
    icon.save(OUTPUT / (palette["slug"] + "-icon.png"))
    image.paste(icon.resize((216, 216), Image.Resampling.LANCZOS), (1194, 216))
    draw.text((1194, 467), "App icon concept", font=ImageFont.truetype(str(FONT), 26), fill="#192636")
    draw.text((1194, 507), "Coin + ledger mark", font=ImageFont.truetype(str(FONT), 18), fill="#526479")
    for size, left in [(64, 1194), (48, 1290), (32, 1370)]:
        image.paste(icon.resize((size, size), Image.Resampling.LANCZOS), (left, 566))
    draw.text((1194, 658), "Palette", font=ImageFont.truetype(str(FONT), 26), fill="#192636")
    for index, (role, key) in enumerate([("Background", "bg"), ("Surface", "surface"), ("Action", "primary"), ("Income", "income"), ("Expense", "expense")]):
        top = 714 + index * 61
        draw.rounded_rectangle((1194, top, 1234, top + 40), radius=5, fill=palette[key], outline="#BCC8D6")
        draw.text((1253, top + 1), role, font=ImageFont.truetype(str(FONT), 17), fill="#34485F")
        draw.text((1432, top + 3), palette[key], font=ImageFont.truetype(str(FONT), 15), fill="#526479")
    for index, note in enumerate(palette["note"]):
        draw.text((1194, 1081 + index * 37), note, font=ImageFont.truetype(str(FONT), 20), fill="#34485F")
    draw.text((1194, 1250), "Dark-only proposal.", font=ImageFont.truetype(str(FONT), 17), fill="#526479")
    draw.text((1194, 1279), "Not applied to the live app.", font=ImageFont.truetype(str(FONT), 17), fill="#526479")
    assert max(ImageStat.Stat(image).stddev) > 20
    image.save(OUTPUT / (palette["slug"] + ".png"))


if __name__ == "__main__":
    for palette in PALETTES:
        minimum = validate_palette(palette)
        render_board(palette)
        print(f"Rendered {palette['name']}; minimum checked text contrast {minimum:.2f}:1")
