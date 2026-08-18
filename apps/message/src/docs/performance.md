# Function Performance Report

## Overview
This report shows performance metrics for key functions in the message app, including execution times and call frequencies.

## Performance Metrics

| Function Name | Calls | Average (s) | Min (s) | Max (s) | Total (s) | Performance Impact |
|:--------------|:-----:|:------------:|:-------:|:-------:|:---------:|:-----------------:|
| **copy_test_data** | 5 | 0.11312 | 0.00701 | 0.50367 | 0.56559 | 🟢 Low |
| **__init__** | 5 | 0.11378 | 0.00763 | 0.50460 | 0.56888 | 🟢 Low |
| **run_adb_command** | 1,667 | 0.05672 | 0.00591 | 0.34581 | 94.54914 | 🟡 Medium |
| **is_ready** | 612 | 0.04628 | 0.01938 | 0.08616 | 28.32125 | 🟡 Medium |
| **wait_for_ready** | 578 | 0.16680 | 0.01948 | 2.12754 | 96.41309 | 🟠 High |
| **dispatch_deeplink_to_android** | 289 | 0.14714 | 0.06894 | 0.20643 | 42.52430 | 🟡 Medium |
| **set_environment** | 11 | 1.78428 | 0.66109 | 11.94482 | 19.62713 | 🟠 High |
| **_check_env_set** | 837 | 0.00000 | 0.00000 | 0.00008 | 0.00117 | 🟢 Low |
| **backup_app_data** | 137 | 3.30705 | 0.04847 | 8.56142 | 453.06631 | 🔴 Critical |
| **persist_state** | 137 | 4.00754 | 0.21220 | 8.76559 | 549.03325 | 🔴 Critical |
| **restore_app_data** | 137 | 0.20048 | 0.04763 | 0.46689 | 27.46559 | 🟡 Medium |
| **rollback_state** | 137 | 0.72787 | 0.39458 | 1.54686 | 99.71791 | 🟠 High |

---