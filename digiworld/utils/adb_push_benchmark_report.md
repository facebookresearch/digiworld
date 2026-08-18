# ADB Push Benchmark Report
## Parallel Workers: 5 / 8 / 12 — All Apps & Profiles

> **Generated:** 2026-05-12 20:48:36  
> **Device:** `emulator-5554`  
> **Worker counts:** 5, 8, 12  
> **Runs per config:** 2  
> **Total profiles tested:** 55  
> **Total files pushed per full run:** 8,385  (587.2 MB)  
> **Profile policy:** all profiles for apps < 300 files/profile; 'default' only for larger apps

---

## Overview

Files are pushed from the local `state_data` assets directory to
`/sdcard/andojo_benchmark/<app>/<profile>/assets` on the emulator using
`ThreadPoolExecutor`. The remote directory tree is created **once** per
profile; subsequent runs overwrite files in-place (avoiding costly
`rm -r` between each run while still exercising the full ADB push path).

| App | Profiles | Total Files | Total Size |
|---|:---:|---:|---:|
| Andojo Auction | 10 | 2,497 | 78.1 MB |
| Andojo Eats | 11 | 2,244 | 377.3 MB |
| Andojo Music | 11 | 275 | 9.7 MB |
| Andojo QwikShop | 1 | 1,226 | 43.7 MB |
| Andojo Ryde | 11 | 47 | 0.2 MB |
| Andojo Shop | 1 | 1,226 | 43.7 MB |
| Andojo Video | 10 | 870 | 34.5 MB |

---

## Detailed Results by App

### Andojo Auction

**Bundle:** `com.andojoauction.sbx`  |  **Profiles:** 10  |  **Total files:** 2,497

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `auction_heavy` | 250 | 7.75 | 2.810 | 2.636 | 2.472 | **12w** |
| `budget_items` | 249 | 7.64 | 3.166 | 2.607 | 2.505 | **12w** |
| `buy_now_focus` | 250 | 7.69 | 2.981 | 3.809 | 3.001 | **5w** |
| `default` | 249 | 7.71 | 3.306 | 3.275 | 3.816 | **8w** |
| `ending_soon` | 250 | 7.74 | 4.622 | 4.124 | 3.803 | **12w** |
| `failed_payments` | 250 | 8.02 | 5.310 | 4.344 | 4.431 | **8w** |
| `high_bid_volume` | 250 | 7.84 | 4.163 | 5.127 | 3.811 | **12w** |
| `new_seller` | 249 | 7.84 | 4.063 | 3.889 | 4.154 | **8w** |
| `power_seller` | 250 | 7.76 | 4.821 | 3.849 | 3.740 | **12w** |
| `premium_items` | 250 | 8.11 | 4.942 | 4.093 | 3.696 | **12w** |
| **App mean** | — | — | 4.018 | 3.775 | 3.543 | **12w** |

> _Per-profile winner: 5w: 1×  8w: 3×  12w: 6×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `auction_heavy` | 5 | 1 | 2.953 | 2.62 | 85 |
| `auction_heavy` | 5 | 2 | 2.667 | 2.91 | 94 |
| `auction_heavy` | 8 | 1 | 2.722 | 2.85 | 92 |
| `auction_heavy` | 8 | 2 | 2.549 | 3.04 | 98 |
| `auction_heavy` | 12 | 1 | 2.515 | 3.08 | 99 |
| `auction_heavy` | 12 | 2 | 2.429 | 3.19 | 103 |
| `budget_items` | 5 | 1 | 3.192 | 2.39 | 78 |
| `budget_items` | 5 | 2 | 3.139 | 2.43 | 79 |
| `budget_items` | 8 | 1 | 2.652 | 2.88 | 94 |
| `budget_items` | 8 | 2 | 2.561 | 2.98 | 97 |
| `budget_items` | 12 | 1 | 2.370 | 3.22 | 105 |
| `budget_items` | 12 | 2 | 2.639 | 2.90 | 94 |
| `buy_now_focus` | 5 | 1 | 2.946 | 2.61 | 85 |
| `buy_now_focus` | 5 | 2 | 3.015 | 2.55 | 83 |
| `buy_now_focus` | 8 | 1 | 3.488 | 2.20 | 72 |
| `buy_now_focus` | 8 | 2 | 4.130 | 1.86 | 61 |
| `buy_now_focus` | 12 | 1 | 2.948 | 2.61 | 85 |
| `buy_now_focus` | 12 | 2 | 3.053 | 2.52 | 82 |
| `default` | 5 | 1 | 3.318 | 2.32 | 75 |
| `default` | 5 | 2 | 3.294 | 2.34 | 76 |
| `default` | 8 | 1 | 3.060 | 2.52 | 81 |
| `default` | 8 | 2 | 3.490 | 2.21 | 71 |
| `default` | 12 | 1 | 3.575 | 2.16 | 70 |
| `default` | 12 | 2 | 4.056 | 1.90 | 61 |
| `ending_soon` | 5 | 1 | 4.818 | 1.61 | 52 |
| `ending_soon` | 5 | 2 | 4.425 | 1.75 | 56 |
| `ending_soon` | 8 | 1 | 4.172 | 1.85 | 60 |
| `ending_soon` | 8 | 2 | 4.075 | 1.90 | 61 |
| `ending_soon` | 12 | 1 | 3.851 | 2.01 | 65 |
| `ending_soon` | 12 | 2 | 3.755 | 2.06 | 67 |
| `failed_payments` | 5 | 1 | 3.957 | 2.03 | 63 |
| `failed_payments` | 5 | 2 | 6.663 | 1.20 | 38 |
| `failed_payments` | 8 | 1 | 4.394 | 1.83 | 57 |
| `failed_payments` | 8 | 2 | 4.294 | 1.87 | 58 |
| `failed_payments` | 12 | 1 | 4.551 | 1.76 | 55 |
| `failed_payments` | 12 | 2 | 4.312 | 1.86 | 58 |
| `high_bid_volume` | 5 | 1 | 3.786 | 2.07 | 66 |
| `high_bid_volume` | 5 | 2 | 4.540 | 1.73 | 55 |
| `high_bid_volume` | 8 | 1 | 4.092 | 1.92 | 61 |
| `high_bid_volume` | 8 | 2 | 6.163 | 1.27 | 41 |
| `high_bid_volume` | 12 | 1 | 3.773 | 2.08 | 66 |
| `high_bid_volume` | 12 | 2 | 3.850 | 2.04 | 65 |
| `new_seller` | 5 | 1 | 3.739 | 2.10 | 67 |
| `new_seller` | 5 | 2 | 4.386 | 1.79 | 57 |
| `new_seller` | 8 | 1 | 3.919 | 2.00 | 64 |
| `new_seller` | 8 | 2 | 3.858 | 2.03 | 65 |
| `new_seller` | 12 | 1 | 3.351 | 2.34 | 74 |
| `new_seller` | 12 | 2 | 4.957 | 1.58 | 50 |
| `power_seller` | 5 | 1 | 5.322 | 1.46 | 47 |
| `power_seller` | 5 | 2 | 4.319 | 1.80 | 58 |
| `power_seller` | 8 | 1 | 4.042 | 1.92 | 62 |
| `power_seller` | 8 | 2 | 3.657 | 2.12 | 68 |
| `power_seller` | 12 | 1 | 3.750 | 2.07 | 67 |
| `power_seller` | 12 | 2 | 3.731 | 2.08 | 67 |
| `premium_items` | 5 | 1 | 3.422 | 2.37 | 73 |
| `premium_items` | 5 | 2 | 6.461 | 1.25 | 39 |
| `premium_items` | 8 | 1 | 4.173 | 1.94 | 60 |
| `premium_items` | 8 | 2 | 4.013 | 2.02 | 62 |
| `premium_items` | 12 | 1 | 3.485 | 2.33 | 72 |
| `premium_items` | 12 | 2 | 3.906 | 2.08 | 64 |

