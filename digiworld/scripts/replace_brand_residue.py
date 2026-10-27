#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Replace the real brands check_no_brands.py still finds in seed data and task
definitions with invented names.

Replacements follow the anonymisation pass of the public release: each brand
gets the name that pass gave it most often (e.g. Toyota -> Tolimar). Brands that
pass did not cover (bank names, a few model names) get a new invented name,
listed in EXTRA_REPLACEMENTS; the extended list of check_no_brands.py (product
lines, couriers, aircraft makers, car models, bank products, ...) uses
EXTENDED_REPLACEMENTS, OTHER_REPLACEMENTS and FURTHER_REPLACEMENTS. A second
round adds chip lines, payees, leagues and model names (V2_REPLACEMENTS,
CAR_MODEL_NAMES, AIRCRAFT_NAMES) and gives a new name to invented names that are
real brands themselves (NAMES_V2, e.g. Visa -> Vantage -> Varenta); a brand
always lands on its current name. rename_invented_names.py moves existing data
from the earlier names.

The same mapping is applied everywhere -- instance JSON, profile mock JSON,
session rootstores, UI-state rootstores and the text cells of the session DBs --
so names stay consistent between the data and the tasks that refer to them. JSON
files are edited as text (layout untouched); keys, paths, URLs and file names are
never changed.

Usage:
  python digiworld/scripts/replace_brand_residue.py --check     # count only
  python digiworld/scripts/replace_brand_residue.py --write
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_no_brands as C  # noqa: E402

# brand -> name used by the anonymisation pass (its most frequent replacement)
REPLACEMENTS = {
    "Visa": "Vantage", "Mastercard": "Summit Card", "American Express": "Prestige",
    "Zelle": "QuickPay", "Toyota": "Tolimar", "Ford": "Fairmont",
    "Hyundai": "Halcyon", "Chevrolet": "Camdon", "Outback": "Backcountry", "Mazda": "Meridia",
    "Android": "Nimbus OS", "Subaru": "Sylvan", "Nissan": "Nimbus", "Honda": "Harmony",
    "Mercedes-Benz": "Marbach", "Jeep": "Wayfarer", "Silverado": "Silverpeak",
    "Volkswagen": "Verdant", "Tesla": "Electra", "Casablanca": "Nightfall", "Mustang": "Stallion",
    "BMW": "Baymar", "Kia": "Kestrel", "Camry": "Camdyn", "Corolla": "Corvale",
    "Cherokee": "Summit", "Audi": "Avanti", "Lexus": "Luxor", "RAV4": "TRV4",
    "Wrangler": "Wanderer", "GMC": "Granite", "Altima": "Alterra", "Prius": "Prisma",
    "Tiguan": "Tigris", "Ioniq": "Ionis", "Model Y": "EY", "Model 3": "E3", "RTX": "RTZ",
    "Inception": "Reverie", "RDNA": "RDNX", "Forester": "Woodland", "Jetta": "Jetstream",
    "FIFA": "IFSA", "Intel": "Vertex Micro", "Telluride": "Tellstone", "Nintendo": "Vertex",
    "Cybertruck": "Ironhide", "Polestar": "Pinnacle", "iOS": "LumaMobile", "NBA": "ProBall",
    "Rivian": "Riverton", "AirPlay": "AirCast", "Snapdragon": "Stormcore", "Nerf": "Zap",
    "Solterra": "Solaris", "Hummer": "Titan", "Xbox": "GameBox", "PlayStation": "PlayCore",
    "AMD": "Radiant", "Ryzen": "Ryze", "Alexa": "Aria", "Polaroid": "Instasnap",
    "iPhone": "LumaPhone", "iPad": "LumaTab", "Samsung": "Solstice", "Google": "Corvex",
    "Sony": "Auralis", "Intel Core": "Vertex Micro Core", "NVIDIA": "Vireo", "Nvidia": "Vireo",
    # lower-case enum ids (card types / payment types)
    "visa": "vantage", "mastercard": "summit card", "amex": "prestige", "discover": "horizon card",
    "paypal": "paylink", "zelle": "quickpay",
}
for _phrase in ("Apple LumaPhone", "Apple LumaBuds", "Apple Vista", "Apple Watch", "Apple TV", "Apple Music",
                "Apple iPhone", "Apple AirPods", "Apple\u2019s new", "Apple's new"):
    REPLACEMENTS[_phrase] = _phrase.replace("Apple", "Lumen")   # anonymisation pass: Apple -> Lumen
REPLACEMENTS.update({"Harmony Civic": "Harmony Civix", "Harmony Accord": "Harmony Concord", "Elantra": "Elara",
                     "EQS": "EQX", "R1T": "R2T", "R1S": "R2S", "EV6": "EV9", "Tucson": "Tucana"})
