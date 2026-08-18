# 🧪 Andojo Auction — MVP Specification

## Background

We need to develop a **minimal viable “sandbox eBay” app** to evaluate how AI agents act in marketplace-like settings.

### Research Goals

- Can agents search for items and compare prices?
- Can they bid in auctions or buy items outright?
- Can they list and sell items with basic descriptions?
- How do they react to deterministic bidding outcomes (win/lose)?
- How do they handle failed purchases, inventory depletion, and refunds?

All of this must happen **offline**, with **mock data generation**, and be **fully reproducible using seeds**.

---

## 🧩 Feature Functions (Scope: F1–F5)

| ID | Feature | Scope |
|----|----------|-------|
| **F1** | Mock Data Generation | Generate items, categories, sellers, and auction/buy-now prices deterministically |
| **F2** | Session Initialization | Initialize deterministic test session for AI agents |
| **F3** | Browse/Search Items | Search for items by keyword or category |
| **F4** | Item Detail View | Show item description, seller info, and price/auction status |
| **F5** | Bidding Simulation | Place bids on items; deterministic win/loss outcomes |
| **F6** | Buy Now Simulation | Purchase item immediately at listed price |
| **F7** | Selling/Listing Items | Agents list items for sale |
| **F8** | Transaction Management | Track won bids, purchases, sales, inventory |
| **F9** | Payment Simulation | Mock credit card payments with deterministic success/failure |
| **F10** | Cancellation & Refunds | Cancel purchases and issue deterministic refunds |
| **F11** | Offline & Determinism | Air-gapped execution with reproducibility via seed |

---

### **F1 — Mock Data Generation**

**User Story:**  
_As a researcher, I want mock data for items, categories, sellers, and prices so agents can explore a realistic marketplace offline._

**Acceptance Criteria:**
- Items include `item_id`, `title`, `description`, `category`, `seller_id`, `price`, `auction_flag`
- Dataset seeded → reproducible for each run
- At least **5 categories**: Electronics, Books, Fashion, Home, Toys
- Auction items have deterministic closing times and bid ranges
- Data saved in:
  - `items.json`
  - `sellers.json`

---

### **F2 — Session Initialization**

**User Story:**  
_As a researcher, I want to initialize a session with agent metadata so experiments are reproducible._

**Acceptance Criteria:**
- Inputs: `agent_id`, `session_id`, `seed`
- Optional file: `agent_session.json` to store deterministic experiment metadata
- Reset option clears prior session state

---

### **F3 — Browse/Search Items**

**User Story:**  
_As an agent, I want to search for items so I can find things to buy or bid on._

**Acceptance Criteria:**
- Search by keyword, category, or seller filter
- Returns up to 10 matching results
- Each result includes: `title`, `price`, `auction/buy-now` flag

---

### **F4 — Item Detail View**

**User Story:**  
_As an agent, I want to view item details so I can make informed buying or bidding decisions._

**Acceptance Criteria:**
- Displays: `item_id`, `title`, `description`, `category`, `seller info`, `price`, `auction_status`, `end_time`

---

### **F5 — Bidding Simulation**

**User Story:**  
_As an agent, I want to place a bid on an auction item so I can attempt to win it._

**Acceptance Criteria:**
- Inputs: `item_id`, `bid_amount`
- Outcome determined deterministically using seeded algorithm
- If won → item moved to **purchases**
- If lost → status set to `"lost"`

---

### **F7 — Selling/Listing Items**

**User Story:**  
_As an agent, I want to list items for sale so I can act as a seller._

**Acceptance Criteria:**
- Inputs: `title`, `description`, `category`, `price`, `auction_flag`
- New `item_id` assigned by system
- New item appears in search results and in `items.json` for future sessions

---

### **F8 — Transaction Management**

**User Story:**  
_As a system, I want to track transactions so agents can view their purchases, bids, and sales._

**Acceptance Criteria:**
- Purchases and sales linked to `agent_id` (equivalent to `user_id`)
- Inventory updated deterministically
- Transactions stored in lightweight JSON (e.g., `transactions.json`)

---

### **F9 — Payment Simulation**

**User Story:**  
_As an agent, I want to simulate payments with mock cards so I can test transaction flows._

**Acceptance Criteria:**
- Accepts fake card numbers (e.g., `4242 4242 4242 4242`)
- Deterministic success/failure using seeded lookup or mock card dataset
- Failed transactions include `"reason": "DECLINED"`

---

### **F10 — Cancellation & Refunds**

**User Story:**  
_As an agent, I want to cancel a purchase so I can trigger a refund._

**Acceptance Criteria:**
- Cancelling a direct purchase sets `status = "cancelled"`
- Always issues a full refund (100%)
- Refunds reflected in transaction records

---

### **F11 — Offline & Determinism**

**User Story:**  
_As a security engineer, I want the app to run fully offline and deterministically for reproducibility._

**Acceptance Criteria:**
- No internet or external API calls
- All data seeded locally (e.g., `seed = 12345`)
- Running with same seed and inputs → identical outcomes

---

## 🧾 Glossary of Key Terms

| Term | Description |
|------|-------------|
| **agent_id** | Identifier for AI agent (≡ user_id) |
| **item_id** | Unique item identifier |
| **auction_flag** | Marks item as auction (1) or buy-now (0) |
| **bounded deterministic random walk** | Algorithm to simulate deterministic bid/price changes |
| **seed** | Number ensuring reproducible pseudo-random outputs |
| **refund** | Full (100%) refund in MVP |

## 🧠 Consolidated Assumptions

1. **General**
   - System runs entirely offline (air-gapped)
   - All randomness derived from deterministic seed
   - No external APIs or logging features (F11 removed)

2. **Data**
   - All mock data generated via seed: `items.json`, `sellers.json`, `transactions.json`
   - Categories fixed to at least: Electronics, Books, Fashion, Home, Toys
   - Items can switch between auction and buy-now modes via `auction_flag`

3. **Session (F2)**
   - `agent_session.json` optional — used only for reproducibility

4. **Auctions & Bidding (F5)**
   - Bids are binding; no cancellations
   - Visible, deterministic open-auction format
   - Auction outcomes fixed by seeded algorithm

5. **Payments (F9)**
   - Deterministic results per card; no random “success percentages”
   - Mock dataset defines which cards always succeed/fail

6. **Purchases & Refunds (F10)**
   - Direct purchases cancellable anytime (instant delivery model)
   - Auctions not cancellable after winning
   - Refunds always full and immediate
---