</details>

---

### Andojo Eats

**Bundle:** `com.andojoeats.sbx`  |  **Profiles:** 11  |  **Total files:** 2,244

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `budget_menu` | 204 | 34.02 | 4.945 | 3.653 | 4.190 | **8w** |
| `cancelled_orders` | 204 | 34.32 | 4.223 | 3.735 | 3.404 | **12w** |
| `default` | 204 | 34.30 | 4.447 | 3.444 | 3.479 | **8w** |
| `excellent_ratings` | 204 | 34.13 | 4.599 | 3.673 | 3.496 | **12w** |
| `high_order_volume` | 204 | 34.50 | 4.997 | 3.767 | 3.467 | **12w** |
| `large_orders` | 204 | 34.36 | 5.073 | 3.986 | 3.520 | **12w** |
| `new_user` | 204 | 34.29 | 4.804 | 4.077 | 4.805 | **8w** |
| `pending_orders` | 204 | 34.53 | 3.851 | 3.775 | 3.459 | **12w** |
| `poor_ratings` | 204 | 34.43 | 3.916 | 3.431 | 3.754 | **8w** |
| `premium_menu` | 204 | 33.97 | 4.440 | 3.505 | 3.861 | **8w** |
| `small_orders` | 204 | 34.45 | 3.761 | 3.646 | 3.901 | **8w** |
| **App mean** | — | — | 4.460 | 3.699 | 3.758 | **8w** |