# brands the anonymisation pass did not replace: new invented names
EXTRA_REPLACEMENTS = {
    "Volvo": "Valdor", "Chrysler": "Crestwood",
    "Windows\u202f11": "Skylight\u202f11", "Windows apps": "Skylight apps",
    "Bank of America": "Bank of Arcadia", "Citibank": "Civitas Bank", "Chase Bank": "Chartwell Bank",
    "F-150": "T-150", "Mustang Mach-E": "Stallion Volt", "e-tron": "e-volt", "Windows 11": "Skylight 11",
}
# Names for the extended list in check_no_brands.py (an existing invented name
# is kept; second-round renames are in NAMES_V2 below).
EXTENDED_REPLACEMENTS = {
    # shop / qwikshop product lines
    "LG": "Lumigen", "Pennzoil": "Penrock", "Microsoft": "Softhaven", "Nike": "Nivara",
    "Under Armour": "Iron Weave", "Dyson": "Vortexa", "Garmin": "Gavron", "3M": "Trimesa",
    "Lay's": "Laney's", "Bose": "Boreal", "Lenovo": "Lenara", "Cuisinart": "Cuisivera",
    "Fitbit": "Strideline", "Hot Wheels": "Turbo Treads", "Crayola": "Crayvera",
    "American Eagle": "Liberty Hawk", "Levi's": "Lander's", "Hamilton Beach": "Halton Bay",
    "Neutrogena": "Neuvessa", "Barbie": "Bettina", "Valvoline": "Valtora", "Doritos": "Crunchitos",
    "Hershey's": "Harwood's", "Cheez-It": "Cheddi-Bits", "OnePlus": "OneNova", "Old Navy": "Old Harbor",
    "Adidas": "Adara", "Dell": "Delvar", "Rubbermaid": "Rubbercraft", "Oster": "Osterly",
    "Burt's Bees": "Bert's Meadow", "Maybelline": "Maylene", "L'Oreal": "L'Aurelle", "Revlon": "Revella",
    "The Honest Company": "The Earnest Company", "Peloton": "Pelora", "Lego": "Blokko", "LEGO": "BLOKKO",
    "Castrol": "Castora", "Goodyear": "Goodmile", "Oreo": "Orbeo", "Abercrombie & Fitch": "Ashcombe & Finch",
    "JBL": "Jubal", "Asus": "Asura", "KitchenAid": "HearthCraft", "Aveeno": "Avella", "Bowflex": "Bowtrain",
    "Reebok": "Redbuck", "Mattel": "Toyvista", "Coca-Cola": "Fizzola", "Kellogg's": "Kendall's",
    "Motorola": "Motivo", "Tommy Hilfiger": "Teddy Halworth", "Panasonic": "Panorix", "IKEA": "IKORA",
    "Black+Decker": "Black+Ridge", "CoverGirl": "CoverBelle", "Fisher-Price": "Finch-Parker",
    "Hasbro": "Haverly", "Play-Doh": "Play-Clay", "Bridgestone": "Bridgerock", "Michelin": "Michaux",
    "Nestle": "Nestora", "Nestlé": "Nestora", "Pepsi": "Fizzpop", "Wiley": "Wily", "Gibson": "Galloway",
    # second catalogue (shop/qwikshop order, cart and review rows)
    "Bajaj": "Bhavya", "Bosch": "Brenner", "Britannia": "Britmoor", "CEAT": "TREDA", "Cadbury": "Cadwell",
    "Decathlon": "Stadia Sports", "Forest Essentials": "Grove Essentials", "Funskool": "Funvilla", "H&M": "J&V",
    "Haldiram's": "Hiralal's", "HomeTown": "Hearthtown", "MRF": "RVT", "Nivea": "Nuvela", "Oppo": "Oplo",
    "Philips": "Phileon", "Realme": "Truemi", "The Body Shop": "The Body Atelier", "Xiaomi": "Xiyun",
    "Yonex": "Yorex", "Cello": "Cellora", "Gulf": "Bayline", "Himalaya": "Kailasa", "Milton": "Milbrook",
    "Vivo": "Vivra",
    # couriers
    "Amazon Logistics": "Amberly Logistics", "Delhivery": "Dakshin Express", "BlueDart": "BlueSwift",
    "DTDC": "RapidRoute", "FedEx": "FleetEx",
    # product-line brands spelt like ordinary words (only in front of a subcategory)
    "Amazon": "Amberly", "Apple": "Lumen", "Gap": "Gable", "Puma": "Ocelot", "GE": "Genvolt",
    "HP": "Hollis", "MAC": "MOVA", "Mobil": "Mobrix",
    # phone chips, OS and display names in product specs
    "Exynos": "Exyra", "MediaTek": "Medalis", "Kirin": "Kiron", "Retina Display": "Clarity Display",
    # airlines and aircraft makers (fly; IATA codes and flight numbers are kept)
    "Aeromexico": "Aztera", "Hawaiian Airlines": "Pacifica Airlines", "Southwest Airlines": "Sunward Airlines",
    "United Airlines": "Unity Airways", "Frontier Airlines": "Ridgeline Airlines", "Boeing": "Boreas",
    "Airbus": "Skyvane", "Embraer": "Emberline", "CRJ-900": "RJX-900", "Dreamliner": "Skyfarer",
    # car makes and models (parking / ryde / eats)
    "Mercedes": "Marbach", "Porsche": "Portera", "Dodge": "Dunmore", "CRV": "KRV", "Honda CRV": "Harmony KRV",
    "Toyota Prius": "Tolimar Prisma", "Honda Civic": "Harmony Civix", "Model S": "ES",
    "Civic": "Civix", "Sprinter": "Strider", "3 Series": "3 Line", "911 GT3": "912 GTS",
    "Lexus": "Luxor",
    # card networks / wallets as the native seeds and app pickers spell them
    "VISA": "VANTAGE", "AMEX": "PRESTIGE", "Amex": "Prestige", "Discover": "Horizon Card",
    "PayPal": "PayLink", "Paypal": "PayLink", "Paytm": "Paytide", "Stripe Wallet": "Strata Wallet",
    "Apple Pay": "Lumen Pay", "Google Pay": "Corvex Pay", "Venmo": "Venn Pay",
    # bank products
    "Way2Save": "Save2Grow", "Sapphire Banking": "Opal Banking",
}
OTHER_REPLACEMENTS = {
    # chips, cameras, consumer electronics
    "Qualcomm": "Quantra", "Dimensity": "Dimora", "ARM Cortex": "ARQ Cortan", "Cortex-A": "Cortan-A",
    "BIONZ": "VIONZ", "Helio G": "Helion G", "DIGIC": "DIGIQ", "EXPEED": "XPEDE", "GeForce": "GeoForce",
    "Radeon": "Radion", "GTX": "GTZ", "Ambarella": "Amberella", "Retina display": "Clarity display",
    "Walkman": "Strollman", "Canon": "Canor", "Leica": "Leyra", "Nikon": "Nikara", "AirPods": "LumaBuds",
    "MacBook": "LumaBook", "Galaxy S": "Lyra S", "HomeKit": "HomeSync", "Game Boy": "Game Pal",
    "Kindle": "Kindra", "Chromecast": "Castra", "CarPlay": "DriveCast", "Pixel 6": "Pyxis 6",
    "Pixel 7": "Pyxis 7", "Pixel 8": "Pyxis 8", "Trinitron": "Trivision", "Amazon Echo": "Amberly Echo",
    "Tensor G": "Tensa G",
    # collectibles, fashion, sport (athletes are real people: invented names)
    "Star Wars": "Star Saga", "Rolex": "Rovanne", "Michael Jordan": "Malcolm Jarrett", "Marvel": "Mythic",
    "Yamaha": "Yamura", "Patagonia": "Patavia", "Submariner": "Aquamariner", "Fender": "Fenwick",
    "Tiffany": "Tilbury", "Chicago Bulls": "Chicago Thunderhawks", "Omega Seamaster": "Orion Seafarer",
    "Seamaster": "Seafarer", "Funko": "Bobblo", "Fortnite": "Fortrift", "Kobe Bryant": "Corey Bradwell",
    "Chanel": "Chalaine", "Stratocaster": "Skycaster", "Avengers": "Vindicators", "LeBron James": "Lamar Jameson",
    "LeBron": "Lamar", "Spider-Man": "Spinnerman", "Louis Vuitton": "Louis Valmont", "Nissan Leaf": "Nimbus Leaf",
    "Tesla Model S": "Electra ES", "Tesla Model S Plaid": "Electra ES Velocity", "Tesla Model X": "Electra EX", "Model S Plaid": "ES Velocity",
    "DC Comics": "Apex Comics", "Amazon Prime": "Amberly Prime", "Frisbee": "Skydisc",
    # airlines
    "American Airlines": "Liberty Airways", "Delta Air": "Deltora Air", "Delta Airlines": "Deltora Airlines",
    "Delta Air Lines": "Deltora Air Lines",
    # food chains and their products
    "KFC": "Kernel's Chicken", "Whopper": "Whomper", "Frappuccino": "Frappalino", "Starbucks": "Starbrew",
    "Crunchwrap": "Crunchfold", "Pizza Hut": "Pizza Hutch", "McDonald's": "McDougal's",
    "McDonald\u2019s": "McDougal\u2019s", "McFlurry": "McSwirl", "Domino's": "Dominic's", "Taco Bell": "Taco Bay",
    "Burger King": "Burger Crown", "Frosty": "Frostee", "Big Mac": "Big Stack", "McMuffin": "Muffwich",
    "Chalupa": "Chalita", "Croissan'wich": "Croissant Stack",
    # cars (the makes are mapped above; these phrases are matched whole, so they need their own entry)
    "Honda Accord": "Harmony Concord", "Hyundai Sonata": "Halcyon Sonora", "Kia Forte": "Kestrel Fortis",
    # publishers
    "Cengage": "Cengrove", "HarperCollins": "Harborline", "Oxford University Press": "Oxley University Press",
    "McGraw-Hill": "McGrath-Dale", "MIT Press": "Meridian Tech Press", "Bloomsbury": "Bloomfield",
    "Cambridge University Press": "Camden University Press", "Penguin Random House": "Puffin Chance House",
    "Simon & Schuster": "Sutton & Shaw", "Elsevier": "Elvington", "HarperOne": "Harborline One",
    "Scholastic": "Scholaris", "Candlewick": "Candlebrook", "Springer": "Sprengel", "Image Comics": "Mirror Comics",
    "Dark Horse": "Dusk Rider", "Ten Speed Press": "Twelve Gear Press",
    # apps and services
    "Instagram": "Picstream", "Netflix": "Cinevault", "YouTube": "Vidstream", "Spotify": "Tunefy",
    # the rest of the scanner list, so every flagged term has a name
    "Chipotle Mexican Grill": "Chiltepin Mexican Grill", "Pearson Education": "Pierson Learning",
    "Chevrolet Equinox": "Camdon Solstara", "Houghton Mifflin": "Horton Milford", "Subway sandwich": "Subline sandwich",
    "Chase Sapphire": "Chartwell Sapphire", "Safari browser": "Savanna browser", "Addison-Wesley": "Addington-Wells",
    "Hyundai Tucson": "Halcyon Tucana", "Harcourt Brace": "Harwick Grace", "IDW Publishing": "IDX Publishing",
    "Chrome browser": "Chroma browser", "Discover Card": "Horizon Card", "Amazon Basics": "Amberly Basics",
    "Google Chrome": "Corvex Chroma", "Ford Explorer": "Fairmont Explorer", "Nissan Ariya": "Nimbus Aria",
    "Nissan Rogue": "Nimbus Rover", "Rodale Books": "Rowdale Books", "Target store": "Tandem store",
    "Wells Fargo": "Wellmont Bank", "MasterCard": "Summit Card", "Chevy Bolt": "Camdon Arc",
    "Amazon.com": "Amberly.com", "Lucid Air": "Lumina Air", "Routledge": "Routhwick", "Viz Media": "Vizor Media",
    "O'Reilly": "O'Rourke", "Beats by": "Pulse by", "Phaidon": "Phaedra", "Walmart": "Wellmart",
    "Wendy's": "Wanda's", "Firefox": "Flamefox", "JetBlue": "JetAzure", "Chevy": "Camdy",
}

