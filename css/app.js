:root {
  --bg: #080b12;
  --bg-elevated: #0d111b;
  --panel: rgba(17, 22, 34, 0.86);
  --panel-solid: #111622;
  --panel-soft: #151b29;

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --text: #f4f6fb;
  --muted: #8f99ab;
  --muted-2: #697386;

  --accent: #7c72ff;
  --accent-soft: rgba(124, 114, 255, 0.15);

  --success: #51d49b;
  --warning: #f0b35d;
  --danger: #ff6b78;

  --sidebar-width: 244px;
  --mobile-nav-height: 76px;

  --radius-sm: 10px;
  --radius: 16px;
  --radius-lg: 22px;

  --shadow:
    0 24px 70px rgba(0, 0, 0, 0.35);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--bg);
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 80% -10%,
      rgba(105, 89, 255, 0.13),
      transparent 35%
    ),
    radial-gradient(
      circle at 10% 40%,
      rgba(34, 94, 160, 0.07),
      transparent 35%
    ),
    var(--bg);

  color: var(--text);

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  -webkit-font-smoothing: antialiased;
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

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

[hidden] {
  display: none !important;
}

.app-shell {
  min-height: 100vh;
}

.sidebar {
  display: none;
}

.main-area {
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;

  height: 70px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding:
    env(safe-area-inset-top)
    18px
    0;

  background:
    rgba(8, 11, 18, 0.82);

  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.mobile-brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.mobile-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mobile-brand-copy span,
.eyebrow {
  color: var(--muted-2);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.mobile-brand-copy strong {
  font-size: 0.96rem;
}

.desktop-page-heading {
  display: none;
}

.brand-mark {
  width: 40px;
  height: 40px;

  display: grid;
  place-items: center;

  border-radius: 12px;

  background:
    linear-gradient(
      145deg,
      #8d84ff,
      #5449dc
    );

  color: white;

  font-weight: 900;
  font-size: 0.8rem;

  box-shadow:
    0 10px 30px
    rgba(94, 79, 229, 0.28);
}

.brand-mark.small {
  width: 37px;
  height: 37px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.desktop-create {
  display: none !important;
}

.user-button,
.icon-button {
  border: 1px solid var(--border);
  background: var(--panel-soft);
}

.user-button {
  width: 38px;
  height: 38px;

  border-radius: 50%;

  font-weight: 800;
}

.icon-button {
  width: 40px;
  height: 40px;

  border-radius: 12px;

  font-size: 1.4rem;
}

.page {
  width: min(100%, 1500px);

  margin: 0 auto;

  padding:
    22px
    16px
    calc(
      var(--mobile-nav-height)
      + 30px
      + env(safe-area-inset-bottom)
    );
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 16px;

  margin-bottom: 22px;
}

.page-header h1 {
  margin: 4px 0 5px;

  font-size:
    clamp(1.7rem, 8vw, 2.6rem);

  line-height: 1;
  letter-spacing: -0.045em;
}

.page-header p {
  margin: 0;
  max-width: 680px;

  color: var(--muted);
  line-height: 1.55;
}

.page-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.primary-button,
.secondary-button,
.danger-button {
  min-height: 44px;

  border-radius: 12px;

  padding: 0 16px;

  border: 1px solid transparent;

  font-weight: 750;
}

.primary-button {
  background:
    linear-gradient(
      135deg,
      #8076ff,
      #665af0
    );

  color: white;

  box-shadow:
    0 10px 28px
    rgba(89, 75, 225, 0.24);
}

.secondary-button {
  background: var(--panel-soft);
  border-color: var(--border);
}

.danger-button {
  background: rgba(255, 107, 120, 0.08);
  border-color: rgba(255, 107, 120, 0.18);
  color: #ff8994;
}

.large-button {
  width: 100%;
  min-height: 52px;
}

.dashboard-hero {
  position: relative;
  overflow: hidden;

  padding: 22px;

  margin-bottom: 18px;

  border: 1px solid var(--border);
  border-radius: var(--radius-lg);

  background:
    linear-gradient(
      145deg,
      rgba(124, 114, 255, 0.16),
      rgba(17, 22, 34, 0.84) 45%,
      rgba(17, 22, 34, 0.9)
    );

  box-shadow: var(--shadow);
}

.dashboard-hero::after {
  content: "";

  position: absolute;
  width: 220px;
  height: 220px;
  right: -100px;
  top: -100px;

  border-radius: 50%;

  background:
    rgba(124, 114, 255, 0.15);

  filter: blur(20px);
}

.dashboard-hero > * {
  position: relative;
  z-index: 1;
}

.dashboard-hero h1 {
  margin: 8px 0;

  font-size:
    clamp(1.8rem, 9vw, 3.1rem);

  letter-spacing: -0.05em;
}

.dashboard-hero p {
  margin: 0;

  color: var(--muted);

  max-width: 650px;

  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;

  margin-bottom: 18px;
}

.stat-card {
  padding: 16px;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background: var(--panel);
}

.stat-card span {
  color: var(--muted);

  font-size: 0.76rem;
}

.stat-card strong {
  display: block;

  margin-top: 7px;

  font-size: 1.65rem;

  letter-spacing: -0.04em;
}

.dashboard-grid {
  display: grid;
  gap: 14px;
}

.panel {
  min-width: 0;

  border: 1px solid var(--border);
  border-radius: var(--radius-lg);

  background: var(--panel);

  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;

  padding: 17px 17px 14px;

  border-bottom: 1px solid var(--border);
}

.panel-header h2 {
  margin: 0;

  font-size: 0.96rem;
}

.panel-header span {
  color: var(--muted);

  font-size: 0.75rem;
}

.panel-body {
  padding: 14px;
}

.list {
  display: grid;
  gap: 9px;
}

.list-item {
  display: flex;
  align-items: center;

  gap: 12px;

  padding: 12px;

  border: 1px solid var(--border);
  border-radius: 13px;

  background:
    rgba(255, 255, 255, 0.018);
}

.list-item-main {
  min-width: 0;
  flex: 1;
}

.list-item strong {
  display: block;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 0.88rem;
}

.list-item small {
  display: block;

  margin-top: 4px;

  color: var(--muted);

  font-size: 0.72rem;
}

.project-dot {
  width: 10px;
  height: 10px;

  flex: 0 0 auto;

  border-radius: 50%;

  background: var(--accent);
}

.status-pill {
  display: inline-flex;
  align-items: center;

  min-height: 24px;

  padding: 0 8px;

  border: 1px solid var(--border);

  border-radius: 999px;

  color: var(--muted);

  background:
    rgba(255, 255, 255, 0.025);

  font-size: 0.65rem;
  font-weight: 800;

  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pill.ready,
.status-pill.published,
.status-pill.connected {
  color: var(--success);
  border-color: rgba(81, 212, 155, 0.18);
  background: rgba(81, 212, 155, 0.07);
}

.status-pill.editing,
.status-pill.recording,
.status-pill.queued,
.status-pill.processing {
  color: var(--warning);
  border-color: rgba(240, 179, 93, 0.18);
  background: rgba(240, 179, 93, 0.07);
}

.status-pill.disconnected,
.status-pill.failed {
  color: var(--danger);
}

.empty-state {
  padding: 34px 18px;

  text-align: center;

  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);

  color: var(--muted);
}

.empty-state strong {
  display: block;

  margin-bottom: 7px;

  color: var(--text);
}

.empty-state p {
  margin: 0 auto 15px;

  max-width: 430px;

  font-size: 0.82rem;
  line-height: 1.5;
}

.project-grid,
.content-grid,
.idea-grid,
.account-grid {
  display: grid;
  gap: 12px;
}

.project-card,
.content-card,
.idea-card,
.account-card {
  position: relative;

  padding: 17px;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background: var(--panel);

  overflow: hidden;
}

.project-card::before {
  content: "";

  position: absolute;

  top: 0;
  left: 0;

  width: 4px;
  height: 100%;

  background:
    var(--project-accent, var(--accent));
}

.project-card h3,
.content-card h3,
.idea-card h3,
.account-card h3 {
  margin: 0 0 7px;

  font-size: 1rem;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;

  gap: 7px;

  margin-top: 13px;
}

.card-copy {
  margin: 0;

  color: var(--muted);

  font-size: 0.8rem;
  line-height: 1.5;
}

.content-pipeline {
  display: grid;
  gap: 14px;
}

.pipeline-column {
  min-width: 0;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background:
    rgba(255, 255, 255, 0.015);

  overflow: hidden;
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 13px 14px;

  border-bottom: 1px solid var(--border);
}

.pipeline-header strong {
  font-size: 0.82rem;
}

.pipeline-header span {
  color: var(--muted);

  font-size: 0.72rem;
}

.pipeline-items {
  display: grid;
  gap: 9px;

  padding: 10px;
}

.pipeline-card {
  padding: 13px;

  border: 1px solid var(--border);
  border-radius: 12px;

  background: var(--panel-solid);
}

.pipeline-card strong {
  display: block;

  font-size: 0.84rem;

  line-height: 1.35;
}

.pipeline-card small {
  display: block;

  margin-top: 7px;

  color: var(--muted);

  font-size: 0.68rem;
}

.pipeline-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;

  margin-top: 10px;
}

.mini-button {
  min-height: 31px;

  padding: 0 9px;

  border: 1px solid var(--border);
  border-radius: 8px;

  background: var(--panel-soft);

  font-size: 0.68rem;
  font-weight: 700;
}

.calendar-list {
  display: grid;
  gap: 10px;
}

.calendar-event {
  display: grid;
  grid-template-columns: 56px 1fr;

  gap: 12px;

  padding: 13px;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background: var(--panel);
}

.calendar-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-height: 55px;

  border-radius: 12px;

  background: var(--accent-soft);
}

.calendar-date strong {
  font-size: 1.25rem;
}

.calendar-date span {
  color: var(--muted);

  font-size: 0.65rem;

  text-transform: uppercase;
}

.account-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.platform-badge {
  display: inline-flex;

  margin-bottom: 10px;

  color: var(--muted);

  font-size: 0.67rem;
  font-weight: 850;

  letter-spacing: 0.08em;

  text-transform: uppercase;
}

.account-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  margin-top: 14px;
}

