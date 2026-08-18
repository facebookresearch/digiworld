# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Banking Sandbox Data Generator
Generates realistic mock data for banking simulation with configurable parameters
"""

import json
import random
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any
from faker import Faker
import hashlib

# Initialize Faker
fake = Faker()
Faker.seed(42)
random.seed(42)


def snake_to_camel(snake_str: str) -> str:
    """Convert snake_case to camelCase"""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def convert_keys_to_camel(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively convert all dictionary keys from snake_case to camelCase"""
    if not isinstance(data, dict):
        return data
    
    return {
        snake_to_camel(key): convert_keys_to_camel(value) if isinstance(value, dict) else value
        for key, value in data.items()
    }

# Configuration
CONFIG = {
    "num_users": 15,
    "transactions_per_user": 15,
    "bills_per_user": 3,
    "beneficiaries_per_user": 2,
    "zelle_contacts_per_user": 3,
    "output_dir": "mock_data",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "initial_balance_range": (1000, 50000),
    "credit_limit_range": (2000, 15000),
}

# Account Tier Configurations
TIER_CONFIGS = [
    {
        "code": "sapphire",
        "name": "Sapphire Banking",
        "min_combined_balance": 250000,
        "monthly_fee": 35.0,
        "fee_waiver_balance": 250000,
        "has_overdraft_protection": 1,
        "has_interest_checking": 1,
        "interest_rate_bonus": 0.15,
        "free_wire_transfers": 10,
        "free_cashiers_checks": 5,
        "priority_support": 1,
        "dedicated_banker": 1,
    },
    {
        "code": "premier",
        "name": "Premier Checking",
        "min_combined_balance": 25000,
        "monthly_fee": 30.0,
        "fee_waiver_balance": 25000,
        "has_overdraft_protection": 1,
        "has_interest_checking": 1,
        "interest_rate_bonus": 0.05,
        "free_wire_transfers": 3,
        "free_cashiers_checks": 2,
        "priority_support": 1,
        "dedicated_banker": 0,
    },
    {
        "code": "everyday",
        "name": "Everyday Checking",
        "min_combined_balance": 0,
        "monthly_fee": 10.0,
        "fee_waiver_balance": 500,
        "has_overdraft_protection": 0,
        "has_interest_checking": 0,
        "interest_rate_bonus": 0.0,
        "free_wire_transfers": 0,
        "free_cashiers_checks": 0,
        "priority_support": 0,
        "dedicated_banker": 0,
    },
]

# Account Type Configurations
ACCOUNT_TYPE_CONFIGS = [
    {
        "code": "checking",
        "name": "Everyday Checking",
        "category": "deposit",
        "min_opening_balance": 25.0,
        "max_balance": 50000.0,
        "monthly_fee": 10.0,
        "fee_waiver_min_balance": 500.0,
        "has_interest": 0,
        "base_interest_rate": 0.01,
        "has_debit_card": 1,
        "has_checks": 1,
        "allows_overdraft": 1,
        "overdraft_fee": 35.0,
    },
    {
        "code": "savings",
        "name": "Way2Save Savings",
        "category": "deposit",
        "min_opening_balance": 25.0,
        "max_balance": 100000.0,
        "monthly_fee": 5.0,
        "fee_waiver_min_balance": 300.0,
        "has_interest": 1,
        "base_interest_rate": 0.15,
        "has_debit_card": 0,
        "has_checks": 0,
        "allows_overdraft": 0,
        "monthly_transaction_limit": 6,
    },
    {
        "code": "money_market",
        "name": "Money Market Account",
        "category": "deposit",
        "min_opening_balance": 2500.0,
        "max_balance": 250000.0,
        "monthly_fee": 12.0,
        "fee_waiver_min_balance": 2500.0,
        "has_interest": 1,
        "base_interest_rate": 0.25,
        "has_debit_card": 1,
        "has_checks": 1,
        "allows_overdraft": 0,
        "monthly_transaction_limit": 6,
    },
    {
        "code": "ira_account",
        "name": "Individual Retirement Account (IRA)",
        "category": "deposit",
        "min_opening_balance": 1000.0,
        "max_balance": 600000.0,
        "monthly_fee": 0.0,
        "fee_waiver_min_balance": None,
        "has_interest": 1,
        "base_interest_rate": 1.75,
        "has_debit_card": 0,
        "has_checks": 0,
        "allows_overdraft": 0,
        "overdraft_fee": 0.0,
        "monthly_transaction_limit": None
    },
]

