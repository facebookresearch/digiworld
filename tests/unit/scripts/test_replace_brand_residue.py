# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for digiworld/scripts/replace_brand_residue.py."""

import importlib.util
import sys
from collections import Counter
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[3] / "digiworld" / "scripts"


def _load():
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(
        "replace_brand_residue", SCRIPTS / "replace_brand_residue.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rbr = _load()


def _fix(text):
    return rbr.replace_text(text, Counter())


def test_context_rule_applies_before_the_family_rename():
    # The model-name rule keys on the family name; both must be replaced.
    out = _fix("Vintage 1978 Air Zoom 'Cortez' sneakers")
    assert "Air Zoom" not in out and "Cortez" not in out
    assert out == _fix(out)  # idempotent


def test_family_name_alone_is_still_replaced():
    out = _fix("Air Zoom trainers")
    assert "Air Zoom" not in out


def test_ordinary_words_untouched():
    for text in (
        "Zoom out to see the map",
        "United Arab Emirates",
        "Bluetooth headphones",
    ):
        assert _fix(text) == text


def test_context_rule_matches_after_the_family_rename():
    out = _fix("Vintage 1978 Apex Athletics Air Bounce 'Cortez' \u2013 Size 9")
    assert "Cortez" not in out and "Air Bounce" in out


def test_paths_urls_and_file_names_are_never_edited():
    for text in (
        "file:///storage/emulated/0/Android/data/com.andojopark.sbx/files/mockdata/assets/default_tiles/tiles/{z}/{x}/{y}.png",
        "https://example.com/Visa/checkout",
        "/wallpapers/Samsung/default.jpg",
        "assets/brands/Toyota/logo.png",
        "Samsung_Galaxy.png",
    ):
        assert _fix(text) == text
    # a path inside prose stays as it is while the prose around it is fixed
    out = _fix(
        "Tiles load from file:///storage/emulated/0/Android/data/x.png on Android phones"
    )
    assert (
        "file:///storage/emulated/0/Android/data/x.png" in out
        and "on Android phones" not in out
    )


def test_earlier_invented_names_resolve_to_their_current_name():
    assert _fix("Visa") == "Varenta"
    assert _fix("visa_4242") == "varenta_4242"
    assert _fix("Paid with Mastercard") == "Paid with Kelvra Card"
    assert _fix("Works with Android") == "Works with Velyn OS"


def test_model_names_follow_the_make():
    assert _fix("Honda Accord") == "Hensmoor Corriva"
    assert (
        _fix("2024 Tesla Model Y Long-Range Review")
        == "2024 Voltaine Larkspur Long-Range Review"
    )
    assert _fix("Boreas 737 MAX 8") == "Boreas 3780 Ultra"
    assert _fix("Boreas 777-300ER") == "Boreas 7730ER"
    # a model word without a make is an ordinary word
    assert (
        _fix("Pilot program for the Explorer club")
        == "Pilot program for the Explorer club"
    )


def test_second_round_terms_and_contexts():
    assert _fix("Intel Core i7-13700H") == "Quellix QL7-C700T"
    assert _fix("TD Bank, 5th Avenue") == "Tarnwick Bank, 5th Avenue"
    assert (
        _fix("Smartphone Showdown: LumaPhone vs. Galaxy")
        == "Smartphone Showdown: LumaPhone vs. Lyra"
    )
    assert (
        _fix("Galaxy Defenders, a tower-defence game")
        == "Galaxy Defenders, a tower-defence game"
    )
    assert (
        _fix("Totally agree, Nolan never stops challenging us.")
        == "Totally agree, Ashdale never stops challenging us."
    )
    assert _fix("Nolan Harper") == "Nolan Harper"


def test_vehicle_model_fields_match_whole():
    counts = Counter()
    assert rbr.replace_text("Air", counts, key="model", vehicles=True) == "Aero"
    assert rbr.replace_text("Air", counts, key="title", vehicles=True) == "Air"
    assert rbr.replace_text("Accord", counts, key="model", vehicles=False) == "Accord"


def test_second_round_is_idempotent():
    for text in (
        "Visa",
        "Honda Accord",
        "Boreas 737 MAX 8",
        "Intel Core i7-13700H",
        "Penguin Random House",
    ):
        once = _fix(text)
        assert _fix(once) == once


def test_ford_is_a_make_in_car_text_and_a_surname_elsewhere():
    assert _fix(
        "compatible with most trucks (e.g., Ford F\u2011150, Camdon Silvarro)"
    ) == ("compatible with most trucks (e.g., Farrowby T\u2011150, Camdon Silvarro)")
    assert (
        _fix("Fits GM, Ford, and Crestwood interior trim")
        == "Fits Granite, Farrowby, and Crestwood interior trim"
    )
    assert _fix("Quinn, Humphrey and Ford") == "Quinn, Humphrey and Ford"
    assert _fix("Anthony Ford") == "Anthony Ford"


def test_db_rows_keep_their_timestamps(tmp_path):
    import sqlite3

    db = tmp_path / "t.db"
    con = sqlite3.connect(db)
    con.executescript("""
        CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT, updated_at TEXT);
        CREATE TRIGGER items_update_timestamp AFTER UPDATE ON items BEGIN
            UPDATE items SET updated_at = 'now' WHERE id = NEW.id;
        END;
        CREATE TABLE items_index (id INTEGER, title TEXT);
        CREATE TRIGGER items_index_update AFTER UPDATE OF title ON items BEGIN
            UPDATE items_index SET title = NEW.title WHERE id = NEW.id;
        END;
        INSERT INTO items VALUES (1, 'Visa gift card', '2025-01-01');
        INSERT INTO items_index VALUES (1, 'Visa gift card');
    """)
    con.commit()
    con.close()
    assert rbr.fix_db(db, Counter(), write=True) == 1
    con = sqlite3.connect(db)
    assert con.execute("SELECT title, updated_at FROM items").fetchone() == (
        "Varenta gift card",
        "2025-01-01",
    )
    assert con.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='trigger'"
    ).fetchone() == (2,)
    # the index trigger stayed on
    assert con.execute("SELECT title FROM items_index").fetchone() == (
        "Varenta gift card",
    )