.loading-state {
  min-height: 55vh;

  display: grid;
  place-items: center;

  align-content: center;
  gap: 14px;

  color: var(--muted);
}

.spinner {
  width: 32px;
  height: 32px;

  border-radius: 50%;

  border:
    3px solid
    rgba(255, 255, 255, 0.08);

  border-top-color: var(--accent);

  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.mobile-nav {
  position: fixed;

  z-index: 30;

  bottom: 0;
  left: 0;
  right: 0;

  height:
    calc(
      var(--mobile-nav-height)
      + env(safe-area-inset-bottom)
    );

  display: grid;

  grid-template-columns:
    1fr
    1fr
    68px
    1fr
    1fr;

  align-items: start;

  padding:
    8px
    8px
    env(safe-area-inset-bottom);

  background:
    rgba(10, 13, 21, 0.95);

  backdrop-filter: blur(22px);

  border-top: 1px solid var(--border);
}

.mobile-nav-item {
  min-height: 54px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 3px;

  border: 0;
  background: transparent;

  color: var(--muted);
}

.mobile-nav-item span {
  font-size: 1.1rem;
}

.mobile-nav-item small {
  font-size: 0.62rem;
  font-weight: 700;
}

.mobile-nav-item.active {
  color: white;
}

.mobile-create-button {
  width: 56px;
  height: 56px;

  align-self: start;
  justify-self: center;

  margin-top: -18px;

  border: 5px solid var(--bg);

  border-radius: 18px;

  background:
    linear-gradient(
      135deg,
      #8b82ff,
      #5f53e8
    );

  color: white;

  font-size: 1.65rem;

  box-shadow:
    0 12px 35px
    rgba(91, 76, 226, 0.35);
}

.backdrop {
  position: fixed;
  inset: 0;

  z-index: 40;

  background:
    rgba(0, 0, 0, 0.64);

  backdrop-filter: blur(5px);
}

.sheet {
  position: fixed;

  z-index: 50;

  left: 0;
  right: 0;
  bottom: 0;

  max-height: 92dvh;

  overflow-y: auto;

  padding:
    9px
    18px
    calc(
      24px +
      env(safe-area-inset-bottom)
    );

  border:
    1px solid
    var(--border-strong);

  border-bottom: 0;

  border-radius:
    24px 24px 0 0;

  background:
    #101521;

  box-shadow:
    0 -30px 80px
    rgba(0, 0, 0, 0.55);
}

.sheet-handle {
  width: 42px;
  height: 4px;

  margin:
    0 auto
    15px;

  border-radius: 999px;

  background:
    rgba(255, 255, 255, 0.17);
}

.sheet-header,
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 14px;

  margin-bottom: 20px;
}

