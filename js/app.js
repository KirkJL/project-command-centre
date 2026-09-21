"use strict";

(() => {

  const state = {
    user: null,
    projects: [],
    activeProjectId: null,
    route: "today",
    publishingContentId: null,
    publications: []
  };


  const routes = {
    today: "Today",
    content: "Content",
    calendar: "Calendar",
    projects: "Projects",
    ideas: "Ideas",
    accounts: "Accounts",
    analytics: "Analytics"
  };


  const pipeline = [
    "idea",
    "script",
    "recording",
    "editing",
    "ready",
    "scheduled",
    "published"
  ];


  const page =
    document.getElementById(
      "page"
    );

  const projectSwitcher =
    document.getElementById(
      "projectSwitcher"
    );

  const mobileSection =
    document.getElementById(
      "mobileSection"
    );

  const userInitial =
    document.getElementById(
      "userInitial"
    );

  const createSheet =
    document.getElementById(
      "createSheet"
    );

  const moreSheet =
    document.getElementById(
      "moreSheet"
    );

  const publishSheet =
    document.getElementById(
      "publishSheet"
    );

  const editPublicationSheet =
    document.getElementById(
      "editPublicationSheet"
    );

  const backdrop =
    document.getElementById(
      "backdrop"
    );

  const toast =
    document.getElementById(
      "toast"
    );


  /* ======================================================
     DOM HELPERS
  ====================================================== */

  function el(
    tag,
    className,
    text
  ) {
    const node =
      document.createElement(
        tag
      );

    if (className) {
      node.className =
        className;
    }

    if (
      text !== undefined &&
      text !== null
    ) {
      node.textContent =
        String(text);
    }

    return node;
  }


  function button(
    text,
    className,
    handler
  ) {
    const node =
      el(
        "button",
        className,
        text
      );

    node.type =
      "button";

    node.addEventListener(
      "click",
      handler
    );

    return node;
  }


  function clear(
    node
  ) {
    while (
      node.firstChild
    ) {
      node.removeChild(
        node.firstChild
      );
    }
  }


  function showToast(
    message,
    isError = false
  ) {
    toast.textContent =
      message;

    toast.className =
      isError
        ? "toast toast-error"
        : "toast";

    toast.hidden =
      false;

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          toast.hidden =
            true;
        },
        3500
      );
  }


  function errorMessage(
    error
  ) {
    const value =
      error?.data?.error ||
      error?.message ||
      "Something went wrong.";

    return String(
      value
    ).replaceAll(
      "_",
      " "
    );
  }


  /* ======================================================
     SHEETS
  ====================================================== */

  function closeSheets() {
    createSheet.hidden =
      true;

    moreSheet.hidden =
      true;

    publishSheet.hidden =
      true;

    editPublicationSheet.hidden =
      true;

    backdrop.hidden =
      true;

    document.body
      .classList
      .remove(
        "sheet-open"
      );
  }


  function openSheet(
    sheet
  ) {
    closeSheets();

    sheet.hidden =
      false;

    backdrop.hidden =
      false;

    document.body
      .classList
      .add(
        "sheet-open"
      );
  }


  backdrop.addEventListener(
    "click",
    closeSheets
  );


  document
    .querySelectorAll(
      "[data-close-sheet]"
    )
    .forEach(
      node => {
        node.addEventListener(
          "click",
          closeSheets
        );
      }
    );


  /* ======================================================
     PROJECT SELECTS
  ====================================================== */

  function populateProjectSelects() {
    const selects = [
      projectSwitcher,

      document.getElementById(
        "contentProject"
      ),

      document.getElementById(
        "ideaProject"
      ),

      document.getElementById(
        "accountProject"
      )
    ];


    for (
      const select
      of selects
    ) {
      if (!select) {
        continue;
      }

      const current =
        select.value;

      clear(
        select
      );


      if (
        select ===
        projectSwitcher
      ) {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          "";

        option.textContent =
          "All workspaces";

        select.appendChild(
          option
        );
      }


      if (
        select.id ===
        "ideaProject"
      ) {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          "";

        option.textContent =
          "No workspace";

        select.appendChild(
          option
        );
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
          project.id;

        option.textContent =
          project.name;

        select.appendChild(
          option
        );
      }


      if (
        current &&
        [...select.options]
          .some(
            option =>
              option.value ===
              current
          )
      ) {
        select.value =
          current;

      } else if (
        state.activeProjectId &&
        [...select.options]
          .some(
            option =>
              Number(
                option.value
              ) ===
              Number(
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
  }


  async function refreshProjects() {
    const data =
      await API.projects();

    state.projects =
      data.projects || [];

    populateProjectSelects();
  }


  /* ======================================================
     ROUTING
  ====================================================== */

  function setRoute(
    route
  ) {
    if (
      !routes[
        route
      ]
    ) {
      route =
        "today";
    }

    state.route =
      route;

    mobileSection.textContent =
      routes[
        route
      ].toUpperCase();


    document
      .querySelectorAll(
        "[data-route]"
      )
      .forEach(
        node => {
          node.classList.toggle(
            "active",
            node.dataset.route ===
              route
          );
        }
      );


    closeSheets();

    renderRoute();
  }


  async function renderRoute() {
    page.setAttribute(
      "aria-busy",
      "true"
    );

    clear(
      page
    );

    page.appendChild(
      el(
        "div",
        "loading-card",
        "Loading…"
      )
    );


    try {
      switch (
        state.route
      ) {

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
      clear(
        page
      );

      const card =
        el(
          "section",
          "panel error-panel"
        );

      card.appendChild(
        el(
          "h2",
          "",
          "Couldn't load this section"
        )
      );

      card.appendChild(
        el(
          "p",
          "muted-text",
          errorMessage(
            error
          )
        )
      );

      page.appendChild(
        card
      );
    }


    page.removeAttribute(
      "aria-busy"
    );
  }


  document
    .querySelectorAll(
      "[data-route]"
    )
    .forEach(
      node => {
        node.addEventListener(
          "click",
          () => {
            setRoute(
              node.dataset.route
            );
          }
        );
      }
    );


  document
    .querySelectorAll(
      "[data-more-route]"
    )
    .forEach(
      node => {
        node.addEventListener(
          "click",
          () => {
            setRoute(
              node.dataset.moreRoute
            );
          }
        );
      }
    );


  projectSwitcher.addEventListener(
    "change",
    () => {
      state.activeProjectId =
        projectSwitcher.value
          ? Number(
              projectSwitcher.value
            )
          : null;

      populateProjectSelects();

      renderRoute();
    }
  );


  /* ======================================================
     PAGE HEADER
  ====================================================== */

  function createPageHeader(
    kicker,
    title,
    description,
    action
  ) {
    const header =
      el(
        "div",
        "page-header"
      );

    const copy =
      el(
        "div",
        "page-header-copy"
      );

    copy.appendChild(
      el(
        "span",
        "eyebrow",
        kicker
      )
    );

    copy.appendChild(
      el(
        "h1",
        "",
        title
      )
    );


    if (
      description
    ) {
      copy.appendChild(
        el(
          "p",
          "muted-text",
          description
        )
      );
    }


    header.appendChild(
      copy
    );


    if (
      action
    ) {
      header.appendChild(
        action
      );
    }


    return header;
  }


  /* ======================================================
     TODAY
  ====================================================== */

  async function renderToday() {
    /*
     * Keep the existing dashboard endpoint as the source
     * of truth, then augment publishing information using
     * the publication endpoint already used by Calendar.
     */

    const [
      data,
      publicationData
    ] =
      await Promise.all([
        API.dashboard(),
        API.publications()
      ]);


    clear(
      page
    );


    const projects =
      filterProject(
        data.projects || []
      );


    const content =
      filterProject(
        data.recentContent || []
      );


    let publications =
      filterProject(
        publicationData.publications ||
        data.publications ||
        []
      );


    state.publications =
      publications;


    const activeQueue =
      publications.filter(
        item =>
          [
            "queued",
            "processing",
            "retrying"
          ].includes(
            item.publish_state
          )
      );


    const attention =
      publications.filter(
        item =>
          publicationNeedsAttention(
            item
          )
      );


    const published =
      publications.filter(
        item =>
          item.publish_state ===
          "published"
      );


    page.appendChild(
      createPageHeader(
        "COMMAND CENTRE",

        `${
          greeting()
        }, ${
          state.user
            ?.displayName ||
          state.user
            ?.username ||
          "Kirk"
        }.`,

        activeQueue.length
          ? `${
              activeQueue.length
            } publication${
              activeQueue.length ===
              1
                ? ""
                : "s"
            } currently moving through the queue.`
          : "Everything moving across your projects."
      )
    );


    const stats =
      el(
        "section",
        "stats-grid"
      );


    stats.appendChild(
      statCard(
        projects.length,
        "Active projects"
      )
    );


    stats.appendChild(
      statCard(
        activeQueue.length,
        "Publishing queue"
      )
    );


    stats.appendChild(
      statCard(
        attention.length,
        "Needs attention"
      )
    );


    stats.appendChild(
      statCard(
        published.length,
        "Published"
      )
    );


    page.appendChild(
      stats
    );


    const layout =
      el(
        "section",
        "dashboard-grid"
      );


    /* ================================================
       UPCOMING / ACTIVE QUEUE
    ================================================ */

    const queue =
      panel(
        "Publishing Queue",
        "Scheduled and processing posts"
      );


    if (
      activeQueue.length ===
      0
    ) {
      queue.appendChild(
        emptyState(
          "Nothing queued",
          "Ready content can be scheduled from the Content pipeline."
        )
      );

    } else {
      const list =
        el(
          "div",
          "stack-list"
        );


      for (
        const publication
        of activeQueue.slice(
          0,
          8
        )
      ) {
        list.appendChild(
          publicationRow(
            publication
          )
        );
      }


      queue.appendChild(
        list
      );
    }


    layout.appendChild(
      queue
    );


    /* ================================================
       ATTENTION
    ================================================ */

    const attentionPanel =
      panel(
        "Needs Attention",
        "Publishing jobs that need you"
      );


    if (
      attention.length ===
      0
    ) {
      attentionPanel.appendChild(
        emptyState(
          "All clear",
          "No failed or blocked publications."
        )
      );

    } else {
      attentionPanel.classList.add(
        "panel-attention"
      );

      const list =
        el(
          "div",
          "stack-list"
        );


      for (
        const publication
        of attention.slice(
          0,
          8
        )
      ) {
        list.appendChild(
          publicationRow(
            publication
          )
        );
      }


      attentionPanel.appendChild(
        list
      );
    }


    layout.appendChild(
      attentionPanel
    );


    /* ================================================
       RECENT CONTENT
    ================================================ */

    const recent =
      panel(
        "Recent Content",
        "Latest work across your pipeline"
      );


    if (
      content.length ===
      0
    ) {
      recent.appendChild(
        emptyState(
          "No content yet",
          "Create your first master content item."
        )
      );

    } else {
      const list =
        el(
          "div",
          "stack-list"
        );


      for (
        const item
        of content.slice(
          0,
          8
        )
      ) {
        list.appendChild(
          contentMiniRow(
            item
          )
        );
      }


      recent.appendChild(
        list
      );
    }


    layout.appendChild(
      recent
    );


    /* ================================================
       TASKS
    ================================================ */

    const tasks =
      panel(
        "Tasks",
        "Work requiring attention"
      );


    const taskItems =
      data.tasks || [];


    if (
      taskItems.length ===
      0
    ) {
      tasks.appendChild(
        emptyState(
          "You're clear",
          "Task management comes next."
        )
      );

    } else {
      const list =
        el(
          "div",
          "stack-list"
        );


      for (
        const task
        of taskItems
      ) {
        const row =
          el(
            "div",
            "list-row"
          );

        const copy =
          el(
            "div"
          );

        copy.appendChild(
          el(
            "strong",
            "",
            task.title
          )
        );

        copy.appendChild(
          el(
            "span",
            "muted-text",
            task.project_name ||
            "General"
          )
        );

        row.appendChild(
          copy
        );

        row.appendChild(
          badge(
            task.priority ||
            "normal"
          )
        );

        list.appendChild(
          row
        );
      }


      tasks.appendChild(
        list
      );
    }


    layout.appendChild(
      tasks
    );


    page.appendChild(
      layout
    );
  }


  function statCard(
    value,
    label
  ) {
    const card =
      el(
        "article",
        "stat-card"
      );

    card.appendChild(
      el(
        "strong",
        "stat-number",
        value
      )
    );

    card.appendChild(
      el(
        "span",
        "muted-text",
        label
      )
    );

    return card;
  }


  /* ======================================================
     CONTENT PIPELINE
  ====================================================== */

  async function renderContent() {
    const data =
      await API.content(
        state.activeProjectId
          ? {
              projectId:
                state.activeProjectId
            }
          : {}
      );


    const items =
      data.content || [];


    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "CONTENT ENGINE",
        "Content Pipeline",
        "One master asset. Multiple platform publications.",

        button(
          "+ Create",
          "primary-button",
          openCreateContent
        )
      )
    );


    if (
      items.length ===
      0
    ) {
      page.appendChild(
        emptyState(
          "Pipeline empty",
          "Create content and move it from idea to published."
        )
      );

      return;
    }


    const board =
      el(
        "div",
        "pipeline-board"
      );


    for (
      const stage
      of pipeline
    ) {
      const column =
        el(
          "section",
          "pipeline-column"
        );


      const stageItems =
        items.filter(
          item =>
            item.status ===
            stage
        );


      const heading =
        el(
          "div",
          "pipeline-heading"
        );


      heading.appendChild(
        el(
          "strong",
          "",
          pretty(
            stage
          )
        )
      );


      heading.appendChild(
        el(
          "span",
          "count-pill",
          stageItems.length
        )
      );


      column.appendChild(
        heading
      );


      const cards =
        el(
          "div",
          "pipeline-cards"
        );


      for (
        const item
        of stageItems
      ) {
        cards.appendChild(
          contentCard(
            item
          )
        );
      }


      if (
        stageItems.length ===
        0
      ) {
        cards.appendChild(
          el(
            "div",
            "pipeline-empty",
            "Nothing here"
          )
        );
      }


      column.appendChild(
        cards
      );

      board.appendChild(
        column
      );
    }


    page.appendChild(
      board
    );
  }


  function contentCard(
    item
  ) {
    const card =
      el(
        "article",
        "content-card"
      );


    card.appendChild(
      el(
        "span",
        "content-type",
        item.content_type
      )
    );


    card.appendChild(
      el(
        "h3",
        "",
        item.title
      )
    );


    card.appendChild(
      el(
        "p",
        "muted-text",
        item.project_name ||
        ""
      )
    );


    const actions =
      el(
        "div",
        "card-actions"
      );


    if (
      item.status ===
        "ready" ||
      item.status ===
        "scheduled"
    ) {
      actions.appendChild(
        button(
          item.status ===
            "scheduled"
            ? "Manage"
            : "Schedule",

          "primary-button compact-button",

          () =>
            openPublishingComposer(
              item.id
            )
        )
      );
    }


    const index =
      pipeline.indexOf(
        item.status
      );


    if (
      index >= 0 &&
      index <
        pipeline.indexOf(
          "ready"
        )
    ) {
      const next =
        pipeline[
          index + 1
        ];


      actions.appendChild(
        button(
          `→ ${
            pretty(
              next
            )
          }`,

          "secondary-button compact-button",

          async () => {
            try {
              await API
                .updateContentStatus(
                  item.id,
                  next
                );

              showToast(
                `Moved to ${
                  pretty(
                    next
                  )
                }.`
              );

              renderContent();

            } catch (error) {
              showToast(
                errorMessage(
                  error
                ),
                true
              );
            }
          }
        )
      );
    }


    card.appendChild(
      actions
    );

    return card;
  }


  /* ======================================================
     PUBLISHING COMPOSER
  ====================================================== */

  async function openPublishingComposer(
    contentId
  ) {
    state.publishingContentId =
      contentId;


    const title =
      document.getElementById(
        "publishTitle"
      );

    const project =
      document.getElementById(
        "publishProject"
      );

    const body =
      document.getElementById(
        "publishBody"
      );


    title.textContent =
      "Schedule Content";

    project.textContent =
      "";


    clear(
      body
    );


    body.appendChild(
      el(
        "div",
        "loading-card",
        "Loading publishing destinations…"
      )
    );


    openSheet(
      publishSheet
    );


    try {
      const data =
        await API.publishingData(
          contentId
        );


      title.textContent =
        data.content.title;

      project.textContent =
        data.content.project_name;


      renderPublishingComposer(
        data
      );

    } catch (error) {
      clear(
        body
      );

      body.appendChild(
        emptyState(
          "Couldn't open publisher",
          errorMessage(
            error
          )
        )
      );
    }
  }


  function renderPublishingComposer(
    data
  ) {
    const body =
      document.getElementById(
        "publishBody"
      );


    clear(
      body
    );


    const accounts =
      data.accounts || [];

    const existing =
      data.publications || [];


    if (
      existing.length >
      0
    ) {
      const existingPanel =
        el(
          "div",
          "existing-publications"
        );


      existingPanel.appendChild(
        el(
          "h3",
          "",
          "Existing Publications"
        )
      );


      for (
        const publication
        of existing
      ) {
        existingPanel.appendChild(
          composerPublicationRow(
            publication,
            accounts
          )
        );
      }


      body.appendChild(
        existingPanel
      );
    }


    if (
      accounts.length ===
      0
    ) {
      body.appendChild(
        emptyState(
          "No accounts for this workspace",
          "Add or connect a TikTok or YouTube account from Accounts before scheduling."
        )
      );


      body.appendChild(
        button(
          "Go to Accounts",
          "primary-button full-button",

          () =>
            setRoute(
              "accounts"
            )
        )
      );

      return;
    }


    const heading =
      el(
        "div",
        "composer-section-heading"
      );


    heading.appendChild(
      el(
        "span",
        "eyebrow",
        "DESTINATIONS"
      )
    );


    heading.appendChild(
      el(
        "h3",
        "",
        "Where should this go?"
      )
    );


    body.appendChild(
      heading
    );


    const form =
      el(
        "form",
        "publisher-form"
      );


    form.id =
      "publisherForm";


    /*
     * Build 3G-C:
     * Finished media is selected locally and transferred
     * directly from the browser to TikTok. Project Hub
     * never stores the video bytes.
     */
    form._selectedMediaFile = null;

    form.appendChild(
      createFinishedMediaPicker(
        form
      )
    );


    const accountCards =
      el(
        "div",
        "destination-list"
      );


    for (
      const account
      of accounts
    ) {
      accountCards.appendChild(
        destinationCard(
          account,
          data.content
        )
      );
    }


    form.appendChild(
      accountCards
    );


    const footer =
      el(
        "div",
        "publisher-footer"
      );


    footer.appendChild(
      button(
        "Save Selected as Draft",
        "secondary-button",

        async () => {
          await submitPublishingForm(
            form,
            data.content.id,
            true
          );
        }
      )
    );


    const scheduleButton =
      el(
        "button",
        "primary-button",
        "Schedule Selected"
      );


    scheduleButton.type =
      "submit";


    footer.appendChild(
      scheduleButton
    );


    const publishNowButton =
      button(
        "Publish TikTok Now",
        "primary-button publisher-now-button",

        async () => {
          await publishSelectedTikTokNow(
            form,
            data.content.id
          );
        }
      );


    footer.appendChild(
      publishNowButton
    );


    form.appendChild(
      footer
    );


    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        await submitPublishingForm(
          form,
          data.content.id,
          false
        );
      }
    );


    body.appendChild(
      form
    );
  }


  function destinationCard(
    account,
    content
  ) {
    const card =
      el(
        "article",
        "destination-card"
      );


    card.dataset.accountId =
      account.id;

    card.dataset.platform =
      account.platform;


    const header =
      el(
        "div",
        "destination-header"
      );


    const checkLabel =
      el(
        "label",
        "destination-check"
      );


    const checkbox =
      document.createElement(
        "input"
      );


    checkbox.type =
      "checkbox";

    checkbox.className =
      "destination-checkbox";

    checkbox.value =
      account.id;


    checkLabel.appendChild(
      checkbox
    );


    const identity =
      el(
        "div"
      );


    identity.appendChild(
      el(
        "strong",
        "",
        prettyPlatform(
          account.platform
        )
      )
    );


    identity.appendChild(
      el(
        "span",
        "muted-text",
        account.account_handle ||
        account.account_name
      )
    );


    checkLabel.appendChild(
      identity
    );


    header.appendChild(
      checkLabel
    );


    header.appendChild(
      badge(
        account.connection_status
      )
    );


    card.appendChild(
      header
    );


    const fields =
      el(
        "div",
        "destination-fields"
      );


    if (
      account.platform ===
      "youtube"
    ) {
      fields.appendChild(
        composerField(
          "Title",
          "title",
          content.title || "",
          false
        )
      );


      fields.appendChild(
        composerField(
          "Description",
          "description",
          content.description || "",
          true
        )
      );

    } else {
      fields.appendChild(
        composerField(
          "Caption",
          "caption",
          content.description || "",
          true
        )
      );


      if (
        account.platform ===
        "tiktok"
      ) {
        fields.appendChild(
          createTikTokOptions(
            account
          )
        );
      }
    }


    const scheduleField =
      el(
        "label"
      );


    scheduleField.appendChild(
      document.createTextNode(
        "Schedule"
      )
    );


    const schedule =
      document.createElement(
        "input"
      );


    schedule.type =
      "datetime-local";

    schedule.className =
      "publication-schedule";

    schedule.min =
      localDateTimeValue(
        new Date()
      );


    scheduleField.appendChild(
      schedule
    );


    fields.appendChild(
      scheduleField
    );


    if (
      account.connection_status !==
      "connected"
    ) {
      const warning =
        el(
          "p",
          "account-warning",
          "This account is not connected. You can save a draft, but it cannot be queued yet."
        );


      fields.appendChild(
        warning
      );
    }


    card.appendChild(
      fields
    );


    checkbox.addEventListener(
      "change",
      async () => {
        card.classList.toggle(
          "selected",
          checkbox.checked
        );


        if (
          checkbox.checked &&
          account.platform ===
            "tiktok" &&
          account.connection_status ===
            "connected"
        ) {
          await loadTikTokCreatorOptions(
            card,
            account.id
          );
        }
      }
    );


    return card;
  }


  function composerField(
    labelText,
    fieldName,
    value,
    textarea
  ) {
    const label =
      el(
        "label"
      );


    label.appendChild(
      document.createTextNode(
        labelText
      )
    );


    const input =
      document.createElement(
        textarea
          ? "textarea"
          : "input"
      );


    input.className =
      `publication-${fieldName}`;

    input.value =
      value || "";


    if (
      fieldName ===
      "title"
    ) {
      input.maxLength =
        500;
    }


    if (
      fieldName ===
      "caption"
    ) {
      input.maxLength =
        5000;
    }


    if (
      fieldName ===
      "description"
    ) {
      input.maxLength =
        10000;
    }


    label.appendChild(
      input
    );


    return label;
  }


  function createFinishedMediaPicker(
    form
  ) {
    const section =
      el(
        "section",
        "media-picker"
      );


    const heading =
      el(
        "div",
        "composer-section-heading"
      );


    heading.appendChild(
      el(
        "span",
        "eyebrow",
        "FINISHED MEDIA"
      )
    );


    heading.appendChild(
      el(
        "h3",
        "",
        "Attach your finished video"
      )
    );


    section.appendChild(
      heading
    );


    const dropZone =
      el(
        "label",
        "media-drop-zone"
      );


    const input =
      document.createElement(
        "input"
      );


    input.type =
      "file";

    input.accept =
      "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

    input.className =
      "media-file-input";


    const icon =
      el(
        "span",
        "media-drop-icon",
        "↑"
      );


    const copy =
      el(
        "div",
        "media-drop-copy"
      );


    copy.appendChild(
      el(
        "strong",
        "",
        "Drop your finished video here"
      )
    );


    copy.appendChild(
      el(
        "span",
        "muted-text",
        "or choose a file • MP4, MOV or WebM"
      )
    );


    const fileMeta =
      el(
        "div",
        "media-file-meta"
      );


    dropZone.appendChild(
      input
    );

    dropZone.appendChild(
      icon
    );

    dropZone.appendChild(
      copy
    );

    dropZone.appendChild(
      fileMeta
    );


    function setFile(
      file
    ) {
      if (
        !file
      ) {
        return;
      }


      const allowed =
        [
          "video/mp4",
          "video/quicktime",
          "video/webm"
        ];


      if (
        file.type &&
        !allowed.includes(
          file.type
        )
      ) {
        showToast(
          "Choose an MP4, MOV or WebM video.",
          true
        );

        return;
      }


      form._selectedMediaFile =
        file;


      dropZone.classList.add(
        "has-file"
      );


      clear(
        fileMeta
      );


      fileMeta.appendChild(
        el(
          "strong",
          "",
          file.name
        )
      );


      fileMeta.appendChild(
        el(
          "span",
          "muted-text",
          formatFileSize(
            file.size
          )
        )
      );
    }


    input.addEventListener(
      "change",
      () => {
        setFile(
          input.files?.[0]
        );
      }
    );


    for (
      const eventName
      of [
        "dragenter",
        "dragover"
      ]
    ) {
      dropZone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          dropZone.classList.add(
            "dragging"
          );
        }
      );
    }


    for (
      const eventName
      of [
        "dragleave",
        "drop"
      ]
    ) {
      dropZone.addEventListener(
        eventName,
        event => {
          event.preventDefault();
          dropZone.classList.remove(
            "dragging"
          );
        }
      );
    }


    dropZone.addEventListener(
      "drop",
      event => {
        setFile(
          event.dataTransfer
            ?.files?.[0]
        );
      }
    );


    section.appendChild(
      dropZone
    );


    const progress =
      el(
        "div",
        "media-progress"
      );


    progress.hidden =
      true;

    progress.innerHTML =
      `<div class="media-progress-top"><strong class="media-progress-label">Preparing upload…</strong><span class="media-progress-percent">0%</span></div><div class="media-progress-track"><div class="media-progress-bar"></div></div><div class="media-progress-detail muted-text"></div>`;


    section.appendChild(
      progress
    );


    return section;
  }


  function createTikTokOptions(
    account
  ) {
    const options =
      el(
        "div",
        "tiktok-options"
      );


    options.dataset.accountId =
      account.id;


    const privacyLabel =
      el(
        "label"
      );


    privacyLabel.appendChild(
      document.createTextNode(
        "Visibility"
      )
    );


    const privacy =
      document.createElement(
        "select"
      );


    privacy.className =
      "tiktok-privacy";


    const loadingOption =
      document.createElement(
        "option"
      );


    loadingOption.value =
      "SELF_ONLY";

    loadingOption.textContent =
      "Private";


    privacy.appendChild(
      loadingOption
    );


    privacyLabel.appendChild(
      privacy
    );


    options.appendChild(
      privacyLabel
    );


    const toggles =
      el(
        "div",
        "tiktok-toggle-grid"
      );


    toggles.appendChild(
      createTikTokToggle(
        "Comments",
        "tiktok-comments",
        true
      )
    );

    toggles.appendChild(
      createTikTokToggle(
        "Duet",
        "tiktok-duet",
        true
      )
    );

    toggles.appendChild(
      createTikTokToggle(
        "Stitch",
        "tiktok-stitch",
        true
      )
    );


    options.appendChild(
      toggles
    );


    const status =
      el(
        "p",
        "tiktok-options-status muted-text",
        account.connection_status ===
          "connected"
          ? "Select TikTok to load posting options."
          : "Connect this TikTok account to publish directly."
      );


    options.appendChild(
      status
    );


    return options;
  }


  function createTikTokToggle(
    text,
    className,
    checked
  ) {
    const label =
      el(
        "label",
        "tiktok-toggle"
      );


    const input =
      document.createElement(
        "input"
      );


    input.type =
      "checkbox";

    input.className =
      className;

    input.checked =
      checked;


    label.appendChild(
      input
    );

    label.appendChild(
      document.createTextNode(
        text
      )
    );


    return label;
  }


  async function loadTikTokCreatorOptions(
    card,
    accountId
  ) {
    const options =
      card.querySelector(
        ".tiktok-options"
      );


    if (
      !options ||
      options.dataset.loaded ===
        "true" ||
      options.dataset.loading ===
        "true"
    ) {
      return;
    }


    const status =
      options.querySelector(
        ".tiktok-options-status"
      );


    options.dataset.loading =
      "true";


    status.textContent =
      "Loading TikTok posting options…";


    try {
      const result =
        await API.creatorInfo(
          accountId
        );


      const info =
        result.creatorInfo ||
        result.data ||
        result;


      const privacyOptions =
        info.privacy_level_options ||
        info.privacyLevelOptions ||
        [];


      const privacy =
        options.querySelector(
          ".tiktok-privacy"
        );


      clear(
        privacy
      );


      const values =
        privacyOptions.length
          ? privacyOptions
          : [
              "SELF_ONLY"
            ];


      for (
        const value
        of values
      ) {
        const option =
          document.createElement(
            "option"
          );


        option.value =
          value;

        option.textContent =
          prettyTikTokPrivacy(
            value
          );


        privacy.appendChild(
          option
        );
      }


      const commentDisabled =
        Boolean(
          info.comment_disabled ??
          info.commentDisabled
        );

      const duetDisabled =
        Boolean(
          info.duet_disabled ??
          info.duetDisabled
        );

      const stitchDisabled =
        Boolean(
          info.stitch_disabled ??
          info.stitchDisabled
        );


      applyTikTokCapability(
        options.querySelector(
          ".tiktok-comments"
        ),
        commentDisabled
      );

      applyTikTokCapability(
        options.querySelector(
          ".tiktok-duet"
        ),
        duetDisabled
      );

      applyTikTokCapability(
        options.querySelector(
          ".tiktok-stitch"
        ),
        stitchDisabled
      );


      options.dataset.loaded =
        "true";

      status.textContent =
        "Posting options loaded from TikTok.";

    } catch (error) {
      status.textContent =
        errorMessage(
          error
        );

      showToast(
        "Couldn't load TikTok posting options.",
        true
      );

    } finally {
      options.dataset.loading =
        "false";
    }
  }


  function applyTikTokCapability(
    input,
    disabledByCreator
  ) {
    if (
      !input
    ) {
      return;
    }


    input.disabled =
      disabledByCreator;


    if (
      disabledByCreator
    ) {
      input.checked =
        false;
    }
  }


  function prettyTikTokPrivacy(
    value
  ) {
    const labels = {
      PUBLIC_TO_EVERYONE:
        "Everyone",
      MUTUAL_FOLLOW_FRIENDS:
        "Friends",
      FOLLOWER_OF_CREATOR:
        "Followers",
      SELF_ONLY:
        "Private"
    };


    return labels[value] ||
      pretty(
        value
      );
  }


  function formatFileSize(
    bytes
  ) {
    const value =
      Number(bytes) || 0;


    if (
      value < 1024
    ) {
      return `${value} B`;
    }


    const units =
      [
        "KB",
        "MB",
        "GB"
      ];


    let size =
      value / 1024;

    let unitIndex =
      0;


    while (
      size >= 1024 &&
      unitIndex <
        units.length - 1
    ) {
      size /= 1024;
      unitIndex += 1;
    }


    return `${
      size >= 100
        ? size.toFixed(0)
        : size.toFixed(1)
    } ${units[unitIndex]}`;
  }


  function setMediaProgress(
    form,
    progress
  ) {
    const panel =
      form.querySelector(
        ".media-progress"
      );


    if (
      !panel
    ) {
      return;
    }


    panel.hidden =
      false;


    const phase =
      String(
        progress.phase ||
        "initialising"
      );


    const labels = {
      initialising:
        "Preparing upload…",
      uploading:
        "Uploading to TikTok",
      processing:
        "TikTok is processing your video…",
      published:
        "Published",
      failed:
        "Publishing failed"
    };


    const percentage =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            progress.percentage ||
            0
          )
        )
      );


    panel.querySelector(
      ".media-progress-label"
    ).textContent =
      labels[phase] ||
      pretty(phase);


    panel.querySelector(
      ".media-progress-percent"
    ).textContent =
      phase === "processing"
        ? "Processing"
        : `${Math.round(percentage)}%`;


    panel.querySelector(
      ".media-progress-bar"
    ).style.width =
      `${percentage}%`;


    const detail =
      panel.querySelector(
        ".media-progress-detail"
      );


    if (
      progress.loaded !==
        undefined &&
      progress.total
    ) {
      detail.textContent =
        `${
          formatFileSize(
            progress.loaded
          )
        } / ${
          formatFileSize(
            progress.total
          )
        }`;

    } else {
      detail.textContent =
        progress.providerStatus
          ? pretty(
              progress.providerStatus
            )
          : "";
    }


    panel.classList.toggle(
      "is-processing",
      phase === "processing"
    );

    panel.classList.toggle(
      "is-success",
      phase === "published"
    );

    panel.classList.toggle(
      "is-error",
      phase === "failed"
    );
  }


  async function publishSelectedTikTokNow(
    form,
    contentId
  ) {
    const file =
      form._selectedMediaFile;


    if (
      !file
    ) {
      showToast(
        "Choose your finished video first.",
        true
      );

      form.querySelector(
        ".media-drop-zone"
      )?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return;
    }


    const selectedTikTok =
      [
        ...form.querySelectorAll(
          '.destination-card[data-platform="tiktok"]'
        )
      ].filter(
        card =>
          card.querySelector(
            ".destination-checkbox"
          )?.checked
      );


    if (
      selectedTikTok.length !==
      1
    ) {
      showToast(
        "Select exactly one TikTok account for Publish Now.",
        true
      );

      return;
    }


    const card =
      selectedTikTok[0];


    const options =
      card.querySelector(
        ".tiktok-options"
      );


    if (
      options?.dataset.loaded !==
      "true"
    ) {
      await loadTikTokCreatorOptions(
        card,
        Number(
          card.dataset.accountId
        )
      );
    }


    const publishButton =
      form.querySelector(
        ".publisher-now-button"
      );


    const footerButtons =
      [
        ...form.querySelectorAll(
          ".publisher-footer button"
        )
      ];


    for (
      const node
      of footerButtons
    ) {
      node.disabled =
        true;
    }


    if (
      publishButton
    ) {
      publishButton.textContent =
        "Publishing…";
    }


    try {
      const result =
        await API.publishTikTokVideo({
          contentId,

          accountId:
            Number(
              card.dataset.accountId
            ),

          file,

          caption:
            card.querySelector(
              ".publication-caption"
            )?.value || "",

          privacyLevel:
            card.querySelector(
              ".tiktok-privacy"
            )?.value ||
            "SELF_ONLY",

          disableComment:
            !Boolean(
              card.querySelector(
                ".tiktok-comments"
              )?.checked
            ),

          disableDuet:
            !Boolean(
              card.querySelector(
                ".tiktok-duet"
              )?.checked
            ),

          disableStitch:
            !Boolean(
              card.querySelector(
                ".tiktok-stitch"
              )?.checked
            ),

          onProgress:
            progress => {
              setMediaProgress(
                form,
                progress
              );
            }
        });


      setMediaProgress(
        form,
        {
          phase: "published",
          percentage: 100,
          loaded: file.size,
          total: file.size
        }
      );


      showToast(
        "TikTok confirmed the video was published."
      );


      if (
        result?.postId
      ) {
        console.info(
          "TikTok post ID:",
          result.postId
        );
      }

    } catch (error) {
      setMediaProgress(
        form,
        {
          phase: "failed",
          percentage: 100
        }
      );


      showToast(
        errorMessage(
          error
        ),
        true
      );

    } finally {
      for (
        const node
        of footerButtons
      ) {
        node.disabled =
          false;
      }


      if (
        publishButton
      ) {
        publishButton.textContent =
          "Publish TikTok Now";
      }
    }
  }


  async function submitPublishingForm(
    form,
    contentId,
    saveDraft
  ) {
    const selected =
      [
        ...form.querySelectorAll(
          ".destination-card"
        )
      ].filter(
        card =>
          card.querySelector(
            ".destination-checkbox"
          ).checked
      );


    if (
      selected.length ===
      0
    ) {
      showToast(
        "Select at least one destination.",
        true
      );

      return;
    }


    const publications =
      [];


    for (
      const card
      of selected
    ) {
      const platform =
        card.dataset.platform;


      const scheduledInput =
        card.querySelector(
          ".publication-schedule"
        );


      const scheduledAt =
        scheduledInput?.value
          ? new Date(
              scheduledInput.value
            ).toISOString()
          : null;


      if (
        !saveDraft &&
        !scheduledAt
      ) {
        showToast(
          `Choose a schedule time for ${
            prettyPlatform(
              platform
            )
          }.`,
          true
        );


        scheduledInput
          ?.focus();

        return;
      }


      const title =
        card.querySelector(
          ".publication-title"
        )?.value || "";


      const caption =
        card.querySelector(
          ".publication-caption"
        )?.value || "";


      const description =
        card.querySelector(
          ".publication-description"
        )?.value || "";


      publications.push({
        socialAccountId:
          Number(
            card.dataset.accountId
          ),

        title,
        caption,
        description,

        scheduledAt:
          saveDraft
            ? null
            : scheduledAt,

        publishState:
          saveDraft
            ? "draft"
            : "queued"
      });
    }


    try {
      await API
        .createPublications({
          contentId,
          publications
        });


      showToast(
        saveDraft
          ? `${
              publications.length
            } publication draft${
              publications.length ===
              1
                ? ""
                : "s"
            } created.`

          : `${
              publications.length
            } post${
              publications.length ===
              1
                ? ""
                : "s"
            } scheduled.`
      );


      closeSheets();

      await renderRoute();

    } catch (error) {
      showToast(
        errorMessage(
          error
        ),
        true
      );
    }
  }


  function composerPublicationRow(
    publication,
    accounts
  ) {
    const row =
      el(
        "div",
        "existing-publication-row"
      );


    applyPublicationVisualState(
      row,
      publication
    );


    const account =
      accounts.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            publication.social_account_id
          )
      );


    const copy =
      el(
        "div"
      );


    copy.appendChild(
      el(
        "strong",
        "",
        prettyPlatform(
          publication.platform
        )
      )
    );


    const details =
      [];


    if (
      account
    ) {
      details.push(
        account.account_handle ||
        account.account_name
      );
    }


    if (
      publication.scheduled_at
    ) {
      details.push(
        formatDateTime(
          publication.scheduled_at
        )
      );
    }


    if (
      publication.publish_state ===
      "retrying" &&
      publication.next_attempt_at
    ) {
      details.push(
        `Retry ${
          formatDateTime(
            publication.next_attempt_at
          )
        }`
      );
    }


    copy.appendChild(
      el(
        "span",
        "muted-text",
        details.join(
          " • "
        ) ||
        "No schedule"
      )
    );


    if (
      publication.last_error
    ) {
      copy.appendChild(
        publicationErrorText(
          publication
        )
      );
    }


    row.appendChild(
      copy
    );


    row.appendChild(
      publicationBadge(
        publication
      )
    );


    const actions =
      el(
        "div",
        "inline-actions"
      );


    if (
      [
        "draft",
        "ready",
        "queued",
        "failed"
      ].includes(
        publication.publish_state
      )
    ) {
      actions.appendChild(
        button(
          "Edit",
          "secondary-button compact-button",

          () =>
            openEditPublication(
              publication
            )
        )
      );


      actions.appendChild(
        button(
          "Cancel",
          "danger-button compact-button",

          async () => {
            if (
              !window.confirm(
                "Cancel this publication?"
              )
            ) {
              return;
            }


            try {
              await API
                .cancelPublication(
                  publication.id
                );


              showToast(
                "Publication cancelled."
              );


              openPublishingComposer(
                state.publishingContentId
              );

            } catch (error) {
              showToast(
                errorMessage(
                  error
                ),
                true
              );
            }
          }
        )
      );
    }


    if (
      actions.childElementCount >
      0
    ) {
      row.appendChild(
        actions
      );
    }


    return row;
  }


  /* ======================================================
     EDIT PUBLICATION
  ====================================================== */

  function openEditPublication(
    publication
  ) {
    document.getElementById(
      "editPublicationId"
    ).value =
      publication.id;


    document.getElementById(
      "editPublicationTitle"
    ).value =
      publication.title || "";


    document.getElementById(
      "editPublicationCaption"
    ).value =
      publication.caption || "";


    document.getElementById(
      "editPublicationDescription"
    ).value =
      publication.description || "";


    document.getElementById(
      "editPublicationSchedule"
    ).value =
      publication.scheduled_at
        ? localDateTimeValue(
            new Date(
              publication.scheduled_at
            )
          )
        : "";


    openSheet(
      editPublicationSheet
    );
  }


  document
    .getElementById(
      "editPublicationForm"
    )
    .addEventListener(
      "submit",

      async event => {
        event.preventDefault();


        const id =
          Number(
            document.getElementById(
              "editPublicationId"
            ).value
          );


        const schedule =
          document.getElementById(
            "editPublicationSchedule"
          ).value;


        try {
          await API
            .updatePublication(
              id,
              {
                title:
                  document.getElementById(
                    "editPublicationTitle"
                  ).value,

                caption:
                  document.getElementById(
                    "editPublicationCaption"
                  ).value,

                description:
                  document.getElementById(
                    "editPublicationDescription"
                  ).value,

                scheduledAt:
                  schedule
                    ? new Date(
                        schedule
                      ).toISOString()
                    : null,

                publishState:
                  schedule
                    ? "queued"
                    : "ready"
              }
            );


          showToast(
            "Publication updated."
          );


          closeSheets();

          await renderRoute();

        } catch (error) {
          showToast(
            errorMessage(
              error
            ),
            true
          );
        }
      }
    );


  /* ======================================================
     CALENDAR
  ====================================================== */

  async function renderCalendar() {
    const data =
      await API.publications();


    let publications =
      data.publications || [];


    if (
      state.activeProjectId
    ) {
      publications =
        publications.filter(
          item =>
            Number(
              item.project_id
            ) ===
            Number(
              state.activeProjectId
            )
        );
    }


    /*
     * Cancelled publications are history, not calendar
     * events.
     */
    publications =
      publications.filter(
        item =>
          item.publish_state !==
            "cancelled" &&
          (
            item.scheduled_at ||
            item.published_at
          )
      );


    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "SCHEDULE",
        "Content Calendar",
        "Every queued, processing and published platform post."
      )
    );


    if (
      publications.length ===
      0
    ) {
      page.appendChild(
        emptyState(
          "Calendar empty",
          "Schedule ready content and it will appear here."
        )
      );

      return;
    }


    const groups =
      new Map();


    for (
      const publication
      of publications
    ) {
      const dateValue =
        publication.published_at ||
        publication.scheduled_at;


      const date =
        new Date(
          dateValue
        );


      const key =
        date.toISOString()
          .slice(
            0,
            10
          );


      if (
        !groups.has(
          key
        )
      ) {
        groups.set(
          key,
          []
        );
      }


      groups
        .get(
          key
        )
        .push(
          publication
        );
    }


    const sortedGroups =
      [...groups.entries()]
        .sort(
          (
            [a],
            [b]
          ) =>
            a.localeCompare(
              b
            )
        );


    const calendar =
      el(
        "div",
        "calendar-list"
      );


    for (
      const [
        key,
        items
      ]
      of sortedGroups
    ) {
      const group =
        el(
          "section",
          "calendar-day"
        );


      const labelDate =
        new Date(
          `${key}T12:00:00`
        );


      group.appendChild(
        el(
          "h2",
          "",
          labelDate
            .toLocaleDateString(
              "en-GB",
              {
                weekday:
                  "long",

                day:
                  "numeric",

                month:
                  "long",

                year:
                  "numeric"
              }
            )
        )
      );


      items.sort(
        (
          a,
          b
        ) => {
          const first =
            new Date(
              a.published_at ||
              a.scheduled_at
            ).getTime();

          const second =
            new Date(
              b.published_at ||
              b.scheduled_at
            ).getTime();

          return (
            first -
            second
          );
        }
      );


      for (
        const item
        of items
      ) {
        group.appendChild(
          publicationRow(
            item
          )
        );
      }


      calendar.appendChild(
        group
      );
    }


    page.appendChild(
      calendar
    );
  }


  /* ======================================================
     PROJECTS
  ====================================================== */

  async function renderProjects() {
    const data =
      await API.projects();


    state.projects =
      data.projects || [];


    populateProjectSelects();


    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "WORKSPACES",
        "Projects",
        "Keep brands, games, software and content separated.",

        button(
          "+ Project",
          "primary-button",

          () =>
            document
              .getElementById(
                "projectDialog"
              )
              .showModal()
        )
      )
    );


    const grid =
      el(
        "div",
        "project-grid"
      );


    for (
      const project
      of state.projects
    ) {
      const card =
        el(
          "article",
          "project-card"
        );


      card.style.setProperty(
        "--project-accent",
        project.accent_colour ||
        "#6C63FF"
      );


      card.appendChild(
        el(
          "span",
          "eyebrow",
          project.project_type
        )
      );


      card.appendChild(
        el(
          "h2",
          "",
          project.name
        )
      );


      card.appendChild(
        el(
          "p",
          "muted-text",
          project.description ||
          "No description"
        )
      );


      const meta =
        el(
          "div",
          "project-meta"
        );


      meta.appendChild(
        el(
          "span",
          "",
          `${
            project.content_count ||
            0
          } content`
        )
      );


      meta.appendChild(
        el(
          "span",
          "",
          `${
            project.account_count ||
            0
          } accounts`
        )
      );


      card.appendChild(
        meta
      );


      card.appendChild(
        button(
          "Open workspace",
          "secondary-button full-button",

          () => {
            state.activeProjectId =
              Number(
                project.id
              );


            projectSwitcher.value =
              String(
                project.id
              );


            setRoute(
              "today"
            );
          }
        )
      );


      grid.appendChild(
        card
      );
    }


    page.appendChild(
      grid
    );
  }


  /* ======================================================
     IDEAS
  ====================================================== */

  async function renderIdeas() {
    const data =
      await API.ideas();


    let ideas =
      data.ideas || [];


    if (
      state.activeProjectId
    ) {
      ideas =
        ideas.filter(
          idea =>
            Number(
              idea.project_id
            ) ===
            Number(
              state.activeProjectId
            )
        );
    }


    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "INBOX",
        "Ideas",
        "Capture it before it disappears.",

        button(
          "+ Idea",
          "primary-button",

          () =>
            document
              .getElementById(
                "ideaDialog"
              )
              .showModal()
        )
      )
    );


    if (
      ideas.length ===
      0
    ) {
      page.appendChild(
        emptyState(
          "Idea inbox empty",
          "That probably won't last long."
        )
      );

      return;
    }


    const grid =
      el(
        "div",
        "idea-grid"
      );


    for (
      const idea
      of ideas
    ) {
      const card =
        el(
          "article",
          "idea-card"
        );


      card.appendChild(
        el(
          "span",
          "eyebrow",
          idea.project_name ||
          "GENERAL"
        )
      );


      card.appendChild(
        el(
          "h3",
          "",
          idea.title
        )
      );


      if (
        idea.description
      ) {
        card.appendChild(
          el(
            "p",
            "muted-text",
            idea.description
          )
        );
      }


      grid.appendChild(
        card
      );
    }


    page.appendChild(
      grid
    );
  }


  /* ======================================================
     ACCOUNTS
  ====================================================== */

  async function renderAccounts() {
    const data =
      await API.accounts();


    let accounts =
      data.accounts || [];


    if (
      state.activeProjectId
    ) {
      accounts =
        accounts.filter(
          account =>
            Number(
              account.project_id
            ) ===
            Number(
              state.activeProjectId
            )
        );
    }


    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "DISTRIBUTION",
        "Social Accounts",
        "Connect each brand only to the accounts it owns.",

        button(
          "+ Account",
          "primary-button",

          () =>
            document
              .getElementById(
                "accountDialog"
              )
              .showModal()
        )
      )
    );


    const connectPanel =
      panel(
        "Connect Platform",
        "OAuth connections are attached to the selected workspace."
      );


    const controls =
      el(
        "div",
        "social-connect-controls"
      );


    const select =
      document.createElement(
        "select"
      );


    select.className =
      "project-switcher";


    for (
      const project
      of state.projects
    ) {
      const option =
        document.createElement(
          "option"
        );


      option.value =
        project.id;

      option.textContent =
        project.name;


      select.appendChild(
        option
      );
    }


    if (
      state.activeProjectId
    ) {
      select.value =
        String(
          state.activeProjectId
        );
    }


    controls.appendChild(
      select
    );


    controls.appendChild(
      button(
        "Connect TikTok",
        "secondary-button",

        async () => {
          try {
            const data =
              await API
                .startTikTok(
                  Number(
                    select.value
                  )
                );


            window.location.href =
              data.authorizationUrl;

          } catch (error) {
            showToast(
              errorMessage(
                error
              ),
              true
            );
          }
        }
      )
    );


    controls.appendChild(
      button(
        "Connect YouTube",
        "secondary-button",

        async () => {
          try {
            const data =
              await API
                .startYouTube(
                  Number(
                    select.value
                  )
                );


            window.location.href =
              data.authorizationUrl;

          } catch (error) {
            showToast(
              errorMessage(
                error
              ),
              true
            );
          }
        }
      )
    );


    connectPanel.appendChild(
      controls
    );


    page.appendChild(
      connectPanel
    );


    if (
      accounts.length ===
      0
    ) {
      page.appendChild(
        emptyState(
          "No social accounts",
          "Add an account record or connect TikTok / YouTube."
        )
      );

      return;
    }


    const grid =
      el(
        "div",
        "account-grid"
      );


    for (
      const account
      of accounts
    ) {
      const card =
        el(
          "article",
          "account-card"
        );


      const heading =
        el(
          "div",
          "account-heading"
        );


      const copy =
        el(
          "div"
        );


      copy.appendChild(
        el(
          "span",
          "eyebrow",
          prettyPlatform(
            account.platform
          )
        )
      );


      copy.appendChild(
        el(
          "h3",
          "",
          account.account_name
        )
      );


      copy.appendChild(
        el(
          "p",
          "muted-text",
          account.account_handle ||
          account.project_name ||
          ""
        )
      );


      heading.appendChild(
        copy
      );


      heading.appendChild(
        badge(
          account.status
        )
      );


      card.appendChild(
        heading
      );


      const actions =
        el(
          "div",
          "card-actions"
        );


      if (
        account.platform ===
          "tiktok" &&
        account.status ===
          "connected"
      ) {
        actions.appendChild(
          button(
            "Check posting access",
            "secondary-button compact-button",

            async () => {
              try {
                await API
                  .creatorInfo(
                    account.id
                  );


                showToast(
                  "TikTok posting access confirmed."
                );

              } catch (error) {
                showToast(
                  errorMessage(
                    error
                  ),
                  true
                );
              }
            }
          )
        );
      }


      if (
        account.status ===
        "connected"
      ) {
        actions.appendChild(
          button(
            "Disconnect",
            "danger-button compact-button",

            async () => {
              if (
                !window.confirm(
                  "Disconnect this social account?"
                )
              ) {
                return;
              }


              try {
                await API
                  .disconnectAccount(
                    account.id
                  );


                showToast(
                  "Account disconnected."
                );


                renderAccounts();

              } catch (error) {
                showToast(
                  errorMessage(
                    error
                  ),
                  true
                );
              }
            }
          )
        );
      }


      card.appendChild(
        actions
      );


      grid.appendChild(
        card
      );
    }


    page.appendChild(
      grid
    );
  }


  /* ======================================================
     ANALYTICS
  ====================================================== */

  function renderAnalytics() {
    clear(
      page
    );


    page.appendChild(
      createPageHeader(
        "PERFORMANCE",
        "Analytics",
        "Publishing comes first. Performance data comes next."
      )
    );


    page.appendChild(
      emptyState(
        "Analytics isn't wired yet",
        "Once posts are being published through Project Hub, we'll bring performance back into this dashboard."
      )
    );
  }


  /* ======================================================
     COMMON PUBLICATION ROW
  ====================================================== */

  function publicationRow(
    publication
  ) {
    const row =
      el(
        "article",
        "publication-row"
      );


    applyPublicationVisualState(
      row,
      publication
    );


    const platform =
      el(
        "div",
        `platform-icon platform-${
          String(
            publication.platform ||
            ""
          ).toLowerCase()
        }`,

        platformInitial(
          publication.platform
        )
      );


    row.appendChild(
      platform
    );


    const copy =
      el(
        "div",
        "publication-copy"
      );


    copy.appendChild(
      el(
        "strong",
        "",
        publication.content_title ||
        publication.title ||
        "Untitled"
      )
    );


    const details =
      [
        prettyPlatform(
          publication.platform
        ),

        publication.account_name,

        primaryPublicationTime(
          publication
        )
      ]
        .filter(
          Boolean
        )
        .join(
          " • "
        );


    copy.appendChild(
      el(
        "span",
        "muted-text",
        details
      )
    );


    const meta =
      publicationMeta(
        publication
      );


    if (
      meta.childElementCount >
      0
    ) {
      copy.appendChild(
        meta
      );
    }


    if (
      publication.last_error
    ) {
      copy.appendChild(
        publicationErrorText(
          publication
        )
      );
    }


    row.appendChild(
      copy
    );


    row.appendChild(
      publicationBadge(
        publication
      )
    );


    const actions =
      el(
        "div",
        "inline-actions"
      );


    if (
      [
        "draft",
        "ready",
        "queued",
        "failed"
      ].includes(
        publication.publish_state
      )
    ) {
      actions.appendChild(
        button(
          publicationNeedsMedia(
            publication
          )
            ? "Manage"
            : "Edit",

          "secondary-button compact-button",

          () => {
            if (
              publication.content_id &&
              publicationNeedsMedia(
                publication
              )
            ) {
              openPublishingComposer(
                publication.content_id
              );

              return;
            }


            openEditPublication(
              publication
            );
          }
        )
      );
    }


    if (
      publication.publish_state ===
        "published" &&
      publication.external_post_url
    ) {
      const link =
        document.createElement(
          "a"
        );


      link.className =
        "secondary-button compact-button";

      link.textContent =
        "View post";

      link.href =
        publication.external_post_url;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";


      actions.appendChild(
        link
      );
    }


    if (
      actions.childElementCount >
      0
    ) {
      row.appendChild(
        actions
      );
    }


    return row;
  }


  function publicationMeta(
    publication
  ) {
    const meta =
      el(
        "div",
        "publication-meta"
      );


    if (
      publication.publish_state ===
        "processing"
    ) {
      meta.appendChild(
        el(
          "span",
          "publication-meta-item",
          "Publishing now…"
        )
      );
    }


    if (
      publication.publish_state ===
        "retrying"
    ) {
      meta.appendChild(
        el(
          "span",
          "publication-meta-item",
          `Attempt ${
            publication.attempt_count ||
            0
          }/${
            publication.max_attempts ||
            3
          }`
        )
      );


      if (
        publication.next_attempt_at
      ) {
        meta.appendChild(
          el(
            "span",
            "publication-meta-item",
            `Next ${
              formatDateTime(
                publication.next_attempt_at
              )
            }`
          )
        );
      }
    }


    if (
      publication.publish_state ===
        "failed"
    ) {
      meta.appendChild(
        el(
          "span",
          "publication-meta-item",
          `${
            publication.attempt_count ||
            0
          }/${
            publication.max_attempts ||
            3
          } attempts`
        )
      );
    }


    if (
      publication.publish_state ===
        "published" &&
      publication.published_at
    ) {
      meta.appendChild(
        el(
          "span",
          "publication-meta-item",
          `Published ${
            formatDateTime(
              publication.published_at
            )
          }`
        )
      );
    }


    return meta;
  }


  function publicationBadge(
    publication
  ) {
    if (
      publicationNeedsMedia(
        publication
      )
    ) {
      return el(
        "span",
        "status-badge status-media-required",
        "Media Required"
      );
    }


    return badge(
      publication.publish_state
    );
  }


  function publicationErrorText(
    publication
  ) {
    const value =
      cleanPublicationError(
        publication.last_error
      );


    const node =
      el(
        "p",
        publication.publish_state ===
          "failed"
          ? "publication-error-copy danger"
          : "publication-error-copy",

        value
      );


    return node;
  }


  function cleanPublicationError(
    value
  ) {
    if (
      !value
    ) {
      return "";
    }


    const text =
      String(
        value
      );


    if (
      text.startsWith(
        "MEDIA_REQUIRED"
      )
    ) {
      return "Finished media needs to be attached before this can publish.";
    }


    if (
      text.startsWith(
        "ACCOUNT_REAUTH_REQUIRED"
      )
    ) {
      return "The social account needs to be reconnected.";
    }


    if (
      text.startsWith(
        "ACCOUNT_NOT_CONNECTED"
      )
    ) {
      return "The social account is no longer connected.";
    }


    if (
      text.startsWith(
        "PROCESSING_TIMEOUT"
      )
    ) {
      return "Publishing timed out. Project Hub will retry automatically.";
    }


    return pretty(
      text
        .split(
          ":"
        )[0]
    );
  }


  function publicationNeedsMedia(
    publication
  ) {
    return String(
      publication.last_error ||
      ""
    ).startsWith(
      "MEDIA_REQUIRED"
    );
  }


  function publicationNeedsAttention(
    publication
  ) {
    if (
      publication.publish_state ===
      "failed"
    ) {
      return true;
    }


    if (
      publicationNeedsMedia(
        publication
      )
    ) {
      return true;
    }


    return false;
  }


  function applyPublicationVisualState(
    node,
    publication
  ) {
    if (
      publicationNeedsMedia(
        publication
      ) ||
      publication.publish_state ===
        "retrying"
    ) {
      node.classList.add(
        "publication-attention"
      );
    }


    if (
      publication.publish_state ===
        "failed"
    ) {
      node.classList.add(
        "publication-error"
      );
    }
  }


  function primaryPublicationTime(
    publication
  ) {
    if (
      publication.publish_state ===
        "published" &&
      publication.published_at
    ) {
      return formatDateTime(
        publication.published_at
      );
    }


    if (
      publication.scheduled_at
    ) {
      return formatDateTime(
        publication.scheduled_at
      );
    }


    return "Not scheduled";
  }


  function contentMiniRow(
    item
  ) {
    const row =
      el(
        "div",
        "list-row"
      );


    const copy =
      el(
        "div"
      );


    copy.appendChild(
      el(
        "strong",
        "",
        item.title
      )
    );


    copy.appendChild(
      el(
        "span",
        "muted-text",
        item.project_name ||
        ""
      )
    );


    row.appendChild(
      copy
    );


    row.appendChild(
      badge(
        item.status
      )
    );


    return row;
  }


  /* ======================================================
     CREATE CONTENT
  ====================================================== */

  function openCreateContent() {
    populateProjectSelects();


    if (
      state.activeProjectId
    ) {
      document.getElementById(
        "contentProject"
      ).value =
        String(
          state.activeProjectId
        );
    }


    openSheet(
      createSheet
    );
  }


  document
    .getElementById(
      "createButton"
    )
    .addEventListener(
      "click",
      openCreateContent
    );


  document
    .getElementById(
      "mobileCreateButton"
    )
    .addEventListener(
      "click",
      openCreateContent
    );


  document
    .getElementById(
      "moreButton"
    )
    .addEventListener(
      "click",

      () =>
        openSheet(
          moreSheet
        )
    );


  document
    .getElementById(
      "contentForm"
    )
    .addEventListener(
      "submit",

      async event => {
        event.preventDefault();


        try {
          await API
            .createContent({
              projectId:
                Number(
                  document.getElementById(
                    "contentProject"
                  ).value
                ),

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


          event.target.reset();


          showToast(
            "Content created."
          );


          closeSheets();


          await renderRoute();

        } catch (error) {
          showToast(
            errorMessage(
              error
            ),
            true
          );
        }
      }
    );


  /* ======================================================
     CREATE PROJECT
  ====================================================== */

  document
    .getElementById(
      "projectForm"
    )
    .addEventListener(
      "submit",

      async event => {
        event.preventDefault();


        try {
          await API
            .createProject({
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


          event.target.reset();


          document
            .getElementById(
              "projectDialog"
            )
            .close();


          await refreshProjects();


          showToast(
            "Project created."
          );


          renderRoute();

        } catch (error) {
          showToast(
            errorMessage(
              error
            ),
            true
          );
        }
      }
    );


  document
    .getElementById(
      "closeProjectDialog"
    )
    .addEventListener(
      "click",

      () =>
        document
          .getElementById(
            "projectDialog"
          )
          .close()
    );


  /* ======================================================
     CREATE IDEA
  ====================================================== */

  document
    .getElementById(
      "ideaForm"
    )
    .addEventListener(
      "submit",

      async event => {
        event.preventDefault();


        const projectValue =
          document.getElementById(
            "ideaProject"
          ).value;


        try {
          await API
            .createIdea({
              title:
                document.getElementById(
                  "ideaTitle"
                ).value,

              description:
                document.getElementById(
                  "ideaDescription"
                ).value,

              projectId:
                projectValue
                  ? Number(
                      projectValue
                    )
                  : null,

              ideaType:
                "general"
            });


          event.target.reset();


          document
            .getElementById(
              "ideaDialog"
            )
            .close();


          showToast(
            "Idea captured."
          );


          renderRoute();

        } catch (error) {
          showToast(
            errorMessage(
              error
            ),
            true
          );
        }
      }
    );


  document
    .getElementById(
      "closeIdeaDialog"
    )
    .addEventListener(
      "click",

      () =>
        document
          .getElementById(
            "ideaDialog"
          )
          .close()
    );


  /* ======================================================
     CREATE ACCOUNT
  ====================================================== */

  document
    .getElementById(
      "accountForm"
    )
    .addEventListener(
      "submit",

      async event => {
        event.preventDefault();


        try {
          await API
            .createAccount({
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


          event.target.reset();


          document
            .getElementById(
              "accountDialog"
            )
            .close();


          showToast(
            "Account added."
          );


          renderRoute();

        } catch (error) {
          showToast(
            errorMessage(
              error
            ),
            true
          );
        }
      }
    );


  document
    .getElementById(
      "closeAccountDialog"
    )
    .addEventListener(
      "click",

      () =>
        document
          .getElementById(
            "accountDialog"
          )
          .close()
    );


  /* ======================================================
     LOGOUT
  ====================================================== */

  async function logout() {
    try {
      await API.logout();

    } finally {
      window.location.href =
        "./login.html";
    }
  }


  document
    .getElementById(
      "logoutButton"
    )
    .addEventListener(
      "click",
      logout
    );


  document
    .getElementById(
      "mobileLogout"
    )
    .addEventListener(
      "click",
      logout
    );


  /* ======================================================
     COMPONENT HELPERS
  ====================================================== */

  function panel(
    title,
    subtitle
  ) {
    const section =
      el(
        "section",
        "panel"
      );


    const header =
      el(
        "div",
        "panel-header"
      );


    const copy =
      el(
        "div"
      );


    copy.appendChild(
      el(
        "h2",
        "",
        title
      )
    );


    if (
      subtitle
    ) {
      copy.appendChild(
        el(
          "p",
          "muted-text",
          subtitle
        )
      );
    }


    header.appendChild(
      copy
    );


    section.appendChild(
      header
    );


    return section;
  }


  function emptyState(
    title,
    description
  ) {
    const node =
      el(
        "div",
        "empty-state"
      );


    node.appendChild(
      el(
        "strong",
        "",
        title
      )
    );


    node.appendChild(
      el(
        "p",
        "muted-text",
        description
      )
    );


    return node;
  }


  function badge(
    value
  ) {
    const clean =
      String(
        value ||
        "unknown"
      ).toLowerCase();


    return el(
      "span",
      `status-badge status-${clean}`,
      pretty(
        clean
      )
    );
  }


  function pretty(
    value
  ) {
    return String(
      value ||
      ""
    )
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        character =>
          character
            .toUpperCase()
      );
  }


  function prettyPlatform(
    platform
  ) {
    if (
      platform ===
      "youtube"
    ) {
      return "YouTube";
    }


    if (
      platform ===
      "tiktok"
    ) {
      return "TikTok";
    }


    if (
      platform ===
      "instagram"
    ) {
      return "Instagram";
    }


    return pretty(
      platform
    );
  }


  function platformInitial(
    platform
  ) {
    switch (
      platform
    ) {

      case "youtube":
        return "YT";

      case "tiktok":
        return "TT";

      case "instagram":
        return "IG";

      default:
        return "?";
    }
  }


  function formatDateTime(
    value
  ) {
    if (
      !value
    ) {
      return "";
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }


    return date.toLocaleString(
      "en-GB",
      {
        day:
          "numeric",

        month:
          "short",

        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    );
  }


  function localDateTimeValue(
    date
  ) {
    const pad =
      value =>
        String(
          value
        ).padStart(
          2,
          "0"
        );


    return (
      date.getFullYear() +
      "-" +
      pad(
        date.getMonth() +
        1
      ) +
      "-" +
      pad(
        date.getDate()
      ) +
      "T" +
      pad(
        date.getHours()
      ) +
      ":" +
      pad(
        date.getMinutes()
      )
    );
  }


  function filterProject(
    items
  ) {
    if (
      !state.activeProjectId
    ) {
      return items;
    }


    return items.filter(
      item =>
        Number(
          item.project_id
        ) ===
        Number(
          state.activeProjectId
        )
    );
  }


  function greeting() {
    const hour =
      new Date()
        .getHours();


    if (
      hour < 12
    ) {
      return "Good morning";
    }


    if (
      hour < 18
    ) {
      return "Good afternoon";
    }


    return "Good evening";
  }


  /* ======================================================
     OAUTH RESULT
  ====================================================== */

  function handleOAuthResult() {
    const url =
      new URL(
        window.location.href
      );


    const provider =
      url.searchParams.get(
        "oauth"
      );


    if (
      !provider
    ) {
      return;
    }


    const status =
      url.searchParams.get(
        "oauthStatus"
      );


    const error =
      url.searchParams.get(
        "oauthError"
      );


    if (
      status ===
      "success"
    ) {
      showToast(
        `${
          prettyPlatform(
            provider
          )
        } connected.`
      );

    } else {
      showToast(
        error
          ? `${
              prettyPlatform(
                provider
              )
            }: ${error}`

          : `${
              prettyPlatform(
                provider
              )
            } connection failed.`,

        true
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


    window.history
      .replaceState(
        {},
        "",
        url.pathname +
        url.search +
        url.hash
      );


    state.route =
      "accounts";
  }


  /* ======================================================
     STARTUP
  ====================================================== */

  async function start() {
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
          .charAt(
            0
          )
          .toUpperCase();


      await refreshProjects();


      handleOAuthResult();


      setRoute(
        state.route
      );

    } catch (error) {
      console.error(
        "App startup failed:",
        error
      );
    }
  }


  start();

})();
