:root {
  --bg: #090b10;
  --bg-soft: #0e1118;
  --panel: rgba(18, 22, 31, 0.88);
  --panel-solid: #12161f;
  --panel-hover: #171c27;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --text: #f4f6fb;
  --muted: #8992a3;
  --muted-2: #616a79;

  --accent: #7c73ff;
  --accent-strong: #928aff;
  --accent-soft: rgba(124, 115, 255, 0.14);

  --danger: #ff667d;
  --danger-soft: rgba(255, 102, 125, 0.08);

  --success: #67d69b;
  --success-soft: rgba(103, 214, 155, 0.08);

  --warning: #e9bc68;
  --warning-soft: rgba(233, 188, 104, 0.08);

  --info: #71b8ff;
  --info-soft: rgba(113, 184, 255, 0.08);

  --radius: 18px;
  --radius-small: 12px;

  --sidebar: 240px;

  --shadow:
    0 24px 70px
    rgba(0, 0, 0, 0.35);

  --shadow-small:
    0 12px 30px
    rgba(0, 0, 0, 0.22);
}


* {
  box-sizing: border-box;
}


html {
  min-height: 100%;
  background: var(--bg);
}


body {
  margin: 0;
  min-height: 100vh;

  color: var(--text);

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background:
    radial-gradient(
      circle at 80% -10%,
      rgba(94, 78, 255, 0.16),
      transparent 34%
    ),
    radial-gradient(
      circle at -10% 40%,
      rgba(33, 110, 175, 0.1),
      transparent 32%
    ),
    var(--bg);
}


button,
input,
textarea,
select {
  font: inherit;
}


button {
  color: inherit;
}


button,
select {
  cursor: pointer;
}


button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}


[hidden] {
  display: none !important;
}


body.sheet-open {
  overflow: hidden;
}


h1,
h2,
h3,
p {
  margin-top: 0;
}


h1 {
  margin-bottom: 8px;

  font-size:
    clamp(
      1.8rem,
      5vw,
      3rem
    );

  line-height: 1.05;
  letter-spacing: -0.045em;
}


h2 {
  margin-bottom: 6px;
  letter-spacing: -0.025em;
}


h3 {
  margin-bottom: 6px;
}


a {
  color: inherit;
}


.muted-text {
  color: var(--muted);
}


.eyebrow,
.section-kicker {
  display: block;

  margin-bottom: 7px;

  color: var(--muted);

  font-size: 0.7rem;
  font-weight: 800;

  letter-spacing: 0.16em;
  text-transform: uppercase;
}


/* =========================================================
   SHELL
========================================================= */

.app-shell {
  min-height: 100vh;
}


.sidebar {
  display: none;
}


.main-shell {
  min-width: 0;
}


.topbar {
  position: sticky;
  top: 0;
  z-index: 40;

  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: 70px;

  padding:
    max(
      12px,
      env(safe-area-inset-top)
    )
    18px
    10px;

  border-bottom:
    1px solid var(--border);

  background:
    rgba(9, 11, 16, 0.82);

  backdrop-filter:
    blur(20px);
}


.mobile-brand {
  margin-bottom: 3px;
  font-weight: 800;
}


.section-kicker {
  margin: 0;
}


.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}


.desktop-create {
  display: none;
}


.avatar-button {
  display: grid;
  place-items: center;

  width: 42px;
  height: 42px;

  border:
    1px solid var(--border);

  border-radius: 50%;

  background:
    var(--panel-solid);

  font-weight: 800;
}


.page {
  width:
    min(
      100%,
      1500px
    );

  margin: 0 auto;

  padding:
    24px
    16px
    110px;
}


/* =========================================================
   BUTTONS
========================================================= */

.primary-button,
.secondary-button,
.ghost-button,
.danger-button,
.icon-button {
  border-radius:
    var(--radius-small);

  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;
}


.primary-button {
  min-height: 44px;

  padding:
    0
    18px;

  border: 0;

  background:
    linear-gradient(
      135deg,
      #8a82ff,
      #6559ed
    );

  color: white;

  font-weight: 800;

  box-shadow:
    0 8px 22px
    rgba(101, 89, 237, 0.18);
}