# Names for the further terms check_no_brands.py adds (airlines and couriers as
# whole values, motorcycle makes, products and services in prose).
FURTHER_REPLACEMENTS = {
    "British Airways": "Albion Airways", "Emirates": "Sandpiper Airways", "Qantas Airways": "Wattle Airways",
    "Air France": "Air Lumiere", "Air Canada": "Air Laurentia", "Cathay Pacific": "Harbour Pacific",
    "KLM Royal Dutch": "Royal Lowland", "Japan Airlines": "Hinode Airlines", "Singapore Airlines": "Lion City Airlines",
    "Iberia": "Hesperia", "All Nippon Airways": "Tsubasa Airways", "Lufthansa": "Hansa Nord",
    "Turkish Airlines": "Anatolia Airlines", "Swiss International": "Alpine International",
    "Qatar Airways": "Dunecrest Airways", "Etihad Airways": "Falaj Airways", "Air New Zealand": "Air Southland",
    "DHL": "Dashline", "UPS": "Unipak", "USPS": "Postline",
    "Harley-Davidson": "Hartley-Dawson", "Ducati": "Duccio",
    "Adobe Photoshop": "Pixelforge Studio", "Photoshop": "Pixelforge", "Excel": "Sheetwise",
    "LinkedIn": "Linkfolio", "TikTok": "ReelRush", "Fujifilm": "Fujiwa", "Gore-Tex": "Storm-Tex",
    "Air Zoom": "Air Bounce", "Air Max": "Air Drift", "Cortez": "Cortina", "nike": "nivara", "canon": "canor", "Zoom": "Zoomly",
}