.sheet-header h2,
.dialog-header h2 {
  margin: 4px 0 0;

  font-size: 1.35rem;
}

.form-stack {
  display: grid;
  gap: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns:
    1fr 1fr;

  gap: 10px;
}

.field {
  display: grid;
  gap: 7px;
}

.field > span {
  color: var(--muted);

  font-size: 0.72rem;
  font-weight: 750;
}

input,
textarea,
select {
  width: 100%;

  border: 1px solid var(--border);
  border-radius: 12px;

  background: #0b0f18;
  color: var(--text);

  padding: 12px 13px;
}

input,
select {
  min-height: 47px;
}

textarea {
  resize: vertical;
}

.platform-preview {
  padding: 14px;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background:
    rgba(255, 255, 255, 0.018);
}

.platform-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  gap: 10px;

  margin-bottom: 12px;
}

.platform-preview-header strong {
  display: block;

  margin-top: 3px;

  font-size: 0.84rem;
}

.coming-soon-badge {
  color: var(--muted);

  font-size: 0.58rem;
  font-weight: 850;

  letter-spacing: 0.08em;
}

.platform-preview-grid {
  display: grid;
  gap: 8px;
}

.platform-preview-card {
  display: flex;
  align-items: center;

  gap: 10px;

  padding: 10px;

  border: 1px solid var(--border);
  border-radius: 11px;

  opacity: 0.72;
}