.secondary-button {
  min-height: 44px;

  padding:
    0
    16px;

  border:
    1px solid var(--border-strong);

  background:
    rgba(255, 255, 255, 0.045);

  font-weight: 700;
}


.ghost-button {
  min-height: 42px;

  padding:
    0
    14px;

  border:
    1px solid var(--border);

  background: transparent;

  color: var(--muted);
}


.danger-button {
  min-height: 42px;

  padding:
    0
    14px;

  border:
    1px solid
    rgba(
      255,
      102,
      125,
      0.24
    );

  background:
    rgba(
      255,
      102,
      125,
      0.08
    );

  color: #ff8295;
}


.icon-button {
  width: 42px;
  height: 42px;

  border:
    1px solid var(--border);

  background:
    rgba(255, 255, 255, 0.04);

  font-size: 1.4rem;
}


.compact-button {
  min-height: 36px;

  padding:
    0
    12px;

  font-size: 0.8rem;
}


.full-button {
  width: 100%;
}


button:active {
  transform: scale(0.98);
}


/* =========================================================
   PAGE
========================================================= */

.page-header {
  display: flex;
  flex-direction: column;

  gap: 18px;

  margin-bottom: 24px;
}


.page-header-copy p {
  max-width: 700px;
  margin-bottom: 0;
}


.loading-card,
.empty-state {
  padding: 28px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    var(--panel);
}


.empty-state strong {
  display: block;
  margin-bottom: 7px;
}


.empty-state p {
  margin-bottom: 0;
}


.error-panel {
  border-color:
    rgba(
      255,
      102,
      125,
      0.22
    ) !important;
}


/* =========================================================
   STATS
========================================================= */

.stats-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 10px;

  margin-bottom: 18px;
}


.stat-card {
  position: relative;

  overflow: hidden;

  padding: 18px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.045),
      rgba(255, 255, 255, 0.015)
    );
}


.stat-card::after {
  content: "";

  position: absolute;

  right: -25px;
  bottom: -40px;

  width: 90px;
  height: 90px;

  border-radius: 50%;

  background:
    rgba(
      124,
      115,
      255,
      0.08
    );

  filter:
    blur(12px);
}


.stat-number {
  position: relative;
  z-index: 1;

  display: block;

  margin-bottom: 5px;

  font-size: 1.8rem;
  letter-spacing: -0.04em;
}


/* =========================================================
   PANELS
========================================================= */

.dashboard-grid {
  display: grid;
  gap: 14px;
}


.panel {
  padding: 18px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    var(--panel);
}


.panel-attention {
  border-color:
    rgba(
      233,
      188,
      104,
      0.18
    );

  background:
    linear-gradient(
      145deg,
      rgba(
        233,
        188,
        104,
        0.04
      ),
      var(--panel)
    );
}


.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 14px;

  margin-bottom: 16px;
}


.panel-header p {
  margin-bottom: 0;
}


.stack-list {
  display: grid;
  gap: 9px;
}


.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;

  padding: 13px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  background:
    rgba(
      255,
      255,
      255,
      0.025
    );
}


.list-row strong,
.list-row span {
  display: block;
}


.list-row span {
  margin-top: 3px;

  font-size: 0.82rem;
}


/* =========================================================
   STATUS
========================================================= */

.status-badge {
  display: inline-flex;
  align-items: center;

  width: fit-content;

  padding:
    5px
    9px;

  border:
    1px solid var(--border);

  border-radius: 999px;

  color: var(--muted);

  background:
    rgba(
      255,
      255,
      255,
      0.04
    );

  font-size: 0.68rem;
  font-weight: 850;

  white-space: nowrap;
}


.status-connected,
.status-published {
  color: var(--success);

  border-color:
    rgba(
      103,
      214,
      155,
      0.22
    );

  background:
    var(--success-soft);
}


.status-queued,
.status-scheduled,
.status-ready {
  color: #b5afff;

  border-color:
    rgba(
      124,
      115,
      255,
      0.28
    );

  background:
    var(--accent-soft);
}


