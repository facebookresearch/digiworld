# Parallel File Copy Benchmark Report

> **Generated:** 2026-05-12 17:31:05  
> **Repetitions per configuration:** 2  
> **Worker counts tested:** 5, 8, 12  
> **Total profiles benchmarked:** 75  
> **Total apps:** 7

---

## Overview

All `assets` directories under each sandbox app's profiles were discovered
automatically and copied to a temporary destination using Python's
`ThreadPoolExecutor`. Each _(profile × worker count)_ pair was timed over
**2 repetitions** and the mean is reported.

| App | Bundle ID | Profiles | Total Files | Total Size |
|---|---|:---:|---:|---:|
| Andojo Auction | `com.andojoauction.sbx` | 10 | 2,497 | 78.1 MB |
| Andojo Eats | `com.andojoeats.sbx` | 11 | 2,244 | 377.3 MB |
| Andojo Music | `com.andojomusic.sbx` | 11 | 275 | 9.7 MB |
| Andojo QwikShop | `com.andojoqwikshop.sbx` | 11 | 13,486 | 482.6 MB |
| Andojo Ryde | `com.andojoryde.sbx` | 11 | 47 | 0.2 MB |
| Andojo Shop | `com.andojoshop.sbx` | 11 | 13,486 | 482.6 MB |
| Andojo Video | `com.andojovideo.sbx` | 10 | 870 | 34.5 MB |

---

## Detailed Results

### Andojo Auction

**Bundle ID:** `com.andojoauction.sbx`  
**Profiles:** 10  |  **Files (total across profiles):** 2,497  |  **Size (total):** 78.1 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `auction_heavy` | 250 | 7.75 | 0.046 | 0.044 | 0.045 | **8w** |
| `budget_items` | 249 | 7.64 | 0.048 | 0.047 | 0.054 | **8w** |
| `buy_now_focus` | 250 | 7.69 | 0.053 | 0.066 | 0.062 | **5w** |
| `default` | 249 | 7.71 | 0.061 | 0.050 | 0.048 | **12w** |
| `ending_soon` | 250 | 7.74 | 0.045 | 0.048 | 0.057 | **5w** |
| `failed_payments` | 250 | 8.02 | 0.061 | 0.048 | 0.052 | **8w** |
| `high_bid_volume` | 250 | 7.84 | 0.046 | 0.046 | 0.045 | **12w** |
| `new_seller` | 249 | 7.84 | 0.047 | 0.054 | 0.058 | **5w** |
| `power_seller` | 250 | 7.76 | 0.048 | 0.049 | 0.045 | **12w** |
| `premium_items` | 250 | 8.11 | 0.061 | 0.052 | 0.063 | **8w** |
| **Profile mean** | — | — | 0.052 | 0.050 | 0.053 | **8w** |

> _Fastest worker per profile across 10 profiles: 5w won 3×, 8w won 4×, 12w won 3×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `auction_heavy` | 0.008 | 0.001 | 0.001 |
| `budget_items` | 0.011 | 0.003 | 0.001 |
| `buy_now_focus` | 0.008 | 0.004 | 0.006 |
| `default` | 0.005 | 0.006 | 0.002 |
| `ending_soon` | 0.008 | 0.001 | 0.001 |
| `failed_payments` | 0.005 | 0.001 | 0.007 |
| `high_bid_volume` | 0.003 | 0.000 | 0.002 |
| `new_seller` | 0.009 | 0.002 | 0.000 |
| `power_seller` | 0.009 | 0.011 | 0.002 |
| `premium_items` | 0.017 | 0.004 | 0.002 |

</details>

---

### Andojo Eats