# Second round. Earlier invented names that turned out to be real brands or
# products themselves (e.g. Vantage, Titan, Solaris) get new names. Here they
# are applied to the output of the maps above, so a brand always lands on its
# current name; rename_invented_names.py moves the existing data over.
NAMES_V2 = {
    'QuickPay': 'Trellipay', 'quickpay': 'trellipay', 'Vantage': 'Varenta', 'vantage': 'varenta',
    'VANTAGE': 'VARENTA', 'Summit Card': 'Kelvra Card', 'summit card': 'kelvra card', 'Prestige': 'Orsanne',
    'prestige': 'orsanne', 'PRESTIGE': 'ORSANNE', 'PayLink': 'Payvane', 'paylink': 'payvane',
    'Opal Banking': 'Tessaline Banking', 'Civitas Bank': 'Corvessa Bank', 'Wellmont Bank': 'Vellmoor Bank', 'Lumen': 'Ambrel',
    'Solstice': 'Solvane', 'Vertex': 'Joyvale', 'Vertex Micro': 'Quellix', 'Vertex Micro Core': 'Quellix Core',
    'Ryze': 'Rovenza', 'PlayCore': 'Plaixo', 'GameBox': 'Gamvault', 'AirCast': 'AirRelay',
    'Aria': 'Avessa', 'Boreal': 'Borvald', 'Lumigen': 'Lumyra', 'Vortexa': 'Vorrin',
    'GeoForce': 'Gevra', 'Radion': 'Radelle', 'Canor': 'Kanvel', 'canor': 'kanvel',
    'Pyxis 6': 'Pyrel 6', 'Pyxis 7': 'Pyrel 7', 'Pyxis 8': 'Pyrel 8', 'Kindra': 'Readlyn',
    'Skylight': 'Panelux', 'Hollis': 'Hallorn', 'MOVA': 'MELVA', 'Fujiwa': 'Kumorin',
    'Pixelforge Studio': 'Layerloom Studio', 'Pixelforge': 'Layerloom', 'Instasnap': 'Printiva', 'Zap': 'Foamzing',
    'HomeSync': 'HomeWeave', 'Nimbus OS': 'Velyn OS', 'Strideline': 'Stepvela', 'Stadia Sports': 'Arenix Sports',
    'Fairmont': 'Farrowby', 'Titan': 'Brakhorn', 'Avanti': 'Avelrin', 'Electra': 'Voltaine',
    'Wayfarer': 'Trekmont', 'Harmony': 'Hensmoor', 'Kestrel': 'Kesmora', 'Luxor': 'Luvane',
    'Meridia': 'Marzeno', 'Nimbus': 'Orvanne', 'Pinnacle': 'Polvane', 'Lucent': 'Luccaro',
    'Summit': 'Kerrowan', 'Grand Summit': 'Grand Kerrowan', 'Wanderer': 'Rambleon', 'Silverpeak': 'Silvarro',
    'Alterra': 'Altrevo', 'Ionis': 'Ionvara', 'Woodland': 'Glenmoor', 'Prisma': 'Privela',
    'Backcountry': 'Bushvale', 'Solaris': 'Solmarren', 'Civix': 'Cevora', 'Concord': 'Corriva',
    'Fortis': 'Fornell', 'Voyager': 'Pathmere', 'Ranger': 'Rovalo', 'Strider': 'Stridell',
    'Ironhide': 'Hauler', 'EV9': 'KV-6', 'ES': 'Seren', 'ES Velocity': 'Seren Velocity',
    'E3': 'Quill', 'EY': 'Larkspur', 'EX': 'Heron', '912 GTS': 'Velocera GT',
    'R2T': 'Trailmar', 'R2S': 'Roamark', 'Lumina Air': 'Luccaro Aero', 'Nimbus Rover': 'Orvanne Rovalo',
    'Harmony KRV': 'Hensmoor Covey', 'Deltora Air': 'Dellmora Air', 'Deltora Airlines': 'Dellmora Airlines', 'Deltora Air Lines': 'Dellmora Air Lines',
    'Ridgeline Airlines': 'Highmesa Airlines', 'Alpine International': 'Edelberg International', 'Unipak': 'Parcelon', 'Postline': 'Mailcrest',
    'Wellmart': 'Wexmart', 'Bayline': 'Coveline', 'Cadwell': 'Cadmoor', "Kendall's": "Kerrigan's",
    'Avella': 'Oatelle', 'Old Harbor': 'Old Anchorage', 'Vivra': 'Vylo', 'Tandem store': 'Tallow store',
    'IFSA': 'WFSA', 'Reverie': 'Somnara', 'Fenwick': 'Strummond', 'Louis Valmont': 'Lucien Vautrin',
    'Sprengel': 'Sperlund', 'Cortina': 'Corlando', 'Puffin Chance House': 'Plover Chance House', 'Puffin': 'Plover',
}
V2_REPLACEMENTS = {
    'Joyvale Switch': 'Joyvale Console', 'Vertex Switch': 'Joyvale Console', 'Random House': 'Chance House',
    'Acer Predator': 'Acerro Lynxar', 'Predator X34': 'Lynxar X34',
    'Mazda3': 'Tercia',
    'Quellix i3': 'Quellix QL3', 'Quellix i5': 'Quellix QL5', 'Quellix i7': 'Quellix QL7', 'Quellix i9': 'Quellix QL9',
    'Core i3': 'QL3', 'Core i5': 'QL5', 'Core i7': 'QL7', 'Core i9': 'QL9',
    'Xeon': 'Xavrel', 'Celeron': 'Calvex', 'Pentium': 'Pentrel', 'TD Bank': 'Tarnwick Bank',
    'Allstate Insurance': 'Allgard Insurance', 'Allstate': 'Allgard', 'State Farm Insurance': 'Fieldstone Insurance', 'State Farm': 'Fieldstone',
    'Geico Insurance': 'Gecova Insurance', 'Geico': 'Gecova', 'GEICO': 'GECOVA', 'Progressive Insurance': 'Forwardline Insurance',
    'Verizon Wireless': 'Veritel Wireless', 'Verizon': 'Veritel', 'T-Mobile USA': 'Tellwave Mobile', 'T-Mobile': 'Tellwave Mobile',
    'AT&T Communications': 'Arcwire Communications', 'AT&T Services': 'Arcwire Services', 'AT&T': 'Arcwire', 'Comcast Cable': 'Coastcast Cable',
    'Comcast': 'Coastcast', 'Con Edison': 'Contura Electric', 'Pacific Gas & Electric': 'Seacliff Gas & Electric', 'Southwest Gas': 'Mesa Ridge Gas',
    'World Series': 'Championship Series', 'Texas Rangers': 'Texas Lariats', 'Wimbledon': 'Grasscourt Championships', 'Super Bowl': 'Gridiron Final',
    'MLB': 'ProBase', 'NHL': 'ProPuck', 'Olympics': 'Global Games', 'PS5': 'Plaixo 5',
    'Chromebook': 'Cloudtop', 'Acer Predator X34': 'Acerro Lynxar X34', 'Puffin Random House': 'Plover Chance House', 'Super AMOLED': 'AMOLED',
    'Dynamic AMOLED': 'AMOLED', '270 React': '270 Rebound', 'Flyknit': 'Flyweave', 'Zoom Air': 'Bounce Air',
    'Christopher Nolan': 'Corin Ashdale',
}
CAR_MODEL_NAMES = {
    'Civic': 'Cevora', 'Civic LX': 'Cevora LX', 'Accord': 'Corriva', 'Odyssey': 'Voyella',
    'Pilot': 'Pilvo', 'CR-X': 'Zippet', 'CR-V': 'Covey', 'CRV': 'Covey',
    'KRV': 'Covey', 'Spark EV': 'Glint EV', 'Spark EUV': 'Glint EUV', 'Equinox': 'Equinar',
    'Bolt EV': 'Flare EV', 'Bolt EUV': 'Flare EUV', 'Camaro': 'Caldera', 'Tahoe': 'Tamarack',
    'Silverado': 'Silvarro', 'Silverpeak 1500': 'Silvarro 1500', 'Sonata': 'Serenade', 'Sonnet': 'Serenade',
    'Ionis 5': 'Ionvara 5', 'Ionis 6': 'Ionvara 6', 'Explorer': 'Pathmere', 'T-150 Lightning': 'T-150 Volt',
    'Sienna': 'Siellen', 'Sienna LE': 'Siellen LE', '4Runner': 'Fourtrek', 'ID.4': 'ID.X',
    'Golf': 'Fairway', 'Beetle': 'Scarab', 'C-Class': 'C-Line', 'E-Class': 'E-Line',
    'CX-5': 'Cascara', 'CX-9': 'Covelle', 'Meridia3': 'Tercia', 'RX': 'Rivalta',
    'RXL': 'Rivalta L', 'RZ': 'Razella', 'RZL': 'Razella L', 'Rogue': 'Rovalo',
    'Leaf': 'Fern', 'Leaf e+': 'Fern e+', 'Ariya': 'Aerine', 'Model X': 'Heron',
    'Model S': 'Seren', 'X5': 'X5L', 'iX': 'iXL', 'i4': 'i4X',
    'i3': 'i3X', 'M3': 'M3L', 'Forte': 'Fornell', 'Soul': 'Saunter',
    'Sierra': 'Highland', 'Titan EV': 'Brakhorn EV', 'Q5': 'Quarry', 'Q5X': 'Quarry',
    'A4': 'Alder', 'A4X': 'Alder', 'A4 Premium': 'Alder Premium', 'Air': 'Aero',
    'M2': 'Pace', 'Street 750': 'Avenue 750', 'Iron 883': 'Forge 883', 'Sportster': 'Speedwell',
    'Electra Glide': 'Highway Glide', '911': 'Velocera', '911 GT3': 'Velocera GT', 'Panigale V4': 'Pavera V4',
    'VNL': 'Roadwyn', 'Cooper': 'Cobble', '1500': 'T15',
    # further models found after a make in product and fitment text
    '3 Series': '3 Line', '5 Series': '5 Line', 'A6': 'Ashby', 'XC70': 'TX70', 'Bel Air': 'Bellmoor', 'Corvette': 'Covington', 'Spark': 'Glint', 'Focus': 'Facet', 'Escape': 'Getaway', 'Rio': 'Rialto', 'Sentra': 'Sentrio', '370Z': 'Zenko 37', 'Impreza': 'Imprella', 'F‑150': 'T‑150', 'C‑Class': 'C‑Line', 'E‑Class': 'E‑Line',
    'F-150': 'T-150',
}
AIRCRAFT_NAMES = {
    'Boreas 737 MAX 8': 'Boreas 3780 Ultra', 'Boreas 737-800': 'Boreas 3708', 'Boreas 777-300ER': 'Boreas 7730ER',
    'Boreas 787-9 Skyfarer': 'Boreas 7890 Skyfarer', 'Skyvane A220-300': 'Skyvane 2230', 'Skyvane A320neo': 'Skyvane 3200N',
    'Skyvane A321neo': 'Skyvane 3210N', 'Skyvane A350-900': 'Skyvane 3590',
}
# Phrase entries above whose model part has its own name in CAR_MODEL_NAMES.
for _brand, _name in {"Hyundai Sonata": "Halcyon Serenade", "Chevrolet Equinox": "Camdon Equinar",
                      "Chevy Bolt": "Camdon Flare", "Ford Explorer": "Farrowby Pathmere", "Lucid Air": "Luccaro Aero",
                      "Nissan Rogue": "Orvanne Rovalo", "Nissan Leaf": "Orvanne Fern", "Nissan Ariya": "Orvanne Aerine",
                      "CRV": "Covey", "Honda CRV": "Hensmoor Covey", "Mustang Mach-E": "Stallion Volt",
                      "Penguin Random House": "Plover Chance House", "Cortez": "Corlando"}.items():
    for _m in (OTHER_REPLACEMENTS, EXTENDED_REPLACEMENTS, FURTHER_REPLACEMENTS, EXTRA_REPLACEMENTS):
        if _brand in _m:
            _m[_brand] = _name