.status-processing {
  color: #8ec8ff;

  border-color:
    rgba(
      113,
      184,
      255,
      0.25
    );

  background:
    var(--info-soft);
}


.status-retrying {
  color: var(--warning);

  border-color:
    rgba(
      233,
      188,
      104,
      0.25
    );

  background:
    var(--warning-soft);
}


.status-failed,
.status-cancelled,
.status-disconnected {
  color: #ff8799;

  border-color:
    rgba(
      255,
      102,
      125,
      0.22
    );

  background:
    var(--danger-soft);
}


.status-media-required {
  color: var(--warning);

  border-color:
    rgba(
      233,
      188,
      104,
      0.25
    );

  background:
    var(--warning-soft);
}


/* =========================================================
   PIPELINE
========================================================= */

/*
 * Mobile-first:
 *
 * The pipeline is deliberately VERTICAL.
 * Each production stage is a section in a timeline.
 */

.pipeline-board {
  position: relative;

  display: grid;

  gap: 0;

  overflow: visible;

  padding: 0;
}


.pipeline-column {
  position: relative;

  min-height: 0;

  margin-left: 13px;

  padding:
    0
    0
    28px
    27px;

  border: 0;
  border-radius: 0;

  background: transparent;
}


.pipeline-column::before {
  content: "";

  position: absolute;

  left: 0;
  top: 10px;

  width: 11px;
  height: 11px;

  border:
    3px solid
    var(--accent);

  border-radius: 50%;

  background:
    var(--bg);

  box-shadow:
    0 0 0 5px
    rgba(
      124,
      115,
      255,
      0.08
    );
}


.pipeline-column:not(:last-child)::after {
  content: "";

  position: absolute;

  left: 6px;
  top: 25px;
  bottom: 0;

  width: 1px;

  background:
    linear-gradient(
      to bottom,
      rgba(
        124,
        115,
        255,
        0.4
      ),
      rgba(
        255,
        255,
        255,
        0.06
      )
    );
}


.pipeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;

  min-height: auto;

  margin-bottom: 11px;

  padding: 0;

  border: 0;

  background: transparent;
}


.pipeline-heading strong {
  font-size: 0.78rem;
  font-weight: 900;

  letter-spacing: 0.1em;
  text-transform: uppercase;
}


.count-pill {
  display: inline-grid;
  place-items: center;

  min-width: 27px;
  height: 25px;

  padding:
    0
    8px;

  border:
    1px solid var(--border);

  border-radius: 999px;

  background:
    rgba(
      255,
      255,
      255,
      0.035
    );

  color: var(--muted);

  font-size: 0.7rem;
  font-weight: 800;
}


.pipeline-cards {
  display: grid;
  gap: 9px;

  padding: 0;
}


.content-card {
  position: relative;

  overflow: hidden;

  padding: 14px;

  border:
    1px solid var(--border);

  border-radius:
    15px;

  background:
    linear-gradient(
      145deg,
      rgba(
        21,
        26,
        37,
        0.96
      ),
      rgba(
        15,
        18,
        27,
        0.96
      )
    );

  box-shadow:
    0 10px 28px
    rgba(
      0,
      0,
      0,
      0.12
    );
}


.content-card::before {
  content: "";

  position: absolute;

  left: 0;
  top: 0;
  bottom: 0;

  width: 2px;

  background:
    linear-gradient(
      to bottom,
      var(--accent),
      transparent
    );

  opacity: 0.7;
}


.content-card h3 {
  margin:
    8px
    0
    5px;

  font-size: 0.96rem;

  line-height: 1.3;
}


.content-card p {
  margin-bottom: 12px;

  font-size: 0.76rem;
}


.content-type {
  display: inline-block;

  color: var(--muted);

  font-size: 0.64rem;
  font-weight: 900;

  letter-spacing: 0.12em;
  text-transform: uppercase;
}


.card-actions,
.inline-actions {
  display: flex;
  flex-wrap: wrap;

  gap: 7px;
}


.pipeline-empty {
  padding:
    10px
    0
    4px;

  color: var(--muted-2);

  font-size: 0.76rem;
}


/* =========================================================
   PROJECT / IDEA / ACCOUNT
========================================================= */

