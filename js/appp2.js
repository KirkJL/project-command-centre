"use strict";

(() => {
  const API = window.API;

  if (!API) {
    throw new Error(
      "API client is not loaded."
    );
  }


  /* ======================================================
     DOM
  ====================================================== */

  const page =
    document.getElementById("page");

  const projectSwitcher =
    document.getElementById(
      "projectSwitcher"
    );

  const mobileSection =
    document.getElementById(
      "mobileSection"
    );

  const desktopSection =
    document.getElementById(
      "desktopSection"
    );

  const userInitial =
    document.getElementById(
      "userInitial"
    );

  const createButton =
    document.getElementById(
      "createButton"
    );

  const mobileCreateButton =
    document.getElementById(
      "mobileCreateButton"
    );

  const moreButton =
    document.getElementById(
      "moreButton"
    );

  const createSheet =
    document.getElementById(
      "createSheet"
    );

  const moreSheet =
    document.getElementById(
      "moreSheet"
    );

  const backdrop =
    document.getElementById(
      "backdrop"
    );

  const toast =
    document.getElementById(
      "toast"
    );

  const logoutButton =
    document.getElementById(
      "logoutButton"
    );

  const mobileLogout =
    document.getElementById(
      "mobileLogout"
    );

  const contentForm =
    document.getElementById(
      "contentForm"
    );

  const projectDialog =
    document.getElementById(
      "projectDialog"
    );

  const projectForm =
    document.getElementById(
      "projectForm"
    );

  const ideaDialog =
    document.getElementById(
      "ideaDialog"
    );

  const ideaForm =
    document.getElementById(
      "ideaForm"
    );

  const accountDialog =
    document.getElementById(
      "accountDialog"
    );

  const accountForm =
    document.getElementById(
      "accountForm"
    );


  /* ======================================================
     STATE
  ====================================================== */

  const state = {
    user: null,
    projects: [],
    activeProjectId: null,
    route: "today"
  };


  const ROUTE_TITLES = {
    today: "Today",
    content: "Content",
    calendar: "Calendar",
    projects: "Projects",
    ideas: "Ideas",
    accounts: "Accounts",
    analytics: "Analytics"
  };


  const PIPELINE_STAGES = [
    "idea",
    "script",
    "recording",
    "editing",
    "ready",
    "scheduled",
    "published"
  ];


  /* ======================================================
     SAFE DOM HELPERS
  ====================================================== */

  function element(
    tag,
    options = {}
  ) {
    const node =
      document.createElement(tag);

    if (options.className) {
      node.className =
        options.className;
    }

    if (
      options.text !== undefined
    ) {
      node.textContent =
        String(options.text);
    }

    if (options.type) {
      node.type =
        options.type;
    }

    return node;
  }


  function clear(node) {
    while (node.firstChild) {
      node.removeChild(
        node.firstChild
      );
    }
  }


  function formatStatus(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );
  }


  function selectedProject() {
    if (!state.activeProjectId) {
      return null;
    }

    return (
      state.projects.find(
        project =>
          Number(project.id) ===
          Number(
            state.activeProjectId
          )
      ) || null
    );
  }


  function projectMatches(
    projectId
  ) {
    if (!state.activeProjectId) {
      return true;
    }

    return (
      Number(projectId) ===
      Number(
        state.activeProjectId
      )
    );
  }


  function showToast(
    message,
    duration = 2600
  ) {
    toast.textContent =
      String(message);

    toast.hidden = false;

    window.clearTimeout(
      showToast.timeout
    );

    showToast.timeout =
      window.setTimeout(
        () => {
          toast.hidden = true;
        },
        duration
      );
  }


  function showLoading() {
    clear(page);

    const wrapper =
      element(
        "div",
        {
          className:
            "loading-state"
        }
      );

    wrapper.append(
      element(
        "div",
        {
          className:
            "spinner"
        }
      )
    );

    wrapper.append(
      element(
        "p",
        {
          text:
            "Loading Command Centre…"
        }
      )
    );

    page.append(wrapper);
  }


  function showError(error) {
    clear(page);

    const wrapper =
      element(
        "div",
        {
          className:
            "empty-state"
        }
      );

    wrapper.append(
      element(
        "strong",
        {
          text:
            "Something went wrong"
        }
      )
    );

    wrapper.append(
      element(
        "p",
        {
          text:
            error?.data?.error ||
            error?.message ||
            "Unable to load this view."
        }
      )
    );

    const retry =
      element(
        "button",
        {
          className:
            "secondary-button",
          text: "Try again",
          type: "button"
        }
      );

    retry.addEventListener(
      "click",
      () => {
        renderRoute();
      }
    );

    wrapper.append(retry);

    page.append(wrapper);
  }


  function emptyState(
    title,
    description,
    actionText,
    action
  ) {
    const wrapper =
      element(
        "div",
        {
          className:
            "empty-state"
        }
      );

    wrapper.append(
      element(
        "strong",
        {
          text: title
        }
      )
    );

    wrapper.append(
      element(
        "p",
        {
          text: description
        }
      )
    );

    if (
      actionText &&
      typeof action === "function"
    ) {
      const button =
        element(
          "button",
          {
            className:
              "secondary-button",
            text: actionText,
            type: "button"
          }
        );

      button.addEventListener(
        "click",
        action
      );

      wrapper.append(button);
    }

    return wrapper;
  }


  function statusPill(status) {
    return element(
      "span",
      {
        className:
          `status-pill ${status || ""}`,
        text:
          formatStatus(status)
      }
    );
  }


  /* ======================================================
     SHEETS
  ====================================================== */

  function openSheet(sheet) {
    closeSheets();

    sheet.hidden = false;
    backdrop.hidden = false;

    document.body.style.overflow =
      "hidden";
  }


  function closeSheets() {
    createSheet.hidden = true;
    moreSheet.hidden = true;
    backdrop.hidden = true;

    document.body.style.overflow =
      "";
  }


  /* ======================================================
     PROJECT SELECTS
  ====================================================== */

  function populateProjectSelect(
    select,
    {
      includeAll = false,
      includeUnassigned = false
    } = {}
  ) {
    clear(select);

    if (includeAll) {
      const option =
        document.createElement(
          "option"
        );

      option.value = "";
      option.textContent =
        "All projects";

      select.append(option);
    }

    if (includeUnassigned) {
      const option =
        document.createElement(
          "option"
        );

      option.value = "";
      option.textContent =
        "Unassigned";

      select.append(option);
    }

    for (
      const project
      of state.projects
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(project.id);

      option.textContent =
        project.name;

      select.append(option);
    }

    if (
      state.activeProjectId &&
      [...select.options].some(
        option =>
          option.value ===
          String(
            state.activeProjectId
          )
      )
    ) {
      select.value =
        String(
          state.activeProjectId
        );
    }
  }


  function populateAllProjectSelects() {
    populateProjectSelect(
      projectSwitcher,
      {
        includeAll: true
      }
    );

    populateProjectSelect(
      document.getElementById(
        "contentProject"
      )
    );

    populateProjectSelect(
      document.getElementById(
        "ideaProject"
      ),
      {
        includeUnassigned: true
      }
    );

    populateProjectSelect(
      document.getElementById(
        "accountProject"
      )
    );
  }


  /* ======================================================
     NAVIGATION
  ====================================================== */

  function updateNavigation() {
    const title =
      ROUTE_TITLES[state.route] ||
      "Command Centre";

    mobileSection.textContent =
      title;

    desktopSection.textContent =
      title;

    document
      .querySelectorAll(
        "[data-route]"
      )
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.route ===
            state.route
        );
      });
  }


  async function navigate(route) {
    if (!ROUTE_TITLES[route]) {
      route = "today";
    }

    state.route = route;

    closeSheets();
    updateNavigation();

    await renderRoute();
  }


  async function renderRoute() {
    showLoading();

    try {
      switch (state.route) {
        case "today":
          await renderToday();
          break;

        case "content":
          await renderContent();
          break;

        case "calendar":
          await renderCalendar();
          break;

        case "projects":
          await renderProjects();
          break;

        case "ideas":
          await renderIdeas();
          break;

        case "accounts":
          await renderAccounts();
          break;

        case "analytics":
          renderAnalytics();
          break;

        default:
          await renderToday();
      }
    } catch (error) {
      console.error(error);
      showError(error);
    }
  }


  /* ======================================================
     PAGE HEADER
  ====================================================== */

  function createPageHeader(
    eyebrow,
    title,
    description
  ) {
    const header =
      element(
        "header",
        {
          className:
            "page-header"
        }
      );

    const copy =
      element("div");

    copy.append(
      element(
        "span",
        {
          className:
            "eyebrow",
          text: eyebrow
        }
      )
    );

    copy.append(
      element(
        "h1",
        {
          text: title
        }
      )
    );

    copy.append(
      element(
        "p",
        {
          text: description
        }
      )
    );

    header.append(copy);

    const actions =
      element(
        "div",
        {
          className:
            "page-actions"
        }
      );

    header.append(actions);

    return {
      header,
      actions
    };
  }


  /* ======================================================
     TODAY
  ====================================================== */

  async function renderToday() {
    const data =
      await API.dashboard();

    clear(page);

    let projects =
      data.projects || [];

    let content =
      data.recentContent || [];

    let tasks =
      data.tasks || [];

    let publications =
      data.publications || [];

    if (state.activeProjectId) {
      projects =
        projects.filter(
          project =>
            projectMatches(
              project.id
            )
        );

      content =
        content.filter(
          item =>
            projectMatches(
              item.project_id
            )
        );

      tasks =
        tasks.filter(
          item => {
            const project =
              selectedProject();

            return (
              !project ||
              item.project_name ===
                project.name
            );
          }
        );
    }

    const active =
      selectedProject();

    const hero =
      element(
        "section",
        {
          className:
            "dashboard-hero"
        }
      );

    hero.append(
      element(
        "span",
        {
          className:
            "eyebrow",
          text:
            active
              ? "ACTIVE WORKSPACE"
              : "YOUR COMMAND CENTRE"
        }
      )
    );

    hero.append(
      element(
        "h1",
        {
          text:
            active
              ? active.name
              : `Evening, ${
                  state.user
                    ?.displayName ||
                  "Kirk"
                }.`
        }
      )
    );

    hero.append(
      element(
        "p",
        {
          text:
            active
              ? "Ideas, content, publishing and work for this project in one place."
              : "Everything you're building, editing and publishing — without bouncing between apps."
        }
      )
    );

    const heroActions =
      element(
        "div",
        {
          className:
            "hero-actions"
        }
      );

    const create =
      element(
        "button",
        {
          className:
            "primary-button",
          text:
            "＋ Create content",
          type: "button"
        }
      );

    create.addEventListener(
      "click",
      () =>
        openSheet(
          createSheet
        )
    );

    const idea =
      element(
        "button",
        {
          className:
            "secondary-button",
          text:
            "✦ Capture idea",
          type: "button"
        }
      );

    idea.addEventListener(
      "click",
      () =>
        ideaDialog.showModal()
    );

    heroActions.append(
      create,
      idea
    );

    hero.append(heroActions);

    page.append(hero);


    const stats =
      element(
        "div",
        {
          className:
            "stats-grid"
        }
      );

    const statData = [
      [
        "Active projects",
        projects.length
      ],
      [
        "Content moving",
        content.length
      ],
      [
        "Open tasks",
        tasks.length
      ],
      [
        "Ideas inbox",
        data.ideaCount || 0
      ]
    ];

    for (
      const [label, value]
      of statData
    ) {
      const card =
        element(
          "article",
          {
            className:
              "stat-card"
          }
        );

      card.append(
        element(
          "span",
          {
            text: label
          }
        )
      );

      card.append(
        element(
          "strong",
          {
            text: value
          }
        )
      );

      stats.append(card);
    }

    page.append(stats);


    const grid =
      element(
        "div",
        {
          className:
            "dashboard-grid"
        }
      );

    grid.append(
      dashboardContentPanel(
        content
      )
    );

    grid.append(
      dashboardQueuePanel(
        publications
      )
    );

    grid.append(
      dashboardTasksPanel(
        tasks
      )
    );

    grid.append(
      dashboardProjectsPanel(
        projects
      )
    );

    page.append(grid);
  }


  function createPanel(
    title,
    subtitle
  ) {
    const panel =
      element(
        "section",
        {
          className: "panel"
        }
      );

    const header =
      element(
        "header",
        {
          className:
            "panel-header"
        }
      );

    header.append(
      element(
        "h2",
        {
          text: title
        }
      )
    );

    header.append(
      element(
        "span",
        {
          text: subtitle
        }
      )
    );

    const body =
      element(
        "div",
        {
          className:
            "panel-body"
        }
      );

    panel.append(
      header,
      body
    );

    return {
      panel,
      body
    };
  }


  function dashboardContentPanel(
    items
  ) {
    const {
      panel,
      body
    } = createPanel(
      "Content in motion",
      `${items.length} items`
    );

    if (!items.length) {
      body.append(
        emptyState(
          "Nothing moving yet",
          "Create your first content item and it will appear here.",
          "Create content",
          () =>
            openSheet(
              createSheet
            )
        )
      );

      return panel;
    }

    const list =
      element(
        "div",
        {
          className: "list"
        }
      );

    for (
      const item
      of items.slice(0, 6)
    ) {
      const row =
        element(
          "div",
          {
            className:
              "list-item"
          }
        );

      const dot =
        element(
          "span",
          {
            className:
              "project-dot"
          }
        );

      const main =
        element(
          "div",
          {
            className:
              "list-item-main"
          }
        );

      main.append(
        element(
          "strong",
          {
            text: item.title
          }
        )
      );

      main.append(
        element(
          "small",
          {
            text:
              item.project_name ||
              "Project"
          }
        )
      );

      row.append(
        dot,
        main,
        statusPill(
          item.status
        )
      );

      list.append(row);
    }

    body.append(list);

    return panel;
  }


  function dashboardQueuePanel(
    items
  ) {
    const {
      panel,
      body
    } = createPanel(
      "Publishing queue",
      `${items.length} queued`
    );

    if (!items.length) {
      body.append(
        emptyState(
          "Queue is clear",
          "Scheduled publications will appear here once the publishing composer is enabled."
        )
      );

      return panel;
    }

    const list =
      element(
        "div",
        {
          className: "list"
        }
      );

    for (const item of items) {
      const row =
        element(
          "div",
          {
            className:
              "list-item"
          }
        );

      const main =
        element(
          "div",
          {
            className:
              "list-item-main"
          }
        );

      main.append(
        element(
          "strong",
          {
            text: item.title
          }
        )
      );

      main.append(
        element(
          "small",
          {
            text:
              `${formatStatus(
                item.platform
              )} · ${
                item.account_name ||
                "Account"
              }`
          }
        )
      );

      row.append(
        main,
        statusPill(
          item.publish_state
        )
      );

      list.append(row);
    }

    body.append(list);

    return panel;
  }


  function dashboardTasksPanel(
    items
  ) {
    const {
      panel,
      body
    } = createPanel(
      "Tasks",
      `${items.length} open`
    );

    if (!items.length) {
      body.append(
        emptyState(
          "Nothing urgent",
          "Your active project tasks will appear here."
        )
      );

      return panel;
    }

    const list =
      element(
        "div",
        {
          className: "list"
        }
      );

    for (
      const item
      of items.slice(0, 6)
    ) {
      const row =
        element(
          "div",
          {
            className:
              "list-item"
          }
        );

      const main =
        element(
          "div",
          {
            className:
              "list-item-main"
          }
        );

      main.append(
        element(
          "strong",
          {
            text: item.title
          }
        )
      );

      main.append(
        element(
          "small",
          {
            text:
              item.project_name ||
              "General"
          }
        )
      );

      row.append(
        main,
        statusPill(
          item.priority ||
          "normal"
        )
      );

      list.append(row);
    }

    body.append(list);

    return panel;
  }


  function dashboardProjectsPanel(
    projects
  ) {
    const {
      panel,
      body
    } = createPanel(
      "Workspaces",
      `${projects.length} active`
    );

    if (!projects.length) {
      body.append(
        emptyState(
          "No workspace",
          "Create a project to separate your brands and work.",
          "New project",
          () =>
            projectDialog.showModal()
        )
      );

      return panel;
    }

    const list =
      element(
        "div",
        {
          className: "list"
        }
      );

    for (
      const project
      of projects.slice(0, 6)
    ) {
      const row =
        element(
          "button",
          {
            className:
              "list-item",
            type: "button"
          }
        );

      row.style.width =
        "100%";

      row.style.color =
        "inherit";

      row.style.textAlign =
        "left";

      const dot =
        element(
          "span",
          {
            className:
              "project-dot"
          }
        );

      dot.style.background =
        project.accent_colour ||
        "#6C63FF";

      const main =
        element(
          "div",
          {
            className:
              "list-item-main"
          }
        );

      main.append(
        element(
          "strong",
          {
            text: project.name
          }
        )
      );

      main.append(
        element(
          "small",
          {
            text:
              formatStatus(
                project.project_type
              )
          }
        )
      );

      row.append(
        dot,
        main
      );

      row.addEventListener(
        "click",
        async () => {
          state.activeProjectId =
            project.id;

          projectSwitcher.value =
            String(project.id);

          await renderRoute();
        }
      );

      list.append(row);
    }

    body.append(list);

    return panel;
  }


  /* ======================================================
     CONTENT
  ====================================================== */

  async function renderContent() {
    const data =
      await API.content({
        projectId:
          state.activeProjectId
      });

    const items =
      data.content || [];

    clear(page);

    const {
      header,
      actions
    } = createPageHeader(
      "CONTENT ENGINE",
      selectedProject()
        ? `${selectedProject().name} content`
        : "Content pipeline",
      "Move every piece from idea to published without losing track of what comes next."
    );

    const create =
      element(
        "button",
        {
          className:
            "primary-button",
          text:
            "＋ Create content",
          type: "button"
        }
      );

    create.addEventListener(
      "click",
      () =>
        openSheet(
          createSheet
        )
    );

    actions.append(create);

    page.append(header);

    if (!items.length) {
      page.append(
        emptyState(
          "Your pipeline is empty",
          "Create a master content item to start building your publishing workflow.",
          "Create content",
          () =>
            openSheet(
              createSheet
            )
        )
      );

      return;
    }

    const pipeline =
      element(
        "div",
        {
          className:
            "content-pipeline"
        }
      );

    for (
      const stage
      of PIPELINE_STAGES
    ) {
      const stageItems =
        items.filter(
          item =>
            item.status === stage
        );

      if (
        stageItems.length === 0 &&
        ![
          "idea",
          "editing",
          "ready",
          "published"
        ].includes(stage)
      ) {
        continue;
      }

      const column =
        element(
          "section",
          {
            className:
              "pipeline-column"
          }
        );

      const header =
        element(
          "header",
          {
            className:
              "pipeline-header"
          }
        );

      header.append(
        element(
          "strong",
          {
            text:
              formatStatus(stage)
          }
        )
      );

      header.append(
        element(
          "span",
          {
            text:
              stageItems.length
          }
        )
      );

      const body =
        element(
          "div",
          {
            className:
              "pipeline-items"
          }
        );

      for (
        const item
        of stageItems
      ) {
        body.append(
          createPipelineCard(
            item
          )
        );
      }

      if (!stageItems.length) {
        body.append(
          element(
            "small",
            {
              className:
                "card-copy",
              text:
                "Nothing here."
            }
          )
        );
      }

      column.append(
        header,
        body
      );

      pipeline.append(column);
    }

    page.append(pipeline);
  }


  function createPipelineCard(
    item
  ) {
    const card =
      element(
        "article",
        {
          className:
            "pipeline-card"
        }
      );

    card.append(
      element(
        "strong",
        {
          text: item.title
        }
      )
    );

    card.append(
      element(
        "small",
        {
          text:
            `${item.project_name} · ${formatStatus(
              item.content_type
            )}`
        }
      )
    );

    const actions =
      element(
        "div",
        {
          className:
            "pipeline-actions"
        }
      );

    const currentIndex =
      PIPELINE_STAGES.indexOf(
        item.status
      );

    if (
      currentIndex > 0 &&
      item.status !== "published"
    ) {
      const previous =
        element(
          "button",
          {
            className:
              "mini-button",
            text: "← Back",
            type: "button"
          }
        );

      previous.addEventListener(
        "click",
        async () => {
          await moveContent(
            item.id,
            PIPELINE_STAGES[
              currentIndex - 1
            ]
          );
        }
      );

      actions.append(previous);
    }

    if (
      currentIndex >= 0 &&
      currentIndex <
        PIPELINE_STAGES.length - 1 &&
      item.status !== "ready"
    ) {
      const next =
        element(
          "button",
          {
            className:
              "mini-button",
            text: "Next →",
            type: "button"
          }
        );

      next.addEventListener(
        "click",
        async () => {
          await moveContent(
            item.id,
            PIPELINE_STAGES[
              currentIndex + 1
            ]
          );
        }
      );

      actions.append(next);
    }

    if (item.status === "ready") {
      const publish =
        element(
          "button",
          {
            className:
              "mini-button",
            text:
              "Schedule",
            type: "button"
          }
        );

      publish.addEventListener(
        "click",
        () => {
          showToast(
            "Platform scheduling is the next API build."
          );
        }
      );

      actions.append(publish);
    }

    card.append(actions);

    return card;
  }


  async function moveContent(
    id,
    status
  ) {
    try {
      await API.updateContentStatus(
        id,
        status
      );

      showToast(
        `Moved to ${formatStatus(
          status
        )}`
      );

      await renderContent();
    } catch (error) {
      showToast(
        error?.data?.error ||
        "Unable to move content."
      );
    }
  }


  /* ======================================================
     PROJECTS
  ====================================================== */

  async function renderProjects() {
    const data =
      await API.projects();

    state.projects =
      data.projects || [];

    populateAllProjectSelects();

    clear(page);

    const {
      header,
      actions
    } = createPageHeader(
      "WORKSPACES",
      "Projects",
      "Each brand, game, channel or software project gets its own isolated workspace."
    );

    const create =
      element(
        "button",
        {
          className:
            "primary-button",
          text:
            "＋ New project",
          type: "button"
        }
      );

    create.addEventListener(
      "click",
      () =>
        projectDialog.showModal()
    );

    actions.append(create);

    page.append(header);

    const projects =
      state.activeProjectId
        ? state.projects.filter(
            project =>
              projectMatches(
                project.id
              )
          )
        : state.projects;

    if (!projects.length) {
      page.append(
        emptyState(
          "No projects yet",
          "Create your first workspace.",
          "Create project",
          () =>
            projectDialog.showModal()
        )
      );

      return;
    }

    const grid =
      element(
        "div",
        {
          className:
            "project-grid"
        }
      );

    for (
      const project
      of projects
    ) {
      const card =
        element(
          "article",
          {
            className:
              "project-card"
          }
        );

      card.style.setProperty(
        "--project-accent",
        project.accent_colour ||
          "#6C63FF"
      );

      card.append(
        element(
          "h3",
          {
            text: project.name
          }
        )
      );

      card.append(
        element(
          "p",
          {
            className:
              "card-copy",
            text:
              project.description ||
              "No description."
          }
        )
      );

      const meta =
        element(
          "div",
          {
            className:
              "card-meta"
          }
        );

      meta.append(
        statusPill(
          project.status
        )
      );

      meta.append(
        element(
          "span",
          {
            className:
              "status-pill",
            text:
              formatStatus(
                project.project_type
              )
          }
        )
      );

      meta.append(
        element(
          "span",
          {
            className:
              "status-pill",
            text:
              `${project.content_count || 0} content`
          }
        )
      );

      meta.append(
        element(
          "span",
          {
            className:
              "status-pill",
            text:
              `${project.account_count || 0} accounts`
          }
        )
      );

      card.append(meta);

      grid.append(card);
    }

    page.append(grid);
  }


  /* ======================================================
     IDEAS
  ====================================================== */

  async function renderIdeas() {
    const data =
      await API.ideas();

    let ideas =
      data.ideas || [];

    if (state.activeProjectId) {
      ideas =
        ideas.filter(
          idea =>
            projectMatches(
              idea.project_id
            )
        );
    }

    clear(page);

    const {
      header,
      actions
    } = createPageHeader(
      "INBOX",
      "Ideas",
      "Capture first. Organise later. Nothing worth making should disappear into your notes app."
    );

    const create =
      element(
        "button",
        {
          className:
            "primary-button",
          text:
            "✦ Capture idea",
          type: "button"
        }
      );

    create.addEventListener(
      "click",
      () =>
        ideaDialog.showModal()
    );

    actions.append(create);

    page.append(header);

    if (!ideas.length) {
      page.append(
        emptyState(
          "No ideas waiting",
          "The next stupidly good idea can live here instead of disappearing.",
          "Capture idea",
          () =>
            ideaDialog.showModal()
        )
      );

      return;
    }

    const grid =
      element(
        "div",
        {
          className:
            "idea-grid"
        }
      );

    for (
      const idea
      of ideas
    ) {
      const card =
        element(
          "article",
          {
            className:
              "idea-card"
          }
        );

      card.append(
        element(
          "h3",
          {
            text: idea.title
          }
        )
      );

      if (idea.description) {
        card.append(
          element(
            "p",
            {
              className:
                "card-copy",
              text:
                idea.description
            }
          )
        );
      }

      const meta =
        element(
          "div",
          {
            className:
              "card-meta"
          }
        );

      meta.append(
        statusPill(
          idea.status
        )
      );

      meta.append(
        element(
          "span",
          {
            className:
              "status-pill",
            text:
              idea.project_name ||
              "Unassigned"
          }
        )
      );

      card.append(meta);

      grid.append(card);
    }

    page.append(grid);
  }


  /* ======================================================
     ACCOUNTS
  ====================================================== */

  async function renderAccounts() {
    const data =
      await API.accounts();

    let accounts =
      data.accounts || [];

    if (state.activeProjectId) {
      accounts =
        accounts.filter(
          account =>
            projectMatches(
              account.project_id
            )
        );
    }

    clear(page);

    const {
      header,
      actions
    } = createPageHeader(
      "SOCIAL HUB",
      "Accounts",
      "Keep every brand tied to the correct social accounts so you never post to the wrong place."
    );

    const add =
      element(
        "button",
        {
          className:
            "secondary-button",
          text:
            "＋ Add account",
          type: "button"
        }
      );

    add.addEventListener(
      "click",
      () =>
        accountDialog.showModal()
    );

    actions.append(add);

    page.append(header);


    const connect =
      element(
        "div",
        {
          className:
            "social-connect-controls"
        }
      );

    const projectSelect =
      document.createElement(
        "select"
      );

    projectSelect.className =
      "project-switcher";

    populateProjectSelect(
      projectSelect
    );

    const tiktok =
      element(
        "button",
        {
          className:
            "secondary-button",
          text:
            "Connect TikTok",
          type: "button"
        }
      );

    const youtube =
      element(
        "button",
        {
          className:
            "secondary-button",
          text:
            "Connect YouTube",
          type: "button"
        }
      );

    tiktok.addEventListener(
      "click",
      async () => {
        await connectOAuth(
          "tiktok",
          projectSelect.value
        );
      }
    );

    youtube.addEventListener(
      "click",
      async () => {
        await connectOAuth(
          "youtube",
          projectSelect.value
        );
      }
    );

    connect.append(
      projectSelect,
      tiktok,
      youtube
    );

    page.append(connect);


    if (!accounts.length) {
      page.append(
        emptyState(
          "No accounts here yet",
          "Add an account record or connect TikTok/YouTube once your provider credentials are configured."
        )
      );

      return;
    }

    const grid =
      element(
        "div",
        {
          className:
            "account-grid"
        }
      );

    for (
      const account
      of accounts
    ) {
      grid.append(
        createAccountCard(
          account
        )
      );
    }

    page.append(grid);
  }


  function createAccountCard(
    account
  ) {
    const card =
      element(
        "article",
        {
          className:
            "account-card"
        }
      );

    const top =
      element(
        "div",
        {
          className:
            "account-top"
        }
      );

    const copy =
      element("div");

    copy.append(
      element(
        "span",
        {
          className:
            "platform-badge",
          text:
            formatStatus(
              account.platform
            )
        }
      )
    );

    copy.append(
      element(
        "h3",
        {
          text:
            account.account_name
        }
      )
    );

    copy.append(
      element(
        "p",
        {
          className:
            "card-copy",
          text:
            account.account_handle ||
            account.project_name ||
            "Social account"
        }
      )
    );

    top.append(
      copy,
      statusPill(
        account.status
      )
    );

    card.append(top);

    const meta =
      element(
        "div",
        {
          className:
            "card-meta"
        }
      );

    meta.append(
      element(
        "span",
        {
          className:
            "status-pill",
          text:
            account.project_name ||
            "Project"
        }
      )
    );

    card.append(meta);

    const actions =
      element(
        "div",
        {
          className:
            "account-actions"
        }
      );

    if (
      account.platform ===
        "tiktok" &&
      account.status ===
        "connected"
    ) {
      const check =
        element(
          "button",
          {
            className:
              "mini-button",
            text:
              "Check posting access",
            type: "button"
          }
        );

      check.addEventListener(
        "click",
        async () => {
          try {
            await API.creatorInfo(
              account.id
            );

            showToast(
              "TikTok posting access confirmed."
            );
          } catch (error) {
            showToast(
              error?.data?.error ||
              "Unable to confirm TikTok access."
            );
          }
        }
      );

      actions.append(check);
    }

    if (
      account.status ===
      "connected"
    ) {
      const disconnect =
        element(
          "button",
          {
            className:
              "mini-button",
            text:
              "Disconnect",
            type: "button"
          }
        );

      disconnect.addEventListener(
        "click",
        async () => {
          try {
            await API.disconnectAccount(
              account.id
            );

            showToast(
              "Account disconnected."
            );

            await renderAccounts();
          } catch (error) {
            showToast(
              error?.data?.error ||
              "Unable to disconnect."
            );
          }
        }
      );

      actions.append(disconnect);
    }

    card.append(actions);

    return card;
  }


  async function connectOAuth(
    platform,
    projectId
  ) {
    const id =
      Number(projectId);

    if (
      !Number.isInteger(id) ||
      id < 1
    ) {
      showToast(
        "Select a workspace first."
      );

      return;
    }

    try {
      const result =
        platform === "tiktok"
          ? await API.startTikTok(id)
          : await API.startYouTube(id);

      if (!result.authorizationUrl) {
        throw new Error(
          "No authorization URL returned."
        );
      }

      window.location.href =
        result.authorizationUrl;
    } catch (error) {
      showToast(
        error?.data?.error ||
        error?.message ||
        "Unable to start connection."
      );
    }
  }


  /* ======================================================
     CALENDAR
  ====================================================== */

  async function renderCalendar() {
    const data =
      await API.calendar();

    let events =
      data.events || [];

    if (state.activeProjectId) {
      events =
        events.filter(
          event =>
            projectMatches(
              event.project_id
            )
        );
    }

    clear(page);

    const {
      header
    } = createPageHeader(
      "PUBLISHING",
      "Calendar",
      "Your scheduled and published content across every connected platform."
    );

    page.append(header);

    if (!events.length) {
      page.append(
        emptyState(
          "Calendar is clear",
          "Scheduled publications will appear here when the publishing composer goes live."
        )
      );

      return;
    }

    const list =
      element(
        "div",
        {
          className:
            "calendar-list"
        }
      );

    for (
      const event
      of events
    ) {
      const rawDate =
        event.scheduled_at ||
        event.published_at;

      const date =
        new Date(rawDate);

      const row =
        element(
          "article",
          {
            className:
              "calendar-event"
          }
        );

      const dateBox =
        element(
          "div",
          {
            className:
              "calendar-date"
          }
        );

      dateBox.append(
        element(
          "strong",
          {
            text:
              Number.isNaN(
                date.getTime()
              )
                ? "—"
                : date.getDate()
          }
        )
      );

      dateBox.append(
        element(
          "span",
          {
            text:
              Number.isNaN(
                date.getTime()
              )
                ? ""
                : date.toLocaleString(
                    undefined,
                    {
                      month:
                        "short"
                    }
                  )
          }
        )
      );

      const copy =
        element("div");

      copy.append(
        element(
          "strong",
          {
            text:
              event.content_title ||
              event.title ||
              "Content"
          }
        )
      );

      copy.append(
        element(
          "p",
          {
            className:
              "card-copy",
            text:
              `${event.project_name} · ${formatStatus(
                event.platform
              )} · ${
                event.account_name
              }`
          }
        )
      );

      const meta =
        element(
          "div",
          {
            className:
              "card-meta"
          }
        );

      meta.append(
        statusPill(
          event.publish_state
        )
      );

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        meta.append(
          element(
            "span",
            {
              className:
                "status-pill",
              text:
                date.toLocaleTimeString(
                  undefined,
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit"
                  }
                )
            }
          )
        );
      }

      copy.append(meta);

      row.append(
        dateBox,
        copy
      );

      list.append(row);
    }

    page.append(list);
  }


  /* ======================================================
     ANALYTICS
  ====================================================== */

  function renderAnalytics() {
    clear(page);

    const {
      header
    } = createPageHeader(
      "PERFORMANCE",
      "Analytics",
      "One view for content output and social performance across your projects."
    );

    page.append(header);

    page.append(
      emptyState(
        "Analytics comes after publishing",
        "Once publications are flowing through the Command Centre, we'll aggregate platform performance here instead of inventing meaningless local numbers."
      )
    );
  }


  /* ======================================================
     FORMS
  ====================================================== */

  contentForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const projectId =
        Number(
          document.getElementById(
            "contentProject"
          ).value
        );

      try {
        await API.createContent({
          projectId,

          title:
            document.getElementById(
              "contentTitle"
            ).value,

          description:
            document.getElementById(
              "contentDescription"
            ).value,

          contentType:
            document.getElementById(
              "contentType"
            ).value,

          status:
            document.getElementById(
              "contentStatus"
            ).value
        });

        contentForm.reset();

        closeSheets();

        showToast(
          "Content created."
        );

        if (
          state.route ===
          "content" ||
          state.route ===
          "today"
        ) {
          await renderRoute();
        }
      } catch (error) {
        showToast(
          error?.data?.error ||
          "Unable to create content."
        );
      }
    }
  );


  projectForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      try {
        await API.createProject({
          name:
            document.getElementById(
              "projectName"
            ).value,

          description:
            document.getElementById(
              "projectDescription"
            ).value,

          projectType:
            document.getElementById(
              "projectType"
            ).value,

          accentColour:
            document.getElementById(
              "projectColour"
            ).value
        });

        projectForm.reset();

        document.getElementById(
          "projectColour"
        ).value =
          "#6C63FF";

        projectDialog.close();

        await refreshProjects();

        showToast(
          "Workspace created."
        );

        await renderRoute();
      } catch (error) {
        showToast(
          error?.data?.error ||
          "Unable to create project."
        );
      }
    }
  );


  ideaForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      try {
        await API.createIdea({
          title:
            document.getElementById(
              "ideaTitle"
            ).value,

          description:
            document.getElementById(
              "ideaDescription"
            ).value,

          projectId:
            document.getElementById(
              "ideaProject"
            ).value ||
            null,

          ideaType:
            "content"
        });

        ideaForm.reset();

        ideaDialog.close();

        showToast(
          "Idea captured."
        );

        if (
          state.route ===
          "ideas" ||
          state.route ===
          "today"
        ) {
          await renderRoute();
        }
      } catch (error) {
        showToast(
          error?.data?.error ||
          "Unable to save idea."
        );
      }
    }
  );


  accountForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      try {
        await API.createAccount({
          projectId:
            Number(
              document.getElementById(
                "accountProject"
              ).value
            ),

          platform:
            document.getElementById(
              "accountPlatform"
            ).value,

          accountName:
            document.getElementById(
              "accountName"
            ).value,

          accountHandle:
            document.getElementById(
              "accountHandle"
            ).value
        });

        accountForm.reset();

        accountDialog.close();

        showToast(
          "Account added."
        );

        if (
          state.route ===
          "accounts"
        ) {
          await renderAccounts();
        }
      } catch (error) {
        showToast(
          error?.data?.error ||
          "Unable to add account."
        );
      }
    }
  );


  /* ======================================================
     EVENTS
  ====================================================== */

  document
    .querySelectorAll(
      "[data-route]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          navigate(
            button.dataset.route
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-more-route]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          navigate(
            button.dataset.moreRoute
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-close-sheet]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        closeSheets
      );
    });


  createButton.addEventListener(
    "click",
    () =>
      openSheet(
        createSheet
      )
  );


  mobileCreateButton.addEventListener(
    "click",
    () =>
      openSheet(
        createSheet
      )
  );


  moreButton.addEventListener(
    "click",
    () =>
      openSheet(
        moreSheet
      )
  );


  backdrop.addEventListener(
    "click",
    closeSheets
  );


  projectSwitcher.addEventListener(
    "change",
    async () => {
      state.activeProjectId =
        projectSwitcher.value
          ? Number(
              projectSwitcher.value
            )
          : null;

      populateAllProjectSelects();

      await renderRoute();
    }
  );


  document
    .getElementById(
      "closeProjectDialog"
    )
    .addEventListener(
      "click",
      event => {
        event.preventDefault();
        projectDialog.close();
      }
    );


  document
    .getElementById(
      "closeIdeaDialog"
    )
    .addEventListener(
      "click",
      event => {
        event.preventDefault();
        ideaDialog.close();
      }
    );


  document
    .getElementById(
      "closeAccountDialog"
    )
    .addEventListener(
      "click",
      event => {
        event.preventDefault();
        accountDialog.close();
      }
    );


  logoutButton.addEventListener(
    "click",
    logout
  );


  mobileLogout.addEventListener(
    "click",
    logout
  );


  async function logout() {
    try {
      await API.logout();
    } catch (error) {
      console.error(error);
    }

    window.location.replace(
      new URL(
        "./login.html",
        window.location.href
      ).href
    );
  }


  /* ======================================================
     STARTUP
  ====================================================== */

  async function refreshProjects() {
    const data =
      await API.projects();

    state.projects =
      data.projects || [];

    if (
      state.activeProjectId &&
      !state.projects.some(
        project =>
          Number(project.id) ===
          Number(
            state.activeProjectId
          )
      )
    ) {
      state.activeProjectId =
        null;
    }

    populateAllProjectSelects();
  }


  function processOAuthResult() {
    const url =
      new URL(
        window.location.href
      );

    const provider =
      url.searchParams.get(
        "oauth"
      );

    const status =
      url.searchParams.get(
        "oauthStatus"
      );

    const error =
      url.searchParams.get(
        "oauthError"
      );

    if (!provider || !status) {
      return;
    }

    if (status === "success") {
      showToast(
        `${formatStatus(
          provider
        )} connected.`
      );
    } else {
      showToast(
        `${formatStatus(
          provider
        )} connection failed${
          error
            ? `: ${error}`
            : "."
        }`,
        5000
      );
    }

    url.searchParams.delete(
      "oauth"
    );

    url.searchParams.delete(
      "oauthStatus"
    );

    url.searchParams.delete(
      "oauthError"
    );

    window.history.replaceState(
      {},
      "",
      url
    );
  }


  async function init() {
    try {
      const me =
        await API.me();

      state.user =
        me.user;

      userInitial.textContent =
        (
          state.user
            ?.displayName ||
          state.user
            ?.username ||
          "K"
        )
          .charAt(0)
          .toUpperCase();

      await refreshProjects();

      processOAuthResult();

      updateNavigation();

      await renderRoute();
    } catch (error) {
      console.error(
        "Application startup failed:",
        error
      );

      showError(error);
    }
  }


  init();
})();