# Product names the original data already used (before the anonymisation pass)
# that are real products or brands themselves: renamed everywhere they appear.
# Ordinary words used as names (Nimbus, Summit, Titan, ...) are kept.
PRE_EXISTING_RENAMES = {
    "HomeSync": "HomeWeave", "Old Harbor": "Old Anchorage", "PlayCore": "Plaixo", "GameBox": "Gamvault",
    "Nimbus OS": "Velyn OS", "Solaris": "Solmarren", "Sundara": "Solmarren",
}
MAP = {**REPLACEMENTS, **EXTRA_REPLACEMENTS, **OTHER_REPLACEMENTS, **EXTENDED_REPLACEMENTS, **FURTHER_REPLACEMENTS,
       **V2_REPLACEMENTS, **PRE_EXISTING_RENAMES}
_V2_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(k) for k in sorted(NAMES_V2, key=len, reverse=True)) + r")(?![\w-])")
CONTEXT_NAMES = {"Galaxy": "Lyra", "Switch": "Joyvale", "Sonic": "Blitz Racer", "Nolan": "Ashdale",
                 "Model T": "Runabout", "Cortez": "Corlando", "Lucid": "Luccaro", "Mini": "Pixley", "Ram": "Ridge",
                 "VW": "Verdant", "Air": "Aero", "1500": "T15", "Beetle": "Scarab"}


