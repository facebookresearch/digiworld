# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared utilities for scenario tests."""

import sqlite3
import os
from typing import List, Tuple, Any, Dict


def mock_compare_database_records(
    initial_path: str,
    final_path: str,
    query: str,
    params: tuple
) -> Tuple[List[Any], List[Any], List[Any]]:
    """
    Reusable mock for compare_database_records.
    
    Executes a query on both initial and final state databases and returns
    the differences.
    
    Args:
        initial_path: Path to initial state directory or database file
        final_path: Path to final state directory or database file
        query: SQL query to execute
        params: Parameters for the query
        
    Returns:
        Tuple of (initial_records, final_records, new_records)
    """
    # Get full database paths
    initial_db = _get_db_path(initial_path)
    final_db = _get_db_path(final_path)
    
    # Query initial state
    conn_initial = sqlite3.connect(initial_db)
    cursor_initial = conn_initial.cursor()
    cursor_initial.execute(query, params)
    initial_records = cursor_initial.fetchall()
    conn_initial.close()
    
    # Query final state
    conn_final = sqlite3.connect(final_db)
    cursor_final = conn_final.cursor()
    cursor_final.execute(query, params)
    final_records = cursor_final.fetchall()
    conn_final.close()
    
    # Find new records (simple set difference)
    initial_set = set(initial_records)
    final_set = set(final_records)
    new_records = final_set - initial_set
    
    return initial_records, final_records, list(new_records)


def _get_db_path(path: str) -> str:
    """
    Get the full database path from a state directory or database file.
    
    Args:
        path: Path to state directory or database file
        
    Returns:
        Full path to the database file
    """
    if path.endswith('.db'):
        return path
    return os.path.join(path, "default.db")


def create_payment_schema(conn: sqlite3.Connection) -> None:
    """Create payment app database schema."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            pin TEXT NOT NULL,
            pin_attempts INTEGER NOT NULL DEFAULT 0,
            pin_locked_until TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone_number TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            settings TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'active',
            kyc_verified INTEGER NOT NULL DEFAULT 0,
            daily_limit REAL NOT NULL DEFAULT 1000,
            monthly_limit REAL NOT NULL DEFAULT 20000
        )
    """)
    
    cursor.execute("""
        CREATE TABLE wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'USD',
            type TEXT NOT NULL DEFAULT 'personal',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_wallet_id INTEGER NOT NULL,
            receiver_wallet_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            status TEXT NOT NULL DEFAULT 'pending',
            type TEXT NOT NULL,
            pin_verified INTEGER NOT NULL DEFAULT 0,
            pin_verified_at TEXT,
            reference TEXT,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (sender_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contact_user_id INTEGER NOT NULL,
            nickname TEXT,
            favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    conn.commit()


def create_email_schema(conn: sqlite3.Connection) -> None:
    """Create email app database schema."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            display_name TEXT,
            avatar TEXT,
            phone_number TEXT,
            date_of_birth TEXT,
            role TEXT,
            created_at TEXT NOT NULL,
            settings TEXT NOT NULL,
            email_settings TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            subject TEXT,
            preview TEXT,
            body TEXT,
            timestamp TEXT NOT NULL,
            unread INTEGER NOT NULL DEFAULT 1,
            read INTEGER NOT NULL DEFAULT 0,
            status TEXT,
            attachments TEXT,
            labels TEXT,
            is_draft INTEGER NOT NULL DEFAULT 0,
            thread_id TEXT,
            folder TEXT,
            priority TEXT,
            cc TEXT,
            bcc TEXT
        )
    """)
    
    conn.commit()


def create_music_schema(conn: sqlite3.Connection) -> None:
    """Create music app database schema."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            profile_picture TEXT,
            favorite_categories TEXT,
            favorite_song_ids TEXT,
            recently_played TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            user_id INTEGER NOT NULL,
            categories TEXT,
            cover_art TEXT,
            song_ids TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    conn.commit()


