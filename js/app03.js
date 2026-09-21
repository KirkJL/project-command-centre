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
    document.getElementById("page");

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
      document.createElement(tag);

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

    node.type = "button";

    node.addEventListener(
      "click",
      handler
    );

    return node;
  }


  function clear(node) {
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

    toast.hidden = false;

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          toast.hidden = true;
        },
        3500
      );
  }


  function errorMessage(error) {
    const value =
      error?.data?.error ||
      error?.message ||
      "Something went wrong.";

    return String(value)
      .replaceAll("_", " ");
  }


  /* ======================================================
     SHEETS
  ====================================================== */

  function closeSheets() {
    createSheet.hidden = true;
    moreSheet.hidden = true;
    publishSheet.hidden = true;
    editPublicationSheet.hidden =
      true;

    backdrop.hidden = true;

    document.body.classList.remove(
      "sheet-open"
    );
  }


  function openSheet(sheet) {
    closeSheets();

    sheet.hidden = false;
    backdrop.hidden = false;

    document.body.classList.add(
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
    .forEach(node => {
      node.addEventListener(
        "click",
        closeSheets
      );
    });


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

    for (const select of selects) {
      if (!select) {
        continue;
      }

      const current =
        select.value;

      clear(select);

      if (
        select ===
        projectSwitcher
      ) {
        const option =
          document.createElement(
            "option"
          );

        option.value = "";
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

        option.value = "";
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
        [...select.options].some(
          option =>
            option.value ===
            current
        )
      ) {
        select.value = current;
      } else if (
        state.activeProjectId &&
        [...select.options].some(
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

  function setRoute(route) {
    if (!routes[route]) {
      route = "today";
    }

    state.route = route;

    mobileSection.textContent =
      routes[
        route
      ].toUpperCase();

    document
      .querySelectorAll(
        "[data-route]"
      )
      .forEach(node => {
        node.classList.toggle(
          "active",
          node.dataset.route ===
            route
        );
      });

    closeSheets();

    renderRoute();
  }


  async function renderRoute() {
    page.setAttribute(
      "aria-busy",
      "true"
    );

    clear(page);

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
      clear(page);

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
          errorMessage(error)
        )
      );

      page.appendChild(card);
    }

    page.removeAttribute(
      "aria-busy"
    );
  }


  document
    .querySelectorAll(
      "[data-route]"
    )
    .forEach(node => {
      node.addEventListener(
        "click",
        () => {
          setRoute(
            node.dataset.route
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-more-route]"
    )
    .forEach(node => {
      node.addEventListener(
        "click",
        () => {
          setRoute(
            node.dataset.moreRoute
          );
        }
      );
    });


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

    if (description) {
      copy.appendChild(
        el(
          "p",
          "muted-text",
          description
        )
      );
    }

    header.appendChild(copy);

    if (action) {
      header.appendChild(action);
    }

    return header;
  }


  /* ======================================================
     TODAY
  ====================================================== */

  async function renderToday() {
    const data =
      await API.dashboard();

    clear(page);

    const projects =
      filterProject(
        data.projects || []
      );

    const content =
      filterProject(
        data.recentContent || []
      );

    const publications =
      filterProject(
        data.publications || []
      );

    page.appendChild(
      createPageHeader(
        "COMMAND CENTRE",
        `Good evening, ${
          state.user?.displayName ||
          "Kirk"
        }.`,
        "Everything moving across your projects."
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
        content.length,
        "Recent content"
      )
    );

    stats.appendChild(
      statCard(
        publications.length,
        "Publishing queue"
      )
    );

    stats.appendChild(
      statCard(
        data.ideaCount || 0,
        "Ideas"
      )
    );

    page.appendChild(stats);


    const layout =
      el(
        "section",
        "dashboard-grid"
      );


    /* QUEUE */

    const queue =
      panel(
        "Publishing Queue",
        "Posts waiting to go out"
      );

    if (
      publications.length === 0
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
        of publications
      ) {
        list.appendChild(
          publicationRow(
            publication
          )
        );
      }

      queue.appendChild(list);
    }

    layout.appendChild(queue);


    /* CONTENT */

    const recent =
      panel(
        "Recent Content",
        "Latest work across your pipeline"
      );

    if (
      content.length === 0
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
        of content
      ) {
        list.appendChild(
          contentMiniRow(item)
        );
      }

      recent.appendChild(list);
    }

    layout.appendChild(recent);


    /* TASKS */

    const tasks =
      panel(
        "Tasks",
        "Work requiring attention"
      );

    const taskItems =
      data.tasks || [];

    if (
      taskItems.length === 0
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
          el("div");

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

        row.appendChild(copy);

        row.appendChild(
          badge(
            task.priority ||
            "normal"
          )
        );

        list.appendChild(row);
      }

      tasks.appendChild(list);
    }

    layout.appendChild(tasks);

    page.appendChild(layout);
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

    clear(page);

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
      items.length === 0
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
          pretty(stage)
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
          contentCard(item)
        );
      }


      if (
        stageItems.length === 0
      ) {
        cards.appendChild(
          el(
            "div",
            "pipeline-empty",
            "Empty"
          )
        );
      }

      column.appendChild(cards);
      board.appendChild(column);
    }


    page.appendChild(board);
  }


  function contentCard(item) {
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
        item.project_name || ""
      )
    );


    const actions =
      el(
        "div",
        "card-actions"
      );


    if (
      item.status === "ready" ||
      item.status === "scheduled"
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
          `→ ${pretty(next)}`,
          "secondary-button compact-button",
          async () => {
            try {
              await API
                .updateContentStatus(
                  item.id,
                  next
                );

              showToast(
                `Moved to ${pretty(next)}.`
              );

              renderContent();
            } catch (error) {
              showToast(
                errorMessage(error),
                true
              );
            }
          }
        )
      );
    }


    card.appendChild(actions);

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

    project.textContent = "";

    clear(body);

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
      clear(body);

      body.appendChild(
        emptyState(
          "Couldn't open publisher",
          errorMessage(error)
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

    clear(body);

    const accounts =
      data.accounts || [];

    const existing =
      data.publications || [];


    if (
      existing.length > 0
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
      accounts.length === 0
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

    body.appendChild(heading);


    const form =
      el(
        "form",
        "publisher-form"
      );

    form.id =
      "publisherForm";


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


    body.appendChild(form);
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
      el("div");

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
    }


    const scheduleField =
      el("label");

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


    card.appendChild(fields);


    checkbox.addEventListener(
      "change",
      () => {
        card.classList.toggle(
          "selected",
          checkbox.checked
        );
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
      el("label");

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
      fieldName === "title"
    ) {
      input.maxLength = 500;
    }

    if (
      fieldName === "caption"
    ) {
      input.maxLength = 5000;
    }

    if (
      fieldName ===
      "description"
    ) {
      input.maxLength = 10000;
    }


    label.appendChild(input);

    return label;
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
      ].filter(card =>
        card.querySelector(
          ".destination-checkbox"
        ).checked
      );


    if (
      selected.length === 0
    ) {
      showToast(
        "Select at least one destination.",
        true
      );

      return;
    }


    const publications = [];


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
          `Choose a schedule time for ${prettyPlatform(platform)}.`,
          true
        );

        scheduledInput?.focus();

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
      await API.createPublications({
        contentId,
        publications
      });


      showToast(
        saveDraft
          ? `${publications.length} publication draft${
              publications.length === 1
                ? ""
                : "s"
            } created.`
          : `${publications.length} post${
              publications.length === 1
                ? ""
                : "s"
            } scheduled.`
      );


      closeSheets();

      await renderRoute();

    } catch (error) {
      showToast(
        errorMessage(error),
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


    const account =
      accounts.find(
        item =>
          Number(item.id) ===
          Number(
            publication.social_account_id
          )
      );


    const copy =
      el("div");


    copy.appendChild(
      el(
        "strong",
        "",
        prettyPlatform(
          publication.platform
        )
      )
    );


    const details = [];

    if (account) {
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


    copy.appendChild(
      el(
        "span",
        "muted-text",
        details.join(" • ") ||
        "No schedule"
      )
    );


    row.appendChild(copy);

    row.appendChild(
      badge(
        publication.publish_state
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
        "queued"
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
                errorMessage(error),
                true
              );
            }
          }
        )
      );
    }


    row.appendChild(actions);

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
          await API.updatePublication(
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
            errorMessage(error),
            true
          );
        }
      }
    );


  /* ======================================================
     CALENDAR
  ====================================================== */

  async function renderCalendar() {
    /*
      Build 3D uses publication_jobs directly rather than
      the legacy calendar publication source.
    */

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


    publications =
      publications.filter(
        item =>
          item.scheduled_at ||
          item.published_at
      );


    clear(page);


    page.appendChild(
      createPageHeader(
        "SCHEDULE",
        "Content Calendar",
        "Every queued and published platform post."
      )
    );


    if (
      publications.length === 0
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
        publication.scheduled_at ||
        publication.published_at;

      const key =
        new Date(
          dateValue
        ).toLocaleDateString(
          "en-GB",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        );


      if (!groups.has(key)) {
        groups.set(
          key,
          []
        );
      }

      groups.get(key).push(
        publication
      );
    }


    const calendar =
      el(
        "div",
        "calendar-list"
      );


    for (
      const [date, items]
      of groups
    ) {
      const group =
        el(
          "section",
          "calendar-day"
        );

      group.appendChild(
        el(
          "h2",
          "",
          date
        )
      );


      for (
        const item
        of items
      ) {
        group.appendChild(
          publicationRow(item)
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

    clear(page);


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
          `${project.content_count || 0} content`
        )
      );

      meta.appendChild(
        el(
          "span",
          "",
          `${project.account_count || 0} accounts`
        )
      );

      card.appendChild(meta);


      card.appendChild(
        button(
          "Open workspace",
          "secondary-button full-button",
          () => {
            state.activeProjectId =
              Number(project.id);

            projectSwitcher.value =
              String(project.id);

            setRoute(
              "today"
            );
          }
        )
      );


      grid.appendChild(card);
    }


    page.appendChild(grid);
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


    clear(page);


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
      ideas.length === 0
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

      grid.appendChild(card);
    }


    page.appendChild(grid);
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


    clear(page);


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

      select.appendChild(option);
    }


    if (
      state.activeProjectId
    ) {
      select.value =
        String(
          state.activeProjectId
        );
    }


    controls.appendChild(select);


    controls.appendChild(
      button(
        "Connect TikTok",
        "secondary-button",
        async () => {
          try {
            const data =
              await API.startTikTok(
                Number(
                  select.value
                )
              );

            window.location.href =
              data.authorizationUrl;

          } catch (error) {
            showToast(
              errorMessage(error),
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
              await API.startYouTube(
                Number(
                  select.value
                )
              );

            window.location.href =
              data.authorizationUrl;

          } catch (error) {
            showToast(
              errorMessage(error),
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
      accounts.length === 0
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
        el("div");

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


      heading.appendChild(copy);

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
                await API.creatorInfo(
                  account.id
                );

                showToast(
                  "TikTok posting access confirmed."
                );
              } catch (error) {
                showToast(
                  errorMessage(error),
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
                  errorMessage(error),
                  true
                );
              }
            }
          )
        );
      }


      card.appendChild(actions);
      grid.appendChild(card);
    }


    page.appendChild(grid);
  }


  /* ======================================================
     ANALYTICS
  ====================================================== */

  function renderAnalytics() {
    clear(page);

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


    const platform =
      el(
        "div",
        "platform-icon",
        platformInitial(
          publication.platform
        )
      );


    row.appendChild(platform);


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


    const details = [
      prettyPlatform(
        publication.platform
      ),

      publication.account_name,

      publication.scheduled_at
        ? formatDateTime(
            publication.scheduled_at
          )
        : "Not scheduled"
    ]
      .filter(Boolean)
      .join(" • ");


    copy.appendChild(
      el(
        "span",
        "muted-text",
        details
      )
    );


    row.appendChild(copy);

    row.appendChild(
      badge(
        publication.publish_state
      )
    );


    if (
      [
        "draft",
        "ready",
        "queued"
      ].includes(
        publication.publish_state
      )
    ) {
      row.appendChild(
        button(
          "Edit",
          "secondary-button compact-button",
          () =>
            openEditPublication(
              publication
            )
        )
      );
    }


    return row;
  }


  function contentMiniRow(item) {
    const row =
      el(
        "div",
        "list-row"
      );


    const copy =
      el("div");

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


    row.appendChild(copy);

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


  document.getElementById(
    "createButton"
  ).addEventListener(
    "click",
    openCreateContent
  );


  document.getElementById(
    "mobileCreateButton"
  ).addEventListener(
    "click",
    openCreateContent
  );


  document.getElementById(
    "moreButton"
  ).addEventListener(
    "click",
    () =>
      openSheet(
        moreSheet
      )
  );


  document.getElementById(
    "contentForm"
  ).addEventListener(
    "submit",
    async event => {
      event.preventDefault();


      try {
        await API.createContent({
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
          errorMessage(error),
          true
        );
      }
    }
  );


  /* ======================================================
     CREATE PROJECT
  ====================================================== */

  document.getElementById(
    "projectForm"
  ).addEventListener(
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
          errorMessage(error),
          true
        );
      }
    }
  );


  document.getElementById(
    "closeProjectDialog"
  ).addEventListener(
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

  document.getElementById(
    "ideaForm"
  ).addEventListener(
    "submit",
    async event => {
      event.preventDefault();


      const projectValue =
        document.getElementById(
          "ideaProject"
        ).value;


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
          errorMessage(error),
          true
        );
      }
    }
  );


  document.getElementById(
    "closeIdeaDialog"
  ).addEventListener(
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

  document.getElementById(
    "accountForm"
  ).addEventListener(
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
          errorMessage(error),
          true
        );
      }
    }
  );


  document.getElementById(
    "closeAccountDialog"
  ).addEventListener(
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


  document.getElementById(
    "logoutButton"
  ).addEventListener(
    "click",
    logout
  );


  document.getElementById(
    "mobileLogout"
  ).addEventListener(
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
      el("div");

    copy.appendChild(
      el(
        "h2",
        "",
        title
      )
    );

    if (subtitle) {
      copy.appendChild(
        el(
          "p",
          "muted-text",
          subtitle
        )
      );
    }


    header.appendChild(copy);

    section.appendChild(
      header
    );

    return section;
  }


  function emptyState(
    title,
    description
  ) {
    const state =
      el(
        "div",
        "empty-state"
      );

    state.appendChild(
      el(
        "strong",
        "",
        title
      )
    );

    state.appendChild(
      el(
        "p",
        "muted-text",
        description
      )
    );

    return state;
  }


  function badge(value) {
    const clean =
      String(
        value || "unknown"
      ).toLowerCase();

    return el(
      "span",
      `status-badge status-${clean}`,
      pretty(clean)
    );
  }


  function pretty(value) {
    return String(
      value || ""
    )
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      );
  }


  function prettyPlatform(
    platform
  ) {
    if (
      platform === "youtube"
    ) {
      return "YouTube";
    }

    if (
      platform === "tiktok"
    ) {
      return "TikTok";
    }

    if (
      platform === "instagram"
    ) {
      return "Instagram";
    }

    return pretty(platform);
  }


  function platformInitial(
    platform
  ) {
    switch (platform) {
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
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

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
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  }


  function localDateTimeValue(
    date
  ) {
    const pad =
      value =>
        String(value)
          .padStart(
            2,
            "0"
          );

    return (
      date.getFullYear() +
      "-" +
      pad(
        date.getMonth() + 1
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


  function filterProject(items) {
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

    if (!provider) {
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
      status === "success"
    ) {
      showToast(
        `${prettyPlatform(provider)} connected.`
      );
    } else {
      showToast(
        error
          ? `${prettyPlatform(provider)}: ${error}`
          : `${prettyPlatform(provider)} connection failed.`,
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


    window.history.replaceState(
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
          .charAt(0)
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