.project-grid,
.idea-grid,
.account-grid {
  display: grid;
  gap: 12px;
}


.project-card,
.idea-card,
.account-card {
  padding: 19px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    var(--panel);
}


.project-card {
  border-top:
    3px solid
    var(
      --project-accent,
      var(--accent)
    );
}


.project-meta {
  display: flex;
  flex-wrap: wrap;

  gap: 14px;

  margin:
    18px
    0;

  color: var(--muted);

  font-size: 0.8rem;
}


.account-heading {
  display: flex;
  justify-content: space-between;

  gap: 14px;
}


/* =========================================================
   CALENDAR / PUBLICATIONS
========================================================= */

.calendar-list {
  display: grid;
  gap: 22px;
}


.calendar-day {
  display: grid;
  gap: 9px;
}


.calendar-day h2 {
  font-size: 1rem;
}


.publication-row {
  display: grid;

  grid-template-columns:
    42px
    minmax(0, 1fr)
    auto;

  gap: 11px;

  align-items: center;

  padding: 13px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  background:
    var(--panel);
}


.publication-row.publication-attention {
  border-color:
    rgba(
      233,
      188,
      104,
      0.2
    );

  background:
    linear-gradient(
      145deg,
      rgba(
        233,
        188,
        104,
        0.045
      ),
      var(--panel)
    );
}


.publication-row.publication-error {
  border-color:
    rgba(
      255,
      102,
      125,
      0.18
    );
}


.publication-row > .inline-actions {
  grid-column:
    2 / -1;
}


.platform-icon {
  display: grid;
  place-items: center;

  width: 42px;
  height: 42px;

  border-radius:
    11px;

  background:
    rgba(
      124,
      115,
      255,
      0.12
    );

  color: #b8b3ff;

  font-size: 0.7rem;
  font-weight: 900;
}


.platform-icon.platform-youtube {
  background:
    rgba(
      255,
      88,
      88,
      0.1
    );

  color: #ff9c9c;
}


.platform-icon.platform-tiktok {
  background:
    rgba(
      113,
      184,
      255,
      0.09
    );

  color: #a9d4ff;
}


.publication-copy {
  min-width: 0;
}


.publication-copy strong,
.publication-copy span {
  display: block;
}


.publication-copy strong {
  overflow: hidden;

  text-overflow: ellipsis;
  white-space: nowrap;
}


.publication-copy span {
  margin-top: 4px;

  font-size: 0.76rem;
}


.publication-meta {
  display: flex;
  flex-wrap: wrap;

  gap: 5px 8px;

  margin-top: 7px;
}


.publication-meta-item {
  color: var(--muted-2);

  font-size: 0.68rem;
}


.publication-error-copy {
  margin:
    9px
    0
    0;

  color: var(--warning);

  font-size: 0.72rem;

  line-height: 1.4;
}


.publication-error-copy.danger {
  color: #ff8fa0;
}


/* =========================================================
   MOBILE NAV
========================================================= */

.mobile-nav {
  position: fixed;

  z-index: 50;

  left: 10px;
  right: 10px;

  bottom:
    max(
      10px,
      env(
        safe-area-inset-bottom
      )
    );

  display: grid;

  grid-template-columns:
    repeat(
      5,
      1fr
    );

  align-items: end;

  min-height: 67px;

  padding: 7px;

  border:
    1px solid var(--border);

  border-radius: 22px;

  background:
    rgba(
      15,
      18,
      26,
      0.94
    );

  box-shadow:
    var(--shadow);

  backdrop-filter:
    blur(22px);
}


.mobile-nav-button {
  display: grid;
  place-items: center;

  gap: 3px;

  height: 52px;

  border: 0;

  background: transparent;

  color: var(--muted);

  font-size: 0.66rem;
}


.mobile-nav-button span {
  font-size: 1rem;
}


.mobile-nav-button.active {
  color: white;
}


.mobile-create-button {
  align-self: center;

  width: 54px;
  height: 54px;

  margin:
    -22px
    auto
    5px;

  border: 0;
  border-radius: 18px;

  background:
    linear-gradient(
      135deg,
      #8d84ff,
      #5e52df
    );

  box-shadow:
    0 13px 32px
    rgba(
      91,
      77,
      222,
      0.36
    );

  color: white;

  font-size: 1.8rem;
}


