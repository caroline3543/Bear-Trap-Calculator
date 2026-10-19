# Referenced map image sources

The map uses external image URLs rather than copying game assets into this repository.

Krozac source: https://github.com/Krozac/wos-interactive-map
Source renderer: https://github.com/Krozac/wos-interactive-map/blob/main/wos-interactive-map-front/src/three/textures.js

Referenced public image paths:
- `wos-interactive-map-front/public/img/furnace.png` (placed city)
- `wos-interactive-map-front/public/img/alliance/trap.png` (Bear Trap)
- `wos-interactive-map-front/public/img/alliance/banner.png` (banner)
- `wos-interactive-map-front/public/img/alliance/hq.png` (HQ)
- `wos-interactive-map-front/public/img/obstacles/mountain-big-8x8-gray.png` (mountain)

The images remain hosted by their source repository. SVG shapes remain behind the external images if unavailable. This avoids redistribution in this repository but does **not** itself resolve any third-party artwork rights or guarantee the remote URLs remain available. The ISC software licence in Krozac's repository does not necessarily cover third-party Whiteout Survival artwork. Confirm artwork permission before shipping bundled copies. Water artwork was not verified in this asset manifest and is intentionally unchanged.

At low zoom, empty slots retain their outline but hide `+ City` in both projections. No slot allocation, camera gesture or attendance data is changed.
