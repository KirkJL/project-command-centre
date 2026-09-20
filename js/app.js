"use strict";

(() => {

  const API =
    window.ProjectHubAPI;


  const state = {

    user: null,

    projects: [],

    activeProjectId: "",

    route: "today"

  };


  const page =
    document.getElementById(
      "page"
    );


  const projectSwitcher =
    document.getElementById(
      "projectSwitcher"
    );


  const userName =
    document.getElementById(
      "userName"
    );


  const userInitial =
    document.getElementById(
      "userInitial"
    );


  const mobileSection =
    document.getElementById(
      "mobileSection"
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


  const projectDialog =
    document.getElementById(
      "projectDialog"
    );


  const ideaDialog =
    document.getElementById(
      "ideaDialog"
    );


  const accountDialog =
    document.getElementById(
      "accountDialog"
    );


  init();


  /* ===================================================
     INIT
     =================================================== */

  async function init() {

    bindGlobalEvents();

    showLoading();


    try {

      const me =
        await API.me();


      state.user =
        me.user;


      userName.textContent =
        state.user.displayName ||
        state.user.username;


      userInitial.textContent =
        (
          state.user.displayName ||
          state.user.username ||
          "U"
        )
          .charAt(0)
          .toUpperCase();


      await loadProjects();


      const oauthProvider =
        new URL(
          window.location.href
        )
          .searchParams
          .get("oauth");


      const hashRoute =
        window.location.hash
          .replace("#", "");


      if (
        oauthProvider ||
        hashRoute === "accounts"
      ) {

        await navigate(
          "accounts"
        );

      } else {

        await navigate(
          "today"
        );

      }

    } catch (error) {

      console.error(error);


      if (
        error.message !==
        "UNAUTHENTICATED"
      ) {

        showFatal(
          "Could not load Project Hub."
        );

      }

    }

  }


  /* ===================================================
     GLOBAL EVENTS
     =================================================== */

  function bindGlobalEvents() {

    document
      .querySelectorAll(
        "[data-route]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              navigate(
                button.dataset.route
              );

            }
          );

        }
      );


    document
      .getElementById(
        "createButton"
      )
      .addEventListener(
        "click",
        openCreateSheet
      );


    document
      .getElementById(
        "mobileCreateButton"
      )
      .addEventListener(
        "click",
        openCreateSheet
      );


    document
      .getElementById(
        "moreButton"
      )
      .addEventListener(
        "click",
        () => {

          openSheet(
            moreSheet
          );

        }
      );


    document
      .querySelectorAll(
        "[data-close-sheet]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            closeSheets
          );

        }
      );


    backdrop.addEventListener(
      "click",
      closeSheets
    );


    document
      .querySelectorAll(
        "[data-more-route]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              closeSheets();

              navigate(
                button.dataset
                  .moreRoute
              );

            }
          );

        }
      );


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


    projectSwitcher
      .addEventListener(
        "change",
        async () => {

          state.activeProjectId =
            projectSwitcher.value;


          await navigate(
            state.route,
            false
          );

        }
      );


    document
      .getElementById(
        "contentForm"
      )
      .addEventListener(
        "submit",
        submitContent
      );


    document
      .getElementById(
        "projectForm"
      )
      .addEventListener(
        "submit",
        submitProject
      );


    document
      .getElementById(
        "ideaForm"
      )
      .addEventListener(
        "submit",
        submitIdea
      );


    document
      .getElementById(
        "accountForm"
      )
      .addEventListener(
        "submit",
        submitAccount
      );


    document
      .getElementById(
        "closeProjectDialog"
      )
      .addEventListener(
        "click",
        () => {

          projectDialog.close();

        }
      );


    document
      .getElementById(
        "closeIdeaDialog"
      )
      .addEventListener(
        "click",
        () => {

          ideaDialog.close();

        }
      );


    document
      .getElementById(
        "closeAccountDialog"
      )
      .addEventListener(
        "click",
        () => {

          accountDialog.close();

        }
      );

  }


  /* ===================================================
     NAVIGATION
     =================================================== */

  async function navigate(
    route,
    updateNav = true
  ) {

    state.route =
      route;


    closeSheets();


    if (updateNav) {

      updateNavigation(
        route
      );

    }


    mobileSection.textContent =
      routeLabel(
        route
      );


    showLoading();


    try {

      switch (route) {

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


        default:

          await renderToday();

      }

    } catch (error) {

      console.error(error);


      page.innerHTML = "";


      page.appendChild(
        emptyState(
          "!",
          "Something went wrong",
          readableError(
            error
          )
        )
      );

    }

  }


  function updateNavigation(
    route
  ) {

    document
      .querySelectorAll(
        "[data-route]"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",

            button.dataset.route ===
              route
          );

        }
      );


    document
      .querySelectorAll(
        ".mobile-nav-button"
      )
      .forEach(
        button => {

          if (
            !button.dataset.route
          ) {

            return;

          }


          button.classList.toggle(
            "active",

            button.dataset.route ===
              route
          );

        }
      );

  }


  /* ===================================================
     PROJECT DATA
     =================================================== */

  async function loadProjects() {

    const response =
      await API.projects();


    state.projects =
      response.projects;


    renderProjectSelectors();

  }


  function renderProjectSelectors() {

    projectSwitcher.innerHTML =
      "";


    addOption(
      projectSwitcher,
      "",
      "All projects"
    );


    const contentProject =
      document.getElementById(
        "contentProject"
      );


    const ideaProject =
      document.getElementById(
        "ideaProject"
      );


    const accountProject =
      document.getElementById(
        "accountProject"
      );


    contentProject.innerHTML =
      "";


    ideaProject.innerHTML =
      "";


    accountProject.innerHTML =
      "";


    addOption(
      ideaProject,
      "",
      "Unassigned"
    );


    for (
      const project of
        state.projects
    ) {

      addOption(
        projectSwitcher,
        String(
          project.id
        ),
        project.name
      );


      addOption(
        contentProject,
        String(
          project.id
        ),
        project.name
      );


      addOption(
        ideaProject,
        String(
          project.id
        ),
        project.name
      );


      addOption(
        accountProject,
        String(
          project.id
        ),
        project.name
      );

    }


    projectSwitcher.value =
      state.activeProjectId;

  }


  /* ===================================================
     TODAY
     =================================================== */

  async function renderToday() {

    const data =
      await API.dashboard();


    const projects =
      filterByProject(
        data.projects,
        "id"
      );


    const content =
      filterByProjectName(
        data.recentContent
      );


    page.innerHTML = "";


    page.appendChild(
      heading(
        "COMMAND CENTRE",
        greeting(),

        activeProjectName() ===
          "All projects"
          ? "Everything that needs your attention."
          : activeProjectName()
      )
    );


    const grid =
      el(
        "div",
        "dashboard-grid"
      );


    grid.appendChild(
      metricCard(
        "Active projects",
        projects.length
      )
    );


    grid.appendChild(
      metricCard(
        "Content in motion",

        content.filter(
          item =>
            ![
              "published",
              "archived"
            ].includes(
              item.status
            )
        ).length
      )
    );


    grid.appendChild(
      metricCard(
        "Idea inbox",
        data.ideaCount
      )
    );


    grid.appendChild(
      dashboardListCard(
        "Recent content",
        content,

        item => ({
          title:
            item.title,

          subtitle:
            `${item.project_name} · ` +
            titleCase(
              item.content_type
            ),

          status:
            item.status
        }),

        "No content yet.",

        "span-8"
      )
    );


    grid.appendChild(
      dashboardListCard(
        "Publishing queue",
        data.publications,

        item => ({
          title:
            item.title,

          subtitle:
            `${titleCase(
              item.platform
            )} · ${
              item.account_name
            }`,

          status:
            item.publish_state
        }),

        "Nothing queued yet.",

        "span-4"
      )
    );


    grid.appendChild(
      dashboardListCard(
        "Tasks",
        data.tasks,

        item => ({
          title:
            item.title,

          subtitle:
            item.project_name ||
            "General",

          status:
            item.priority
        }),

        "No outstanding tasks.",

        "span-6"
      )
    );


    grid.appendChild(
      dashboardListCard(
        "Projects",
        projects,

        item => ({
          title:
            item.name,

          subtitle:
            titleCase(
              item.project_type
            ),

          status:
            item.status
        }),

        "Create your first project.",

        "span-6"
      )
    );


    page.appendChild(
      grid
    );

  }


  /* ===================================================
     PROJECTS
     =================================================== */

  async function renderProjects() {

    const response =
      await API.projects();


    state.projects =
      response.projects;


    renderProjectSelectors();


    const projects =
      filterByProject(
        state.projects,
        "id"
      );


    page.innerHTML = "";


    page.appendChild(
      heading(
        "WORKSPACES",
        "Projects",

        "Keep every brand, build and content machine separated.",

        "New project",

        () => {

          projectDialog
            .showModal();

        }
      )
    );


    if (
      !projects.length
    ) {

      page.appendChild(
        emptyState(
          "◇",
          "No projects",

          "Create a workspace for a brand, game, website or content channel."
        )
      );


      return;

    }


    const grid =
      el(
        "div",
        "project-grid"
      );


    for (
      const project of
        projects
    ) {

      const card =
        el(
          "article",
          "project-card"
        );


      card.style.setProperty(
        "--project-accent",

        project.accent_colour ||
        "#8b5cf6"
      );


      const accent =
        el(
          "div",
          "project-accent"
        );


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        project.name;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        project.description ||
        `${titleCase(
          project.project_type
        )} project`;


      const meta =
        el(
          "div",
          "project-meta"
        );


      meta.textContent =
        `${project.content_count} content · ` +
        `${project.account_count} accounts · ` +
        `${titleCase(
          project.status
        )}`;


      card.append(
        accent,
        title,
        description,
        meta
      );


      grid.appendChild(
        card
      );

    }


    page.appendChild(
      grid
    );

  }


  /* ===================================================
     CONTENT
     =================================================== */

  async function renderContent() {

    const response =
      await API.content({
        projectId:
          state.activeProjectId
      });


    const items =
      response.content;


    page.innerHTML = "";


    page.appendChild(
      heading(
        "CONTENT ENGINE",
        "Pipeline",

        "Move ideas from concept to ready-to-publish.",

        "Create",

        openCreateSheet
      )
    );


    if (
      !items.length
    ) {

      page.appendChild(
        emptyState(
          "▤",
          "Nothing in the pipeline",

          "Create your first piece of content and start moving it through production."
        )
      );


      return;

    }


    const stages = [
      "idea",
      "script",
      "recording",
      "editing",
      "ready"
    ];


    const pipeline =
      el(
        "div",
        "pipeline"
      );


    for (
      const stage of
        stages
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


      const columnHeading =
        el(
          "div",
          "pipeline-heading"
        );


      const label =
        document.createElement(
          "span"
        );


      label.textContent =
        titleCase(
          stage
        );


      const count =
        el(
          "span",
          "pipeline-count"
        );


      count.textContent =
        stageItems.length;


      columnHeading.append(
        label,
        count
      );


      column.appendChild(
        columnHeading
      );


      for (
        const item of
          stageItems
      ) {

        column.appendChild(
          contentCard(
            item
          )
        );

      }


      pipeline.appendChild(
        column
      );

    }


    page.appendChild(
      pipeline
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


    const title =
      document.createElement(
        "strong"
      );


    title.textContent =
      item.title;


    const meta =
      document.createElement(
        "small"
      );


    meta.textContent =
      `${item.project_name} · ` +
      titleCase(
        item.content_type
      );


    const select =
      document.createElement(
        "select"
      );


    const stages = [
      "idea",
      "script",
      "recording",
      "editing",
      "ready",
      "scheduled",
      "published",
      "archived"
    ];


    for (
      const stage of stages
    ) {

      addOption(
        select,
        stage,
        titleCase(
          stage
        )
      );

    }


    select.value =
      item.status;


    select.addEventListener(
      "change",
      async () => {

        const previous =
          item.status;


        try {

          await API
            .updateContentStatus(
              item.id,
              select.value
            );


          showToast(
            "Content stage updated."
          );


          await navigate(
            "content",
            false
          );

        } catch (error) {

          select.value =
            previous;


          showToast(
            readableError(
              error
            ),
            true
          );

        }

      }
    );


    card.append(
      title,
      meta,
      select
    );


    return card;

  }


  /* ===================================================
     IDEAS
     =================================================== */

  async function renderIdeas() {

    const response =
      await API.ideas();


    let ideas =
      response.ideas;


    if (
      state.activeProjectId
    ) {

      ideas =
        ideas.filter(
          idea =>
            String(
              idea.project_id
            ) ===
            String(
              state.activeProjectId
            )
        );

    }


    page.innerHTML = "";


    page.appendChild(
      heading(
        "CAPTURE FIRST",
        "Ideas",

        "Get it out of your head before it disappears.",

        "Capture idea",

        () => {

          ideaDialog
            .showModal();

        }
      )
    );


    if (
      !ideas.length
    ) {

      page.appendChild(
        emptyState(
          "✦",
          "Idea inbox is empty",

          "Capture an idea the moment you have it and decide what to do with it later."
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
      const idea of
        ideas
    ) {

      const card =
        el(
          "article",
          "idea-card"
        );


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        idea.title;


      const description =
        document.createElement(
          "p"
        );


      description.textContent =
        idea.description ||
        "No notes yet.";


      const meta =
        el(
          "div",
          "project-meta"
        );


      meta.textContent =
        `${idea.project_name ||
          "Unassigned"} · ` +
        titleCase(
          idea.status
        );


      card.append(
        title,
        description,
        meta
      );


      grid.appendChild(
        card
      );

    }


    page.appendChild(
      grid
    );

  }


  /* ===================================================
     ACCOUNTS
     =================================================== */

  async function renderAccounts() {

    const response =
      await API.accounts();


    let accounts =
      response.accounts;


    if (
      state.activeProjectId
    ) {

      accounts =
        accounts.filter(
          account =>
            String(
              account.project_id
            ) ===
            String(
              state.activeProjectId
            )
        );

    }


    page.innerHTML = "";


    page.appendChild(
      heading(
        "SOCIAL CONTROL",
        "Accounts",

        "Connect your channels once. Project Hub handles the account switching."
      )
    );


    /* ---------------------------
       CONNECT CARD
       --------------------------- */

    const connectCard =
      el(
        "section",
        "card"
      );


    const connectHeading =
      el(
        "div",
        "card-heading"
      );


    const connectTitle =
      document.createElement(
        "h2"
      );


    connectTitle.textContent =
      "Connect an account";


    connectHeading.appendChild(
      connectTitle
    );


    connectCard.appendChild(
      connectHeading
    );


    if (
      !state.projects.length
    ) {

      connectCard.appendChild(
        emptyState(
          "◇",
          "Create a project first",

          "Social accounts are attached to a project or brand."
        )
      );

    } else {

      const controls =
        el(
          "div",
          "social-connect-controls"
        );


      const projectSelect =
        document.createElement(
          "select"
        );


      projectSelect.className =
        "project-switcher";


      for (
        const project of
          state.projects
      ) {

        addOption(
          projectSelect,
          String(
            project.id
          ),
          project.name
        );

      }


      if (
        state.activeProjectId
      ) {

        projectSelect.value =
          state.activeProjectId;

      }


      /* TikTok */

      const tiktok =
        document.createElement(
          "button"
        );


      tiktok.type =
        "button";


      tiktok.className =
        "secondary-button";


      tiktok.textContent =
        "♪ Connect TikTok";


      tiktok.addEventListener(
        "click",
        async () => {

          try {

            tiktok.disabled =
              true;


            tiktok.textContent =
              "Opening TikTok…";


            const result =
              await API
                .startTikTokOAuth(
                  Number(
                    projectSelect.value
                  )
                );


            window.location.href =
              result.authorizationUrl;

          } catch (error) {

            showToast(
              readableError(
                error
              ),
              true
            );


            tiktok.disabled =
              false;


            tiktok.textContent =
              "♪ Connect TikTok";

          }

        }
      );


      /* YouTube */

      const youtube =
        document.createElement(
          "button"
        );


      youtube.type =
        "button";


      youtube.className =
        "secondary-button";


      youtube.textContent =
        "▶ Connect YouTube";


      youtube.addEventListener(
        "click",
        async () => {

          try {

            youtube.disabled =
              true;


            youtube.textContent =
              "Opening Google…";


            const result =
              await API
                .startYouTubeOAuth(
                  Number(
                    projectSelect.value
                  )
                );


            window.location.href =
              result.authorizationUrl;

          } catch (error) {

            showToast(
              readableError(
                error
              ),
              true
            );


            youtube.disabled =
              false;


            youtube.textContent =
              "▶ Connect YouTube";

          }

        }
      );


      controls.append(
        projectSelect,
        tiktok,
        youtube
      );


      connectCard.appendChild(
        controls
      );

    }


    page.appendChild(
      connectCard
    );


    /* ---------------------------
       CONNECTED ACCOUNTS
       --------------------------- */

    const section =
      document.createElement(
        "section"
      );


    section.style.marginTop =
      "18px";


    if (
      !accounts.length
    ) {

      section.appendChild(
        emptyState(
          "◎",
          "No social accounts",

          "Connect TikTok or YouTube above. Once connected, the account stays attached to its project."
        )
      );


      page.appendChild(
        section
      );


      handleOAuthResult();


      return;

    }


    const grid =
      el(
        "div",
        "account-grid"
      );


    for (
      const account of
        accounts
    ) {

      const card =
        el(
          "article",
          "account-card"
        );


      const icon =
        el(
          "div",
          "platform-icon"
        );


      icon.textContent =
        platformIcon(
          account.platform
        );


      const body =
        el(
          "div",
          "account-body"
        );


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        account.account_name;


      const handle =
        document.createElement(
          "small"
        );


      handle.textContent =
        account.account_handle ||
        titleCase(
          account.platform
        );


      const footer =
        el(
          "div",
          "account-footer"
        );


      const project =
        document.createElement(
          "small"
        );


      project.textContent =
        account.project_name ||
        "Unassigned";


      footer.append(
        project,
        statusPill(
          account.status
        )
      );


      body.append(
        title,
        handle,
        footer
      );


      /* TikTok capability test */

      if (
        account.status ===
          "connected" &&
        account.platform ===
          "tiktok"
      ) {

        const test =
          document.createElement(
            "button"
          );


        test.type =
          "button";


        test.className =
          "ghost-button";


        test.style.marginTop =
          "12px";


        test.style.marginRight =
          "8px";


        test.textContent =
          "Check posting access";


        test.addEventListener(
          "click",
          async () => {

            try {

              test.disabled =
                true;


              test.textContent =
                "Checking…";


              const result =
                await API
                  .tiktokCreatorInfo(
                    account.id
                  );


              const options =
                result.creator
                  ?.privacy_level_options ||
                [];


              showToast(
                options.length
                  ? `TikTok ready: ${options.length} privacy options available.`
                  : "TikTok connection is active."
              );

            } catch (error) {

              showToast(
                readableError(
                  error
                ),
                true
              );

            } finally {

              test.disabled =
                false;


              test.textContent =
                "Check posting access";

            }

          }
        );


        body.appendChild(
          test
        );

      }


      /* Disconnect */

      if (
        account.status ===
        "connected"
      ) {

        const disconnect =
          document.createElement(
            "button"
          );


        disconnect.type =
          "button";


        disconnect.className =
          "ghost-button";


        disconnect.style.marginTop =
          "12px";


        disconnect.textContent =
          "Disconnect";


        disconnect.addEventListener(
          "click",
          async () => {

            const confirmed =
              window.confirm(
                `Disconnect ${account.account_name}?`
              );


            if (!confirmed) {

              return;

            }


            try {

              disconnect.disabled =
                true;


              await API
                .disconnectAccount(
                  account.id
                );


              showToast(
                "Account disconnected."
              );


              await renderAccounts();

            } catch (error) {

              showToast(
                readableError(
                  error
                ),
                true
              );


              disconnect.disabled =
                false;

            }

          }
        );


        body.appendChild(
          disconnect
        );

      }


      card.append(
        icon,
        body
      );


      grid.appendChild(
        card
      );

    }


    section.appendChild(
      grid
    );


    page.appendChild(
      section
    );


    handleOAuthResult();

  }


  /* ===================================================
     OAUTH RESULT
     =================================================== */

  function handleOAuthResult() {

    const url =
      new URL(
        window.location.href
      );


    const provider =
      url.searchParams.get(
        "oauth"
      );


    const result =
      url.searchParams.get(
        "result"
      );


    if (
      !provider ||
      !result
    ) {

      return;

    }


    if (
      result ===
      "success"
    ) {

      showToast(
        `${titleCase(
          provider
        )} connected.`
      );

    } else {

      const error =
        url.searchParams.get(
          "error"
        );


      showToast(
        `${titleCase(
          provider
        )} connection failed${
          error
            ? `: ${titleCase(
                error
              )}`
            : "."
        }`,
        true
      );

    }


    url.searchParams.delete(
      "oauth"
    );


    url.searchParams.delete(
      "result"
    );


    url.searchParams.delete(
      "error"
    );


    url.hash =
      "";


    window.history
      .replaceState(
        {},
        "",
        url.toString()
      );

  }


  /* ===================================================
     CALENDAR
     =================================================== */

  async function renderCalendar() {

    const response =
      await API.calendar();


    let events =
      response.events;


    if (
      state.activeProjectId
    ) {

      const active =
        state.projects.find(
          project =>
            String(
              project.id
            ) ===
            String(
              state.activeProjectId
            )
        );


      if (active) {

        events =
          events.filter(
            event =>
              event.project_name ===
              active.name
          );

      }

    }


    page.innerHTML = "";


    page.appendChild(
      heading(
        "PUBLISHING",
        "Calendar",

        "Scheduled and published content across every connected platform."
      )
    );


    if (
      !events.length
    ) {

      page.appendChild(
        emptyState(
          "□",
          "Calendar is clear",

          "Scheduled publications will appear here when the publishing composer goes live."
        )
      );


      return;

    }


    const list =
      el(
        "div",
        "calendar-list"
      );


    for (
      const event of
        events
    ) {

      const row =
        el(
          "article",
          "calendar-row"
        );


      const date =
        el(
          "div",
          "calendar-date"
        );


      const dateStrong =
        document.createElement(
          "strong"
        );


      const dateSmall =
        document.createElement(
          "span"
        );


      const when =
        new Date(
          event.scheduled_at ||
          event.published_at
        );


      dateStrong.textContent =
        when.toLocaleDateString(
          undefined,
          {
            day:
              "2-digit",

            month:
              "short"
          }
        );


      dateSmall.textContent =
        when.toLocaleTimeString(
          undefined,
          {
            hour:
              "2-digit",

            minute:
              "2-digit"
          }
        );


      date.append(
        dateStrong,
        dateSmall
      );


      const content =
        el(
          "div",
          "calendar-content"
        );


      const title =
        document.createElement(
          "strong"
        );


      title.textContent =
        event.content_title;


      const meta =
        document.createElement(
          "span"
        );


      meta.textContent =
        `${event.project_name} · ` +
        `${titleCase(
          event.platform
        )} · ` +
        `${event.account_name}`;


      content.append(
        title,
        meta
      );


      row.append(
        date,
        content,
        statusPill(
          event.publish_state
        )
      );


      list.appendChild(
        row
      );

    }


    page.appendChild(
      list
    );

  }


  /* ===================================================
     FORM SUBMISSIONS
     =================================================== */

  async function submitContent(
    event
  ) {

    event.preventDefault();


    if (
      !state.projects.length
    ) {

      closeSheets();


      showToast(
        "Create a project first.",
        true
      );


      await navigate(
        "projects"
      );


      projectDialog
        .showModal();


      return;

    }


    const button =
      event.submitter;


    button.disabled =
      true;


    try {

      await API.createContent({

        projectId:
          Number(
            document
              .getElementById(
                "contentProject"
              )
              .value
          ),

        title:
          document
            .getElementById(
              "contentTitle"
            )
            .value,

        description:
          document
            .getElementById(
              "contentDescription"
            )
            .value,

        contentType:
          document
            .getElementById(
              "contentType"
            )
            .value,

        status:
          document
            .getElementById(
              "contentStatus"
            )
            .value

      });


      event.target.reset();


      closeSheets();


      showToast(
        "Content created."
      );


      await navigate(
        "content"
      );

    } catch (error) {

      showToast(
        readableError(
          error
        ),
        true
      );

    } finally {

      button.disabled =
        false;

    }

  }


  async function submitProject(
    event
  ) {

    event.preventDefault();


    const button =
      event.submitter;


    button.disabled =
      true;


    try {

      await API.createProject({

        name:
          document
            .getElementById(
              "projectName"
            )
            .value,

        description:
          document
            .getElementById(
              "projectDescription"
            )
            .value,

        projectType:
          document
            .getElementById(
              "projectType"
            )
            .value,

        accentColour:
          document
            .getElementById(
              "projectColour"
            )
            .value

      });


      event.target.reset();


      document
        .getElementById(
          "projectColour"
        )
        .value =
          "#8b5cf6";


      projectDialog.close();


      await loadProjects();


      showToast(
        "Project created."
      );


      await navigate(
        "projects",
        false
      );

    } catch (error) {

      showToast(
        readableError(
          error
        ),
        true
      );

    } finally {

      button.disabled =
        false;

    }

  }


  async function submitIdea(
    event
  ) {

    event.preventDefault();


    const button =
      event.submitter;


    button.disabled =
      true;


    try {

      await API.createIdea({

        title:
          document
            .getElementById(
              "ideaTitle"
            )
            .value,

        description:
          document
            .getElementById(
              "ideaDescription"
            )
            .value,

        projectId:
          document
            .getElementById(
              "ideaProject"
            )
            .value,

        ideaType:
          "content"

      });


      event.target.reset();


      ideaDialog.close();


      showToast(
        "Idea captured."
      );


      await navigate(
        "ideas",
        false
      );

    } catch (error) {

      showToast(
        readableError(
          error
        ),
        true
      );

    } finally {

      button.disabled =
        false;

    }

  }


  /*
    Retained for the existing
    account dialog.

    OAuth is now the preferred
    TikTok/YouTube workflow.
  */

  async function submitAccount(
    event
  ) {

    event.preventDefault();


    const button =
      event.submitter;


    button.disabled =
      true;


    try {

      await API.createAccount({

        projectId:
          Number(
            document
              .getElementById(
                "accountProject"
              )
              .value
          ),

        platform:
          document
            .getElementById(
              "accountPlatform"
            )
            .value,

        accountName:
          document
            .getElementById(
              "accountName"
            )
            .value,

        accountHandle:
          document
            .getElementById(
              "accountHandle"
            )
            .value

      });


      event.target.reset();


      accountDialog.close();


      showToast(
        "Account added."
      );


      await navigate(
        "accounts",
        false
      );

    } catch (error) {

      showToast(
        readableError(
          error
        ),
        true
      );

    } finally {

      button.disabled =
        false;

    }

  }


  /* ===================================================
     CREATE SHEET
     =================================================== */

  function openCreateSheet() {

    if (
      !state.projects.length
    ) {

      showToast(
        "Create a project first.",
        true
      );


      navigate(
        "projects"
      );


      setTimeout(
        () => {

          projectDialog
            .showModal();

        },
        100
      );


      return;

    }


    const projectSelect =
      document.getElementById(
        "contentProject"
      );


    if (
      state.activeProjectId
    ) {

      projectSelect.value =
        state.activeProjectId;

    }


    openSheet(
      createSheet
    );

  }


  function openSheet(
    sheet
  ) {

    closeSheets();


    backdrop.hidden =
      false;


    sheet.classList.add(
      "open"
    );


    sheet.setAttribute(
      "aria-hidden",
      "false"
    );

  }


  function closeSheets() {

    for (
      const sheet of
        [
          createSheet,
          moreSheet
        ]
    ) {

      sheet.classList.remove(
        "open"
      );


      sheet.setAttribute(
        "aria-hidden",
        "true"
      );

    }


    backdrop.hidden =
      true;

  }


  /* ===================================================
     LOGOUT
     =================================================== */

  async function logout() {

    try {

      await API.logout();

    } catch (error) {

      console.error(
        error
      );

    } finally {

      window.location.href =
        "./login.html";

    }

  }


  /* ===================================================
     COMPONENTS
     =================================================== */

  function heading(
    eyebrow,
    title,
    description,
    actionLabel,
    action
  ) {

    const wrapper =
      el(
        "header",
        "page-heading"
      );


    const text =
      document.createElement(
        "div"
      );


    const eyebrowEl =
      el(
        "span",
        "eyebrow"
      );


    eyebrowEl.textContent =
      eyebrow;


    const h1 =
      document.createElement(
        "h1"
      );


    h1.textContent =
      title;


    const p =
      document.createElement(
        "p"
      );


    p.textContent =
      description;


    text.append(
      eyebrowEl,
      h1,
      p
    );


    wrapper.appendChild(
      text
    );


    if (
      actionLabel &&
      action
    ) {

      const button =
        el(
          "button",
          "secondary-button"
        );


      button.type =
        "button";


      button.textContent =
        actionLabel;


      button.addEventListener(
        "click",
        action
      );


      wrapper.appendChild(
        button
      );

    }


    return wrapper;

  }


  function metricCard(
    label,
    number
  ) {

    const card =
      el(
        "article",
        "card span-4 metric-card"
      );


    const labelEl =
      el(
        "span",
        "metric-label"
      );


    labelEl.textContent =
      label;


    const numberEl =
      el(
        "strong",
        "metric-number"
      );


    numberEl.textContent =
      number;


    card.append(
      labelEl,
      numberEl
    );


    return card;

  }


  function dashboardListCard(
    title,
    items,
    mapper,
    emptyMessage,
    span
  ) {

    const card =
      el(
        "article",
        `card ${span}`
      );


    const cardHeading =
      el(
        "div",
        "card-heading"
      );


    const h2 =
      document.createElement(
        "h2"
      );


    h2.textContent =
      title;


    const count =
      document.createElement(
        "span"
      );


    count.textContent =
      `${items.length}`;


    cardHeading.append(
      h2,
      count
    );


    card.appendChild(
      cardHeading
    );


    if (
      !items.length
    ) {

      const p =
        document.createElement(
          "p"
        );


      p.className =
        "metric-label";


      p.textContent =
        emptyMessage;


      card.appendChild(
        p
      );


      return card;

    }


    const list =
      el(
        "div",
        "list"
      );


    for (
      const item of
        items.slice(
          0,
          6
        )
    ) {

      const mapped =
        mapper(item);


      const row =
        el(
          "div",
          "list-row"
        );


      const main =
        el(
          "div",
          "list-row-main"
        );


      const strong =
        document.createElement(
          "strong"
        );


      strong.textContent =
        mapped.title;


      const small =
        document.createElement(
          "small"
        );


      small.textContent =
        mapped.subtitle;


      main.append(
        strong,
        small
      );


      row.append(
        main,
        statusPill(
          mapped.status
        )
      );


      list.appendChild(
        row
      );

    }


    card.appendChild(
      list
    );


    return card;

  }


  function statusPill(
    status
  ) {

    const pill =
      el(
        "span",
        `status-pill ${
          status || ""
        }`
      );


    pill.textContent =
      titleCase(
        status ||
        "unknown"
      );


    return pill;

  }


  function emptyState(
    icon,
    title,
    description
  ) {

    const wrapper =
      el(
        "div",
        "empty-state"
      );


    const iconEl =
      el(
        "div",
        "empty-icon"
      );


    iconEl.textContent =
      icon;


    const strong =
      document.createElement(
        "strong"
      );


    strong.textContent =
      title;


    const p =
      document.createElement(
        "p"
      );


    p.textContent =
      description;


    wrapper.append(
      iconEl,
      strong,
      p
    );


    return wrapper;

  }


  /* ===================================================
     LOADING / ERRORS
     =================================================== */

  function showLoading() {

    page.innerHTML = `
      <div class="loading">
        <div class="loading-inner">
          <div class="spinner"></div>
          <span>Loading…</span>
        </div>
      </div>
    `;

  }


  function showFatal(
    message
  ) {

    page.innerHTML =
      "";


    page.appendChild(
      emptyState(
        "!",
        "Project Hub unavailable",
        message
      )
    );

  }


  function showToast(
    message,
    error = false
  ) {

    toast.textContent =
      message;


    toast.classList.toggle(
      "error",
      error
    );


    toast.hidden =
      false;


    clearTimeout(
      showToast.timeout
    );


    showToast.timeout =
      setTimeout(
        () => {

          toast.hidden =
            true;

        },
        3500
      );

  }


  /* ===================================================
     FILTERS
     =================================================== */

  function filterByProject(
    items,
    idProperty
  ) {

    if (
      !state.activeProjectId
    ) {

      return items;

    }


    return items.filter(
      item =>
        String(
          item[idProperty]
        ) ===
        String(
          state.activeProjectId
        )
    );

  }


  function filterByProjectName(
    items
  ) {

    if (
      !state.activeProjectId
    ) {

      return items;

    }


    const project =
      state.projects.find(
        item =>
          String(
            item.id
          ) ===
          String(
            state.activeProjectId
          )
      );


    if (!project) {

      return items;

    }


    return items.filter(
      item =>
        item.project_name ===
        project.name
    );

  }


  function activeProjectName() {

    if (
      !state.activeProjectId
    ) {

      return "All projects";

    }


    const project =
      state.projects.find(
        item =>
          String(
            item.id
          ) ===
          String(
            state.activeProjectId
          )
      );


    return project
      ? project.name
      : "All projects";

  }


  /* ===================================================
     TEXT HELPERS
     =================================================== */

  function greeting() {

    const hour =
      new Date()
        .getHours();


    const name =
      state.user
        ?.displayName ||
      state.user
        ?.username ||
      "";


    if (
      hour < 12
    ) {

      return `Morning, ${name}`;

    }


    if (
      hour < 18
    ) {

      return `Afternoon, ${name}`;

    }


    return `Evening, ${name}`;

  }


  function routeLabel(
    route
  ) {

    const labels = {

      today:
        "Today",

      content:
        "Content",

      calendar:
        "Calendar",

      projects:
        "Projects",

      ideas:
        "Ideas",

      accounts:
        "Accounts"

    };


    return (
      labels[route] ||
      "Project Hub"
    );

  }


  function platformIcon(
    platform
  ) {

    const icons = {

      tiktok:
        "♪",

      youtube:
        "▶",

      instagram:
        "◎"

    };


    return (
      icons[platform] ||
      "◎"
    );

  }


  function titleCase(
    value
  ) {

    if (!value) {

      return "";

    }


    return String(
      value
    )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\b\w/g,

        character =>
          character
            .toUpperCase()
      );

  }


  function readableError(
    error
  ) {

    const value =
      error?.data?.error ||
      error?.message ||
      "Something went wrong.";


    const known = {

      TIKTOK_CLIENT_KEY_MISSING:
        "TikTok client key has not been added to the Worker yet.",

      TIKTOK_CLIENT_SECRET_MISSING:
        "TikTok client secret has not been added to the Worker yet.",

      GOOGLE_CLIENT_ID_MISSING:
        "Google client ID has not been added to the Worker yet.",

      GOOGLE_CLIENT_SECRET_MISSING:
        "Google client secret has not been added to the Worker yet.",

      TOKEN_ENCRYPTION_KEY_MISSING:
        "Token encryption key is missing.",

      ACCOUNT_RECONNECT_REQUIRED:
        "This account needs to be reconnected.",

      TOKEN_REFRESH_FAILED:
        "The social account token could not be refreshed.",

      INVALID_PROJECT:
        "Select a valid project."

    };


    return (
      known[value] ||
      titleCase(
        value
      )
    );

  }


  /* ===================================================
     DOM HELPERS
     =================================================== */

  function addOption(
    select,
    value,
    label
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      value;


    option.textContent =
      label;


    select.appendChild(
      option
    );

  }


  function el(
    tag,
    className
  ) {

    const element =
      document.createElement(
        tag
      );


    if (className) {

      element.className =
        className;

    }


    return element;

  }

})();