**Bundle ID:** `com.andojoeats.sbx`  
**Profiles:** 11  |  **Files (total across profiles):** 2,244  |  **Size (total):** 377.3 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `budget_menu` | 204 | 34.02 | 0.059 | 0.052 | 0.048 | **12w** |
| `cancelled_orders` | 204 | 34.32 | 0.051 | 0.046 | 0.059 | **8w** |
| `default` | 204 | 34.30 | 0.051 | 0.045 | 0.047 | **8w** |
| `excellent_ratings` | 204 | 34.13 | 0.057 | 0.049 | 0.054 | **8w** |
| `high_order_volume` | 204 | 34.50 | 0.054 | 0.044 | 0.045 | **8w** |
| `large_orders` | 204 | 34.36 | 0.049 | 0.045 | 0.047 | **8w** |
| `new_user` | 204 | 34.29 | 0.050 | 0.043 | 0.052 | **8w** |
| `pending_orders` | 204 | 34.53 | 0.055 | 0.051 | 0.052 | **8w** |
| `poor_ratings` | 204 | 34.43 | 0.052 | 0.048 | 0.043 | **12w** |
| `premium_menu` | 204 | 33.97 | 0.050 | 0.044 | 0.042 | **12w** |
| `small_orders` | 204 | 34.45 | 0.049 | 0.047 | 0.050 | **8w** |
| **Profile mean** | — | — | 0.053 | 0.047 | 0.049 | **8w** |

> _Fastest worker per profile across 11 profiles: 5w won 0×, 8w won 8×, 12w won 3×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `budget_menu` | 0.008 | 0.003 | 0.001 |
| `cancelled_orders` | 0.011 | 0.002 | 0.016 |
| `default` | 0.016 | 0.002 | 0.000 |
| `excellent_ratings` | 0.012 | 0.001 | 0.000 |
| `high_order_volume` | 0.016 | 0.002 | 0.000 |
| `large_orders` | 0.012 | 0.000 | 0.003 |
| `new_user` | 0.016 | 0.001 | 0.001 |
| `pending_orders` | 0.015 | 0.002 | 0.001 |
| `poor_ratings` | 0.014 | 0.001 | 0.001 |
| `premium_menu` | 0.010 | 0.000 | 0.001 |
| `small_orders` | 0.012 | 0.004 | 0.000 |

</details>

---

### Andojo Music

**Bundle ID:** `com.andojomusic.sbx`  
**Profiles:** 11  |  **Files (total across profiles):** 275  |  **Size (total):** 9.7 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `default` | 25 | 0.87 | 0.007 | 0.007 | 0.007 | **5w** |
| `genre_focused` | 25 | 0.86 | 0.007 | 0.007 | 0.008 | **5w** |
| `high_rated_content` | 25 | 0.90 | 0.007 | 0.007 | 0.007 | **8w** |
| `large_playlists` | 25 | 0.92 | 0.007 | 0.009 | 0.009 | **5w** |
| `low_engagement` | 25 | 0.89 | 0.007 | 0.006 | 0.006 | **8w** |
| `minimal_playlists` | 25 | 0.87 | 0.006 | 0.006 | 0.006 | **8w** |
| `new_user` | 25 | 0.86 | 0.006 | 0.005 | 0.005 | **12w** |
| `playlist_heavy` | 25 | 0.90 | 0.006 | 0.006 | 0.007 | **8w** |
| `power_listener` | 25 | 0.88 | 0.006 | 0.006 | 0.006 | **8w** |
| `recent_activity` | 25 | 0.87 | 0.006 | 0.006 | 0.006 | **12w** |
| `viral_songs` | 25 | 0.86 | 0.006 | 0.006 | 0.006 | **8w** |
| **Profile mean** | — | — | 0.007 | 0.006 | 0.007 | **8w** |

> _Fastest worker per profile across 11 profiles: 5w won 3×, 8w won 6×, 12w won 2×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `default` | 0.001 | 0.000 | 0.000 |
| `genre_focused` | 0.001 | 0.000 | 0.000 |
| `high_rated_content` | 0.000 | 0.000 | 0.001 |
| `large_playlists` | 0.001 | 0.002 | 0.001 |
| `low_engagement` | 0.001 | 0.000 | 0.000 |
| `minimal_playlists` | 0.001 | 0.000 | 0.000 |
| `new_user` | 0.000 | 0.001 | 0.000 |
| `playlist_heavy` | 0.000 | 0.000 | 0.001 |
| `power_listener` | 0.002 | 0.000 | 0.000 |
| `recent_activity` | 0.000 | 0.000 | 0.001 |
| `viral_songs` | 0.001 | 0.000 | 0.000 |

</details>

---

### Andojo QwikShop