def settled(term: str) -> str:
    """The replacement for ``term``, itself free of mapped terms. Some phrase
    entries rename only their first word ("Apple iPhone" -> "Lumen iPhone");
    resolving the rest here keeps one pass of this tool idempotent. Earlier
    invented names in the result move on to their second-round name."""
    out = MAP[term] if term in MAP else CONTEXT_NAMES[term]
    for _ in range(4):
        new = C._TERM_RE.sub(lambda m: m.group(0).replace(m.group(1), MAP.get(m.group(1), m.group(1))), out)
        if new == out:
            break
        out = new
    return _V2_RE.sub(lambda m: NAMES_V2[m.group(1)], out)


def model_name(make: str, model: str) -> str | None:
    """Second-round name of a car model after ``make`` (None: keep)."""
    if model in ("1500",) and make not in ("Ram", "Ridge"):
        return None
    if model == "Air" and make not in ("Lucid", "Lucent", "Luccaro"):
        return None
    return CAR_MODEL_NAMES.get(model)


# invented makes only: a real make is renamed first, then its model follows
_MAKE_ALT = "|".join(re.escape(m) for m in sorted(C.CAR_MAKES[:C.CAR_MAKES.index("Toyota")], key=len, reverse=True))
_MODEL_ALT = "|".join(re.escape(m) for m in sorted(CAR_MODEL_NAMES, key=len, reverse=True))
_CAR_RE = re.compile(r"(?<![\w-])(" + _MAKE_ALT + r") (" + _MODEL_ALT + r")(?![\w-]|\.\d)")
_AIRCRAFT_TYPE_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(a) for a in sorted(AIRCRAFT_NAMES, key=len, reverse=True))
                               + r")(?![\w-])")
