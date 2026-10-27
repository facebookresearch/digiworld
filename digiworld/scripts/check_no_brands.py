#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Fail if seed data or task definitions mention a real brand.

The public release replaced real brands (card networks, car makers, chains,
consumer electronics, publishers, ...) with invented names in its anonymisation
pass. This check keeps it that way: it scans the data a change touches for the
brand terms that pass replaced plus a curated list of obvious ones.

Scopes (combine with commas):
  instances  scenario/instance JSON under digiworld/scenarios/scenarios, plus
             tasks_list.jsonl and scenario_list.json            (default)
  data       profile mock JSON, rootstores and session DB text under
             digiworld/state_data, and ui_states rootstores

Usage:
  python digiworld/scripts/check_no_brands.py                    # instances, all files
  python digiworld/scripts/check_no_brands.py --scope instances,data
  python digiworld/scripts/check_no_brands.py --diff origin/main  # only files changed since
Exit status 1 when any hit is found.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repo root (override with --root)
PKG = ROOT / "digiworld" / "digiworld"

# Terms matched case-sensitively on word boundaries. Single words that are also
# ordinary English words are only listed inside a phrase (e.g. "Burger King",
# not "King"). Lower-case payment ids used as enum values are listed separately.
BRAND_TERMS = [
    # payment networks / wallets / banks
    "Visa", "Mastercard", "MasterCard", "American Express", "Amex", "AMEX", "Discover Card",
    "PayPal", "Paypal", "Zelle", "Venmo", "Apple Pay", "Google Pay", "Chase Sapphire",
    "Wells Fargo", "Bank of America", "Citibank", "Chase Bank",
    # operating systems / platforms / software
    "Android", "iOS", "iPadOS", "macOS", "Windows 10", "Windows 11", "Windows\u202f11", "Windows apps",
    "Microsoft", "Ubuntu",
    "Google Chrome", "Chrome browser", "Chromecast", "Firefox", "Safari browser", "Wear OS", "WearOS", "AirPlay", "CarPlay",
    "HomeKit", "Alexa", "Spotify", "Instagram", "Netflix", "YouTube", "Fortnite",
    # consumer electronics and chips
    # "Apple" alone is also the fruit: only brand uses are listed
    "Apple LumaPhone", "Apple LumaBuds", "Apple Vista", "Apple Watch", "Apple TV", "Apple Music",
    "Apple iPhone", "Apple AirPods", "Apple\u2019s new", "Apple's new", "iPhone", "iPad", "MacBook", "AirPods", "Retina display", "Samsung", "Galaxy S",
    "Google", "Pixel 6", "Pixel 7", "Pixel 8", "Sony", "PlayStation", "Walkman", "Trinitron",
    "Nintendo", "Game Boy", "Xbox", "Canon", "Nikon", "Leica", "Polaroid", "Garmin", "Bose",
    "Beats by", "Yamaha", "Intel", "AMD", "Ryzen", "Radeon", "NVIDIA", "Nvidia", "GeForce",
    "RTX", "GTX", "Qualcomm", "Snapdragon", "MediaTek", "Dimensity", "Helio G", "Exynos",
    "ARM Cortex", "Cortex-A", "RDNA", "BIONZ", "EXPEED", "DIGIC", "Ambarella", "Tensor G",
    # car makers and models
    "Toyota", "Honda", "Ford", "Chevrolet", "Chevy", "Nissan", "Subaru", "Hyundai", "Tesla",
    "BMW", "Mercedes", "Mercedes-Benz", "Audi", "Volkswagen", "Kia", "Mazda", "Lexus", "Jeep",
    "GMC", "Polestar", "Rivian", "Lucid Air", "Hummer", "Camry", "Corolla", "Prius", "RAV4",
    "Mustang", "Silverado", "Wrangler", "Cherokee", "Outback", "Forester", "Tiguan", "Jetta",
    "Altima", "Ioniq", "Telluride", "Cybertruck", "Model 3", "Model Y", "Tesla Model S", "Tesla Model X",
    "Model S Plaid",
    "Mustang Mach-E", "F-150", "Honda Civic", "Honda Accord", "Nissan Leaf", "Nissan Rogue",
    "Chevy Bolt", "Ford Explorer", "Kia Forte", "Hyundai Sonata", "Hyundai Tucson",
    "Chevrolet Equinox", "Volvo", "Chrysler", "Elantra", "Harmony Civic", "Harmony Accord", "Solterra", "Nissan Ariya", "e-tron", "EQS", "R1T", "R1S", "EV6",
    # food and drink chains
    "KFC", "McDonald's", "McDonald\u2019s", "Burger King", "Whopper", "Starbucks", "Frappuccino",
    "Taco Bell", "Crunchwrap", "Chalupa", "Domino's", "Pizza Hut", "Subway sandwich", "McFlurry",
    "McMuffin", "Big Mac", "Croissan'wich", "Frosty", "Coca-Cola", "Pepsi", "Wendy's", "Chipotle Mexican Grill",
    # retail, fashion, toys, sport
    "Amazon.com", "Amazon Prime", "Amazon Echo", "Amazon Basics", "Kindle", "Walmart", "Target store", "Nike", "Adidas", "Patagonia", "Rolex", "Submariner",
    "Omega Seamaster", "Seamaster", "Chanel", "Tiffany", "Louis Vuitton", "Barbie", "Funko", "Nerf", "Frisbee",
    "Fender", "Stratocaster", "Gibson", "NBA", "FIFA", "Chicago Bulls", "Michael Jordan",
    "LeBron", "Kobe Bryant", "Star Wars", "Avengers", "Spider-Man", "Marvel",
    # airlines
    "Delta Air", "United Airlines", "American Airlines", "Southwest Airlines", "JetBlue",
    # publishers
    "Penguin Random House", "HarperCollins", "HarperOne", "Simon & Schuster", "McGraw-Hill",
    "Pearson Education", "Cengage", "Wiley", "Springer", "Elsevier", "Routledge", "Bloomsbury",
    "Scholastic", "Candlewick", "Houghton Mifflin", "Harcourt Brace", "Phaidon", "Rodale Books",
    "Addison-Wesley", "O'Reilly", "Oxford University Press", "Cambridge University Press",
    "MIT Press", "Ten Speed Press", "Viz Media", "IDW Publishing", "DC Comics", "Image Comics",
    "Dark Horse",
    # films used as titles
    "Casablanca", "Inception",
]
# Words that are a brand only in some apps' data (e.g. "Tucson" is a car model in
# the parking app and a city elsewhere): term -> bundle ids where it is a brand.
SCOPED_TERMS = {"Tucson": ("com.andojopark.sbx",)}

