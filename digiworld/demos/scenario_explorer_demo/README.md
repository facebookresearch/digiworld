# Scenario Explorer Demo

**The Main Interactive Interface for the DigiWorld Framework**

The Scenario Explorer is a beautiful, modern web application that serves as the primary way to explore, test, and understand the DigiWorld Framework. It provides an intuitive interface for browsing all available scenarios across all supported apps, viewing detailed information, and interactively testing scenario verification logic.

## Why Use the Scenario Explorer?

The Scenario Explorer is designed to be **your main entrypoint** into the DigiWorld Framework. It provides:

- **Visual Overview**: See all available scenarios across all supported apps at a glance
- **Interactive Testing**: Test any scenario directly from your browser
- **Code Inspection**: View the actual verification logic for each scenario
- **Learning Tool**: Understand how the framework works by exploring real examples
- **QA Workflow**: Validate scenarios and track validation status

## Who Should Use This?

- **AI Researchers**: Explore available benchmarks and understand task definitions
- **Framework Developers**: Debug scenarios and test verification logic
- **QA Engineers**: Validate scenarios and track testing progress
- **New Users**: Learn how the framework works through interactive exploration

## Features at a Glance

### 1. Scenario Browser
- **Grid View**: Browse all scenarios with beautiful cards showing key information
- **Smart Filtering**: Filter by app, difficulty, and validation status
- **Search**: Quickly find specific scenarios
- **Statistics Dashboard**: See live stats about framework coverage

### 2. Detailed Scenario Information
Click any scenario to see:
- **Full Parameters**: All configurable parameters with descriptions
- **Verification Logic**: The actual Python code that checks task completion
- **Metadata**: Difficulty level, creation date, compatible profiles
- **Validation Status**: Whether the scenario has been human-validated
- **Instance Details**: All pre-configured test instances

### 3. Interactive Play Mode
Test scenarios directly from your browser:
1. **Reset**: Initialize the Android app to the scenario's starting state
2. **View Context**: See what information an AI agent would receive
3. **Manual Testing**: Perform the task on the Android emulator
4. **Verify**: Run the verification logic to check completion

### 4. Random Scenario Mode
- Get a random scenario to explore (great for learning!)
- Filters apply to random selection
- Perfect for discovering new scenarios

## Installation & Setup

### Prerequisites

Before running the Scenario Explorer, ensure you have:

1. **DigiWorld Framework** installed (see [main README](../../README.md))
2. **Python 3.9+** with dependencies installed
3. **Node.js 16+** for the frontend
4. **Android Emulator** running and accessible via ADB
5. **All React Native apps** installed on the emulator

### Step-by-Step Setup

#### 1. Backend Setup

```bash
cd digiworld/demos/scenario_explorer_demo/backend
pip install -r requirements.txt
```

**Backend Dependencies:**
- `fastapi` - Modern web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- Access to DigiWorld framework modules

#### 2. Frontend Setup

```bash
cd digiworld/demos/scenario_explorer_demo/frontend
npm install
```

**Frontend Dependencies:**
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Shadcn/ui components

## Running the Application

### Option 1: Quick Start (Recommended)

Use the provided startup script:

```bash
cd digiworld/demos/scenario_explorer_demo
chmod +x run.sh
./run.sh
```