# vehicle model fields (parking vehicles, ride and delivery drivers) and the
# aircraft field of flights: matched as a whole value
MODEL_KEYS = {"model", "vehicleModel", "vehicle_model"}
_MODEL_TRIM_RE = re.compile(r"(" + _MODEL_ALT + r") (?=[A-Z0-9])")
# bare model values that are only a model next to their make (Polestar 2, Ram 1500, Lucid Air)
MODEL_VALUES = {"2": "Pace", "1500": "T15", "Air": "Aero"}
_VEHICLE_PATHS = ("com.andojopark.sbx", "/parking/", "com.andojoryde.sbx", "/ryde/", "com.andojoeats.sbx", "/eats/")


# Material and fastener trademarks -> generic names (check_no_brands.GENERIC_TERMS).
# Lower case mid-sentence; capitalised at a sentence start or inside a Title Case
# string; PTFE always upper case. "<brand>-style" becomes the generic name alone,
# and "<brand> <generic>" ("Velcro hook-and-loop strap") keeps one generic word.
GENERIC_NAMES = {"velcro": "hook-and-loop", "lycra": "elastane", "kevlar": "aramid", "teflon": "PTFE"}
_GENERIC_RE = re.compile(
    r"(?<![\w-])(?P<brand>velcro|lycra|kevlar|teflon)(?P<style>[-\u2011]style)?"
    r"(?P<dup>\s+(?:hook[-\u2011]and[-\u2011]loop|elastane|aramid|PTFE)(?![\w-]))?(?![A-Za-z])", re.I)


def _is_title_case(text: str) -> bool:
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'\u2019-]*", text) if len(w) > 3]
    return len(words) >= 2 and sum(w[0].isupper() for w in words) / len(words) >= 0.8


def replace_generic(text: str, counts: Counter) -> str:
    title = _is_title_case(text)

    def sub(m):
        brand = m.group("brand")
        name = GENERIC_NAMES[brand.lower()]
        counts[brand] += 1
        if name.isupper():
            return name
        before = text[:m.start()].rstrip()
        sentence_start = not before or before[-1] in ".!?:\n\"(\u2022*-\u2013\u2014"
        if brand[0].isupper() and (sentence_start or title):
            return name[0].upper() + name[1:]
        return name

    return _GENERIC_RE.sub(sub, text)


def replace_text(s: str, counts: Counter, **kw) -> str:
    """One string, replaced until stable: a renamed maker or make can complete a
    phrase the same pass could not see yet ("Boeing 737 MAX 8" -> "Boreas ..."
    -> "Boreas 3780 Ultra"), so a single run of this tool is idempotent."""
    for _ in range(3):
        out = _replace_once(s, counts, **kw)
        if out == s:
            break
        s = out
    return s


def _replace_once(s: str, counts: Counter, scoped=(), allowed=frozenset(), exact=frozenset(), key=None,
                  vehicles=False) -> str:
    if not s:
        return s
    if not re.search(r"\s", s.strip()) and C._PATHLIKE.fullmatch(s.strip()):
        return s   # a path, URL or file name: never edited
    if _GENERIC_RE.search(s):
        s = replace_generic(s, counts)
    if s.strip() in allowed:
        return s
    if s.strip() in exact and (s.strip() in MAP or s.strip() in CONTEXT_NAMES):
        counts[s.strip()] += 1
        return s.replace(s.strip(), settled(s.strip()))
    if vehicles and key in MODEL_KEYS:
        if s.strip() in CAR_MODEL_NAMES or s.strip() in MODEL_VALUES:
            counts[s.strip()] += 1
            return s.replace(s.strip(), MODEL_VALUES.get(s.strip()) or CAR_MODEL_NAMES[s.strip()])
        m = _MODEL_TRIM_RE.match(s)      # a model followed by its trim ("F-150 XL")
        if m:
            counts[m.group(1)] += 1
            return CAR_MODEL_NAMES[m.group(1)] + s[m.end(1):]
    protected = []

    def protect(m):
        protected.append(m.group(0))
        return f"\x00{len(protected) - 1}\x00"

    def sub_aircraft(m):
        counts[m.group(1)] += 1
        return AIRCRAFT_NAMES[m.group(1)]

    def sub_car(m):
        new = model_name(m.group(1), m.group(2))
        if new is None:
            return m.group(0)
        counts[m.group(2)] += 1
        return f"{m.group(1)} {new}"

    t = C._PATHLIKE.sub(protect, s)
    # model names before the model-code guard below ("777-300ER", "F-150")
    t = _AIRCRAFT_TYPE_RE.sub(sub_aircraft, t)
    t = _CAR_RE.sub(sub_car, t)
    t = C.protect_re(t).sub(protect, t)

    def sub_term(m):
        term = m.group(1)
        if term not in MAP:
            return m.group(0)
        counts[term] += 1
        return m.group(0).replace(term, settled(term))

    def sub_context(m):
        term = next(g for g in m.groups() if g)
        if term not in MAP and term not in CONTEXT_NAMES:
            return m.group(0)
        counts[term] += 1
        return m.group(0).replace(term, settled(term))

    # Context rules first: they key on a brand family name ("Air Zoom 'Cortez'"),
    # which the plain-term pass would otherwise rename before they can match.
    t = C._CONTEXT_RE.sub(sub_context, t)
    t = C._TERM_RE.sub(sub_term, t)
    t = C._PRODUCT_LINE_RE.sub(sub_term, t)
    for term in scoped:
        t = C._SCOPED_RE[term].sub(sub_term, t)
    if " " not in t.strip():
        t = C._LOWER_RE.sub(sub_term, t)
    else:
        t = C._QUOTED_LOWER_RE.sub(lambda m: m.group(0) if m.group(1) in allowed else sub_term(m), t)
    t = re.sub("\x00(\\d+)\x00", lambda m: protected[int(m.group(1))], t)
    # again, now that the make itself has its current name (paths still untouched)
    paths = []
    t = C._PATHLIKE.sub(lambda m: paths.append(m.group(0)) or f"\x01{len(paths) - 1}\x01", t)
    t = _CAR_RE.sub(sub_car, t)
    t = re.sub("\x01(\\d+)\x01", lambda m: paths[int(m.group(1))], t)
    if "_" in s and not re.search(r"\s", s):
        t = t.replace(" ", "_")   # an id ("visa_4242"): keep it one token ("summit_card_4242")
    return t