# enum-style lower-case ids (card types, payment types, instance ids): matched only
# in strings without spaces, e.g. "visa" or "visa_maria_gonzalez_2", not prose
LOWER_TERMS = ["visa", "mastercard", "amex", "discover", "paypal", "zelle"]

# ---------------------------------------------------------------------------
# Extended list: product-line, courier, aircraft-maker, car-model, card-spelling
# and bank-product names the list above does not name (replacement names in
# replace_brand_residue.py).
EXTENDED_TERMS = [
    # consumer brands used as product-line prefixes in shop / qwikshop data
    "LG", "Pennzoil", "Microsoft", "Under Armour", "Dyson", "3M", "Lay's", "Lenovo", "Cuisinart",
    "Fitbit", "Hot Wheels", "Crayola", "American Eagle", "Levi's", "Hamilton Beach", "Neutrogena",
    "Valvoline", "Doritos", "Hershey's", "Cheez-It", "OnePlus", "Old Navy", "Dell", "Rubbermaid",
    "Oster", "Burt's Bees", "Maybelline", "L'Oreal", "Revlon", "The Honest Company", "Peloton",
    "Lego", "LEGO", "Castrol", "Goodyear", "Oreo", "Abercrombie & Fitch", "JBL", "Asus", "KitchenAid",
    "Aveeno", "Bowflex", "Reebok", "Mattel", "Coca-Cola", "Kellogg's", "Motorola", "Tommy Hilfiger",
    "Panasonic", "IKEA", "Black+Decker", "CoverGirl", "Fisher-Price", "Hasbro", "Play-Doh",
    "Bridgestone", "Michelin", "Nestle", "Nestl\u00e9",
    # second catalogue in shop/qwikshop order, cart and review rows
    "Bajaj", "Bosch", "Britannia", "CEAT", "Cadbury", "Decathlon", "Forest Essentials", "Funskool", "H&M",
    "Haldiram's", "HomeTown", "MRF", "Nivea", "Oppo", "Philips", "Realme", "The Body Shop", "Xiaomi", "Yonex",
    # couriers on shop/qwikshop orders
    "Amazon Logistics", "Delhivery", "BlueDart", "DTDC", "FedEx",
    # phone chips / display names in product specs
    "Kirin", "Retina Display",
    # airlines and aircraft makers (fly)
    "Aeromexico", "Hawaiian Airlines", "Frontier Airlines", "Boeing", "Airbus", "Embraer",
    "CRJ-900", "Dreamliner",
    # car makes and models (parking, ryde, eats)
    "Porsche", "Dodge", "Honda CRV", "Toyota Prius",
    # card networks, wallets and bank products written differently from the list above
    "VISA", "AMEX", "Paytm", "Stripe Wallet", "Apple Pay", "Google Pay", "Way2Save",
    "Sapphire Banking",
    # spellings the list above does not catch ("Delta Air" stops before "lines")
    "Delta Airlines", "Delta Air Lines", "LeBron James", "Tesla Model S Plaid",
]
# Brands that are also ordinary words: only flagged in their brand context
# (a camera "Canon EOS", jewellery "Tiffany & Co", the dessert "Chocolate Frosty").
CONTEXT_TERMS = {   # term -> regex; the term is a capture group
    "Canon": r"(?<![\w-])(Canon)(?= (?:EOS|PowerShot|Rebel|RF|EF|camera|Camera|lens|Lens|\d))",
    "Tiffany": r"(?<![\w-])(Tiffany)(?= (?:& Co|lamp|Lamp|necklace|Necklace|ring|Ring|bracelet|Bracelet|"
               r"earrings|Earrings|style|Style|blue|Blue|setting|Setting|sterling|Sterling|heart|Heart|key|Key))",
    "Frosty": r"(?<![\w-])(Frosty)(?= (?:dessert|Dessert|shake|Shake|treat|Treat|cup|Cup|cone|Cone|[Ff]loat|Key Lime))"
              r"|(?<=Chocolate )(Frosty)|(?<=Vanilla )(Frosty)|(?<=Wendy's )(Frosty)",
}
# Brands spelt like ordinary words. A card provider "Discover" is only a brand
# as a whole string value; vehicle models only as a whole value in parking data
# (term -> path fragments, None = anywhere).
_PARK = ("andojo_park", "com.andojopark.sbx", "/parking/")
EXACT_TERMS = {"Discover": None, "Civic": _PARK, "Sprinter": _PARK, "3 Series": _PARK, "911 GT3": _PARK,
               "Model S": _PARK}