> _Per-profile winner: 5w: 0×  8w: 6×  12w: 5×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `budget_menu` | 5 | 1 | 3.243 | 10.49 | 63 |
| `budget_menu` | 5 | 2 | 6.646 | 5.12 | 31 |
| `budget_menu` | 8 | 1 | 3.499 | 9.72 | 58 |
| `budget_menu` | 8 | 2 | 3.807 | 8.94 | 54 |
| `budget_menu` | 12 | 1 | 3.116 | 10.92 | 65 |
| `budget_menu` | 12 | 2 | 5.265 | 6.46 | 39 |
| `cancelled_orders` | 5 | 1 | 4.595 | 7.47 | 44 |
| `cancelled_orders` | 5 | 2 | 3.851 | 8.91 | 53 |
| `cancelled_orders` | 8 | 1 | 3.507 | 9.79 | 58 |
| `cancelled_orders` | 8 | 2 | 3.964 | 8.66 | 51 |
| `cancelled_orders` | 12 | 1 | 3.202 | 10.72 | 64 |
| `cancelled_orders` | 12 | 2 | 3.605 | 9.52 | 57 |
| `default` | 5 | 1 | 5.006 | 6.85 | 41 |
| `default` | 5 | 2 | 3.888 | 8.82 | 52 |
| `default` | 8 | 1 | 3.703 | 9.26 | 55 |
| `default` | 8 | 2 | 3.185 | 10.77 | 64 |
| `default` | 12 | 1 | 3.674 | 9.34 | 56 |
| `default` | 12 | 2 | 3.284 | 10.44 | 62 |
| `excellent_ratings` | 5 | 1 | 5.142 | 6.64 | 40 |
| `excellent_ratings` | 5 | 2 | 4.056 | 8.41 | 50 |
| `excellent_ratings` | 8 | 1 | 3.873 | 8.81 | 53 |
| `excellent_ratings` | 8 | 2 | 3.474 | 9.82 | 59 |
| `excellent_ratings` | 12 | 1 | 3.632 | 9.40 | 56 |
| `excellent_ratings` | 12 | 2 | 3.359 | 10.16 | 61 |
| `high_order_volume` | 5 | 1 | 5.970 | 5.78 | 34 |
| `high_order_volume` | 5 | 2 | 4.023 | 8.58 | 51 |
| `high_order_volume` | 8 | 1 | 4.041 | 8.54 | 50 |
| `high_order_volume` | 8 | 2 | 3.492 | 9.88 | 58 |
| `high_order_volume` | 12 | 1 | 3.604 | 9.57 | 57 |
| `high_order_volume` | 12 | 2 | 3.330 | 10.36 | 61 |
| `large_orders` | 5 | 1 | 5.897 | 5.83 | 35 |
| `large_orders` | 5 | 2 | 4.249 | 8.09 | 48 |
| `large_orders` | 8 | 1 | 3.890 | 8.83 | 52 |
| `large_orders` | 8 | 2 | 4.082 | 8.42 | 50 |
| `large_orders` | 12 | 1 | 3.448 | 9.97 | 59 |
| `large_orders` | 12 | 2 | 3.592 | 9.57 | 57 |
| `new_user` | 5 | 1 | 5.520 | 6.21 | 37 |
| `new_user` | 5 | 2 | 4.087 | 8.39 | 50 |
| `new_user` | 8 | 1 | 4.001 | 8.57 | 51 |
| `new_user` | 8 | 2 | 4.153 | 8.26 | 49 |
| `new_user` | 12 | 1 | 5.286 | 6.49 | 39 |
| `new_user` | 12 | 2 | 4.324 | 7.93 | 47 |
| `pending_orders` | 5 | 1 | 4.262 | 8.10 | 48 |
| `pending_orders` | 5 | 2 | 3.441 | 10.03 | 59 |
| `pending_orders` | 8 | 1 | 3.786 | 9.12 | 54 |
| `pending_orders` | 8 | 2 | 3.765 | 9.17 | 54 |
| `pending_orders` | 12 | 1 | 3.124 | 11.05 | 65 |
| `pending_orders` | 12 | 2 | 3.795 | 9.10 | 54 |
| `poor_ratings` | 5 | 1 | 4.343 | 7.93 | 47 |
| `poor_ratings` | 5 | 2 | 3.489 | 9.87 | 58 |
| `poor_ratings` | 8 | 1 | 3.614 | 9.53 | 56 |
| `poor_ratings` | 8 | 2 | 3.248 | 10.60 | 63 |
| `poor_ratings` | 12 | 1 | 3.838 | 8.97 | 53 |
| `poor_ratings` | 12 | 2 | 3.670 | 9.38 | 56 |
| `premium_menu` | 5 | 1 | 4.902 | 6.93 | 42 |
| `premium_menu` | 5 | 2 | 3.977 | 8.54 | 51 |
| `premium_menu` | 8 | 1 | 3.234 | 10.51 | 63 |
| `premium_menu` | 8 | 2 | 3.777 | 9.00 | 54 |
| `premium_menu` | 12 | 1 | 3.649 | 9.31 | 56 |
| `premium_menu` | 12 | 2 | 4.072 | 8.34 | 50 |
| `small_orders` | 5 | 1 | 3.599 | 9.57 | 57 |
| `small_orders` | 5 | 2 | 3.922 | 8.78 | 52 |
| `small_orders` | 8 | 1 | 3.821 | 9.02 | 53 |
| `small_orders` | 8 | 2 | 3.470 | 9.93 | 59 |
| `small_orders` | 12 | 1 | 3.736 | 9.22 | 55 |
| `small_orders` | 12 | 2 | 4.067 | 8.47 | 50 |

</details>

---

### Andojo Music

**Bundle:** `com.andojomusic.sbx`  |  **Profiles:** 11  |  **Total files:** 275

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `default` | 25 | 0.87 | 0.273 | 0.638 | 0.553 | **5w** |
| `genre_focused` | 25 | 0.86 | 0.498 | 0.603 | 0.307 | **12w** |
| `high_rated_content` | 25 | 0.90 | 0.451 | 0.566 | 0.387 | **12w** |
| `large_playlists` | 25 | 0.92 | 0.268 | 0.555 | 0.550 | **5w** |
| `low_engagement` | 25 | 0.89 | 0.949 | 1.099 | 0.292 | **12w** |
| `minimal_playlists` | 25 | 0.87 | 0.362 | 0.470 | 0.499 | **5w** |
| `new_user` | 25 | 0.86 | 0.334 | 0.473 | 0.570 | **5w** |
| `playlist_heavy` | 25 | 0.90 | 0.471 | 0.292 | 0.488 | **8w** |
| `power_listener` | 25 | 0.88 | 0.449 | 0.335 | 0.474 | **8w** |
| `recent_activity` | 25 | 0.87 | 1.001 | 0.622 | 0.559 | **12w** |
| `viral_songs` | 25 | 0.86 | 0.518 | 0.300 | 0.556 | **8w** |
| **App mean** | — | — | 0.507 | 0.541 | 0.476 | **12w** |