def fix_json_text(raw: str, counts: Counter, key=None, **kw) -> str:
    """Replace inside JSON string values only (keys and layout untouched). The
    key a value sits under is passed on (vehicle model fields match whole)."""
    out, i = [], 0
    for m in re.finditer(r'"((?:[^"\\]|\\.)*)"(\s*:)?', raw):
        out.append(raw[i:m.start()])
        body, is_key = m.group(1), bool(m.group(2))
        if is_key:
            key = json.loads(f'"{body}"')
            out.append(m.group(0))
        else:
            decoded = json.loads(f'"{body}"')
            fixed = replace_text(decoded, counts, key=key, **kw)
            if fixed == decoded:
                out.append(m.group(0))
            else:
                enc = json.dumps(fixed, ensure_ascii=("\\u" in body))[1:-1]
                out.append(f'"{enc}"')
        i = m.end()
    out.append(raw[i:])
    return "".join(out)


def update_rows(con, table: str, updates: list) -> None:
    """UPDATE ``table`` rows ({column: value}, rowid) with the table's
    self-updating triggers switched off, so an "updated_at = now" trigger does
    not restamp rows that only had their text renamed. Other triggers (e.g. the
    ones keeping a full-text index in step) stay on. The switched-off triggers
    are recreated as they were."""
    self_update = re.compile(r'\bUPDATE\s+"?' + re.escape(table) + r'"?\s+SET\b', re.I)
    triggers = [(n, sql) for n, sql in con.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name=?", (table,)).fetchall()
        if sql and self_update.search(sql)]
    for name, _ in triggers:
        con.execute(f'DROP TRIGGER "{name}"')
    for upd, rowid in updates:
        sets = ", ".join(f'"{c}" = ?' for c in upd)
        con.execute(f'UPDATE "{table}" SET {sets} WHERE rowid = ?', [*upd.values(), rowid])
    for _, sql in triggers:
        con.execute(sql)


def fix_db(path: Path, counts: Counter, write: bool) -> int:
    kw = _kwargs(path)
    con = sqlite3.connect(path)
    changed = 0
    tables = [r[0] for r in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql NOT LIKE '%VIRTUAL%'")]
    for t in tables:
        if re.search(r"_fts(_|$)", t):
            continue
        cols = [r[1] for r in con.execute(f'PRAGMA table_info("{t}")')]
        try:
            rows = con.execute(f'SELECT rowid, * FROM "{t}"').fetchall()
        except sqlite3.DatabaseError:
            continue
        updates = []
        for row in rows:
            upd = {}
            for c, v in zip(cols, row[1:]):
                if isinstance(v, str):
                    nv = (fix_json_text(v, counts, key=c, **kw) if v[:1] in "[{" and _is_json(v)
                          else replace_text(v, counts, key=c, **kw))
                    if nv != v:
                        upd[c] = nv
            if upd:
                updates.append((upd, row[0]))
        changed += len(updates)
        if write and updates:
            update_rows(con, t, updates)
    if write and changed:
        # keep full-text indexes in step with the rows they index
        for (t,) in con.execute("SELECT name FROM sqlite_master WHERE sql LIKE '%VIRTUAL TABLE%fts%'").fetchall():
            try:
                con.execute(f"INSERT INTO \"{t}\"(\"{t}\") VALUES('rebuild')")
            except sqlite3.DatabaseError:
                pass
        con.commit()
    con.close()
    return changed


def _kwargs(path) -> dict:
    return dict(scoped=C.scoped_terms_for(path), allowed=C.allowed_exact_for(path), exact=C.exact_terms_for(path),
                vehicles=any(f in str(path) for f in _VEHICLE_PATHS))


def name_for(term: str) -> str:
    for table in (MAP, CONTEXT_NAMES, AIRCRAFT_NAMES, CAR_MODEL_NAMES, MODEL_VALUES):
        if term in table:
            return settled(term) if table in (MAP, CONTEXT_NAMES) else table[term]
    return GENERIC_NAMES.get(term.lower(), "?")


def _is_json(v: str) -> bool:
    try:
        json.loads(v)
        return True
    except ValueError:
        return False


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    ap.add_argument("--scope", default="instances,data")
    args = ap.parse_args(argv)
    counts, files = Counter(), 0
    for scope in args.scope.split(","):
        for path in C.files_for(scope.strip()):
            if C.is_lfs_pointer(path):
                continue
            if path.suffix == ".db":
                if fix_db(path, counts, args.write):
                    files += 1
                continue
            raw = path.read_text(encoding="utf-8")
            new = fix_json_text(raw, counts, **_kwargs(path))
            if new != raw:
                assert _keys(json.loads(raw)) == _keys(json.loads(new)), path
                files += 1
                if args.write:
                    path.write_text(new, encoding="utf-8")
    print(f"{sum(counts.values())} replacements in {files} files")
    for term, n in counts.most_common():
        print(f"  {n:6d}  {term} -> {name_for(term)}")
    return 0


def _keys(o):
    if isinstance(o, dict):
        return sorted((k, _keys(v)) for k, v in o.items())
    if isinstance(o, list):
        return [_keys(v) for v in o]
    return None


if __name__ == "__main__":
    sys.exit(main())