# Shop product lines are "<brand> <subcategory> <adjective> <model>"; these brands
# are ordinary words elsewhere, so they only count in front of a subcategory.
PRODUCT_LINE_BRANDS = ["Amazon", "Apple", "Gap", "Puma", "GE", "HP", "MAC", "Mobil", "Cello", "Gulf",
                       "Himalaya", "Milton", "Vivo"]
_SUBCATEGORIES = ("Accessories|Action Figures|Audio Devices|Bedding|Bike Accessories|Board Games|Cameras|"
                  "Car Accessories|Car Care|Chips|Chocolates|Educational Toys|Exercise Equipment|"
                  "Feature Phones|Footwear|Furniture|Haircare|Health Supplements|Home Decor|Kids' Wear|"
                  "Kitchen Appliances|Laptops|Makeup|Men|Women|Outdoor Activities|Personal Care|Puzzles|"
                  "Skincare|Smartphones|Soft Drinks|Sports Gear|Tablets|Tools|Appliances|Health Drinks|"
                  "Coffee|Snacks|Mobiles")
# Contexts that are not brands: the scientist, and surnames inside generated
# company names ("Quinn, Humphrey and Ford", "O'Reilly and Sons").
_SURNAMES = r"(?:Ford|O'Reilly|Wiley|Gibson|Dell|Hamilton|Oster)"