.platform-logo {
  width: 35px;
  height: 35px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 10px;

  background: var(--panel-soft);

  font-size: 0.65rem;
  font-weight: 900;
}

.platform-preview-card strong {
  display: block;

  font-size: 0.78rem;
}

.platform-preview-card small {
  display: block;

  margin-top: 2px;

  color: var(--muted);

  font-size: 0.64rem;
}

.more-grid {
  display: grid;
  grid-template-columns:
    1fr 1fr;

  gap: 10px;

  margin-bottom: 20px;
}

.more-grid button {
  min-height: 115px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;

  padding: 14px;

  border: 1px solid var(--border);
  border-radius: var(--radius);

  background: var(--panel-soft);

  text-align: left;
}

.more-grid button > span {
  margin-bottom: auto;

  font-size: 1.3rem;
}

.more-grid strong {
  font-size: 0.85rem;
}

.more-grid small {
  margin-top: 4px;

  color: var(--muted);

  font-size: 0.66rem;
}

.app-dialog {
  width:
    min(
      calc(100% - 24px),
      520px
    );

  max-height: 90dvh;

  padding: 0;

  border: 1px solid var(--border-strong);
  border-radius: 22px;

  background: transparent;
  color: var(--text);

  box-shadow: var(--shadow);
}

.app-dialog::backdrop {
  background:
    rgba(0, 0, 0, 0.68);

  backdrop-filter: blur(5px);
}

.dialog-card {
  display: grid;
  gap: 15px;

  padding: 20px;

  background: #101521;
}

