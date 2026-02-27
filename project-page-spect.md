# Project Portfolio Page Brief

## Purpose
Create a media-first project page that behaves like a cinematic “device UI”; content is experienced through a full-height hero player plus stacked sections below. The page should feel curated, minimal, and responsive; interactions should be smooth, stateful, and reversible.

Primary focus: individual project pages; strong video, stills, and gallery behaviors with a consistent UI shell.

---

## Core UX Principles
- Media is the interface; UI chrome is intentionally minimal and disappears when idle.
- Navigation is “player-like”; users can scrub, step, and switch formats/aspect ratios.
- Scrolling reveals structured content; hero remains visually present until “Other Projects.”
- All transitions are smooth; no abrupt layout shifts.
- Keyboard affordances exist; ESC exits modals; arrows navigate galleries.

---

## Page Anatomy (Top to Bottom)

### 1) Hero Section (Full-Height Media Player)
**Layout**
- Always full viewport height (100vh).
- Media scales to fill vertically; preserve aspect ratio by shrinking horizontally as needed (pillarbox behavior).
- Sits as the persistent background while user scrolls down through subsequent sections; remains present until the final “Other Projects” section intersects.

**Default state**
- Autoplay enabled (where allowed); start muted.
- Minimal overlay UI (volume, transport, navigation, optional aspect ratio toggles, optional captions/subtitles).
- After 3 seconds of no mouse activity, overlay fades out fully, leaving unobstructed hero media.

**Optional hero mode**
- Allow hero to be a still image instead of video.
- If hero is still; remove video-only overlay controls (play/pause, timeline scrub, timecode), and keep only project navigation UI as needed.

**Requested enhancement (for your version)**
- Add a sleek timeline navbar:
  - Click/drag scrubbing; jumping ahead supported.
  - Current time displayed at the far side of the nav bar.
  - Timeline should be unobtrusive and auto-hide with the rest of the overlay on idle.

---

### 2) Transition Ramp to Content
- At the bottom edge of hero section: a subtle ramp to black that blends into the next section’s pure black background.
- This is visual only; it should not create extra spacing or scroll “dead zones.” the user only scrolls "beneath" this full size player when they get to the very bottom of the page to the Other Projects section, which should be populated by the other projects grid from the root of the site

---

### 3) Project Overview Section
- Black background.
- Left-aligned header: “Project Overview” (or localized equivalent).
- Beneath it; a tagline or short text block (single paragraph or short multi-line blurb).

---

### 4) Other Videos Section (Conditional)
- Display only if additional videos exist for the project.
- Thumbnails or titles; clicking one:
  - Loads that video into the hero player.
  - Smoothly scroll-animates the viewport back to the top (hero).
  - Preserves UI state appropriately (muted state, captions state, aspect ratio selection rules).

---

### 5) Poster Section (Conditional)
- A full-height (100vh) section.
- Can contain up to 4 images in a row; often a single centered image.
- No auto-scroll; no carousel behavior here.
- Clicking any poster image opens the fullscreen viewer (same behavior as the carousel viewer).

---

### 6) Other Content Section (Image Carousel)
A horizontally scrolling, continuous-loop gallery.

**Default behavior (idle)**
- The carousel auto-scrolls slowly by default.
- It loops seamlessly back to the beginning; no visible jump.
- All images are scaled to the same height.
- Images keep native aspect ratio; widths vary accordingly.
- Equal spacing/margins between images.

**Interaction behavior**
- Trackpad swipe or drag:
  - Immediately stops auto-scroll.
  - User can smoothly scroll left/right.
  - When user stops interacting, carousel remains static.

**Auto-resume**
- After 5 seconds of no interaction, auto-scroll resumes.

**Hover affordance**
- Mouse rollover highlights the border of images (visual focus state).

**Click behavior**
- Clicking an image opens a fullscreen modal viewer (see next section).

---

### 7) Fullscreen Image Viewer (Modal)
A separate viewer state for poster images and carousel images.

**Entry**
- Opened via click on any image in Poster or Other Content.

