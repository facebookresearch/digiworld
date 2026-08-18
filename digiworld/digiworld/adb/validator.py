# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Database Validator Module
Provides database validation and connection utilities for multiple apps.
"""

import sqlite3
import os
import shutil
import sys
import json
from typing import Dict, Any, Optional


class DatabaseValidator:
    """
    Database validator and connection utility for multiple apps.
    Handles database validation, connection, and basic operations.
    """
    
    def __init__(self, bundle_id: str, app_config: Dict[str, Any]):
        self.bundle_id = bundle_id
        self.app_config = app_config
        self.conn = None
        self.cursor = None
    
    def validate_sqlite_database(self, db_path: str) -> bool:
        """
        Validates if a file is a proper SQLite database by trying to connect to it.
        
        Args:
            db_path (str): Path to the database file
            
        Returns:
            bool: True if valid SQLite database, False otherwise
        """
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            # Try to execute a simple query to verify the database is valid
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            return True
        except Exception:
            return False
    
    def connect(self, db_path: str) -> bool:
        """
        Connect to a SQLite database.
        
        Args:
            db_path (str): Path to the database file
            
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            self.conn = sqlite3.connect(db_path)
            self.cursor = self.conn.cursor()
            self.cursor.execute("PRAGMA foreign_keys = ON")
            return True
        except Exception:
            return False
    
    def disconnect(self):
        """Disconnect from the database."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self.cursor = None
    
    def get_table_columns(self, table_name: str) -> list:
        """
        Get column names for a table.
        
        Args:
            table_name (str): Name of the table
            
        Returns:
            list: List of column names
        """
        if not self.cursor:
            return []
        
        try:
            self.cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in self.cursor.fetchall()]
            return columns
        except Exception:
            return []
    
    def get_existing_data(self, db_path: str) -> Dict[str, Any]:
        """
        Extract existing data from database.
        
        Args:
            db_path (str): Path to the database file
            
        Returns:
            Dict[str, Any]: Dictionary with table names as keys and data as values
        """
        if not self.connect(db_path):
            return {}
        
        try:
            # Get all table names
            self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in self.cursor.fetchall()]
            
            existing_data = {}
            for table in tables:
                if table not in ['sqlite_sequence', 'sqlite_master']:
                    self.cursor.execute(f"SELECT * FROM {table}")
                    rows = self.cursor.fetchall()
                    columns = self.get_table_columns(table)
                    existing_data[table] = [dict(zip(columns, row)) for row in rows]
            
            return existing_data
        except Exception:
            return {}
        finally:
            self.disconnect()
    
    def copy_database(self, source_path: str, dest_path: str) -> bool:
        """
        Copy a database file from source to destination.
        
        Args:
            source_path (str): Source database path
            dest_path (str): Destination database path
            
        Returns:
            bool: True if copy successful, False otherwise
        """
        try:
            shutil.copy2(source_path, dest_path)
            return True
        except Exception:
            return False
    
    def execute_data_append(self, current_db_path: str, modified_db_path: str, source_path: str) -> bool:
        """
        Execute data append process for the current app.
        
        Args:
            current_db_path (str): Path to current database
            modified_db_path (str): Path to modified database
            source_path (str): Path to source directory with JSON files
            
        Returns:
            bool: True if append successful, False otherwise
        """
        try:
            if os.path.exists(modified_db_path):
                try:
                    os.remove(modified_db_path)
                except (PermissionError, OSError) as e:
                    if "WinError 32" in str(e) or "being used by another process" in str(e):
                        print(f"⚠️ modify.db is locked by another process, skipping deletion: {e}")
                    else:
                        raise e
            
            mockdata_files = self.app_config.get("mockdata_files", [])
            
            if not mockdata_files:
                return self.copy_database(current_db_path, modified_db_path)
            
            if not os.path.exists(source_path):
                print(f"⚠️ Source directory not found: {source_path}")
                print(f"⚠️ No data will be appended - copying current.db to modify.db")
                return self.copy_database(current_db_path, modified_db_path)
            
            new_files = {}
            for filename in mockdata_files:
                file_path = os.path.join(source_path, filename)
                if os.path.exists(file_path):
                    new_files[filename] = file_path
            
            if not new_files:
                print(f"⚠️ No JSON files found in source directory: {source_path}")
                print(f"⚠️ Expected files matching: {mockdata_files}")
                print(f"⚠️ No data will be appended - copying current.db to modify.db")
                return self.copy_database(current_db_path, modified_db_path)
            
            print(f"✅ Found {len(new_files)} JSON file(s) to append: {list(new_files.keys())}")
            
            result = self._call_app_specific_merger(current_db_path, modified_db_path, new_files)
            
            return result
            
        except Exception as e:
            print(f"❌ Error in execute_data_append: {e}")
            import traceback
            traceback.print_exc()
            print(f"🎯 Returning False due to exception")
            return False
    
    @staticmethod
    def _camel_to_snake(name: str) -> str:
        """Convert camelCase to snake_case (mirrors mockdata_validator)."""
        result = []
        for i, ch in enumerate(name):
            if ch.isupper() and i > 0:
                result.append("_")
            result.append(ch.lower())
        return "".join(result)

    @staticmethod
    def _derive_table_name(filename: str) -> str:
        stem = filename
        if stem.startswith("mock-"):
            stem = stem[len("mock-") :]
        if stem.endswith(".json"):
            stem = stem[: -len(".json")]
        return stem.replace("-", "_")

    def _call_app_specific_merger(self, current_db_path: str, modified_db_path: str, new_files: Dict[str, str]) -> bool:
        """Merge JSON mockdata into a copy of the current database."""

        try:
            try:
                shutil.copy2(current_db_path, modified_db_path)
            except Exception as e:
                print(f"❌ Failed to copy {current_db_path} -> {modified_db_path}: {e}")
                return False

            json_files_data: Dict[str, Any] = {}
            for filename, file_path in new_files.items():
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if not isinstance(data, list):
                        print(f"⚠️ {filename} does not contain a list, skipping")
                        continue
                    json_files_data[filename] = data
                    print(f"📄 Loaded {filename}: {len(data)} items")
                except Exception as e:
                    print(f"❌ Error loading {filename}: {e}")
                    return False

            if not json_files_data:
                print("⚠️ No JSON data to merge after loading")
                return True

            conn = sqlite3.connect(modified_db_path)
            conn.execute("PRAGMA foreign_keys = OFF")
            cursor = conn.cursor()

            for filename, records in json_files_data.items():
                table_name = self._derive_table_name(filename)
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,),
                )
                if cursor.fetchone() is None:
                    print(f"⚠️ Table '{table_name}' not found for {filename}, skipping")
                    continue

                cursor.execute(f"PRAGMA table_info({table_name})")
                table_info = cursor.fetchall()
                if not table_info:
                    print(f"⚠️ Could not get schema for {table_name}, skipping")
                    continue
                db_columns = {row[1] for row in table_info}

                inserted = 0
                for record in records:
                    if not isinstance(record, dict):
                        continue

                    mapped: Dict[str, Any] = {}
                    for key, value in record.items():
                        if key in db_columns:
                            col = key
                        else:
                            snake = self._camel_to_snake(key)
                            if snake in db_columns:
                                col = snake
                            else:
                                if isinstance(value, (dict, list)):
                                    continue
                                continue

                        if isinstance(value, (dict, list)):
                            try:
                                value = json.dumps(value)
                            except Exception:
                                value = str(value)

                        mapped[col] = value

                    if not mapped:
                        continue

                    cols = list(mapped.keys())
                    placeholders = ", ".join(["?"] * len(cols))
                    col_list = ", ".join([f'"{c}"' for c in cols])
                    sql = f'INSERT OR REPLACE INTO "{table_name}" ({col_list}) VALUES ({placeholders})'
                    try:
                        cursor.execute(sql, [mapped[c] for c in cols])
                        inserted += 1
                    except Exception as e:
                        print(f"❌ Failed to insert into {table_name} ({cols}): {e} | record={record}")
                        continue

                conn.commit()
                print(f"✅ Merged {inserted}/{len(records)} records into {table_name} from {filename}")

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"❌ Error in data append merge: {e}")
            import traceback

            traceback.print_exc()
            return False
    
    
    def _delete_processed_files(self, processed_files: Dict[str, str]):
        """
        Delete processed JSON files after successful append.
        
        Args:
            processed_files (Dict[str, str]): Dictionary of processed files
        """
        try:
            deleted_files = []
            for filename, file_path in processed_files.items():
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files.append(filename)
            
            if deleted_files:
                print(f"🗑️ Deleted {len(deleted_files)} processed JSON files")
                print(f"📋 Deleted files: {deleted_files}")
            else:
                print("⚠️ No files were deleted")
                
        except Exception as e:
            print(f"⚠️ Error deleting files: {e}")
            # Don't fail the entire process if deletion fails