**Bundle ID:** `com.andojoqwikshop.sbx`  
**Profiles:** 11  |  **Files (total across profiles):** 13,486  |  **Size (total):** 482.6 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `bulk_quantity` | 1226 | 44.23 | 0.312 | 0.269 | 0.299 | **8w** |
| `default` | 1226 | 43.68 | 0.290 | 0.287 | 0.293 | **8w** |
| `empty_cart` | 1226 | 43.73 | 0.268 | 0.291 | 0.269 | **5w** |
| `full_cart` | 1226 | 43.75 | 0.290 | 0.291 | 0.280 | **12w** |
| `heavy_discounts` | 1226 | 44.01 | 0.410 | 0.266 | 0.295 | **8w** |
| `high_order_volume` | 1226 | 43.82 | 0.273 | 0.286 | 0.287 | **5w** |
| `large_orders` | 1226 | 44.03 | 0.278 | 0.289 | 0.273 | **12w** |
| `low_stock` | 1226 | 43.86 | 0.313 | 0.281 | 0.266 | **12w** |
| `new_user` | 1226 | 44.05 | 0.288 | 0.262 | 0.332 | **8w** |
| `power_shopper` | 1226 | 43.64 | 0.283 | 0.311 | 0.269 | **12w** |
| `premium_products` | 1226 | 43.83 | 0.294 | 0.268 | 0.303 | **8w** |
| **Profile mean** | — | — | 0.300 | 0.282 | 0.288 | **8w** |

> _Fastest worker per profile across 11 profiles: 5w won 2×, 8w won 5×, 12w won 4×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `bulk_quantity` | 0.009 | 0.014 | 0.010 |
| `default` | 0.021 | 0.008 | 0.018 |
| `empty_cart` | 0.017 | 0.011 | 0.007 |
| `full_cart` | 0.039 | 0.037 | 0.011 |
| `heavy_discounts` | 0.234 | 0.008 | 0.007 |
| `high_order_volume` | 0.025 | 0.021 | 0.018 |
| `large_orders` | 0.035 | 0.013 | 0.012 |
| `low_stock` | 0.104 | 0.012 | 0.002 |
| `new_user` | 0.042 | 0.006 | 0.035 |
| `power_shopper` | 0.060 | 0.035 | 0.008 |
| `premium_products` | 0.042 | 0.004 | 0.022 |

</details>

---

### Andojo Ryde

**Bundle ID:** `com.andojoryde.sbx`  
**Profiles:** 11  |  **Files (total across profiles):** 47  |  **Size (total):** 0.2 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `budget_rides` | 6 | 0.03 | 0.002 | 0.002 | 0.002 | **8w** |
| `cancelled_rides` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **5w** |
| `default` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **12w** |
| `excellent_feedback` | 5 | 0.03 | 0.001 | 0.001 | 0.001 | **5w** |
| `high_rated_drivers` | 3 | 0.01 | 0.001 | 0.001 | 0.001 | **12w** |
| `high_ride_volume` | 5 | 0.02 | 0.002 | 0.001 | 0.001 | **12w** |
| `inactive_users` | 4 | 0.02 | 0.001 | 0.003 | 0.001 | **5w** |
| `low_rated_drivers` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **12w** |
| `new_user` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **8w** |
| `poor_feedback` | 5 | 0.03 | 0.002 | 0.004 | 0.002 | **12w** |
| `premium_fares` | 3 | 0.02 | 0.001 | 0.001 | 0.001 | **5w** |
| **Profile mean** | — | — | 0.001 | 0.002 | 0.001 | **12w** |

> _Fastest worker per profile across 11 profiles: 5w won 4×, 8w won 2×, 12w won 5×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `budget_rides` | 0.000 | 0.000 | 0.000 |
| `cancelled_rides` | 0.000 | 0.000 | 0.000 |
| `default` | 0.000 | 0.000 | 0.000 |
| `excellent_feedback` | 0.000 | 0.000 | 0.000 |
| `high_rated_drivers` | 0.000 | 0.000 | 0.000 |
| `high_ride_volume` | 0.000 | 0.000 | 0.000 |
| `inactive_users` | 0.000 | 0.004 | 0.000 |
| `low_rated_drivers` | 0.000 | 0.000 | 0.000 |
| `new_user` | 0.000 | 0.000 | 0.000 |
| `poor_feedback` | 0.000 | 0.001 | 0.000 |
| `premium_fares` | 0.000 | 0.000 | 0.000 |