# Biller Configurations
BILLER_CONFIGS = [
    # --- Utilities ---
    {
        "code": "bright_energy",
        "name": "Bright Energy",
        "category": "utilities",
        "subcategory": "electricity",
        "average_bill_amount": 120.50,
    },
    {
        "code": "voltwave_power",
        "name": "VoltWave Power",
        "category": "utilities",
        "subcategory": "electricity",
        "average_bill_amount": 132.25,
    },
    {
        "code": "clearwater_utilities",
        "name": "ClearWater Utilities",
        "category": "utilities",
        "subcategory": "water",
        "average_bill_amount": 48.75,
    },
    {
        "code": "blue_stream_water",
        "name": "BlueStream Water",
        "category": "utilities",
        "subcategory": "water",
        "average_bill_amount": 52.10,
    },
    {
        "code": "fuelflow_gas",
        "name": "FuelFlow Gas",
        "category": "utilities",
        "subcategory": "gas",
        "average_bill_amount": 97.80,
    },

    # --- Telecom ---
    {
        "code": "talkmore_mobile",
        "name": "TalkMore Mobile",
        "category": "telecom",
        "subcategory": "mobile",
        "average_bill_amount": 79.99,
    },
    {
        "code": "signalpro_wireless",
        "name": "SignalPro Wireless",
        "category": "telecom",
        "subcategory": "mobile",
        "average_bill_amount": 89.50,
    },
    {
        "code": "speedlink_internet",
        "name": "SpeedLink Internet",
        "category": "telecom",
        "subcategory": "internet",
        "average_bill_amount": 84.99,
    },
    {
        "code": "netfiber_solutions",
        "name": "NetFiber Solutions",
        "category": "telecom",
        "subcategory": "internet",
        "average_bill_amount": 92.00,
    },

    # --- Insurance ---
    {
        "code": "safeguard_auto",
        "name": "SafeGuard Auto Insurance",
        "category": "insurance",
        "subcategory": "auto",
        "average_bill_amount": 145.00,
    },
    {
        "code": "securelife_home",
        "name": "SecureLife Home Insurance",
        "category": "insurance",
        "subcategory": "home",
        "average_bill_amount": 130.00,
    },
    {
        "code": "protectplus_health",
        "name": "ProtectPlus Health Insurance",
        "category": "insurance",
        "subcategory": "health",
        "average_bill_amount": 155.75,
    },

    # --- Subscription / Entertainment ---
    {
        "code": "streamline_cable",
        "name": "StreamLine Cable",
        "category": "subscription",
        "subcategory": "cable",
        "average_bill_amount": 29.99,
    },
    {
        "code": "viewmax_tv",
        "name": "ViewMax TV",
        "category": "subscription",
        "subcategory": "cable",
        "average_bill_amount": 25.49,
    },
    {
        "code": "cinestream_plus",
        "name": "CineStream Plus",
        "category": "subscription",
        "subcategory": "streaming",
        "average_bill_amount": 14.99,
    },
    {
        "code": "binge_box",
        "name": "BingeBox Streaming",
        "category": "subscription",
        "subcategory": "streaming",
        "average_bill_amount": 12.99,
    },

    # --- Loans / Finance ---
    {
        "code": "loaneasy_finance",
        "name": "LoanEasy Finance",
        "category": "finance",
        "subcategory": "loan",
        "average_bill_amount": 210.00,
    },
    {
        "code": "creditpath_lending",
        "name": "CreditPath Lending",
        "category": "finance",
        "subcategory": "loan",
        "average_bill_amount": 195.50,
    },
    {
        "code": "quickloan_services",
        "name": "QuickLoan Services",
        "category": "finance",
        "subcategory": "loan",
        "average_bill_amount": 205.75,
    },

    # --- Miscellaneous ---
    {
        "code": "metro_trash",
        "name": "Metro City Waste Management",
        "category": "utilities",
        "subcategory": "waste",
        "average_bill_amount": 35.20,
    },
]

PASSWORD_PATTERNS = [
    "password123",
    "qwerty123",
    "admin123",
    "letmein123",
    "welcome123",
    "123456789",
    "sunshine123",
    "iloveyou123",
    "football123",
    "monkey123",
  ]


# Transaction Types
TRANSACTION_TYPES = [
    {"code": "transfer", "name": "Account Transfer", "category": "transfer"},
    {"code": "bill_payment", "name": "Bill Payment", "category": "debit"},
    {"code": "zelle", "name": "Zelle Payment", "category": "transfer"},
    {"code": "external_transfer", "name": "External Transfer", "category": "transfer"},
    {"code": "deposit", "name": "Deposit", "category": "credit"},
    {"code": "withdrawal", "name": "Withdrawal", "category": "debit"},
    {"code": "purchase", "name": "Purchase", "category": "debit"},
    {"code": "credit_card_payment", "name": "Credit Card Payment", "category": "debit"},
    {"code": "interest_charge", "name": "Interest Charge", "category": "debit"},
    {"code": "monthly_fee", "name": "Monthly Fee", "category": "debit"},
]