def _not_brand(surnames: str, person: str) -> str:
    return (
        r"Nikola(?: [A-Z]\.)? Tesla|Tesla(?=,? Nikola)|Tesla[ _][Cc]oils?\b"
        r"|\b(?!Original |Classic |Vintage |Genuine |Restored |Historic |Antique )[A-Z][a-z]+ " + person +
        r"(?![\w-]| [A-Z0-9]| models?\b| engines?\b)"           # a surname ("Anthony Ford", "Nina Oster")
        r"|\b(?!RTX|GTX)[A-Z0-9]{1,3}[-\u2011]\d{2,}"            # batch/model codes ("LG-2023", "S-210")
        rf"|{surnames}(?= and Sons| Group| LLC| Inc| PLC| Ltd|, | and | - )"
        rf"|(?<=, ){surnames}(?! models?\b)|(?<= and ){surnames}(?! models?\b)|(?<= - ){surnames}"
        r"|Hamilton(?! Beach)"   # a surname/place unless it is the appliance brand
        r"|max_zelle_transaction"   # banking system_config key
    )


NOT_BRAND = re.compile(_not_brand(_SURNAMES, r"(?:Ford|Gibson|Oster)"))
# in text about cars (it names a car make), "Ford" is the make, not a surname
NOT_BRAND_CARS = re.compile(_not_brand(_SURNAMES.replace("Ford|", ""), r"(?:Gibson|Oster)"))
# Lower-case ids that are not brand text in one app's data: the video 'discover'
# hashtag. (The banking transaction-type code follows the wallet's name, as the
# session DBs already do.)
ALLOWED_EXACT = {"andojo_video": {"discover"}, "": {"Gibson"}}  # "": anywhere (a last name)

# Further names this data carries that neither list above names: airlines and
# couriers (whole values), motorcycle makes in parking data, and a few products
# and services mentioned in video, mail and product text.
_FLY = ("com.andojofly.sbx", "/flightbooking/")
_COURIER = ("com.andojoqwikshop.sbx", "com.andojoshop.sbx", "/qwikshop/", "/ecommerce/")
EXACT_TERMS.update({
    "British Airways": _FLY, "Emirates": _FLY, "Qantas Airways": _FLY, "Air France": _FLY,
    "Air Canada": _FLY, "Cathay Pacific": _FLY, "KLM Royal Dutch": _FLY, "Japan Airlines": _FLY,
    "Singapore Airlines": _FLY, "Iberia": _FLY, "All Nippon Airways": _FLY, "Lufthansa": _FLY,
    "Turkish Airlines": _FLY, "Swiss International": _FLY, "Qatar Airways": _FLY, "Etihad Airways": _FLY,
    "Air New Zealand": _FLY,
    "DHL": _COURIER, "UPS": _COURIER, "USPS": _COURIER,
    "Harley-Davidson": _PARK, "Ducati": _PARK,
})
EXTENDED_TERMS += ["Adobe Photoshop", "Photoshop", "LinkedIn", "TikTok", "Fujifilm", "Gore-Tex", "Harley-Davidson",
                   "Ducati", "Air Zoom", "Air Max"]
CONTEXT_TERMS.update({
    "Excel": r"(?<![\w-])(Excel)(?= (?:with|skills|Pivot|pivot|formulas|Formulas|to|spreadsheets?)\b)|(?<=in )(Excel)(?=[,.])"
             r"|(?<=basic )(Excel)",
    "Cortez": r"(?<=Air Zoom ')(Cortez)",
    "nike": r"(?<![\w-])(nike)(?= shoes)",
    "canon": r"(?<![\w-])(canon)(?= camera)",
    "Zoom": r"(?<![\w-])(Zoom)(?= (?:meeting|call|glitch|disaster|background)\b)",
})

