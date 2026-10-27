# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for digiworld/scripts/replace_brand_residue.py."""
import importlib.util
import sys
from collections import Counter
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[3] / "digiworld" / "scripts"


def _load():
    sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location("replace_brand_residue", SCRIPTS / "replace_brand_residue.py")
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
    for text in ("Zoom out to see the map", "United Arab Emirates", "Bluetooth headphones"):
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
    out = _fix("Tiles load from file:///storage/emulated/0/Android/data/x.png on Android phones")
    assert "file:///storage/emulated/0/Android/data/x.png" in out and "on Android phones" not in out


def test_earlier_invented_names_resolve_to_their_current_name():
    assert _fix("Visa") == "Varenta"
    assert _fix("visa_4242") == "varenta_4242"
    assert _fix("Paid with Mastercard") == "Paid with Kelvra Card"
    assert _fix("Works with Android") == "Works with Velyn OS"


def test_model_names_follow_the_make():
    assert _fix("Honda Accord") == "Hensmoor Corriva"
    assert _fix("2024 Tesla Model Y Long-Range Review") == "2024 Voltaine Larkspur Long-Range Review"
    assert _fix("Boreas 737 MAX 8") == "Boreas 3780 Ultra"
    assert _fix("Boreas 777-300ER") == "Boreas 7730ER"
    # a model word without a make is an ordinary word
    assert _fix("Pilot program for the Explorer club") == "Pilot program for the Explorer club"


def test_second_round_terms_and_contexts():
    assert _fix("Intel Core i7-13700H") == "Quellix QL7-13700H"
    assert _fix("TD Bank, 5th Avenue") == "Tarnwick Bank, 5th Avenue"
    assert _fix("Smartphone Showdown: LumaPhone vs. Galaxy") == "Smartphone Showdown: LumaPhone vs. Lyra"
    assert _fix("Galaxy Defenders, a tower-defence game") == "Galaxy Defenders, a tower-defence game"
    assert _fix("Totally agree, Nolan never stops challenging us.") == "Totally agree, Ashdale never stops challenging us."
    assert _fix("Nolan Harper") == "Nolan Harper"


def test_vehicle_model_fields_match_whole():
    counts = Counter()
    assert rbr.replace_text("Air", counts, key="model", vehicles=True) == "Aero"
    assert rbr.replace_text("Air", counts, key="title", vehicles=True) == "Air"
    assert rbr.replace_text("Accord", counts, key="model", vehicles=False) == "Accord"


def test_second_round_is_idempotent():
    for text in ("Visa", "Honda Accord", "Boreas 737 MAX 8", "Intel Core i7-13700H", "Penguin Random House"):
        once = _fix(text)
        assert _fix(once) == once


def test_ford_is_a_make_in_car_text_and_a_surname_elsewhere():
    assert _fix("compatible with most trucks (e.g., Ford F\u2011150, Camdon Silvarro)") == (
        "compatible with most trucks (e.g., Farrowby T\u2011150, Camdon Silvarro)")
    assert _fix("Fits GM, Ford, and Crestwood interior trim") == "Fits GM, Farrowby, and Crestwood interior trim"
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
    assert con.execute("SELECT title, updated_at FROM items").fetchone() == ("Varenta gift card", "2025-01-01")
    assert con.execute("SELECT count(*) FROM sqlite_master WHERE type='trigger'").fetchone() == (2,)
    # the index trigger stayed on
    assert con.execute("SELECT title FROM items_index").fetchone() == ("Varenta gift card",)
