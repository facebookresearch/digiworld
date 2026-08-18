---

## **Feature Group 1: Session Initialization**

### **Feature Function:**

Initialize the environment with agent-specific metadata and deterministic control (seed, volatility, config toggles).

### **User Story 1.1 – Start Agent Session**

As a researcher, I want to start a test session with a unique agent ID and configuration so I can track and reproduce agent behavior.

**Acceptance Criteria:**

* Starting balances: Checking $2,000, Savings $5,000

Assumptions:  
– rest all params are configured as part of mock\_data and session\_id would be part of set\_environment deeplink

---

## 

##  **Feature Group 2: Account Summary View**

### **Feature Function:**

Display current account balances for each simulated account type.

### **User Story 2.1 – View Account Summary**

As an agent, I want to see all account balances so I can plan transfers and bill payments.

**Acceptance Criteria:**

*  Displays account types: Checking, Savings, Credit Card 

*  Balance shown to two decimal places

* Account number masked (e.g., \*\*\*\*1234)

* View-only; cannot modify from this screen

Assumptions: 

\-- Checking, Savings, Credit Card \- these are the only account types we target for MVP, limit to only 3, to keep it simple

\-- Users can add more checking/savings/credit accounts for their main account to maximum of 2 per type

Inputs: Banks usually make this very annoying to do too and has upsell to different type of checking/ savings accounts. let's make sure we add as much friction as the top banks have. Also, why is there a restriction of 2 per type? Can we remove this restriction?

---

##  **Feature Group 3: Funds Transfer**

### **Feature Function:**

Allow agents to transfer funds between their own accounts (e.g., savings to checking).

### **User Story 3.1 – Transfer Between Accounts**

As an agent, I want to move funds between my accounts to manage liquidity for upcoming bills.

**Acceptance Criteria:**

*  Transfer requires valid source/destination

*  Transfer blocked if source has insufficient funds

* Transfer logs include `amount`, `from_account`, `to_account`, and new balances

*  Error logs created for invalid actions with reason codes

Assumption:

– For Phase-1 MVP, only self account transfers, cannot transfer to another users’/beneficiaries’ accounts

---

##  **Feature Group 4: Bill Payment (Mock)**

### **Feature Function:**

Simulate paying bills to mock billers like utilities or internet providers.

### **User Story 4.1 – Pay a Mock Biller**

As an agent, I want to pay a bill from my account to test task execution and memory.

**Acceptance Criteria:**

*  App lists predefined billers (Electricity, Internet, Water)

* Payment deducted from selected account

* Payment blocked if insufficient balance

* Success/failure is logged with amount, biller, and reference ID

Assumption: Options are predefined and rendered using dropdown to make it easier 

– We create mock utility companies and simulate mock transactions
Inputs: we also need the "add biller option", this is also super annoying to do with banks because you have to try to look up, then if it fails, you manually enter the biller information and you account number and so much more.


---

## 

## **Feature Group 5: Transaction History**

### **Feature Function:**

Show all transactions performed in the current session.

### **User Story 5.1 – View Transaction History**

As a researcher, I want to review what the agent has done during the session to evaluate accuracy and planning.

**Acceptance Criteria:**

*  Shows timestamp, action type, amount, accounts, result

*  Can filter by action type (Buy/Sell/Transfer/Bill Pay) (credit/debit/transfer/bill pay)

*  Pulled from the local log file (JSONL)


## 

## **Feature Group 6: Offline Compliance**

### **Feature Function:**

Ensure the app operates entirely without network access or external services.

### **User Story 8.1 – Enforce Offline Execution**

As a security auditor, I want to verify this app can run fully offline to meet FAIR lab air-gapped compliance.

**Acceptance Criteria:**

* `INTERNET` permission not declared in manifest

*  App tested in airplane mode across full session

* All resources (fonts, icons, configs) bundled locally

* No telemetry, analytics, or cloud sync libraries used

---

# **Glossary of Key Terms** 

| Term | Meaning |
| ----- | ----- |
| **Agentic AI** | An AI system that can make decisions and take actions in pursuit of goals (e.g., pay all bills under budget) |
| **Air-Gapped** | Completely offline, no network access allowed (even for error reporting) |
| **Seed** | A number used to initialize random-like behaviors deterministically (e.g., price changes or interest) |
| **Session ID** | Unique string to identify a test run |
| **Agent ID** | Label for the AI agent being tested (Agent\_1, Agent\_X, etc.) |
| **Recurring Bills** | Automatic simulated bills (e.g., rent every 5 days) |
| **Interest Accrual** | Savings account grows by a fixed % per simulated day (e.g., \+0.05%) |
| **JSONL** | JSON Lines: 1 valid JSON object per line, ideal for logs |
| **T+N** | Simulated “day” counter (e.g., T+3 \= third simulated day) |
| **Volatility** | In this context, controls how "dynamic" account behavior can be (e.g., future feature for transaction volume or bill fluctuations) |

---