# Material and fastener trademarks used as generic words: replaced with the
# generic name (replace_brand_residue.GENERIC_NAMES), any capitalisation.
GENERIC_TERMS = ["Velcro", "velcro", "VELCRO", "Lycra", "lycra", "LYCRA", "Kevlar", "kevlar", "KEVLAR",
                 "Teflon", "teflon", "TEFLON"]
EXTENDED_TERMS += GENERIC_TERMS

# Second round: chip lines, a bank, insurers and telecoms used as payees, sports
# leagues and events, consoles and laptops, a publisher, a film director, and
# the model names that follow a (renamed) car make or aircraft maker.
EXTENDED_TERMS += [
    "Core i3", "Core i5", "Core i7", "Core i9", "Xeon", "Celeron", "Pentium", "TD Bank",
    "Allstate", "State Farm", "Geico", "GEICO", "Progressive Insurance", "Verizon", "T-Mobile", "AT&T",
    "Comcast", "Con Edison", "Pacific Gas & Electric", "Southwest Gas",
    "World Series", "Texas Rangers", "Wimbledon", "Super Bowl", "MLB", "NHL", "Olympics",
    "PS5", "Chromebook", "Acer Predator", "Predator X34", "Random House", "Super AMOLED", "Dynamic AMOLED",
    "Christopher Nolan", "Flyknit", "Zoom Air", "270 React", "Joyvale Switch", "Vertex Switch",
    "Quellix i3", "Quellix i5", "Quellix i7", "Quellix i9", "Mazda3",
]
CONTEXT_TERMS.update({
    "Galaxy": r"(?<=LumaPhone and )(Galaxy)(?= models)|(Galaxy)(?= and LumaPhone)|(?<=vs\. )(Galaxy)|(?<=vs )(Galaxy)|(Galaxy)(?= vs\b)"
              r"|(?<=for )(Galaxy)(?=$|[\"',.])",
    "Switch": r"(?<=for the )(Switch)\b|(?<=on the )(Switch)\b|(?<=for )(Switch)(?= with)|(?<=\()(Switch)(?=\))",
    "Sonic": r"(?<=Levels In )(Sonic)\b",
    "Nolan": r"(Nolan)(?= never stops)",
    "Model T": r"(?<=1903 )(Model T)\b",
    # the sneaker model, also once its family name has been renamed ("Air Zoom" -> "Air Bounce")
    "Cortez": r"(?<=Air Zoom ')(Cortez)|(?<=Air Bounce ')(Cortez)|(?<=Air Bounce \u2018)(Cortez)",
    "Ram": r"\b(Ram)(?= 1500\b| T15\b)",
    "Lucid": r"\b(Lucid)(?= Air\b| Aero\b)",
    "Mini": r"\b(Mini)(?= Cooper\b| Cobble\b)",
    "VW": r"\b(VW)(?= models\b| Golf\b| Beetle\b)",
    "Air": r"(?<=Lucid )(Air)\b|(?<=Lucent )(Air)\b|(?<=Luccaro )(Air)\b",
    "1500": r"(?<=Ram )(1500)\b|(?<=Ridge )(1500)\b",
    "Beetle": r"(?<=[Cc]lassic )(Beetle)\b|(?<=that )(Beetle)(?= looks)",
})
EXACT_TERMS.update({"Lucid": _PARK, "Mini": _PARK, "Ram": _PARK})
# Car models behind invented makes: flagged right after a make, and as a whole
# value in parking data. Aircraft designations: after an aircraft maker.
CAR_MAKES = [
    "Camdon", "Sylvan", "Halcyon", "Tolimar", "Harmony", "Fairmont", "Wayfarer", "Marbach", "Luxor", "Ridge",
    "Verdant", "Kestrel", "Granite", "Avanti", "Meridia", "Nimbus", "Baymar", "Lucent", "Electra", "Pinnacle",
    "Riverton", "Portera", "Duccio", "Hartley-Dawson", "Valdor", "Sterling", "Crestwood", "Dunmore", "Lucid",
    "Mini", "Ram", "Hensmoor", "Farrowby", "Trekmont", "Luvane", "Kesmora", "Brakhorn", "Avelrin", "Marzeno",
    "Orvanne", "Voltaine", "Polvane", "Luccaro", "Pixley",
    # real makes too, so a model is renamed together with its make
    "Toyota", "Honda", "Ford", "Chevrolet", "Chevy", "Nissan", "Subaru", "Hyundai", "Tesla", "BMW", "Mercedes",
    "Mercedes-Benz", "Audi", "Volkswagen", "VW", "Kia", "Mazda", "Lexus", "Jeep", "GMC", "Polestar", "Rivian",
    "Hummer", "Volvo", "Chrysler", "Dodge", "Porsche", "Ducati", "Harley-Davidson",
]
CAR_MODELS = [
    "Civic LX", "Civic", "Accord", "Odyssey", "Pilot", "CR-X", "CR-V", "Spark EV", "Spark EUV", "Equinox",
    "Bolt EV", "Bolt EUV", "Camaro", "Tahoe", "Silverado", "Sonata", "Explorer", "T-150 Lightning", "Sienna LE",
    "Sienna", "4Runner", "ID.4", "Golf", "Beetle", "C-Class", "E-Class", "CX-5", "CX-9", "RX", "RZ", "Rogue",
    "Leaf e\\+", "Leaf", "Ariya", "Model X", "Model S", "X5", "iX", "i4", "i3", "M3", "M2", "Forte", "Soul",
    "Sierra", "Q5", "A4 Premium", "A4", "Street 750", "Iron 883", "Sportster", "Electra Glide", "911",
    "Panigale V4", "VNL", "Cooper", "3 Series", "5 Series", "A6", "XC70", "Bel Air", "Corvette", "Spark",
    "Focus", "Escape", "Rio", "Sentra", "370Z", "Impreza", "F-150", "F\u2011150", "C\u2011Class", "E\u2011Class",
]
AIRCRAFT_MAKERS = ["Boreas", "Skyvane", "Emberline", "Boeing", "Airbus", "Embraer"]
AIRCRAFT_DESIGNATIONS = [
    "737 MAX 8", "737-800", "777-300ER", "787-9", "A220-300", "A320neo", "A321neo", "A350-900", "A220", "A320",
    "A321", "A330", "A350", "A380", "E175", "E190", "737", "747", "757", "767", "777", "787",
]
_CAR_MODEL_RE = re.compile(r"(?<![\w-])(?:" + "|".join(re.escape(m) for m in sorted(CAR_MAKES, key=len, reverse=True))
                           + r") (" + "|".join(sorted(CAR_MODELS, key=len, reverse=True)) + r")(?![\w-]|\.\d)")