def test_pre_existing_product_names_are_renamed_with_their_structure():
    assert _fix("Nimbus OS 1.0 (Linux\u2011based)") == "Velyn OS 1.0 (Linux\u2011based)"
    assert (
        _fix("Orion PlayCore Pro Gaming Console") == "Orion Plaixo Pro Gaming Console"
    )
    assert _fix("Old Harbor Co.") == "Old Anchorage Co."
    # a brand that maps to an earlier invented name lands on the current one
    assert _fix("Solterra") == "Solmarren"
    # ordinary words used as names stay
    assert _fix('Nimbus Tab 10.5"') == 'Nimbus Tab 10.5"'


def test_odd_hyphens_and_spaces_do_not_hide_a_brand():
    assert (
        _fix("Original 1955 Coca\u2011Cola Glass Bottle")
        == "Original 1955 Fizzola Glass Bottle"
    )
    assert _fix("Wear\u202fOS 4.0") == "Velyn Watch 4.0"
    # characters outside the replaced span are kept as they were
    assert (
        _fix("Its Quellix\u2011i3 processor, 8\u202fGB RAM")
        == "Its Quellix\u2011QL3 processor, 8\u202fGB RAM"
    )
    assert (
        _fix("fits Baymar 3\u2011Series, Marbach\u2011C\u2011Class")
        == "fits Baymar 3 Line, Marbach\u2011C\u2011Line"
    )


def test_trademarks_for_materials_and_features_become_generic_words():
    assert _fix("Full-grain leather upper, Gore-Tex membrane, Vibram outsole") == (
        "Full-grain leather upper, Drivane membrane, rubber outsole"
    )
    assert _fix("2.1-channel soundbar with Dolby Atmos and wireless subwoofer.") == (
        "2.1-channel soundbar with spatial audio and wireless subwoofer."
    )
    assert (
        _fix("Wi-Fi 6E, Bluetooth 5.3, Thunderbolt 4 x2, HDMI 2.1")
        == "Wi-Fi 6E, Bluetooth 5.3, USB4 x2, HDMI 2.1"
    )
    assert _fix("Tech Tutorial: Building a Raspberry Pi Home Server") == (
        "Tech Tutorial: Building a Single-Board Computer Home Server"
    )
    assert (
        _fix("I wire an LED to an Arduino")
        == "I wire an LED to a microcontroller board"
    )
    # a nickname stays
    assert _fix("Thunderbolt") == "Thunderbolt"


def test_titan_is_renamed_on_electronics_only():
    assert _fix("Titan X Gaming Console") == "Brontar X Gaming Console"
    assert _fix("Nebula Titan 15") == "Nebula Brontar 15"
    for text in (
        "Titan 4000 Heavy-Duty Winch",
        "Turbo Titan Mech Warrior",
        "Titan Trail",
    ):
        assert _fix(text) == text


def test_relative_paths_with_slashes_are_not_paths():
    assert (
        _fix("Bluetooth 5.3, AAC/LDAC/aptX Adaptive")
        == "Bluetooth 5.3, AAC/Sonaq/Vocra Adaptive"
    )