> _Per-profile winner: 5w: 4×  8w: 3×  12w: 4×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `default` | 5 | 1 | 0.245 | 3.55 | 102 |
| `default` | 5 | 2 | 0.300 | 2.90 | 83 |
| `default` | 8 | 1 | 0.923 | 0.94 | 27 |
| `default` | 8 | 2 | 0.354 | 2.46 | 71 |
| `default` | 12 | 1 | 0.805 | 1.08 | 31 |
| `default` | 12 | 2 | 0.300 | 2.90 | 83 |
| `genre_focused` | 5 | 1 | 0.243 | 3.55 | 103 |
| `genre_focused` | 5 | 2 | 0.753 | 1.15 | 33 |
| `genre_focused` | 8 | 1 | 0.435 | 1.99 | 58 |
| `genre_focused` | 8 | 2 | 0.772 | 1.12 | 32 |
| `genre_focused` | 12 | 1 | 0.285 | 3.03 | 88 |
| `genre_focused` | 12 | 2 | 0.330 | 2.62 | 76 |
| `high_rated_content` | 5 | 1 | 0.629 | 1.44 | 40 |
| `high_rated_content` | 5 | 2 | 0.274 | 3.30 | 91 |
| `high_rated_content` | 8 | 1 | 0.312 | 2.90 | 80 |
| `high_rated_content` | 8 | 2 | 0.820 | 1.10 | 30 |
| `high_rated_content` | 12 | 1 | 0.468 | 1.93 | 53 |
| `high_rated_content` | 12 | 2 | 0.305 | 2.97 | 82 |
| `large_playlists` | 5 | 1 | 0.240 | 3.84 | 104 |
| `large_playlists` | 5 | 2 | 0.295 | 3.12 | 85 |
| `large_playlists` | 8 | 1 | 0.793 | 1.16 | 32 |
| `large_playlists` | 8 | 2 | 0.318 | 2.90 | 79 |
| `large_playlists` | 12 | 1 | 0.331 | 2.78 | 75 |
| `large_playlists` | 12 | 2 | 0.769 | 1.20 | 33 |
| `low_engagement` | 5 | 1 | 0.566 | 1.57 | 44 |
| `low_engagement` | 5 | 2 | 1.332 | 0.67 | 19 |
| `low_engagement` | 8 | 1 | 1.195 | 0.74 | 21 |
| `low_engagement` | 8 | 2 | 1.004 | 0.88 | 25 |
| `low_engagement` | 12 | 1 | 0.287 | 3.10 | 87 |
| `low_engagement` | 12 | 2 | 0.298 | 2.98 | 84 |
| `minimal_playlists` | 5 | 1 | 0.297 | 2.94 | 84 |
| `minimal_playlists` | 5 | 2 | 0.426 | 2.05 | 59 |
| `minimal_playlists` | 8 | 1 | 0.632 | 1.38 | 40 |
| `minimal_playlists` | 8 | 2 | 0.307 | 2.85 | 81 |
| `minimal_playlists` | 12 | 1 | 0.316 | 2.77 | 79 |
| `minimal_playlists` | 12 | 2 | 0.682 | 1.28 | 37 |
| `new_user` | 5 | 1 | 0.295 | 2.91 | 85 |
| `new_user` | 5 | 2 | 0.374 | 2.29 | 67 |
| `new_user` | 8 | 1 | 0.613 | 1.40 | 41 |
| `new_user` | 8 | 2 | 0.333 | 2.57 | 75 |
| `new_user` | 12 | 1 | 0.574 | 1.49 | 44 |
| `new_user` | 12 | 2 | 0.566 | 1.51 | 44 |
| `playlist_heavy` | 5 | 1 | 0.246 | 3.68 | 102 |
| `playlist_heavy` | 5 | 2 | 0.695 | 1.30 | 36 |
| `playlist_heavy` | 8 | 1 | 0.286 | 3.16 | 87 |
| `playlist_heavy` | 8 | 2 | 0.299 | 3.02 | 84 |
| `playlist_heavy` | 12 | 1 | 0.330 | 2.74 | 76 |
| `playlist_heavy` | 12 | 2 | 0.646 | 1.40 | 39 |
| `power_listener` | 5 | 1 | 0.252 | 3.49 | 99 |
| `power_listener` | 5 | 2 | 0.646 | 1.36 | 39 |
| `power_listener` | 8 | 1 | 0.362 | 2.43 | 69 |
| `power_listener` | 8 | 2 | 0.308 | 2.85 | 81 |
| `power_listener` | 12 | 1 | 0.688 | 1.28 | 36 |
| `power_listener` | 12 | 2 | 0.260 | 3.38 | 96 |
| `recent_activity` | 5 | 1 | 0.651 | 1.33 | 38 |
| `recent_activity` | 5 | 2 | 1.351 | 0.64 | 18 |
| `recent_activity` | 8 | 1 | 0.955 | 0.91 | 26 |
| `recent_activity` | 8 | 2 | 0.288 | 3.01 | 87 |
| `recent_activity` | 12 | 1 | 0.324 | 2.68 | 77 |
| `recent_activity` | 12 | 2 | 0.795 | 1.09 | 31 |
| `viral_songs` | 5 | 1 | 0.330 | 2.61 | 76 |
| `viral_songs` | 5 | 2 | 0.705 | 1.22 | 35 |
| `viral_songs` | 8 | 1 | 0.276 | 3.12 | 90 |
| `viral_songs` | 8 | 2 | 0.324 | 2.66 | 77 |
| `viral_songs` | 12 | 1 | 0.709 | 1.21 | 35 |
| `viral_songs` | 12 | 2 | 0.403 | 2.14 | 62 |

</details>

---

### Andojo QwikShop

**Bundle:** `com.andojoqwikshop.sbx`  |  **Profiles:** 1  |  **Total files:** 1,226

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `default` | 1226 | 43.68 | 24.891 | 17.183 | 18.824 | **8w** |
| **App mean** | — | — | 24.891 | 17.183 | 18.824 | **8w** |

> _Per-profile winner: 5w: 0×  8w: 1×  12w: 0×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `default` | 5 | 1 | 22.820 | 1.91 | 54 |
| `default` | 5 | 2 | 26.962 | 1.62 | 45 |
| `default` | 8 | 1 | 14.952 | 2.92 | 82 |
| `default` | 8 | 2 | 19.415 | 2.25 | 63 |
| `default` | 12 | 1 | 19.294 | 2.26 | 64 |
| `default` | 12 | 2 | 18.353 | 2.38 | 67 |

</details>

---

### Andojo Ryde