_AIRCRAFT_RE = re.compile(r"(?<![\w-])(?:" + "|".join(AIRCRAFT_MAKERS) + r") ("
                          + "|".join(re.escape(d) for d in AIRCRAFT_DESIGNATIONS) + r")(?![\w-])")

# Never look inside paths, URLs, data URIs, file names or package ids: the brand
# word there is part of a location ("/storage/emulated/0/Android/data/..."), not text.
_PATHLIKE = re.compile(
    r"\b[a-z][a-z0-9+.-]*://\S*|\bdata:[\w/+.-]+;base64,\S*"
    r"|(?<![\w.])\.{0,2}/(?:[\w.{}@-]+/)*[\w.{}@-]+|[\w.{}@-]+(?:/[\w.{}@-]+){2,}"
    r"|\b[\w-]+\.(?:png|jpe?g|gif|webp|svg|json|jsonl|db|mp3|mp4|wav|html?|js|ts|css|pdf|txt|csv|py)\b"
    r"|\bcom\.andojo\w*(?:\.\w+)*")

_CONTEXT_RE = re.compile("|".join(CONTEXT_TERMS.values()))
_PRODUCT_LINE_RE = re.compile(r"(?<![\w-])(" + "|".join(PRODUCT_LINE_BRANDS) + r")(?= (?:" + _SUBCATEGORIES + r")\b)")
_ALL_TERMS = sorted((set(BRAND_TERMS) | set(EXTENDED_TERMS)) - set(CONTEXT_TERMS), key=len, reverse=True)
_TERM_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(t) for t in _ALL_TERMS) + r")(?![A-Za-z])")
_SCOPED_RE = {t: re.compile(r"(?<![\w-])(" + re.escape(t) + r")(?![\w'])") for t in SCOPED_TERMS}
_LOWER_RE = re.compile(r"(?<![A-Za-z0-9])(" + "|".join(LOWER_TERMS) + r")(?![A-Za-z0-9])")
# The same lower-case ids as a whole quoted token inside longer text (SQL
# literals 'visa', quoted enum values "paypal").
_QUOTED_LOWER_RE = re.compile(r"(?<=['\"`])(" + "|".join(LOWER_TERMS) + r")(?=['\"`])")