def create_ecommerce_schema(conn: sqlite3.Connection) -> None:
    """Create ecommerce app database schema."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            phone_number TEXT,
            profile_picture TEXT,
            date_joined INTEGER,
            cart_id TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )
    """)
    
    cursor.execute("""
        CREATE TABLE addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            full_name TEXT NOT NULL,
            street TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            pincode TEXT NOT NULL,
            phone TEXT,
            country TEXT,
            delivery_instructions TEXT,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            product_image TEXT NOT NULL,
            short_description TEXT NOT NULL,
            seller TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            discounted_price REAL NOT NULL,
            total REAL NOT NULL,
            in_stock INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cart_id) REFERENCES carts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    conn.commit()


def create_eats_schema(conn: sqlite3.Connection) -> None:
    """Create eats app database schema using actual schema column names (snake_case)."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone_number TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            settings TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE user_addresses (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            address_line_1 TEXT NOT NULL,
            address_line_2 TEXT,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            is_default INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            restaurant_id INTEGER NOT NULL,
            address_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            total REAL NOT NULL,
            delivery_address TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            special_instructions TEXT,
            cutlery INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    conn.commit()


def create_ryde_schema(conn: sqlite3.Connection) -> None:
    """Create ryde app database schema."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone_number TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            settings TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE user_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            address TEXT NOT NULL,
            is_default INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE rides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            driver_id INTEGER,
            pickup_location TEXT NOT NULL,
            drop_location TEXT NOT NULL,
            status TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            distance_km REAL,
            fare_amount REAL,
            feedback_submitted INTEGER DEFAULT 0,
            payment_mode TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()


def insert_test_user(
    cursor: sqlite3.Cursor,
    user_id: int,
    email: str,
    first_name: str = "Test",
    last_name: str = "User",
    phone: str = "+1234567890"
) -> None:
    """
    Insert a test user into the users table.
    
    Works for payment, email, eats, and ryde apps (uses camelCase for eats/ryde).
    """
    # Try to determine which schema based on table structure
    # For now, use camelCase (works with eats schema)
    cursor.execute("""
        INSERT INTO users (id, email, password, firstName, lastName, phoneNumber, 
                          createdAt, updatedAt, settings, status)
        VALUES (?, ?, 'hashed_password', ?, ?, ?, 
                datetime('now'), datetime('now'), '{}', 'active')
    """, (user_id, email, first_name, last_name, phone))


def insert_test_music_user(
    cursor: sqlite3.Cursor,
    user_id: int,
    email: str,
    username: str = "testuser"
) -> None:
    """Insert a test user into the music app users table."""
    cursor.execute("""
        INSERT INTO users (id, username, email, password)
        VALUES (?, ?, ?, 'hashed_password')
    """, (user_id, username, email))


def insert_test_ecommerce_user(
    cursor: sqlite3.Cursor,
    user_id: int,
    email: str,
    first_name: str = "Test",
    last_name: str = "User"
) -> None:
    """Insert a test user into the ecommerce app users table."""
    cursor.execute("""
        INSERT INTO users (id, first_name, last_name, email, password)
        VALUES (?, ?, ?, ?, 'hashed_password')
    """, (user_id, first_name, last_name, email))


def insert_test_eats_user(
    cursor: sqlite3.Cursor,
    user_id: int,
    email: str,
    first_name: str = "Test",
    last_name: str = "User",
    phone: str = "+1234567890"
) -> None:
    """Insert a test user into the eats app users table (snake_case columns)."""
    cursor.execute("""
        INSERT INTO users (id, email, password, first_name, last_name, phone_number, 
                          created_at, updated_at, settings, status)
        VALUES (?, ?, 'hashed_password', ?, ?, ?, 
                datetime('now'), datetime('now'), '{}', 'active')
    """, (user_id, email, first_name, last_name, phone))


def create_message_schema(conn: sqlite3.Connection) -> None:
    """Create message app database schema using actual schema column names (snake_case)."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            phone_number TEXT NOT NULL UNIQUE,
            name TEXT,
            avatar_url TEXT,
            last_logged_in INTEGER NOT NULL DEFAULT 0
        )
    """)
    
    cursor.execute("""
        CREATE TABLE groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            avatar_url TEXT,
            created_by TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            is_active INTEGER NOT NULL DEFAULT 1
        )
    """)
    
    cursor.execute("""
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            message_type TEXT NOT NULL,
            content TEXT,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            is_read INTEGER NOT NULL DEFAULT 0,
            is_delivered INTEGER NOT NULL DEFAULT 0
        )
    """)
    
    cursor.execute("""
        CREATE TABLE attachments (
            id TEXT PRIMARY KEY,
            message_id TEXT,
            file_type TEXT,
            file_path TEXT,
            preview TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE group_members (
            group_id TEXT,
            user_id TEXT,
            PRIMARY KEY (group_id, user_id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE group_messages (
            id TEXT PRIMARY KEY,
            group_id TEXT,
            sender_id TEXT,
            message_type TEXT,
            content TEXT,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            is_read_by TEXT,
            is_delivered_to TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE chat_settings (
            user_id TEXT PRIMARY KEY,
            font_size TEXT NOT NULL DEFAULT 'medium',
            wallpaper TEXT,
            notification_tone TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE call_history (
            id TEXT PRIMARY KEY,
            caller_id TEXT,
            receiver_id TEXT,
            call_type TEXT,
            duration INTEGER,
            timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            was_missed INTEGER NOT NULL DEFAULT 0
        )
    """)
    
    cursor.execute("""
        CREATE TABLE app_state (
            user_id TEXT PRIMARY KEY,
            last_screen TEXT,
            last_opened_timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            scroll_positions TEXT
        )
    """)
    
    conn.commit()