**Presentation**
- Fullscreen.
- Black background.
- Image scales to fit without clipping; preserve aspect ratio (contain behavior).
- ESC button appears in upper-left corner.
- Arrow controls appear in lower-right corner; also support keyboard arrow keys.

**Navigation**
- Left/right arrow navigates to previous/next image.
- Transition between images is a smooth slide animation.
- Viewer should track the image list source:
  - If opened from Poster; navigate within Poster set.
  - If opened from Carousel; navigate within Carousel set.
  - If desired; optionally unify both sets into one continuous list, but keep this as a deliberate product decision.

**Exit**
- ESC key closes.
- Clicking ESC UI closes.
- Optional: click outside image to close (only if it does not conflict with the “device UI” feel).

---

### 8) Credits Section
- Presented like a table.
- Rows contain:
  - Role (left column)
  - Name (right column)
- Styling evokes a technical overlay; thin rules/dividers between rows.
- Optional label in Japanese supported (e.g., チーム for “Team”), but core content remains readable in English.

---

### 9) Other Projects Thumbnails (Terminal Section)
**Layout**
- Grid of project thumbnails.
- Default: 3 across per row.
- Responsive collapse:
  - At narrow widths (mobile/portrait); switch to 1 per row, stacked vertically.
- This grid is the point where the persistent hero background behavior ends; as this section arrives, page behaves like normal content-first scrolling.

---

## Global Navigation + Page Shell (Implied)
- Project pages are part of a sequence; support next/previous project stepping.
- Minimal global nav items (Menu, Contact, Progress) may exist as header-level controls.

---

## Interaction States and Timers
- Hero overlay auto-hide: 3 seconds idle.
- Carousel auto-resume: 5 seconds idle after user interaction.
- All fades and slides should be eased; avoid sudden pops.

---

## Responsiveness
- Hero always 100vh; media scales vertically first.
- Thumbnail grid responds from 3-column to 1-column layout based on viewport width.
- Fullscreen viewer is consistent across desktop and mobile; touch swipe navigation is optional but recommended.

---

## Accessibility and Input Support
- Keyboard:
  - ESC closes fullscreen viewer.
  - Left/Right arrows navigate images in viewer.
  - Tab order should reach ESC control and arrow controls.
- Provide visible focus states (match the hover border highlight).
- Respect reduced motion preference:
  - Reduce or disable continuous carousel auto-scroll if user prefers reduced motion.
  - Keep transitions minimal and fast in reduced motion mode.

---

## Performance Notes
- Lazy-load non-hero images; prioritize hero media and first viewport content.
- Preload a small number of upcoming carousel images for smooth scrolling.
- Fullscreen viewer should request higher-res images only when opened, if separate sizes exist.
- Avoid layout shifts by reserving image dimensions (known height; width auto via aspect ratio).

---

## Content Model Requirements (Data)
Each project should define:
- `slug`, `title`, `client`
- `hero`:
  - `type`: video | image
  - `sources`: one or more encodes
  - `poster` (for video)
  - `captions` (optional)
  - `aspectRatios` (optional list; 16:9, 9:16, 4:3, etc)
- `overview`:
  - `tagline` or `description`
- `otherVideos[]` (optional):
  - `title`, `sources`, `poster`, `aspectRatios`, `captions`
- `posterImages[]` (optional, up to 4 typical)
- `carouselImages[]` (optional; drives the auto-scrolling strip)
- `credits[]`:
  - `role`, `name`
- `relatedProjects[]`:
  - `title`, `slug`, `thumbnail`, optional `aspectRatioPreview`

---

## Acceptance Checklist
- Hero loads full-height; autoplay muted; overlay hides after 3 seconds idle.
- Scrolling keeps hero present until “Other Projects” section.
- “Other Videos” swaps into hero and scrolls to top smoothly.
- Poster section supports fullscreen viewer.
- Carousel auto-scrolls, loops seamlessly, equal height images, equal spacing.
- Carousel interaction pauses auto-scroll; resumes after 5 seconds idle.
- Fullscreen viewer supports ESC, arrow keys, on-screen arrows; smooth slide transitions; fit-to-screen contain behavior.
- Other projects grid is 3-up on desktop; 1-up on narrow viewports.