.toast {
  position: fixed;

  z-index: 100;

  left: 50%;
  bottom:
    calc(
      var(--mobile-nav-height)
      + 20px
      + env(safe-area-inset-bottom)
    );

  transform: translateX(-50%);

  width:
    min(
      calc(100% - 32px),
      420px
    );

  padding: 12px 14px;

  border: 1px solid var(--border-strong);
  border-radius: 12px;

  background: #171d2a;

  box-shadow: var(--shadow);

  text-align: center;

  font-size: 0.78rem;
  font-weight: 700;
}

.social-connect-controls {
  display: grid;
  gap: 10px;

  margin-bottom: 18px;
}

.social-connect-controls
.project-switcher {
  width: 100%;
}

@media (min-width: 700px) {
  .project-grid,
  .content-grid,
  .idea-grid,
  .account-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .stats-grid {
    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );
  }

  .dashboard-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .social-connect-controls {
    grid-template-columns:
      minmax(180px, 1fr)
      auto
      auto;

    align-items: center;
  }
}

@media (min-width: 1000px) {
  .app-shell {
    display: grid;

    grid-template-columns:
      var(--sidebar-width)
      minmax(0, 1fr);
  }

  .sidebar {
    position: sticky;
    top: 0;

    height: 100vh;

    display: flex;
    flex-direction: column;

    padding: 20px 14px;

    border-right: 1px solid var(--border);

    background:
      rgba(9, 12, 19, 0.88);

    backdrop-filter: blur(20px);
  }

  .brand-block {
    display: flex;
    align-items: center;

    gap: 11px;

    padding: 0 7px 24px;
  }

  .brand-block strong {
    display: block;

    font-size: 0.86rem;
  }

  .brand-block span {
    display: block;

    margin-top: 3px;

    color: var(--muted);

    font-size: 0.64rem;
  }

  .sidebar-workspace {
    padding:
      0 5px
      16px;
  }

  .sidebar-workspace label {
    display: block;

    margin-bottom: 7px;

    color: var(--muted-2);

    font-size: 0.58rem;
    font-weight: 850;

    letter-spacing: 0.1em;
  }

  .project-switcher {
    width: 100%;

    min-height: 43px;
  }

  .desktop-nav {
    display: grid;
    gap: 4px;
  }

  .nav-item {
    width: 100%;

    min-height: 44px;

    display: flex;
    align-items: center;

    gap: 11px;

    padding: 0 12px;

    border: 1px solid transparent;
    border-radius: 11px;

    background: transparent;

    color: var(--muted);

    text-align: left;

    font-size: 0.8rem;
    font-weight: 700;
  }

  .nav-item:hover,
  .nav-item.active {
    color: white;

    border-color: var(--border);

    background:
      rgba(255, 255, 255, 0.04);
  }

  .nav-icon {
    width: 22px;

    text-align: center;
  }

  .sidebar-footer {
    margin-top: auto;
  }

  .topbar {
    height: 72px;

    padding: 0 28px;
  }

  .mobile-brand {
    display: none;
  }

  .desktop-page-heading {
    display: flex;
    flex-direction: column;
  }

  .desktop-page-heading strong {
    margin-top: 2px;

    font-size: 1rem;
  }

  .desktop-create {
    display: inline-flex !important;

    align-items: center;
    gap: 6px;
  }

  .page {
    padding:
      30px
      28px
      60px;
  }

  .mobile-nav {
    display: none;
  }

  .sheet {
    left: auto;
    right: 24px;
    bottom: 24px;

    width: 520px;

    max-height:
      calc(100vh - 48px);

    border: 1px solid var(--border-strong);

    border-radius: 22px;

    padding: 14px 20px 22px;
  }

  .sheet-handle {
    display: none;
  }

  .toast {
    bottom: 25px;
  }

  .page-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .dashboard-grid {
    grid-template-columns:
      1.2fr 0.8fr;
  }

  .project-grid,
  .content-grid,
  .idea-grid,
  .account-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
  }

  .content-pipeline {
    grid-template-columns:
      repeat(
        4,
        minmax(230px, 1fr)
      );

    overflow-x: auto;
  }
}

@media (min-width: 1350px) {
  .project-grid,
  .content-grid,
  .idea-grid,
  .account-grid {
    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );
  }
           }