# Identifiers the public release kept on purpose (a profile name and the schema
# of the banking app); they are not user-visible text.
ALLOWED_IDENTIFIERS = re.compile(r"many_zelle_contacts|zelle_contacts?|zelle_contact_id|zelleContactId")
_PROTECT = re.compile(ALLOWED_IDENTIFIERS.pattern + "|" + NOT_BRAND.pattern)
_PROTECT_CARS = re.compile(ALLOWED_IDENTIFIERS.pattern + "|" + NOT_BRAND_CARS.pattern)
_CAR_CUE = re.compile(r"(?<![\w-])(?:GM|Tolimar|Camdon|Marbach|Baymar|Halcyon|Crestwood|Dunmore|Hensmoor|Farrowby|"
                      r"Trekmont|Luvane|Kesmora|Brakhorn|Avelrin|Marzeno|Orvanne|Voltaine|Polvane|Luccaro|Toyota|"
                      r"Honda|Chevrolet|Nissan|Subaru|Hyundai|BMW|Audi|Volkswagen|Kia|Mazda|Lexus|Jeep|Chrysler|"
                      r"Dodge|Harmony Civix|Fairmont)(?![\w-])|\bF[-\u2011]150\b")


def protect_re(text: str):
    """The guard for non-brand uses of brand words in this text."""
    return _PROTECT_CARS if _CAR_CUE.search(text) else _PROTECT
# path fragments of this repo for the app names used in ALLOWED_EXACT
_APP_PATHS = {"andojo_bank": ("com.andojobank.sbx", "/banking/"), "andojo_video": ("com.andojovideo.sbx", "/video/"),
              "": ("",)}


def scoped_terms_for(path) -> list:
    p = str(path)
    return [t for t, bundles in SCOPED_TERMS.items() if any(b in p for b in bundles)]


def allowed_exact_for(path) -> set:
    p = str(path)
    return {v for app, vals in ALLOWED_EXACT.items() if any(f in p for f in _APP_PATHS.get(app, (app,)))
            for v in vals}


def exact_terms_for(path) -> set:
    p = str(path)
    return {t for t, frags in EXACT_TERMS.items() if frags is None or any(f in p for f in frags)}


def scan_text(text: str, scoped=(), allowed_exact=frozenset(), exact=frozenset(t for t, f in EXACT_TERMS.items() if f is None)):
    if text.strip() in allowed_exact:
        return
    if text.strip() in exact:
        yield text.strip()
        return
    text = _PATHLIKE.sub(" ", text)
    for m in _AIRCRAFT_RE.finditer(text):
        yield m.group(1)
    for m in _CAR_MODEL_RE.finditer(text):
        yield m.group(1)
    text = protect_re(text).sub(" ", text)
    for m in _PRODUCT_LINE_RE.finditer(text):
        yield m.group(1)
    for m in _CONTEXT_RE.finditer(text):
        yield next(g for g in m.groups() if g)
    for t in scoped:
        for m in _SCOPED_RE[t].finditer(text):
            yield m.group(1)
    for m in _TERM_RE.finditer(text):
        yield m.group(1)
    if " " not in text.strip():
        for m in _LOWER_RE.finditer(text):
            yield m.group(1)
    else:
        for m in _QUOTED_LOWER_RE.finditer(text):
            if m.group(1) not in allowed_exact:
                yield m.group(1)