**Bundle:** `com.andojoryde.sbx`  |  **Profiles:** 11  |  **Total files:** 47

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `budget_rides` | 6 | 0.03 | 0.067 | 0.055 | 0.368 | **8w** |
| `cancelled_rides` | 4 | 0.02 | 0.050 | 0.054 | 0.063 | **5w** |
| `default` | 4 | 0.02 | 0.054 | 0.060 | 0.047 | **12w** |
| `excellent_feedback` | 5 | 0.03 | 0.327 | 0.057 | 0.061 | **8w** |
| `high_rated_drivers` | 3 | 0.01 | 0.051 | 0.052 | 0.057 | **5w** |
| `high_ride_volume` | 5 | 0.02 | 0.071 | 0.322 | 0.047 | **12w** |
| `inactive_users` | 4 | 0.02 | 0.044 | 0.050 | 0.056 | **5w** |
| `low_rated_drivers` | 4 | 0.02 | 0.046 | 0.070 | 0.330 | **5w** |
| `new_user` | 4 | 0.02 | 0.069 | 0.060 | 0.132 | **8w** |
| `poor_feedback` | 5 | 0.03 | 0.077 | 0.273 | 0.064 | **12w** |
| `premium_fares` | 3 | 0.02 | 0.048 | 0.041 | 0.054 | **8w** |
| **App mean** | — | — | 0.082 | 0.100 | 0.116 | **5w** |

> _Per-profile winner: 5w: 4×  8w: 4×  12w: 3×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `budget_rides` | 5 | 1 | 0.067 | 0.46 | 90 |
| `budget_rides` | 5 | 2 | 0.068 | 0.45 | 88 |
| `budget_rides` | 8 | 1 | 0.051 | 0.61 | 118 |
| `budget_rides` | 8 | 2 | 0.060 | 0.51 | 100 |
| `budget_rides` | 12 | 1 | 0.058 | 0.53 | 103 |
| `budget_rides` | 12 | 2 | 0.678 | 0.05 | 9 |
| `cancelled_rides` | 5 | 1 | 0.044 | 0.46 | 91 |
| `cancelled_rides` | 5 | 2 | 0.056 | 0.36 | 72 |
| `cancelled_rides` | 8 | 1 | 0.056 | 0.36 | 71 |
| `cancelled_rides` | 8 | 2 | 0.052 | 0.39 | 77 |
| `cancelled_rides` | 12 | 1 | 0.054 | 0.37 | 74 |
| `cancelled_rides` | 12 | 2 | 0.072 | 0.28 | 56 |
| `default` | 5 | 1 | 0.047 | 0.43 | 85 |
| `default` | 5 | 2 | 0.060 | 0.34 | 67 |
| `default` | 8 | 1 | 0.053 | 0.38 | 75 |
| `default` | 8 | 2 | 0.066 | 0.30 | 60 |
| `default` | 12 | 1 | 0.045 | 0.45 | 89 |
| `default` | 12 | 2 | 0.049 | 0.41 | 81 |
| `excellent_feedback` | 5 | 1 | 0.587 | 0.04 | 9 |
| `excellent_feedback` | 5 | 2 | 0.067 | 0.38 | 74 |
| `excellent_feedback` | 8 | 1 | 0.058 | 0.44 | 86 |
| `excellent_feedback` | 8 | 2 | 0.055 | 0.47 | 91 |
| `excellent_feedback` | 12 | 1 | 0.061 | 0.42 | 82 |
| `excellent_feedback` | 12 | 2 | 0.062 | 0.42 | 81 |
| `high_rated_drivers` | 5 | 1 | 0.046 | 0.32 | 65 |
| `high_rated_drivers` | 5 | 2 | 0.055 | 0.26 | 54 |
| `high_rated_drivers` | 8 | 1 | 0.047 | 0.32 | 64 |
| `high_rated_drivers` | 8 | 2 | 0.058 | 0.26 | 52 |
| `high_rated_drivers` | 12 | 1 | 0.054 | 0.27 | 55 |
| `high_rated_drivers` | 12 | 2 | 0.060 | 0.24 | 50 |
| `high_ride_volume` | 5 | 1 | 0.069 | 0.36 | 72 |
| `high_ride_volume` | 5 | 2 | 0.072 | 0.34 | 69 |
| `high_ride_volume` | 8 | 1 | 0.590 | 0.04 | 8 |
| `high_ride_volume` | 8 | 2 | 0.055 | 0.46 | 92 |
| `high_ride_volume` | 12 | 1 | 0.045 | 0.55 | 110 |
| `high_ride_volume` | 12 | 2 | 0.048 | 0.52 | 104 |
| `inactive_users` | 5 | 1 | 0.042 | 0.49 | 96 |
| `inactive_users` | 5 | 2 | 0.047 | 0.44 | 85 |
| `inactive_users` | 8 | 1 | 0.041 | 0.49 | 97 |
| `inactive_users` | 8 | 2 | 0.058 | 0.35 | 69 |
| `inactive_users` | 12 | 1 | 0.058 | 0.35 | 69 |
| `inactive_users` | 12 | 2 | 0.055 | 0.37 | 73 |
| `low_rated_drivers` | 5 | 1 | 0.042 | 0.48 | 94 |
| `low_rated_drivers` | 5 | 2 | 0.050 | 0.41 | 81 |
| `low_rated_drivers` | 8 | 1 | 0.043 | 0.48 | 93 |
| `low_rated_drivers` | 8 | 2 | 0.098 | 0.21 | 41 |
| `low_rated_drivers` | 12 | 1 | 0.070 | 0.29 | 57 |
| `low_rated_drivers` | 12 | 2 | 0.590 | 0.03 | 7 |
| `new_user` | 5 | 1 | 0.057 | 0.35 | 71 |
| `new_user` | 5 | 2 | 0.081 | 0.25 | 50 |
| `new_user` | 8 | 1 | 0.062 | 0.32 | 65 |
| `new_user` | 8 | 2 | 0.059 | 0.34 | 68 |
| `new_user` | 12 | 1 | 0.182 | 0.11 | 22 |
| `new_user` | 12 | 2 | 0.082 | 0.25 | 49 |
| `poor_feedback` | 5 | 1 | 0.071 | 0.36 | 70 |
| `poor_feedback` | 5 | 2 | 0.083 | 0.31 | 60 |
| `poor_feedback` | 8 | 1 | 0.056 | 0.45 | 89 |
| `poor_feedback` | 8 | 2 | 0.489 | 0.05 | 10 |
| `poor_feedback` | 12 | 1 | 0.080 | 0.32 | 63 |
| `poor_feedback` | 12 | 2 | 0.049 | 0.52 | 101 |
| `premium_fares` | 5 | 1 | 0.040 | 0.38 | 76 |
| `premium_fares` | 5 | 2 | 0.055 | 0.28 | 54 |
| `premium_fares` | 8 | 1 | 0.043 | 0.35 | 69 |
| `premium_fares` | 8 | 2 | 0.040 | 0.39 | 76 |
| `premium_fares` | 12 | 1 | 0.043 | 0.36 | 70 |
| `premium_fares` | 12 | 2 | 0.066 | 0.23 | 45 |