This will:
1. Start the backend server on port 8000
2. Start the frontend dev server on port 5173
3. Open your browser automatically

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd digiworld/demos/scenario_explorer_demo/backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd digiworld/demos/scenario_explorer_demo/frontend
npm run dev
```

Then open your browser to: **http://localhost:5173**

### Verify Everything Works

1. The frontend should load showing the scenario grid
2. Check that scenarios are loading (you should see the scenario cards)
3. Click "View Details" on any scenario to test the modal
4. Try the filters to narrow down scenarios

## Using the Scenario Explorer

### Browsing Scenarios

1. **View All Scenarios**: The main page shows all scenarios in a grid layout
2. **Read Descriptions**: Each card shows the app, task name, and basic info
3. **Check Status**: See which scenarios have been validated (green checkmark)

### Filtering

Use the filter panel on the left to narrow down scenarios:

- **By App**: Email, Payment, Music, Eats, Ecommerce, Ryde, Message, Video, Smart Home
- **By Difficulty**: Basic, Intermediate, Advanced
- **By Validation Status**: Validated, Not Validated, All

Filters work together - select multiple options to refine results.

### Viewing Scenario Details

Click the **"View Details"** button (info icon) on any scenario card:

1. **Overview Tab**: Parameters, metadata, compatible profiles
2. **Verification Tab**: See the actual Python code that checks task completion
3. **Validation Tab**: Validation status, notes, and history
4. **Instances Tab**: All pre-configured test instances with their parameters

### Testing a Scenario (Play Mode)

Click the **"Play"** button on any scenario card to enter interactive mode:

#### Step 1: Reset to Initial State
- Click "Reset to Initial State"
- The framework will:
  - Select a compatible user profile
  - Reset the app's database to that profile
  - Insert any required mockdata
  - Restart the app on your emulator
- Wait for confirmation before proceeding

#### Step 2: View Agent Context
- Click "Get Agent Context"
- This shows you exactly what an AI agent would see:
  - Task description with resolved parameters
  - Relevant user context (email, name, etc.)
  - Any app-specific information
- **Important**: This context is what you'll use to perform the task manually

#### Step 3: Perform the Task
- Using the context information, **manually perform the task** on your Android emulator
- For example, if the task is "Send email to john@example.com", open the email app and send that email
- Take your time - there's no rush!

#### Step 4: Verify Completion
- Once you've finished the task, click "Verify Task Completion"
- The framework will:
  - Capture the current app state
  - Run the verification logic
  - Compare initial and final states
  - Report whether the task was completed successfully
- You'll see the results immediately:
  - ✓ **Task Completed** (green) - Great job!
  - ✗ **Task Not Completed** (red) - The verification logic didn't detect completion

### Random Scenario Selection

- Click **"Random Scenario"** button at the top
- Gets a random scenario from the filtered set
- Great for:
  - Discovering scenarios you haven't tried
  - Quick testing sessions
  - Learning about different apps

## Architecture

### Backend (FastAPI)

**File:** `backend/main.py`

The backend provides a RESTful API for interacting with the DigiWorld Framework:

#### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scenarios` | GET | List all scenarios with optional filtering |
| `/api/scenario/{id}` | GET | Get detailed info for a specific scenario |
| `/api/scenario/select` | POST | Select a scenario instance for testing |
| `/api/scenario/reset` | POST | Reset app to initial state |
| `/api/scenario/context` | POST | Get agent context for selected scenario |
| `/api/scenario/verify` | POST | Verify task completion |
| `/api/scenario/random` | GET | Get a random scenario (with filters) |
| `/api/stats` | GET | Get framework statistics |
| `/docs` | GET | Interactive API documentation (Swagger UI) |

#### Session Management

The backend maintains session state:
- Currently selected scenario
- Selected instance (if any)
- Initial state path
- Agent context

This allows the Play Mode workflow to work seamlessly.

### Frontend (React + TypeScript)

**Directory:** `frontend/src`

The frontend is a modern React application using:
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Beautiful icons
- **Shadcn/ui**: High-quality UI components

#### Component Structure

```
src/
├── components/
│   ├── Header.tsx              # Top navigation bar
│   ├── StatsPanel.tsx          # Statistics dashboard
│   ├── FilterPanel.tsx         # Filtering controls
│   ├── ScenarioGrid.tsx        # Main scenario display
│   ├── ScenarioCard.tsx        # Individual scenario card
│   ├── ScenarioDetailModal.tsx # Detailed scenario view
│   └── PlayPanel.tsx           # Interactive testing interface
├── types/
│   └── scenario.ts             # TypeScript type definitions
├── App.tsx                     # Main application
└── main.tsx                    # Application entry point
```

## Common Workflows

### Workflow 1: Exploring a New Scenario