/* =========================================================
   BACKDROP / SHEETS
========================================================= */

.backdrop {
  position: fixed;
  inset: 0;

  z-index: 70;

  background:
    rgba(
      0,
      0,
      0,
      0.65
    );

  backdrop-filter:
    blur(5px);
}


.bottom-sheet {
  position: fixed;

  z-index: 80;

  left: 0;
  right: 0;
  bottom: 0;

  max-height: 92vh;

  overflow-y: auto;

  padding:
    10px
    18px
    calc(
      24px +
      env(
        safe-area-inset-bottom
      )
    );

  border:
    1px solid var(--border);

  border-bottom: 0;

  border-radius:
    25px
    25px
    0
    0;

  background:
    #11151e;

  box-shadow:
    0 -30px 80px
    rgba(
      0,
      0,
      0,
      0.5
    );
}


.sheet-handle {
  width: 45px;
  height: 4px;

  margin:
    2px
    auto
    18px;

  border-radius: 999px;

  background:
    rgba(
      255,
      255,
      255,
      0.17
    );
}


.sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 20px;

  margin-bottom: 22px;
}


.sheet-header h2 {
  margin-bottom: 4px;
}


.small-sheet {
  max-height: 70vh;
}


.more-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      1fr
    );

  gap: 10px;

  margin-bottom: 16px;
}


.more-grid button {
  min-height: 80px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  background:
    rgba(
      255,
      255,
      255,
      0.035
    );

  font-weight: 700;
}


/* =========================================================
   FORMS
========================================================= */

form {
  display: grid;
  gap: 15px;
}


label {
  display: grid;
  gap: 7px;

  color: #c7ccd6;

  font-size: 0.82rem;
  font-weight: 700;
}


input,
textarea,
select {
  width: 100%;

  min-height: 47px;

  padding:
    11px
    13px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  outline: none;

  background:
    #0c0f16;

  color: var(--text);
}


textarea {
  min-height: 100px;
  resize: vertical;
}


input:focus,
textarea:focus,
select:focus {
  border-color:
    rgba(
      124,
      115,
      255,
      0.62
    );

  box-shadow:
    0 0 0 3px
    rgba(
      124,
      115,
      255,
      0.09
    );
}


.form-grid {
  display: grid;
  gap: 12px;
}


.platform-preview {
  display: grid;
  gap: 8px;
}


.platform-preview > div {
  display: flex;
  justify-content: space-between;

  padding: 12px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  background:
    rgba(
      255,
      255,
      255,
      0.025
    );
}


.platform-preview span {
  color: var(--muted);

  font-size: 0.75rem;
}


.muted-platform {
  opacity: 0.45;
}


/* =========================================================
   PUBLISHER
========================================================= */

.publish-sheet {
  max-height: 95vh;
}


.publish-body {
  display: grid;
  gap: 22px;
}


.composer-section-heading h3 {
  margin-bottom: 0;
}


.destination-list {
  display: grid;
  gap: 12px;
}


.destination-card {
  padding: 15px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    rgba(
      255,
      255,
      255,
      0.025
    );

  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}


.destination-card.selected {
  border-color:
    rgba(
      124,
      115,
      255,
      0.52
    );

  background:
    rgba(
      124,
      115,
      255,
      0.07
    );
}


.destination-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 14px;

  margin-bottom: 15px;
}


.destination-check {
  display: flex;
  align-items: center;

  gap: 12px;

  min-width: 0;

  cursor: pointer;
}


.destination-check input {
  width: 20px;
  height: 20px;
  min-height: 0;

  accent-color:
    var(--accent);
}


.destination-check strong,
.destination-check span {
  display: block;
}


.destination-check span {
  margin-top: 3px;

  font-size: 0.75rem;
}


.destination-fields {
  display: grid;
  gap: 12px;
}