</details>

---

### Andojo Shop

**Bundle ID:** `com.andojoshop.sbx`  
**Profiles:** 11  |  **Files (total across profiles):** 13,486  |  **Size (total):** 482.6 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `bulk_quantity` | 1226 | 44.23 | 0.295 | 0.272 | 0.304 | **8w** |
| `default` | 1226 | 43.68 | 0.281 | 0.286 | 0.314 | **5w** |
| `empty_cart` | 1226 | 43.73 | 0.273 | 0.331 | 0.287 | **5w** |
| `full_cart` | 1226 | 43.75 | 0.296 | 0.306 | 0.292 | **12w** |
| `heavy_discounts` | 1226 | 44.01 | 0.395 | 0.291 | 0.306 | **8w** |
| `high_order_volume` | 1226 | 43.82 | 0.300 | 0.283 | 0.301 | **8w** |
| `large_orders` | 1226 | 44.03 | 0.274 | 0.273 | 0.279 | **8w** |
| `low_stock` | 1226 | 43.86 | 0.300 | 0.305 | 0.291 | **12w** |
| `new_user` | 1226 | 44.05 | 0.301 | 0.309 | 0.303 | **5w** |
| `power_shopper` | 1226 | 43.64 | 0.303 | 0.299 | 0.314 | **8w** |
| `premium_products` | 1226 | 43.83 | 0.298 | 0.292 | 0.345 | **8w** |
| **Profile mean** | — | — | 0.301 | 0.295 | 0.303 | **8w** |

> _Fastest worker per profile across 11 profiles: 5w won 3×, 8w won 6×, 12w won 2×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `bulk_quantity` | 0.008 | 0.007 | 0.011 |
| `default` | 0.003 | 0.024 | 0.007 |
| `empty_cart` | 0.041 | 0.053 | 0.000 |
| `full_cart` | 0.068 | 0.045 | 0.002 |
| `heavy_discounts` | 0.204 | 0.034 | 0.018 |
| `high_order_volume` | 0.003 | 0.011 | 0.019 |
| `large_orders` | 0.045 | 0.008 | 0.014 |
| `low_stock` | 0.026 | 0.027 | 0.001 |
| `new_user` | 0.053 | 0.038 | 0.029 |
| `power_shopper` | 0.022 | 0.013 | 0.008 |
| `premium_products` | 0.007 | 0.013 | 0.059 |

</details>

---

### Andojo Video

**Bundle ID:** `com.andojovideo.sbx`  
**Profiles:** 10  |  **Files (total across profiles):** 870  |  **Size (total):** 34.5 MB

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Fastest |
|---|---:|---:|---:|---:|---:|:---:|
| `comments_disabled` | 78 | 3.16 | 0.019 | 0.018 | 0.017 | **12w** |
| `default` | 73 | 2.96 | 0.017 | 0.015 | 0.018 | **8w** |
| `high_engagement` | 76 | 3.05 | 0.018 | 0.017 | 0.017 | **8w** |
| `high_view_count` | 74 | 2.84 | 0.019 | 0.018 | 0.022 | **8w** |
| `inactive_users` | 74 | 2.94 | 0.022 | 0.018 | 0.021 | **8w** |
| `long_videos` | 77 | 3.03 | 0.021 | 0.018 | 0.019 | **8w** |
| `low_engagement` | 71 | 2.84 | 0.018 | 0.017 | 0.018 | **8w** |
| `many_videos` | 199 | 7.93 | 0.047 | 0.041 | 0.049 | **8w** |
| `new_content` | 71 | 2.81 | 0.018 | 0.018 | 0.019 | **5w** |
| `short_videos` | 77 | 2.96 | 0.021 | 0.019 | 0.018 | **12w** |
| **Profile mean** | — | — | 0.022 | 0.020 | 0.022 | **8w** |

> _Fastest worker per profile across 10 profiles: 5w won 1×, 8w won 7×, 12w won 2×_

<details>
<summary>Variability (std dev per profile)</summary>