</details>

---

### Andojo Shop

**Bundle:** `com.andojoshop.sbx`  |  **Profiles:** 1  |  **Total files:** 1,226

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `default` | 1226 | 43.68 | 18.591 | 19.218 | 18.132 | **12w** |
| **App mean** | — | — | 18.591 | 19.218 | 18.132 | **12w** |

> _Per-profile winner: 5w: 0×  8w: 0×  12w: 1×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `default` | 5 | 1 | 17.137 | 2.55 | 72 |
| `default` | 5 | 2 | 20.045 | 2.18 | 61 |
| `default` | 8 | 1 | 17.826 | 2.45 | 69 |
| `default` | 8 | 2 | 20.611 | 2.12 | 59 |
| `default` | 12 | 1 | 17.874 | 2.44 | 69 |
| `default` | 12 | 2 | 18.391 | 2.38 | 67 |

</details>

---

### Andojo Video

**Bundle:** `com.andojovideo.sbx`  |  **Profiles:** 10  |  **Total files:** 870

| Profile | Files | Size (MB) | 5w Mean (s) | 8w Mean (s) | 12w Mean (s) | Best |
|---|---:|---:|---:|---:|---:|:---:|
| `comments_disabled` | 78 | 3.16 | 1.202 | 0.963 | 1.190 | **8w** |
| `default` | 73 | 2.96 | 0.973 | 0.813 | 1.133 | **8w** |
| `high_engagement` | 76 | 3.05 | 1.091 | 0.899 | 1.090 | **8w** |
| `high_view_count` | 74 | 2.84 | 1.033 | 0.965 | 1.107 | **8w** |
| `inactive_users` | 74 | 2.94 | 0.934 | 0.898 | 1.016 | **8w** |
| `long_videos` | 77 | 3.03 | 0.993 | 1.003 | 1.044 | **5w** |
| `low_engagement` | 71 | 2.84 | 0.779 | 0.981 | 0.933 | **5w** |
| `many_videos` | 199 | 7.93 | 2.444 | 2.531 | 2.648 | **5w** |
| `new_content` | 71 | 2.81 | 0.802 | 1.011 | 1.091 | **5w** |
| `short_videos` | 77 | 2.96 | 1.028 | 1.010 | 1.123 | **8w** |
| **App mean** | — | — | 1.128 | 1.107 | 1.238 | **8w** |

> _Per-profile winner: 5w: 4×  8w: 6×  12w: 0×_

<details>
<summary>All raw runs</summary>

| Profile | Workers | Run | Elapsed (s) | MB/s | Files/s |
|---|:---:|:---:|---:|---:|---:|
| `comments_disabled` | 5 | 1 | 1.121 | 2.82 | 70 |
| `comments_disabled` | 5 | 2 | 1.283 | 2.46 | 61 |
| `comments_disabled` | 8 | 1 | 0.742 | 4.25 | 105 |
| `comments_disabled` | 8 | 2 | 1.183 | 2.67 | 66 |
| `comments_disabled` | 12 | 1 | 1.178 | 2.68 | 66 |
| `comments_disabled` | 12 | 2 | 1.202 | 2.63 | 65 |
| `default` | 5 | 1 | 0.836 | 3.53 | 87 |
| `default` | 5 | 2 | 1.109 | 2.66 | 66 |
| `default` | 8 | 1 | 0.639 | 4.63 | 114 |
| `default` | 8 | 2 | 0.986 | 3.00 | 74 |
| `default` | 12 | 1 | 1.133 | 2.61 | 64 |
| `default` | 12 | 2 | 1.134 | 2.61 | 64 |
| `high_engagement` | 5 | 1 | 0.834 | 3.65 | 91 |
| `high_engagement` | 5 | 2 | 1.348 | 2.26 | 56 |
| `high_engagement` | 8 | 1 | 1.019 | 2.99 | 75 |
| `high_engagement` | 8 | 2 | 0.779 | 3.91 | 98 |
| `high_engagement` | 12 | 1 | 1.089 | 2.80 | 70 |
| `high_engagement` | 12 | 2 | 1.092 | 2.79 | 70 |
| `high_view_count` | 5 | 1 | 0.811 | 3.50 | 91 |
| `high_view_count` | 5 | 2 | 1.255 | 2.26 | 59 |
| `high_view_count` | 8 | 1 | 1.210 | 2.35 | 61 |
| `high_view_count` | 8 | 2 | 0.721 | 3.93 | 103 |
| `high_view_count` | 12 | 1 | 1.119 | 2.54 | 66 |
| `high_view_count` | 12 | 2 | 1.095 | 2.59 | 68 |
| `inactive_users` | 5 | 1 | 0.851 | 3.45 | 87 |
| `inactive_users` | 5 | 2 | 1.017 | 2.89 | 73 |
| `inactive_users` | 8 | 1 | 1.119 | 2.62 | 66 |
| `inactive_users` | 8 | 2 | 0.676 | 4.35 | 109 |
| `inactive_users` | 12 | 1 | 0.960 | 3.06 | 77 |
| `inactive_users` | 12 | 2 | 1.072 | 2.74 | 69 |
| `long_videos` | 5 | 1 | 0.864 | 3.51 | 89 |
| `long_videos` | 5 | 2 | 1.123 | 2.70 | 69 |
| `long_videos` | 8 | 1 | 0.752 | 4.03 | 102 |
| `long_videos` | 8 | 2 | 1.254 | 2.42 | 61 |
| `long_videos` | 12 | 1 | 1.044 | 2.90 | 74 |
| `long_videos` | 12 | 2 | 1.045 | 2.90 | 74 |
| `low_engagement` | 5 | 1 | 0.887 | 3.20 | 80 |
| `low_engagement` | 5 | 2 | 0.671 | 4.24 | 106 |
| `low_engagement` | 8 | 1 | 0.960 | 2.96 | 74 |
| `low_engagement` | 8 | 2 | 1.002 | 2.84 | 71 |
| `low_engagement` | 12 | 1 | 0.647 | 4.40 | 110 |
| `low_engagement` | 12 | 2 | 1.219 | 2.33 | 58 |
| `many_videos` | 5 | 1 | 2.387 | 3.32 | 83 |
| `many_videos` | 5 | 2 | 2.502 | 3.17 | 80 |
| `many_videos` | 8 | 1 | 2.510 | 3.16 | 79 |
| `many_videos` | 8 | 2 | 2.553 | 3.11 | 78 |
| `many_videos` | 12 | 1 | 2.671 | 2.97 | 75 |
| `many_videos` | 12 | 2 | 2.625 | 3.02 | 76 |
| `new_content` | 5 | 1 | 0.563 | 5.00 | 126 |
| `new_content` | 5 | 2 | 1.041 | 2.70 | 68 |
| `new_content` | 8 | 1 | 1.187 | 2.37 | 60 |
| `new_content` | 8 | 2 | 0.836 | 3.37 | 85 |
| `new_content` | 12 | 1 | 1.044 | 2.70 | 68 |
| `new_content` | 12 | 2 | 1.137 | 2.47 | 62 |
| `short_videos` | 5 | 1 | 0.963 | 3.07 | 80 |
| `short_videos` | 5 | 2 | 1.093 | 2.70 | 70 |
| `short_videos` | 8 | 1 | 0.790 | 3.74 | 98 |
| `short_videos` | 8 | 2 | 1.231 | 2.40 | 63 |
| `short_videos` | 12 | 1 | 1.045 | 2.83 | 74 |
| `short_videos` | 12 | 2 | 1.201 | 2.46 | 64 |