.account-warning {
  margin: 0;

  padding: 10px;

  border:
    1px solid
    rgba(
      233,
      188,
      104,
      0.18
    );

  border-radius: 10px;

  background:
    rgba(
      233,
      188,
      104,
      0.06
    );

  color: var(--warning);

  font-size: 0.78rem;
}


.publisher-footer {
  position: sticky;

  bottom:
    calc(
      -24px -
      env(
        safe-area-inset-bottom
      )
    );

  display: grid;
  gap: 9px;

  padding:
    14px
    0
    calc(
      24px +
      env(
        safe-area-inset-bottom
      )
    );

  background:
    linear-gradient(
      transparent,
      #11151e 22%
    );
}


.existing-publications {
  display: grid;
  gap: 9px;

  padding-bottom: 20px;

  border-bottom:
    1px solid var(--border);
}


.existing-publication-row {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  gap: 9px;

  align-items: center;

  padding: 12px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius-small);

  background:
    rgba(
      255,
      255,
      255,
      0.025
    );
}


.existing-publication-row.publication-attention {
  border-color:
    rgba(
      233,
      188,
      104,
      0.2
    );
}


.existing-publication-row.publication-error {
  border-color:
    rgba(
      255,
      102,
      125,
      0.2
    );
}


.existing-publication-row strong,
.existing-publication-row span {
  display: block;
}


.existing-publication-row span {
  margin-top: 3px;

  font-size: 0.75rem;
}


.existing-publication-row .inline-actions {
  grid-column:
    1 / -1;

  margin-top: 2px;
}


/* =========================================================
   DIALOG
========================================================= */

dialog {
  width:
    min(
      92vw,
      520px
    );

  max-height: 90vh;

  overflow-y: auto;

  padding: 20px;

  border:
    1px solid var(--border);

  border-radius:
    var(--radius);

  background:
    #11151e;

  color: var(--text);

  box-shadow:
    var(--shadow);
}


dialog::backdrop {
  background:
    rgba(
      0,
      0,
      0,
      0.72
    );

  backdrop-filter:
    blur(5px);
}


.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}


/* =========================================================
   SOCIAL
========================================================= */

.social-connect-controls {
  display: grid;
  gap: 10px;
}


.social-connect-controls
.project-switcher {
  width: 100%;
  max-width: none;
}


/* =========================================================
   TOAST
========================================================= */

.toast {
  position: fixed;

  z-index: 120;

  left: 50%;

  bottom: 100px;

  width:
    min(
      calc(
        100% - 32px
      ),
      440px
    );

  transform:
    translateX(-50%);

  padding:
    13px
    16px;

  border:
    1px solid
    rgba(
      103,
      214,
      155,
      0.24
    );

  border-radius:
    var(--radius-small);

  background:
    #14241d;

  color: #b7f0d0;

  box-shadow:
    var(--shadow);

  font-size: 0.86rem;
  font-weight: 700;
}


.toast-error {
  border-color:
    rgba(
      255,
      102,
      125,
      0.25
    );

  background:
    #29151a;

  color: #ffadb9;
}


/* =========================================================
   TABLET
========================================================= */

@media (
  min-width: 700px
) {

  .page {
    padding:
      34px
      28px
      110px;
  }


  .page-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }


  .stats-grid {
    grid-template-columns:
      repeat(
        4,
        1fr
      );
  }


  .dashboard-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
  }


  .project-grid,
  .idea-grid,
  .account-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(
          0,
          1fr
        )
      );
  }


  .form-grid {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }


  .platform-preview {
    grid-template-columns:
      repeat(
        3,
        1fr
      );
  }


  .platform-preview > div {
    display: grid;
    gap: 4px;
  }


  .social-connect-controls {
    grid-template-columns:
      minmax(
        180px,
        1fr
      )
      auto
      auto;

    align-items: center;
  }


  .publisher-footer {
    grid-template-columns:
      1fr
      1fr;
  }


  .publication-row {
    grid-template-columns:
      42px
      minmax(
        0,
        1fr
      )
      auto
      auto;
  }


  .publication-row
  > .inline-actions {
    grid-column: auto;
  }

}


/* =========================================================
   DESKTOP
========================================================= */