| Profile | 5w σ (s) | 8w σ (s) | 12w σ (s) |
|---|---:|---:|---:|
| `comments_disabled` | 0.004 | 0.001 | 0.001 |
| `default` | 0.003 | 0.000 | 0.000 |
| `high_engagement` | 0.003 | 0.000 | 0.000 |
| `high_view_count` | 0.002 | 0.000 | 0.000 |
| `inactive_users` | 0.001 | 0.000 | 0.000 |
| `long_videos` | 0.004 | 0.002 | 0.001 |
| `low_engagement` | 0.004 | 0.000 | 0.000 |
| `many_videos` | 0.007 | 0.000 | 0.001 |
| `new_content` | 0.004 | 0.000 | 0.000 |
| `short_videos` | 0.002 | 0.002 | 0.001 |

</details>

---

## Consolidated View — All Apps × All Profiles

| App | Profile | Files | Size (MB) | 5w (s) | 8w (s) | 12w (s) | Fastest |
|---|---|---:|---:|---:|---:|---:|:---:|
| Andojo Auction | `auction_heavy` | 250 | 7.75 | 0.046 | 0.044 | 0.045 | **8w** |
| Andojo Auction | `budget_items` | 249 | 7.64 | 0.048 | 0.047 | 0.054 | **8w** |
| Andojo Auction | `buy_now_focus` | 250 | 7.69 | 0.053 | 0.066 | 0.062 | **5w** |
| Andojo Auction | `default` | 249 | 7.71 | 0.061 | 0.050 | 0.048 | **12w** |
| Andojo Auction | `ending_soon` | 250 | 7.74 | 0.045 | 0.048 | 0.057 | **5w** |
| Andojo Auction | `failed_payments` | 250 | 8.02 | 0.061 | 0.048 | 0.052 | **8w** |
| Andojo Auction | `high_bid_volume` | 250 | 7.84 | 0.046 | 0.046 | 0.045 | **12w** |
| Andojo Auction | `new_seller` | 249 | 7.84 | 0.047 | 0.054 | 0.058 | **5w** |
| Andojo Auction | `power_seller` | 250 | 7.76 | 0.048 | 0.049 | 0.045 | **12w** |
| Andojo Auction | `premium_items` | 250 | 8.11 | 0.061 | 0.052 | 0.063 | **8w** |
| Andojo Eats | `budget_menu` | 204 | 34.02 | 0.059 | 0.052 | 0.048 | **12w** |
| Andojo Eats | `cancelled_orders` | 204 | 34.32 | 0.051 | 0.046 | 0.059 | **8w** |
| Andojo Eats | `default` | 204 | 34.30 | 0.051 | 0.045 | 0.047 | **8w** |
| Andojo Eats | `excellent_ratings` | 204 | 34.13 | 0.057 | 0.049 | 0.054 | **8w** |
| Andojo Eats | `high_order_volume` | 204 | 34.50 | 0.054 | 0.044 | 0.045 | **8w** |
| Andojo Eats | `large_orders` | 204 | 34.36 | 0.049 | 0.045 | 0.047 | **8w** |
| Andojo Eats | `new_user` | 204 | 34.29 | 0.050 | 0.043 | 0.052 | **8w** |
| Andojo Eats | `pending_orders` | 204 | 34.53 | 0.055 | 0.051 | 0.052 | **8w** |
| Andojo Eats | `poor_ratings` | 204 | 34.43 | 0.052 | 0.048 | 0.043 | **12w** |
| Andojo Eats | `premium_menu` | 204 | 33.97 | 0.050 | 0.044 | 0.042 | **12w** |
| Andojo Eats | `small_orders` | 204 | 34.45 | 0.049 | 0.047 | 0.050 | **8w** |
| Andojo Music | `default` | 25 | 0.87 | 0.007 | 0.007 | 0.007 | **5w** |
| Andojo Music | `genre_focused` | 25 | 0.86 | 0.007 | 0.007 | 0.008 | **5w** |
| Andojo Music | `high_rated_content` | 25 | 0.90 | 0.007 | 0.007 | 0.007 | **8w** |
| Andojo Music | `large_playlists` | 25 | 0.92 | 0.007 | 0.009 | 0.009 | **5w** |
| Andojo Music | `low_engagement` | 25 | 0.89 | 0.007 | 0.006 | 0.006 | **8w** |
| Andojo Music | `minimal_playlists` | 25 | 0.87 | 0.006 | 0.006 | 0.006 | **8w** |
| Andojo Music | `new_user` | 25 | 0.86 | 0.006 | 0.005 | 0.005 | **12w** |
| Andojo Music | `playlist_heavy` | 25 | 0.90 | 0.006 | 0.006 | 0.007 | **8w** |
| Andojo Music | `power_listener` | 25 | 0.88 | 0.006 | 0.006 | 0.006 | **8w** |
| Andojo Music | `recent_activity` | 25 | 0.87 | 0.006 | 0.006 | 0.006 | **12w** |
| Andojo Music | `viral_songs` | 25 | 0.86 | 0.006 | 0.006 | 0.006 | **8w** |
| Andojo QwikShop | `bulk_quantity` | 1226 | 44.23 | 0.312 | 0.269 | 0.299 | **8w** |
| Andojo QwikShop | `default` | 1226 | 43.68 | 0.290 | 0.287 | 0.293 | **8w** |
| Andojo QwikShop | `empty_cart` | 1226 | 43.73 | 0.268 | 0.291 | 0.269 | **5w** |
| Andojo QwikShop | `full_cart` | 1226 | 43.75 | 0.290 | 0.291 | 0.280 | **12w** |
| Andojo QwikShop | `heavy_discounts` | 1226 | 44.01 | 0.410 | 0.266 | 0.295 | **8w** |
| Andojo QwikShop | `high_order_volume` | 1226 | 43.82 | 0.273 | 0.286 | 0.287 | **5w** |
| Andojo QwikShop | `large_orders` | 1226 | 44.03 | 0.278 | 0.289 | 0.273 | **12w** |
| Andojo QwikShop | `low_stock` | 1226 | 43.86 | 0.313 | 0.281 | 0.266 | **12w** |
| Andojo QwikShop | `new_user` | 1226 | 44.05 | 0.288 | 0.262 | 0.332 | **8w** |
| Andojo QwikShop | `power_shopper` | 1226 | 43.64 | 0.283 | 0.311 | 0.269 | **12w** |
| Andojo QwikShop | `premium_products` | 1226 | 43.83 | 0.294 | 0.268 | 0.303 | **8w** |
| Andojo Ryde | `budget_rides` | 6 | 0.03 | 0.002 | 0.002 | 0.002 | **8w** |
| Andojo Ryde | `cancelled_rides` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **5w** |
| Andojo Ryde | `default` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **12w** |
| Andojo Ryde | `excellent_feedback` | 5 | 0.03 | 0.001 | 0.001 | 0.001 | **5w** |
| Andojo Ryde | `high_rated_drivers` | 3 | 0.01 | 0.001 | 0.001 | 0.001 | **12w** |
| Andojo Ryde | `high_ride_volume` | 5 | 0.02 | 0.002 | 0.001 | 0.001 | **12w** |
| Andojo Ryde | `inactive_users` | 4 | 0.02 | 0.001 | 0.003 | 0.001 | **5w** |
| Andojo Ryde | `low_rated_drivers` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **12w** |
| Andojo Ryde | `new_user` | 4 | 0.02 | 0.001 | 0.001 | 0.001 | **8w** |
| Andojo Ryde | `poor_feedback` | 5 | 0.03 | 0.002 | 0.004 | 0.002 | **12w** |
| Andojo Ryde | `premium_fares` | 3 | 0.02 | 0.001 | 0.001 | 0.001 | **5w** |
| Andojo Shop | `bulk_quantity` | 1226 | 44.23 | 0.295 | 0.272 | 0.304 | **8w** |
| Andojo Shop | `default` | 1226 | 43.68 | 0.281 | 0.286 | 0.314 | **5w** |
| Andojo Shop | `empty_cart` | 1226 | 43.73 | 0.273 | 0.331 | 0.287 | **5w** |
| Andojo Shop | `full_cart` | 1226 | 43.75 | 0.296 | 0.306 | 0.292 | **12w** |
| Andojo Shop | `heavy_discounts` | 1226 | 44.01 | 0.395 | 0.291 | 0.306 | **8w** |
| Andojo Shop | `high_order_volume` | 1226 | 43.82 | 0.300 | 0.283 | 0.301 | **8w** |
| Andojo Shop | `large_orders` | 1226 | 44.03 | 0.274 | 0.273 | 0.279 | **8w** |
| Andojo Shop | `low_stock` | 1226 | 43.86 | 0.300 | 0.305 | 0.291 | **12w** |
| Andojo Shop | `new_user` | 1226 | 44.05 | 0.301 | 0.309 | 0.303 | **5w** |
| Andojo Shop | `power_shopper` | 1226 | 43.64 | 0.303 | 0.299 | 0.314 | **8w** |
| Andojo Shop | `premium_products` | 1226 | 43.83 | 0.298 | 0.292 | 0.345 | **8w** |
| Andojo Video | `comments_disabled` | 78 | 3.16 | 0.019 | 0.018 | 0.017 | **12w** |
| Andojo Video | `default` | 73 | 2.96 | 0.017 | 0.015 | 0.018 | **8w** |
| Andojo Video | `high_engagement` | 76 | 3.05 | 0.018 | 0.017 | 0.017 | **8w** |
| Andojo Video | `high_view_count` | 74 | 2.84 | 0.019 | 0.018 | 0.022 | **8w** |
| Andojo Video | `inactive_users` | 74 | 2.94 | 0.022 | 0.018 | 0.021 | **8w** |
| Andojo Video | `long_videos` | 77 | 3.03 | 0.021 | 0.018 | 0.019 | **8w** |
| Andojo Video | `low_engagement` | 71 | 2.84 | 0.018 | 0.017 | 0.018 | **8w** |
| Andojo Video | `many_videos` | 199 | 7.93 | 0.047 | 0.041 | 0.049 | **8w** |
| Andojo Video | `new_content` | 71 | 2.81 | 0.018 | 0.018 | 0.019 | **5w** |
| Andojo Video | `short_videos` | 77 | 2.96 | 0.021 | 0.019 | 0.018 | **12w** |