def path_kwargs(path) -> dict:
    return dict(scoped=scoped_terms_for(path), allowed_exact=allowed_exact_for(path), exact=exact_terms_for(path))


def iter_strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():          # keys are schema names, not data
            yield from iter_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from iter_strings(v)


def json_strings(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        if path.suffix == ".jsonl":
            objs = [json.loads(line) for line in text.splitlines() if line.strip()]
        else:
            objs = [json.loads(text)]
    except ValueError:
        yield text
        return
    for o in objs:
        yield from iter_strings(o)


def db_strings(path: Path):
    try:
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        tables = [r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        for t in tables:
            try:
                for row in con.execute(f'SELECT * FROM "{t}"'):
                    for v in row:
                        if isinstance(v, str):
                            yield v
            except sqlite3.DatabaseError:
                continue
        con.close()
    except sqlite3.DatabaseError:
        return


def is_lfs_pointer(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            return f.read(40).startswith(b"version https://git-lfs")
    except OSError:
        return False


def files_for(scope: str):
    if scope == "instances":
        yield from (PKG / "scenarios" / "scenarios").rglob("*.json")
        for name in ("tasks_list.jsonl", "scenario_list.json"):
            p = ROOT / "digiworld" / name
            if p.exists():
                yield p
    elif scope == "data":
        yield from (PKG / "state_data").rglob("*.json")
        yield from (PKG / "state_data").rglob("*.db")
        yield from (ROOT / "digiworld" / "ui_states").rglob("*.json")
    else:
        raise SystemExit(f"unknown scope {scope!r}")


def changed_files(base: str):
    out = subprocess.run(["git", "-C", str(ROOT), "diff", "--name-only", base, "--"],
                         capture_output=True, text=True, check=True).stdout
    return {(ROOT / line).resolve() for line in out.splitlines() if line}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scope", default="instances")
    ap.add_argument("--diff", metavar="BASE", help="only scan files changed since BASE (git ref)")
    ap.add_argument("--max-examples", type=int, default=20)
    ap.add_argument("--json", action="store_true", help="print a JSON summary")
    ap.add_argument("--root", type=Path, help="scan another checkout of this repo")
    ap.add_argument("--text", type=Path, action="append", default=[],
                    help="also scan this text file line by line (e.g. a PR description)")
    args = ap.parse_args(argv)
    if args.root:
        global ROOT, PKG
        ROOT = args.root.resolve()
        PKG = ROOT / "digiworld" / "digiworld"
    only = changed_files(args.diff) if args.diff else None

    hits = Counter()
    examples = defaultdict(list)
    scanned = 0
    skipped_lfs = 0
    for scope in args.scope.split(","):
        for path in files_for(scope.strip()):
            if only is not None and path.resolve() not in only:
                continue
            if is_lfs_pointer(path):
                skipped_lfs += 1
                continue
            scanned += 1
            strings = db_strings(path) if path.suffix == ".db" else json_strings(path)
            kw = path_kwargs(path)
            for s in strings:
                for term in scan_text(s, **kw):
                    hits[term] += 1
                    if len(examples[term]) < 3:
                        examples[term].append(f"{path.relative_to(ROOT)}: {s[:120]!r}")
    for tf in args.text:
        scanned += 1
        for line in tf.read_text(encoding="utf-8").splitlines():
            for term in scan_text(line):
                hits[term] += 1
                if len(examples[term]) < 3:
                    examples[term].append(f"{tf}: {line[:120]!r}")
    total = sum(hits.values())
    if args.json:
        print(json.dumps({"scanned_files": scanned, "skipped_lfs_pointers": skipped_lfs,
                          "hits": total, "by_term": dict(hits.most_common()),
                          "examples": examples}, indent=1, ensure_ascii=False))
    else:
        print(f"scanned {scanned} files ({skipped_lfs} LFS pointers skipped): {total} brand hits")
        for term, n in hits.most_common(args.max_examples):
            print(f"  {n:6d}  {term}")
            for e in examples[term]:
                print(f"          {e}")
    if skipped_lfs and "data" in args.scope:
        print("warning: LFS pointers were not scanned; run `git lfs pull` first", file=sys.stderr)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