@media (
  min-width: 1000px
) {

  .app-shell {
    display: grid;

    grid-template-columns:
      var(--sidebar)
      minmax(
        0,
        1fr
      );
  }


  .sidebar {
    position: sticky;
    top: 0;

    display: flex;
    flex-direction: column;

    height: 100vh;

    padding:
      20px
      14px;

    border-right:
      1px solid var(--border);

    background:
      rgba(
        11,
        14,
        20,
        0.8
      );

    backdrop-filter:
      blur(20px);
  }


  .brand-block {
    display: flex;
    align-items: center;

    gap: 11px;

    margin-bottom: 28px;
  }


  .brand-block strong,
  .brand-block span {
    display: block;
  }


  .brand-block span {
    margin-top: 2px;

    color: var(--muted);

    font-size: 0.72rem;
  }


  .brand-mark {
    display: grid;
    place-items: center;

    width: 40px;
    height: 40px;

    border-radius: 12px;

    background:
      linear-gradient(
        135deg,
        #8a82ff,
        #6255dd
      );

    font-weight: 900;
  }


  .sidebar-label {
    margin-bottom: 7px;

    color: var(--muted);

    font-size: 0.68rem;

    letter-spacing: 0.12em;
    text-transform: uppercase;
  }


  .project-switcher {
    margin-bottom: 18px;
  }


  .desktop-nav {
    display: grid;
    gap: 5px;
  }


  .nav-button {
    display: flex;
    align-items: center;

    gap: 12px;

    min-height: 45px;

    padding:
      0
      13px;

    border: 0;
    border-radius: 11px;

    background: transparent;

    color: var(--muted);

    text-align: left;
  }


  .nav-button.active,
  .nav-button:hover {
    background:
      rgba(
        255,
        255,
        255,
        0.05
      );

    color: white;
  }


  .sidebar-footer {
    margin-top: auto;
  }


  .sidebar-footer button {
    width: 100%;
  }


  .topbar {
    min-height: 74px;

    padding:
      12px
      30px;
  }


  .mobile-brand {
    display: none;
  }


  .desktop-create {
    display: inline-flex;
    align-items: center;
  }


  .mobile-nav {
    display: none;
  }


  .page {
    padding:
      40px
      34px
      60px;
  }


  .bottom-sheet {
    left: auto;

    width:
      min(
        600px,
        94vw
      );

    height: 100vh;
    max-height: none;

    border:
      1px solid var(--border);

    border-radius:
      24px
      0
      0
      24px;

    padding: 24px;
  }


  .publish-sheet {
    width:
      min(
        720px,
        94vw
      );
  }


  .sheet-handle {
    display: none;
  }


  .dashboard-grid {
    grid-template-columns:
      1.2fr
      1fr;
  }


  .project-grid,
  .idea-grid,
  .account-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(
          0,
          1fr
        )
      );
  }


  /*
   * Desktop returns to the horizontal Kanban layout.
   */

  .pipeline-board {
    display: grid;

    grid-auto-flow: column;

    grid-auto-columns: 300px;

    gap: 12px;

    overflow-x: auto;

    padding-bottom: 14px;

    scroll-snap-type:
      x proximity;
  }


  .pipeline-column {
    min-height: 390px;

    margin-left: 0;

    padding: 14px;

    border:
      1px solid var(--border);

    border-radius:
      var(--radius);

    background:
      rgba(
        255,
        255,
        255,
        0.018
      );

    scroll-snap-align:
      start;
  }


  .pipeline-column::before,
  .pipeline-column::after {
    display: none !important;
  }


  .pipeline-heading {
    margin-bottom: 14px;
  }


  .pipeline-heading strong {
    font-size: inherit;

    letter-spacing: normal;
    text-transform: none;
  }


  .pipeline-empty {
    padding:
      28px
      12px;

    text-align: center;
  }


  .content-card {
    padding: 15px;
  }


  .toast {
    bottom: 30px;
  }

}


/* =========================================================
   LARGE DESKTOP
========================================================= */

@media (
  min-width: 1350px
) {

  .dashboard-grid {
    grid-template-columns:
      1.25fr
      1fr
      0.85fr;
  }

}