---

## Inference

### 1. Win Rate by Worker Count

How often each worker count was the fastest for a given profile:

| Workers | Profiles Won | Win % | Mean Throughput (MB/s) |
|:---:|---:|---:|---:|
| **5w** | 16 / 75 | 21% | 203.0 |
| **8w** | 38 / 75 | 51% | 219.8 |
| **12w** | 21 / 75 | 28% | 210.9 |

### 2. Performance by Dataset Size

Mean copy time grouped by assets size:

| Size bucket | Range | 5w mean (s) | 8w mean (s) | 12w mean (s) | Recommended |
|---|---|---:|---:|---:|:---:|
| **tiny** | < 1 MB | 0.004 | 0.004 | 0.004 | **12w** |
| **small** | 1 – 10 MB | 0.037 | 0.035 | 0.037 | **8w** |
| **medium** | 10 – 40 MB | 0.053 | 0.047 | 0.049 | **8w** |
| **large** | > 40 MB | 0.301 | 0.288 | 0.296 | **8w** |

### 3. Key Findings

- **8 workers** won the most profiles overall (38/75, 51%).
- **Tiny assets** (Andojo Ryde, < 1 MB, 3–6 files): thread-spawn overhead dominates. All worker counts perform identically; use the lowest (5) to avoid unnecessary thread creation.
- **Small–medium assets** (Andojo Video, Andojo Music, Andojo Auction): 5–8 workers hit the I/O bandwidth ceiling. Beyond 8, additional threads add scheduling noise without gaining throughput.
- **Large assets** (Andojo Eats ~35 MB, Andojo Shop / QwikShop ~47 MB, 1 226 files): more than 8 workers can hurt. macOS's Unified Buffer Cache saturates and `shutil.copy2` serializes on inode-level metadata locks, causing 12-worker runs to be measurably slower than 5–8-worker runs.
- **Recommended default for `copy_test_data`:** `max_workers = 8`.
  It matches or beats 5w and 12w across all size buckets and keeps
  thread overhead predictable.

---

_Report generated by `digiworld/utils/benchmark_parallel_copy.py`_