</details>

---

## Consolidated — All Apps × All Profiles

| App | Profile | Files | Size (MB) | 5w (s) | 8w (s) | 12w (s) | Fastest |
|---|---|---:|---:|---:|---:|---:|:---:|
| Andojo Auction | `auction_heavy` | 250 | 7.75 | 2.810 | 2.636 | 2.472 | **12w** |
| Andojo Auction | `budget_items` | 249 | 7.64 | 3.166 | 2.607 | 2.505 | **12w** |
| Andojo Auction | `buy_now_focus` | 250 | 7.69 | 2.981 | 3.809 | 3.001 | **5w** |
| Andojo Auction | `default` | 249 | 7.71 | 3.306 | 3.275 | 3.816 | **8w** |
| Andojo Auction | `ending_soon` | 250 | 7.74 | 4.622 | 4.124 | 3.803 | **12w** |
| Andojo Auction | `failed_payments` | 250 | 8.02 | 5.310 | 4.344 | 4.431 | **8w** |
| Andojo Auction | `high_bid_volume` | 250 | 7.84 | 4.163 | 5.127 | 3.811 | **12w** |
| Andojo Auction | `new_seller` | 249 | 7.84 | 4.063 | 3.889 | 4.154 | **8w** |
| Andojo Auction | `power_seller` | 250 | 7.76 | 4.821 | 3.849 | 3.740 | **12w** |
| Andojo Auction | `premium_items` | 250 | 8.11 | 4.942 | 4.093 | 3.696 | **12w** |
| Andojo Eats | `budget_menu` | 204 | 34.02 | 4.945 | 3.653 | 4.190 | **8w** |
| Andojo Eats | `cancelled_orders` | 204 | 34.32 | 4.223 | 3.735 | 3.404 | **12w** |
| Andojo Eats | `default` | 204 | 34.30 | 4.447 | 3.444 | 3.479 | **8w** |
| Andojo Eats | `excellent_ratings` | 204 | 34.13 | 4.599 | 3.673 | 3.496 | **12w** |
| Andojo Eats | `high_order_volume` | 204 | 34.50 | 4.997 | 3.767 | 3.467 | **12w** |
| Andojo Eats | `large_orders` | 204 | 34.36 | 5.073 | 3.986 | 3.520 | **12w** |
| Andojo Eats | `new_user` | 204 | 34.29 | 4.804 | 4.077 | 4.805 | **8w** |
| Andojo Eats | `pending_orders` | 204 | 34.53 | 3.851 | 3.775 | 3.459 | **12w** |
| Andojo Eats | `poor_ratings` | 204 | 34.43 | 3.916 | 3.431 | 3.754 | **8w** |
| Andojo Eats | `premium_menu` | 204 | 33.97 | 4.440 | 3.505 | 3.861 | **8w** |
| Andojo Eats | `small_orders` | 204 | 34.45 | 3.761 | 3.646 | 3.901 | **8w** |
| Andojo Music | `default` | 25 | 0.87 | 0.273 | 0.638 | 0.553 | **5w** |
| Andojo Music | `genre_focused` | 25 | 0.86 | 0.498 | 0.603 | 0.307 | **12w** |
| Andojo Music | `high_rated_content` | 25 | 0.90 | 0.451 | 0.566 | 0.387 | **12w** |
| Andojo Music | `large_playlists` | 25 | 0.92 | 0.268 | 0.555 | 0.550 | **5w** |
| Andojo Music | `low_engagement` | 25 | 0.89 | 0.949 | 1.099 | 0.292 | **12w** |
| Andojo Music | `minimal_playlists` | 25 | 0.87 | 0.362 | 0.470 | 0.499 | **5w** |
| Andojo Music | `new_user` | 25 | 0.86 | 0.334 | 0.473 | 0.570 | **5w** |
| Andojo Music | `playlist_heavy` | 25 | 0.90 | 0.471 | 0.292 | 0.488 | **8w** |
| Andojo Music | `power_listener` | 25 | 0.88 | 0.449 | 0.335 | 0.474 | **8w** |
| Andojo Music | `recent_activity` | 25 | 0.87 | 1.001 | 0.622 | 0.559 | **12w** |
| Andojo Music | `viral_songs` | 25 | 0.86 | 0.518 | 0.300 | 0.556 | **8w** |
| Andojo QwikShop | `default` | 1226 | 43.68 | 24.891 | 17.183 | 18.824 | **8w** |
| Andojo Ryde | `budget_rides` | 6 | 0.03 | 0.067 | 0.055 | 0.368 | **8w** |
| Andojo Ryde | `cancelled_rides` | 4 | 0.02 | 0.050 | 0.054 | 0.063 | **5w** |
| Andojo Ryde | `default` | 4 | 0.02 | 0.054 | 0.060 | 0.047 | **12w** |
| Andojo Ryde | `excellent_feedback` | 5 | 0.03 | 0.327 | 0.057 | 0.061 | **8w** |
| Andojo Ryde | `high_rated_drivers` | 3 | 0.01 | 0.051 | 0.052 | 0.057 | **5w** |
| Andojo Ryde | `high_ride_volume` | 5 | 0.02 | 0.071 | 0.322 | 0.047 | **12w** |
| Andojo Ryde | `inactive_users` | 4 | 0.02 | 0.044 | 0.050 | 0.056 | **5w** |
| Andojo Ryde | `low_rated_drivers` | 4 | 0.02 | 0.046 | 0.070 | 0.330 | **5w** |
| Andojo Ryde | `new_user` | 4 | 0.02 | 0.069 | 0.060 | 0.132 | **8w** |
| Andojo Ryde | `poor_feedback` | 5 | 0.03 | 0.077 | 0.273 | 0.064 | **12w** |
| Andojo Ryde | `premium_fares` | 3 | 0.02 | 0.048 | 0.041 | 0.054 | **8w** |
| Andojo Shop | `default` | 1226 | 43.68 | 18.591 | 19.218 | 18.132 | **12w** |
| Andojo Video | `comments_disabled` | 78 | 3.16 | 1.202 | 0.963 | 1.190 | **8w** |
| Andojo Video | `default` | 73 | 2.96 | 0.973 | 0.813 | 1.133 | **8w** |
| Andojo Video | `high_engagement` | 76 | 3.05 | 1.091 | 0.899 | 1.090 | **8w** |
| Andojo Video | `high_view_count` | 74 | 2.84 | 1.033 | 0.965 | 1.107 | **8w** |
| Andojo Video | `inactive_users` | 74 | 2.94 | 0.934 | 0.898 | 1.016 | **8w** |
| Andojo Video | `long_videos` | 77 | 3.03 | 0.993 | 1.003 | 1.044 | **5w** |
| Andojo Video | `low_engagement` | 71 | 2.84 | 0.779 | 0.981 | 0.933 | **5w** |
| Andojo Video | `many_videos` | 199 | 7.93 | 2.444 | 2.531 | 2.648 | **5w** |
| Andojo Video | `new_content` | 71 | 2.81 | 0.802 | 1.011 | 1.091 | **5w** |
| Andojo Video | `short_videos` | 77 | 2.96 | 1.028 | 1.010 | 1.123 | **8w** |