def test_console_name_in_game_descriptions():
    assert _fix("High-speed racing game with customizable cars on Switch.") == (
        "High-speed racing game with customizable cars on Joyvale."
    )
    assert (
        _fix("Puzzle Quest: Elemental Trials \u2013 Switch")
        == "Puzzle Voyage: Elemental Trials \u2013 Joyvale"
    )
    for text in (
        "Garage Switch",
        "Turn on the Garage Switch",
        "PulseLink 3-Port HDMI Switch - 4K60Hz",
    ):
        assert _fix(text) == text


def test_chip_model_numbers_and_articles_before_new_names():
    assert (
        _fix("Gaming laptop with an i7 CPU, 15.6-inch display")
        == "Gaming laptop with a QL7 CPU, 15.6-inch display"
    )
    assert _fix("and an Quellix QL7 processor.") == "and a Quellix QL7 processor."
    assert (
        _fix("I wire an LED to an Arduino board")
        == "I wire an LED to a microcontroller board"
    )
    # an article before an ordinary word, or inside a word, is left alone
    for text in ("Visit Xi'an today", "a HEPA segment", "a 8-core CPU"):
        assert _fix(text) == text


def test_hyphen_joined_terms_codes_and_chip_names():
    assert (
        _fix("compact 8\u2011inch Gorilla\u2011Glass display")
        == "compact 8\u2011inch toughened glass display"
    )
    assert (
        _fix("with detachable Joy\u2011Con support")
        == "with detachable controller support"
    )
    assert _fix("Nylon-lycra blend") == "Nylon-elastane blend"
    assert _fix("PACIFIC_GAS__ELECTRIC") == "SEACLIFF_GAS__ELECTRIC"
    assert _fix("bright_horizons_tutoring") == "brightmere_tutoring"
    assert _fix("Ambrel M2 Pro (8-core CPU)") == "Ambrel K2 Pro (8-core CPU)"
    for text in ("M12 x 1.5 thread", "summit_fitness_center", "attendance_log"):
        assert _fix(text) == text


def test_sweep_email_domains_ids_and_context_rules():
    assert _fix("maya.patel@gmail.com") == "maya.patel@veltamail.com"
    assert _fix("personal_mayapatelgmailcom_0") == "personal_mayapatelveltamailcom_0"
    assert _fix("CE, RoHS, UL Listed") == "CE, RoHS, Safety Listed"
    assert (
        _fix("Vanguard 2023 Ceramic Black Watch - 40mm")
        == "Valdric 2023 Ceramic Black Watch - 40mm"
    )
    for text in (
        "many_zelle_contacts",
        "Vanguard Cruiser",
        "Monthly Fee - Service Charge",
        "LTE-Cat-M1",
    ):
        assert _fix(text) == text


def test_webmail_domains_derived_fields_and_image_slugs():
    assert _fix("liam.oconnor@gmail.co.uk") == "liam.oconnor@veltamail.co.uk"
    assert _fix("a@outlook.co.jp") == "a@viewpointmail.co.jp"
    assert _fix("z@mail.example.com") == "z@mail.example.com"
    assert _fix("brighthorizonstutoring") == "brightmeretutoring"
    assert (
        _fix("https://example.com/logos/talkmore_mobile.png")
        == "https://example.com/logos/wavelore_mobile.png"
    )
    assert (
        _fix('["camera", "canon", "electronics"]')
        == '["camera", "corvid", "electronics"]'
    )
    assert rbr.image_url_for(
        "https://example.com/images/rolex-submariner.jpg", "Regalis Deepline Date"
    ) == ("https://example.com/images/regalis-deepline-date.jpg")
    assert _fix("Vireo RTZ 3080 Ti (embedded)") == "Vireo VX 380 Plus (embedded)"
    assert _fix("Rare First Edition 'To Kill a Mockingbird' by Harper Lee") == (
        "Rare First Edition 'The Quiet Orchard' by Hollis Rae"
    )


def test_doubled_words_and_battery_context():
    assert (
        _fix("brand-new, Cherry MX Brown switches, full RGB")
        == "brand-new, tactile mechanical switches, full RGB"
    )
    assert _fix("CE marked, UL listed, RoHS") == "CE marked, Safety listed, RoHS"
    assert _fix("very very good, Bora Bora") == "very very good, Bora Bora"
    assert _fix("spare battery LP-E6NH, 2100mAh") == "spare battery RB-E7NH, 2100mAh"
    assert _fix("Nebula 3S DSLR, Model NB-3S") == "Nebula 3S DSLR, Model NB-3S"


def test_curly_apostrophes_match_and_stay():
    assert (
        _fix("Chef\u2019s Choice 8-inch Cast Iron Skillet")
        == "Cookhaven 8-inch Cast Iron Skillet"
    )
    assert (
        _fix("jersey from Jordan\u2019s iconic 1992 Finals")
        == "jersey from Jaden\u2019s iconic 1992 Finals"
    )
    assert _fix("Bora Bora\u2019s beach") == "Bora Bora\u2019s beach"