1. Open the Scenario Explorer
2. Filter to the app you're interested in (e.g., "Email")
3. Browse the available scenarios
4. Click "View Details" to see parameters and verification logic
5. Click "Play" to try it out interactively

### Workflow 2: Validating Scenarios

1. Select a scenario to validate
2. Click "Play" to enter interactive mode
3. Reset to initial state
4. Perform the task manually on the emulator
5. Verify completion
6. Document any issues or edge cases discovered
7. Mark as validated in the QA tool (if validation succeeded)

### Workflow 3: Debugging Verification Logic

1. Find a scenario that's failing verification
2. Click "View Details" → "Verification" tab
3. Review the verification logic code
4. Click "Play" to test it
5. After performing the task, check the verification result
6. If incorrect, you now know which verification logic needs fixing

### Workflow 4: Learning the Framework

1. Click "Random Scenario" repeatedly
2. For each scenario:
   - Read the task description
   - View the verification logic
   - Check what parameters are available
3. Try a few in Play Mode to see the full workflow
4. Notice patterns (database queries, JSON state checks, etc.)

## Tips & Best Practices

### Before You Start

- ✓ Ensure the Android emulator is running
- ✓ Install all required apps on the emulator
- ✓ Start the emulator before starting the Scenario Explorer
- ✓ Keep the emulator visible while testing

### During Testing

- **Read Context Carefully**: The agent context contains all information needed
- **Check Initial State**: After reset, verify the app is in the expected state
- **Follow Task Exactly**: Perform only the specific task requested
- **Don't Rush**: Take time to complete tasks correctly

### Troubleshooting

**Problem: Scenarios not loading**
- Check that the backend is running (`http://localhost:8000/docs`)
- Verify DigiWorld framework is installed correctly
- Check backend logs for errors

**Problem: Reset fails**
- Ensure Android emulator is running and responsive
- Check that ADB can connect: `adb devices`
- Verify the app is installed on the emulator

**Problem: Verification always fails**
- Make sure you completed the exact task requested
- Check parameter values (e.g., exact email address, amount)
- Review verification logic for hints on what it's checking

**Problem: Frontend not connecting to backend**
- Verify backend is running on port 8000
- Check browser console for connection errors
- Try refreshing the page

## Advanced Features

### API Documentation

The backend provides interactive API documentation:
- Open `http://localhost:8000/docs` in your browser
- Try out API endpoints directly
- See request/response schemas
- Useful for integrating with other tools

### Custom Integrations

The Scenario Explorer API can be used to build:
- **Automated Testing Scripts**: Use the API to run scenarios programmatically
- **CI/CD Integration**: Incorporate scenario testing into your pipeline
- **Custom Dashboards**: Build your own UI on top of the API
- **Agent Evaluation**: Use the API to test AI agents at scale

## Development & Contribution

### Running in Development Mode

Both frontend and backend support hot-reloading:
- **Backend**: Automatically reloads on code changes
- **Frontend**: Vite hot module replacement (HMR)

### Adding New Features

The codebase is structured for easy extension:
- **New API endpoint**: Add to `backend/main.py`
- **New frontend component**: Add to `frontend/src/components/`
- **New scenario type**: Framework will auto-discover it

### Code Quality

- **Backend**: Follows FastAPI best practices with Pydantic models
- **Frontend**: TypeScript ensures type safety
- **Styling**: Tailwind CSS for consistent, maintainable styles

## Related Documentation

- **DigiWorld Framework**: [Main README](../../README.md)
- **QA Validation Tool**: [QA Validation README](../../qa_validation/README.md)
- **API Documentation**: `http://localhost:8000/docs` (when running)
- **Test Documentation**: [Test README](../../scenarios/tests/scenarios/README.md)

## Support & Feedback

If you encounter issues or have suggestions:
1. Check the troubleshooting section above
2. Review backend logs for errors
3. Check browser console for frontend issues
4. Ensure all prerequisites are met

---

**Happy Exploring! The Scenario Explorer is your gateway to understanding and working with the DigiWorld Framework.**