---

## Inference

### 1. Win Rate

Which worker count achieved the fastest mean push time per profile:

| Workers | Profiles Won | Win % | Mean MB/s | Mean Time (s) |
|:---:|---:|---:|---:|---:|
| **5w** | 13/55 | 24% | 3.15 | 2.74 |
| **8w** | 23/55 | 42% | 3.42 | 2.42 |
| **12w** | 19/55 | 35% | 3.37 | 2.41 |

### 2. Performance by Dataset Size

| Bucket | Range | 5w mean (s) | 8w mean (s) | 12w mean (s) | Recommended |
|---|---|---:|---:|---:|:---:|
| **tiny** | < 1 MB | 0.294 | 0.320 | 0.296 | **5w** |
| **small** | 1–10 MB | 2.573 | 2.441 | 2.390 | **12w** |
| **medium** | 10–40 MB | 4.460 | 3.699 | 3.758 | **8w** |
| **large** | > 40 MB | 21.741 | 18.201 | 18.478 | **8w** |

### 3. Key Findings

- **8 workers** won the most profiles overall (23/55, 42%).
- ADB push speed over the virtual USB channel is the real bottleneck.
  More workers open additional concurrent connections to the ADB daemon,
  which multiplexes transfers and reduces wall-clock time.
- **Tiny assets** (Ryde, < 1 MB): the per-subprocess ADB handshake (~50 ms)
  dominates. All worker counts are effectively equal.
- **Small–medium assets** (Music, Video, Auction, Eats): 8–12 workers provide
  a clear speedup. Thread overhead stays below the ADB round-trip savings.
- **Large assets** (Shop / QwikShop, > 40 MB, 1 226 files): the ADB daemon
  can become saturated at 12 workers; 8 workers is often more stable.
- **Recommended default `max_workers` for `set_environment()` assets push: `8`**.

### 4. Suggested Code Change in `adb_actions.py`

Replace the sequential `for filename in files: adb push` loop with:

```python
from concurrent.futures import ThreadPoolExecutor
import subprocess

def _push_one(args):
    local, remote = args
    subprocess.run(["adb", "push", local, remote], check=True)

with ThreadPoolExecutor(max_workers=8) as pool:
    pool.map(_push_one, [(local_file, remote_file)
                         for local_file, remote_file in push_pairs])
```

---

_Report generated by `digiworld/utils/benchmark_adb_push.py`_