class DataGenerator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.output_dir = Path(config["output_dir"])
        self.output_dir.mkdir(exist_ok=True)
        
        # Storage for generated data
        self.data = {
            "account_tier_levels": [],
            "account_types": [],
            "interest_rate_tiers": [],
            "users": [],
            "sessions": [],
            "accounts": [],
            "credit_cards": [],
            "beneficiaries": [],
            "zelle_contacts": [],
            "billers": [],
            "user_billers": [],
            "bills": [],
            "transaction_types": [],
            "transactions": [],
            "scheduled_transactions": [],
            "error_codes": [],
            "system_config": [],
            "notifications": [],
        }
        
        # ID counters
        self.counters = {key: 1 for key in self.data.keys()}

    def generate_all(self):
        """Generate all data in proper order"""
        print("🏦 Starting Banking Data Generation...")
        
        self.generate_account_tiers()
        self.generate_account_types()
        self.generate_interest_rate_tiers()
        self.generate_transaction_types()
        self.generate_billers()
        self.generate_users()
        self.generate_sessions()
        self.generate_accounts()
        self.generate_credit_cards()
        self.generate_beneficiaries()
        self.generate_zelle_contacts()
        self.generate_user_billers()
        self.generate_bills()
        self.generate_transactions()
        self.generate_scheduled_transactions()
        self.generate_error_codes()
        self.generate_system_config()
        self.generate_notifications()
        
        self.save_all()
        print("✅ Data generation complete!")

    def get_id(self, table: str) -> int:
        """Get next ID for a table"""
        current_id = self.counters[table]
        self.counters[table] += 1
        return current_id

    def generate_account_tiers(self):
        """Generate account tier levels"""
        print("📊 Generating account tiers...")
        for i, tier_config in enumerate(TIER_CONFIGS):
            self.data["account_tier_levels"].append({
                "id": self.get_id("account_tier_levels"),
                "code": tier_config["code"],
                "name": tier_config["name"],
                "description": f"{tier_config['name']} tier benefits",
                "min_combined_balance": tier_config["min_combined_balance"],
                "max_accounts_per_type": 3,
                "monthly_fee": tier_config["monthly_fee"],
                "fee_waiver_balance": tier_config["fee_waiver_balance"],
                "has_overdraft_protection": tier_config["has_overdraft_protection"],
                "has_interest_checking": tier_config["has_interest_checking"],
                "interest_rate_bonus": tier_config["interest_rate_bonus"],
                "free_wire_transfers": tier_config["free_wire_transfers"],
                "free_cashiers_checks": tier_config["free_cashiers_checks"],
                "priority_support": tier_config["priority_support"],
                "dedicated_banker": tier_config["dedicated_banker"],
                "sort_order": i,
                "created_at": datetime.now().isoformat(),
            })

    def generate_account_types(self):
        """Generate account types"""
        print("💳 Generating account types...")
        for i, acc_config in enumerate(ACCOUNT_TYPE_CONFIGS):
            self.data["account_types"].append({
                "id": self.get_id("account_types"),
                "tier_level_id": None,
                "code": acc_config["code"],
                "name": acc_config["name"],
                "category": acc_config["category"],
                "description": f"{acc_config['name']} account",
                "min_opening_balance": acc_config["min_opening_balance"],
                "max_balance": acc_config["max_balance"],
                "monthly_fee": acc_config["monthly_fee"],
                "fee_waiver_min_balance": acc_config.get("fee_waiver_min_balance"),
                "fee_waiver_min_direct_deposit": None,
                "has_interest": acc_config["has_interest"],
                "base_interest_rate": acc_config["base_interest_rate"],
                "has_debit_card": acc_config.get("has_debit_card", 0),
                "has_checks": acc_config.get("has_checks", 0),
                "allows_overdraft": acc_config.get("allows_overdraft", 0),
                "overdraft_fee": acc_config.get("overdraft_fee", 0.0),
                "overdraft_protection_transfer_fee": 10.0,
                "min_balance_to_avoid_fee": acc_config.get("fee_waiver_min_balance", 0.0),
                "monthly_transaction_limit": acc_config.get("monthly_transaction_limit"),
                "withdrawal_penalty_days": None,
                "early_withdrawal_penalty_rate": None,
                "is_active": 1,
                "sort_order": i,
                "created_at": datetime.now().isoformat(),
            })

    def generate_interest_rate_tiers(self):
        """Generate interest rate tiers for savings accounts"""
        print("📈 Generating interest rate tiers...")
        savings_account_type = next(
            (acc for acc in self.data["account_types"] if acc["code"] == "savings"), None
        )
        if savings_account_type:
            tiers = [
                {"min": 0, "max": 1000, "apy": 0.01},
                {"min": 1000, "max": 10000, "apy": 0.10},
                {"min": 10000, "max": None, "apy": 0.15},
            ]
            for tier in tiers:
                self.data["interest_rate_tiers"].append({
                    "id": self.get_id("interest_rate_tiers"),
                    "account_type_id": savings_account_type["id"],
                    "min_balance": tier["min"],
                    "max_balance": tier["max"],
                    "annual_percentage_yield": tier["apy"],
                    "effective_date": datetime.now().isoformat(),
                    "end_date": None,
                    "created_at": datetime.now().isoformat(),
                })

    def generate_transaction_types(self):
        """Generate transaction types"""
        print("🔄 Generating transaction types...")
        for tx_type in TRANSACTION_TYPES:
            self.data["transaction_types"].append({
                "id": self.get_id("transaction_types"),
                "code": tx_type["code"],
                "name": tx_type["name"],
                "category": tx_type["category"],
                "description": f"{tx_type['name']} transaction",
            })

    def generate_billers(self):
        """Generate predefined and user-defined billers"""
        print("🏢 Generating billers...")
        # Predefined billers
        for biller_config in BILLER_CONFIGS:
            self.data["billers"].append({
                "id": self.get_id("billers"),
                "user_id": None,  # Predefined billers have no user_id
                "code": biller_config["code"],
                "name": biller_config["name"],
                "name_normalized": biller_config["name"].lower().replace(" ", ""),
                "category": biller_config["category"],
                "subcategory": biller_config["subcategory"],
                "description": f"Pay your {biller_config['name']} bills",
                "logo_url": f"https://example.com/logos/{biller_config['code']}.png",
                "website": f"https://www.{biller_config['code']}.com",
                "phone": fake.phone_number(),
                "address": fake.address(),
                "is_searchable": 1,
                "search_success_rate": 1.0,
                "requires_account_number": 1,
                "requires_routing_number": 0,
                "accepts_credit_card": 1,
                "accepts_debit_card": 1,
                "accepts_bank_account": 1,
                "min_payment_amount": 1.0,
                "max_payment_amount": 10000.0,
                "average_bill_amount": biller_config["average_bill_amount"],
                "payment_processing_days": 1,
                "is_active": 1,
                "created_at": datetime.now().isoformat(),
            })

        # User-defined billers
        for user in self.data["users"]:
            for _ in range(self.config["bills_per_user"]):
                self.data["billers"].append({
                    "id": self.get_id("billers"),
                    "user_id": user["id"],  # User-defined billers have a user_id
                    "code": None,  # User-defined billers don't have a predefined code
                    "name": fake.company(),
                    "name_normalized": fake.company().lower().replace(" ", ""),
                    "category": "others",
                    "subcategory": None,
                    "description": "User-defined biller",
                    "logo_url": None,
                    "website": None,
                    "phone": fake.phone_number(),
                    "address": fake.address(),
                    "is_searchable": 1,
                    "search_success_rate": 1.0,
                    "requires_account_number": 1,
                    "requires_routing_number": 0,
                    "accepts_credit_card": 0,
                    "accepts_debit_card": 0,
                    "accepts_bank_account": 1,
                    "min_payment_amount": 1.0,
                    "max_payment_amount": None,
                    "average_bill_amount": None,
                    "payment_processing_days": 1,
                    "is_active": 1,
                    "created_at": datetime.now().isoformat(),
                })

    def generate_users(self):
        """Generate users with tier assignments"""
        print("👥 Generating users...")
        num_users = self.config["num_users"]
        
        for i in range(num_users):
            # First 3 users get specific tiers
            if i == 0:
                tier_id = self.data["account_tier_levels"][0]["id"]  # Sapphire
            elif i == 1:
                tier_id = self.data["account_tier_levels"][1]["id"]  # Premier
            elif i == 2:
                tier_id = self.data["account_tier_levels"][2]["id"]  # Everyday
            else:
                # Random tier for others
                tier_id = random.choice(self.data["account_tier_levels"])["id"]
            
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"{first_name.lower()}.{last_name.lower()}{i}"
            
            self.data["users"].append({
                "id": self.get_id("users"),
                "username": username,
                "password": random.choice(PASSWORD_PATTERNS),
                "full_name": f"{first_name} {last_name}",
                "phone_number": fake.phone_number(),
                "email": f"{username}@example.com",
                "account_tier_id": tier_id,
                "pin": f"{random.randint(1000, 9999)}",
                "security_question": "What is your mother's maiden name?",
                "security_answer": fake.last_name(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "deleted_at": None,
            })

    def generate_sessions(self):
        """Generate sessions for users"""
        print("🔐 Generating sessions...")
        for user in self.data["users"]:
            self.data["sessions"].append({
                "id": self.get_id("sessions"),
                "session_id": fake.uuid4(),
                "user_id": user["id"],
                "seed": random.randint(1000, 9999),
                "volatility": 0.0,
                "enable_interest": 1,
                "enable_recurring_bills": 1,
                "enable_monthly_fees": 1,
                "current_day": 0,
                "created_date": datetime.now().isoformat(),
                "current_date": datetime.now().isoformat(),
                "status": "active",
                "ended_at": None,
                "metadata": json.dumps({"platform": "web", "ip": fake.ipv4()}),
            })

    def generate_accounts(self):
        """Generate accounts for users"""
        print("🏦 Generating accounts...")
        for user in self.data["users"]:
            # Each user gets checking and savings
            checking_type = next(acc for acc in self.data["account_types"] if acc["code"] == "checking")
            savings_type = next(acc for acc in self.data["account_types"] if acc["code"] == "savings")
            
            for idx, acc_type in enumerate([checking_type, savings_type]):
                balance = random.uniform(*self.config["initial_balance_range"])
                account_number = f"{random.randint(1000000000, 9999999999)}"
                
                self.data["accounts"].append({
                    "id": self.get_id("accounts"),
                    "user_id": user["id"],
                    "account_type_id": acc_type["id"],
                    "account_number": account_number,
                    "account_name": f"My {acc_type['name']}",
                    "balance": round(balance, 2),
                    "available_balance": round(balance, 2),
                    "is_primary": 1 if idx == 0 else 0,
                    "status": "active",
                    "opened_date": datetime.now().isoformat(),
                    "closed_date": None,
                    "last_statement_date": None,
                    "next_statement_date": None,
                    "overdraft_protection_enabled": 0,
                    "overdraft_protection_source_account_id": None,
                    "linked_savings_account_id": None,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "deleted_at": None,
                })

    def generate_credit_cards(self):
        """Generate credit cards for users"""
        print("💳 Generating credit cards...")
        for user in self.data["users"]:
            # 70% of users have a credit card
            if random.random() < 0.7:
                credit_limit = random.uniform(*self.config["credit_limit_range"])
                current_balance = random.uniform(0, credit_limit * 0.3)
                
                card_number = f"4{random.randint(100000000000000, 999999999999999)}"
                
                self.data["credit_cards"].append({
                    "id": self.get_id("credit_cards"),
                    "user_id": user["id"],
                    "linked_checking_account_id": None,
                    "card_number": card_number,
                    "last_four_digits": card_number[-4:],
                    "cardholder_name": user["full_name"],
                    "expiry_month": random.randint(1, 12),
                    "expiry_year": datetime.now().year + random.randint(1, 4),
                    "cvv": f"{random.randint(100, 999)}",
                    "credit_limit": round(credit_limit, 2),
                    "current_balance": round(current_balance, 2),
                    "available_credit": round(credit_limit - current_balance, 2),
                    "apr": round(random.uniform(15.99, 24.99), 2),
                    "annual_fee": random.choice([0, 0, 0, 95]),
                    "cash_advance_fee_percent": 5.0,
                    "late_payment_fee": 35.0,
                    "payment_due_day": random.randint(1, 28),
                    "minimum_payment_percent": 2.0,
                    "statement_closing_day": random.randint(1, 28),
                    "autopay_enabled": 0,
                    "autopay_amount": "minimum",
                    "status": "active",
                    "opened_date": datetime.now().isoformat(),
                    "last_payment_date": None,
                    "last_statement_date": None,
                    "created_at": datetime.now().isoformat(),
                })

    def generate_beneficiaries(self):
        """Generate external beneficiaries for users"""
        print("🤝 Generating beneficiaries...")
        for user in self.data["users"]:
            for _ in range(self.config["beneficiaries_per_user"]):
                self.data["beneficiaries"].append({
                    "id": self.get_id("beneficiaries"),
                    "user_id": user["id"],
                    "name": fake.name(),
                    "account_number": f"{random.randint(1000000000, 9999999999)}",
                    "routing_number": f"{random.randint(100000000, 999999999)}",
                    "account_type": random.choice(["checking", "savings"]),
                    "bank_name": random.choice(["Chase Bank", "Bank of America", "Citibank"]),
                    "bank_address": fake.address(),
                    "nickname": fake.first_name(),
                    "email": fake.email(),
                    "phone": fake.phone_number(),
                    "verification_status": random.choice(["verified", "verified", "pending"]),
                    "verification_method": "micro_deposit",
                    "is_favorite": random.choice([0, 0, 1]),
                    "status": "active",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "deleted_at": None,
                })
    def generate_notifications(self):
        """Generate notifications for users based on transactions, bills, or accounts"""
        print("🔔 Generating notifications...")
        
        notification_types = [
            {"type": "transaction", "title": "Transaction Alert"},
            {"type": "bill_due", "title": "Bill Due Reminder"},
            {"type": "account_update", "title": "Account Update"},
        ]
        
        for user in self.data["users"]:
            # Create a few notifications per user
            for _ in range(random.randint(1, 5)):
                notif_type = random.choice(notification_types)
                
                related_transaction = None
                related_bill = None
                related_account = None
                
                # Assign related objects if applicable
                if notif_type["type"] == "transaction":
                    user_tx = [tx for tx in self.data["transactions"] if tx["user_id"] == user["id"]]
                    if user_tx:
                        related_transaction = random.choice(user_tx)["id"]
                elif notif_type["type"] == "bill_due":
                    user_bills = [bill for bill in self.data["bills"] if bill["user_id"] == user["id"]]
                    if user_bills:
                        related_bill = random.choice(user_bills)["id"]
                elif notif_type["type"] == "account_update":
                    user_accounts = [acc for acc in self.data["accounts"] if acc["user_id"] == user["id"]]
                    if user_accounts:
                        related_account = random.choice(user_accounts)["id"]
                
                # Compose notification
                notification = {
                    "id": self.get_id("notifications"),
                    "user_id": user["id"],
                    "session_id": None,  # Optional: could link to last session
                    "notification_type": notif_type["type"],
                    "title": notif_type["title"],
                    "message": f"{notif_type['title']} for your account.",
                    "related_transaction_id": related_transaction,
                    "related_bill_id": related_bill,
                    "related_account_id": related_account,
                    "priority": random.choice(["low", "normal", "high"]),
                    "is_read": random.choice([0, 1]),
                    "read_at": None,
                    "created_at": datetime.now().isoformat(),
                    "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
                }
                
                self.data["notifications"].append(notification)
            

    def generate_zelle_contacts(self):
        """Generate Zelle contacts for users"""
        print("💸 Generating Zelle contacts...")
        for user in self.data["users"]:
            for _ in range(self.config["zelle_contacts_per_user"]):
                self.data["zelle_contacts"].append({
                    "id": self.get_id("zelle_contacts"),
                    "user_id": user["id"],
                    "contact_name": fake.name(),
                    "contact_email": fake.email() ,
                    "contact_phone": fake.phone_number(),
                    "is_enrolled": random.choice([0, 1, 1]),
                    "is_favorite": random.choice([0, 0, 1]),
                    "last_sent_amount": None,
                    "last_sent_date": None,
                    "created_at": datetime.now().isoformat(),
                })

    def generate_user_billers(self):
        """Generate user-added billers"""
        print("📝 Generating user billers...")
        for user in self.data["users"]:
            # 30% of users have manually added billers
            if random.random() < 0.3:
                self.data["user_billers"].append({
                    "id": self.get_id("user_billers"),
                    "user_id": user["id"],
                    "biller_name": fake.company(),
                    "biller_account_number": f"{random.randint(100000, 999999)}",
                    "biller_routing_number": f"{random.randint(100000000, 999999999)}",
                    "biller_address": fake.address(),
                    "biller_phone": fake.phone_number(),
                    "nickname": None,
                    "category": "other",
                    "notes": None,
                    "default_payment_account_id": None,
                    "verification_status": "unverified",
                    "verification_warnings": None,
                    "last_payment_date": None,
                    "is_favorite": 0,
                    "autopay_enabled": 0,
                    "status": "active",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "deleted_at": None,
                })

    def generate_bills(self):
        """Generate bills for users"""
        print("🧾 Generating bills...")
        for user in self.data["users"]:
            # Select random billers for this user
            selected_billers = random.sample(
                self.data["billers"],
                min(self.config["bills_per_user"], len(self.data["billers"]))
            )
            
            for biller in selected_billers:
                amount = biller["average_bill_amount"] * random.uniform(0.8, 1.2)
                due_date = datetime.now() + timedelta(days=random.randint(5, 30))
                
                self.data["bills"].append({
                    "id": self.get_id("bills"),
                    "user_id": user["id"],
                    "biller_id": biller["id"],
                    "account_id": None,
                    "bill_number": f"BILL-{random.randint(100000, 999999)}",
                    "amount": round(amount, 2),
                    "due_date": due_date.isoformat(),
                    "due_day": due_date.day,
                    "is_recurring": 1,
                    "recurrence_interval": 30,
                    "next_due_date": (due_date + timedelta(days=30)).isoformat(),
                    "auto_pay_enabled": 0,
                    "auto_pay_account_id": None,
                    "minimum_payment_amount": None,
                    "status": "pending",
                    "paid_date": None,
                    "paid_amount": None,
                    "late_fee": 0.0,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                })

    def generate_transactions(self):
        """Generate transactions for users"""
        print("💰 Generating transactions...")
        start_date = datetime.fromisoformat(self.config["start_date"])
        end_date = datetime.fromisoformat(self.config["end_date"])
        
        for user in self.data["users"]:
            user_accounts = [acc for acc in self.data["accounts"] if acc["user_id"] == user["id"]]
            if not user_accounts:
                continue
            
            num_transactions = self.config["transactions_per_user"]
            
            for _ in range(num_transactions):
                # Random transaction type
                tx_type = random.choice(self.data["transaction_types"])
                tx_date = start_date + timedelta(
                    days=random.randint(0, (end_date - start_date).days)
                )
                
                from_account = random.choice(user_accounts)
                amount = random.uniform(10, 500)
                
                transaction = {
                    "id": self.get_id("transactions"),
                    "session_id": None,
                    "transaction_type_id": tx_type["id"],
                    "user_id": user["id"],
                    "from_account_id": from_account["id"] if tx_type["category"] in ["debit", "transfer"] else None,
                    "to_account_id": None,
                    "biller_id": None,
                    "bill_id": None,
                    "beneficiary_id": None,
                    "zelle_contact_id": None,
                    "credit_card_id": None,
                    "amount": round(amount, 2),
                    "fee": 0.0,
                    "balance_before": from_account["balance"],
                    "balance_after": from_account["balance"] - amount if tx_type["category"] == "debit" else from_account["balance"] + amount,
                    "reference_id": fake.uuid4(),
                    "confirmation_number": f"CNF{random.randint(100000000, 999999999)}",
                    "description": f"{tx_type['name']} - {fake.company()}",
                    "memo": None,
                    "day": (tx_date - start_date).days,
                    "transaction_date": tx_date.isoformat(),
                    "posted_date": tx_date.isoformat(),
                    "pending_until": None,
                    "status": "success",
                    "failure_reason": None,
                    "error_code": None,
                    "error_message": None,
                    "metadata": None,
                    "created_at": tx_date.isoformat(),
                }
                
                # Add specific IDs based on transaction type
                if tx_type["code"] == "bill_payment":
                    user_bills = [bill for bill in self.data["bills"] if bill["user_id"] == user["id"]]
                    if user_bills:
                        bill = random.choice(user_bills)
                        transaction["biller_id"] = bill["biller_id"]
                        transaction["bill_id"] = bill["id"]
                
                elif tx_type["code"] == "zelle":
                    user_zelle = [z for z in self.data["zelle_contacts"] if z["user_id"] == user["id"]]
                    if user_zelle:
                        contact = random.choice(user_zelle)
                        transaction["zelle_contact_id"] = contact["id"]
                
                elif tx_type["code"] == "external_transfer":
                    user_beneficiaries = [b for b in self.data["beneficiaries"] if b["user_id"] == user["id"]]
                    if user_beneficiaries:
                        beneficiary = random.choice(user_beneficiaries)
                        transaction["beneficiary_id"] = beneficiary["id"]
                
                elif tx_type["code"] == "transfer":
                    # Internal transfer between accounts
                    if len(user_accounts) > 1:
                        to_account = random.choice([acc for acc in user_accounts if acc["id"] != from_account["id"]])
                        transaction["to_account_id"] = to_account["id"]
    def generate_error_codes(self):
        """Generate standard error codes"""
        print("⚠️  Generating error codes...")
        error_codes = [
            {
                "code": "INSUFFICIENT_FUNDS",
                "category": "insufficient_funds",
                "message": "Insufficient funds in account",
                "user_message": "You don't have enough money in your account for this transaction.",
                "suggested_action": "Please add funds or choose a different account.",
            },
            {
                "code": "INVALID_ACCOUNT",
                "category": "validation",
                "message": "Invalid account number",
                "user_message": "The account number you entered is not valid.",
                "suggested_action": "Please check the account number and try again.",
            },
            {
                "code": "LIMIT_EXCEEDED",
                "category": "limit_exceeded",
                "message": "Transaction limit exceeded",
                "user_message": "This transaction exceeds your daily limit.",
                "suggested_action": "Please try a smaller amount or contact support.",
            },
            {
                "code": "ACCOUNT_FROZEN",
                "category": "validation",
                "message": "Account is frozen",
                "user_message": "This account is currently frozen.",
                "suggested_action": "Please contact customer support.",
            },
            {
                "code": "INVALID_ROUTING",
                "category": "validation",
                "message": "Invalid routing number",
                "user_message": "The routing number you entered is not valid.",
                "suggested_action": "Please verify the routing number.",
            },
        ]
        
        for error in error_codes:
            self.data["error_codes"].append({
                "id": self.get_id("error_codes"),
                "code": error["code"],
                "category": error["category"],
                "message": error["message"],
                "user_message": error["user_message"],
                "description": error["message"],
                "suggested_action": error["suggested_action"],
            })
    def generate_transactions(self):
        """Generate transactions for users"""
        print("💰 Generating transactions...")
        start_date = datetime.fromisoformat(self.config["start_date"])
        end_date = datetime.fromisoformat(self.config["end_date"])
        
        for user in self.data["users"]:
            user_accounts = [acc for acc in self.data["accounts"] if acc["user_id"] == user["id"]]
            if not user_accounts:
                continue
            
            num_transactions = self.config["transactions_per_user"]
            
            for _ in range(num_transactions):
                tx_type = random.choice(self.data["transaction_types"])
                tx_date = start_date + timedelta(
                    days=random.randint(0, (end_date - start_date).days)
                )
                
                from_account = random.choice(user_accounts)
                amount = random.uniform(10, 500)
                
                transaction = {
                    "id": self.get_id("transactions"),
                    "session_id": None,
                    "transaction_type_id": tx_type["id"],
                    "user_id": user["id"],
                    "from_account_id": from_account["id"] if tx_type["category"] in ["debit", "transfer"] else None,
                    "to_account_id": None,
                    "biller_id": None,
                    "bill_id": None,
                    "beneficiary_id": None,
                    "zelle_contact_id": None,
                    "credit_card_id": None,
                    "amount": round(amount, 2),
                    "fee": 0.0,
                    "balance_before": from_account["balance"],
                    "balance_after": from_account["balance"] - amount if tx_type["category"] == "debit" else from_account["balance"] + amount,
                    "reference_id": fake.uuid4(),
                    "confirmation_number": f"CNF{random.randint(100000000, 999999999)}",
                    "description": f"{tx_type['name']} - {fake.company()}",
                    "memo": None,
                    "day": (tx_date - start_date).days,
                    "transaction_date": tx_date.isoformat(),
                    "posted_date": tx_date.isoformat(),
                    "pending_until": None,
                    "status": "success",
                    "failure_reason": None,
                    "error_code": None,
                    "error_message": None,
                    "metadata": None,
                    "created_at": tx_date.isoformat(),
                }
                
                # Fill in related IDs for certain types
                if tx_type["code"] == "bill_payment":
                    user_bills = [bill for bill in self.data["bills"] if bill["user_id"] == user["id"]]
                    if user_bills:
                        bill = random.choice(user_bills)
                        transaction["biller_id"] = bill["biller_id"]
                        transaction["bill_id"] = bill["id"]
                
                elif tx_type["code"] == "zelle":
                    user_zelle = [z for z in self.data["zelle_contacts"] if z["user_id"] == user["id"]]
                    if user_zelle:
                        contact = random.choice(user_zelle)
                        transaction["zelle_contact_id"] = contact["id"]
                
                elif tx_type["code"] == "external_transfer":
                    user_beneficiaries = [b for b in self.data["beneficiaries"] if b["user_id"] == user["id"]]
                    if user_beneficiaries:
                        beneficiary = random.choice(user_beneficiaries)
                        transaction["beneficiary_id"] = beneficiary["id"]
                
                elif tx_type["code"] == "transfer":
                    # Internal transfer between accounts
                    if len(user_accounts) > 1:
                        to_account = random.choice([acc for acc in user_accounts if acc["id"] != from_account["id"]])
                        transaction["to_account_id"] = to_account["id"]
                
                # ✅ Append transaction
                self.data["transactions"].append(transaction)
    def generate_scheduled_transactions(self):
        """Generate scheduled transactions"""
        print("📅 Generating scheduled transactions...")
        start_date = datetime.fromisoformat(self.config["start_date"])
        end_date = datetime.fromisoformat(self.config["end_date"])

        for user in self.data["users"]:
            user_accounts = [acc for acc in self.data["accounts"] if acc["user_id"] == user["id"]]
            if not user_accounts:
                continue

            # Random 1–3 scheduled transactions per user
            for _ in range(random.randint(1, 3)):
                tx_type = random.choice(self.data["transaction_types"])
                scheduled_date = start_date + timedelta(
                    days=random.randint(0, (end_date - start_date).days)
                )
                amount = random.uniform(20, 1000)

                scheduled_tx = {
                    "id": self.get_id("scheduled_transactions"),
                    "user_id": user["id"],
                    "transaction_type_id": tx_type["id"],
                    "from_account_id": random.choice(user_accounts)["id"],
                    "to_account_id": None,
                    "biller_id": None,
                    "beneficiary_id": None,
                    "amount": round(amount, 2),
                    "scheduled_date": scheduled_date.isoformat(),
                    "is_recurring": 0,
                    "recurrence_frequency": None,
                    "recurrence_end_date": None,
                    "description": f"{tx_type['name']} - {fake.company()}",
                    "memo": None,
                    "status": "scheduled",
                    "processed_transaction_id": None,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }

                self.data["scheduled_transactions"].append(scheduled_tx)

    def generate_system_config(self):
        """Generate system configuration"""
        print("⚙️  Generating system config...")
        configs = [
            {
                "key": "max_daily_transfer_limit",
                "value": "10000",
                "data_type": "real",
                "category": "balance_limits",
                "description": "Maximum daily transfer limit",
            },
            {
                "key": "max_zelle_transaction",
                "value": "2500",
                "data_type": "real",
                "category": "balance_limits",
                "description": "Maximum single Zelle transaction",
            },
            {
                "key": "overdraft_fee",
                "value": "35",
                "data_type": "real",
                "category": "fees",
                "description": "Standard overdraft fee",
            },
            {
                "key": "wire_transfer_fee",
                "value": "30",
                "data_type": "real",
                "category": "fees",
                "description": "Domestic wire transfer fee",
            },
            {
                "key": "enable_notifications",
                "value": "true",
                "data_type": "boolean",
                "category": "features",
                "description": "Enable push notifications",
            },
        ]
        
        for config in configs:
            self.data["system_config"].append({
                "id": self.get_id("system_config"),
                "key": config["key"],
                "value": config["value"],
                "data_type": config["data_type"],
                "category": config["category"],
                "description": config["description"],
                "is_configurable": 1,
                "updated_at": datetime.now().isoformat(),
            })

    def save_all(self):
        """Save all generated data to JSON files"""
        print("\n💾 Saving data to files...")
        
        for table_name, records in self.data.items():
            if records:
                # Convert all records to camelCase
                camel_records = [convert_keys_to_camel(record) for record in records]
                
                filename = self.output_dir / f"mock-{table_name}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(camel_records, f, indent=2, ensure_ascii=False)
                print(f"   ✓ {filename} ({len(records)} records)")
        
        # Generate summary
        self.save_summary()

    def save_summary(self):
        """Save generation summary"""
        summary = {
            "generated_at": datetime.now().isoformat(),
            "config": self.config,
            "statistics": {
                table: len(records) 
                for table, records in self.data.items() 
                if records
            },
            "users": [
                {
                    "id": user["id"],
                    "username": user["username"],
                    "full_name": user["full_name"],
                    "tier": next(
                        tier["name"] 
                        for tier in self.data["account_tier_levels"] 
                        if tier["id"] == user["account_tier_id"]
                    ),
                    "accounts": len([
                        acc for acc in self.data["accounts"] 
                        if acc["user_id"] == user["id"]
                    ]),
                    "credit_cards": len([
                        cc for cc in self.data["credit_cards"] 
                        if cc["user_id"] == user["id"]
                    ]),
                }
                for user in self.data["users"]
            ]
        }
        
        summary_file = self.output_dir / "summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n📊 Summary saved to {summary_file}")
        print("\n" + "="*60)
        print("GENERATION SUMMARY")
        print("="*60)
        for table, count in summary["statistics"].items():
            print(f"   {table:30s}: {count:5d} records")
        print("="*60)
        print(f"\n✨ All data saved to '{self.output_dir}' directory")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate banking sandbox data")
    parser.add_argument("--users", type=int, default=15, help="Number of users (max 15)")
    parser.add_argument("--transactions", type=int, default=15, help="Transactions per user")
    parser.add_argument("--bills", type=int, default=3, help="Bills per user")
    parser.add_argument("--beneficiaries", type=int, default=2, help="Beneficiaries per user")
    parser.add_argument("--zelle", type=int, default=3, help="Zelle contacts per user")
    parser.add_argument("--output", type=str, default="mock_data", help="Output directory")
    parser.add_argument("--start-date", type=str, default="2024-01-01", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, default="2024-12-31", help="End date (YYYY-MM-DD)")
    parser.add_argument("--min-balance", type=float, default=1000, help="Min initial balance")
    parser.add_argument("--max-balance", type=float, default=50000, help="Max initial balance")
    parser.add_argument("--min-credit", type=float, default=2000, help="Min credit limit")
    parser.add_argument("--max-credit", type=float, default=15000, help="Max credit limit")
    
    args = parser.parse_args()
    
    # Validate and update config
    config = CONFIG.copy()
    config["num_users"] = min(args.users, 15)
    config["transactions_per_user"] = args.transactions
    config["bills_per_user"] = args.bills
    config["beneficiaries_per_user"] = args.beneficiaries
    config["zelle_contacts_per_user"] = args.zelle
    config["output_dir"] = args.output
    config["start_date"] = args.start_date
    config["end_date"] = args.end_date
    config["initial_balance_range"] = (args.min_balance, args.max_balance)
    config["credit_limit_range"] = (args.min_credit, args.max_credit)
    
    # Generate data
    generator = DataGenerator(config)
    generator.generate_all()


if __name__ == "__main__":
    main()