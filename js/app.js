"use strict";

const state = {
  user: null,
  projects: [],
  tasks: [],
  publications: []
};


document.addEventListener(
  "DOMContentLoaded",
  initialise
);


async function initialise() {
  bindEvents();

  try {
    const result =
      await ProjectHubAPI.dashboard();

    state.user =
      result.user;

    state.projects =
      result.projects || [];

    state.tasks =
      result.tasks || [];

    state.publications =
      result.publications || [];

    render();

  } catch (error) {

    if (error.status === 401) {
      window.location.href =
        "./login.html";

      return;
    }

    console.error(error);

    document
      .getElementById(
        "welcome-heading"
      )
      .textContent =
        "Dashboard unavailable";
  }
}


function bindEvents() {

  document
    .getElementById(
      "logout-button"
    )
    .addEventListener(
      "click",
      logout
    );


  document
    .getElementById(
      "new-project-button"
    )
    .addEventListener(
      "click",
      openProjectDialog
    );


  document
    .getElementById(
      "close-project-dialog"
    )
    .addEventListener(
      "click",
      closeProjectDialog
    );


  document
    .getElementById(
      "project-form"
    )
    .addEventListener(
      "submit",
      createProject
    );


  document
    .getElementById(
      "quick-create"
    )
    .addEventListener(
      "click",
      () => {
        alert(
          "Content Composer is Build #3."
        );
      }
    );
}


function render() {

  document
    .getElementById(
      "welcome-heading"
    )
    .textContent =
      `Morning, ${state.user.displayName}.`;

  renderProjects();

  renderTasks();

  renderPublications();
}


function renderProjects() {

  const container =
    document.getElementById(
      "project-grid"
    );

  container.replaceChildren();

  if (!state.projects.length) {

    container.appendChild(
      emptyState(
        "No projects yet.",
        "Create the first one."
      )
    );

    return;
  }

  for (
    const project of state.projects
  ) {

    const card =
      document.createElement("div");

    card.className =
      "project-card";

    if (project.accent_colour) {
      card.style.setProperty(
        "--project-accent",
        project.accent_colour
      );
    }

    const accent =
      document.createElement("span");

    accent.className =
      "project-accent";

    const body =
      document.createElement("div");

    const name =
      document.createElement("strong");

    name.textContent =
      project.name;

    const meta =
      document.createElement("small");

    meta.textContent =
      project.project_type;

    body.append(
      name,
      meta
    );

    card.append(
      accent,
      body
    );

    container.appendChild(card);
  }
}


function renderTasks() {

  const container =
    document.getElementById(
      "task-list"
    );

  container.replaceChildren();

  if (!state.tasks.length) {

    container.appendChild(
      emptyState(
        "Nothing urgent.",
        "Beautiful."
      )
    );

    return;
  }

  for (const task of state.tasks) {

    const row =
      document.createElement("div");

    row.className =
      "list-row";

    const body =
      document.createElement("div");

    const title =
      document.createElement("strong");

    title.textContent =
      task.title;

    const project =
      document.createElement("small");

    project.textContent =
      task.project_name ||
      "General";

    body.append(
      title,
      project
    );

    const status =
      document.createElement("span");

    status.className =
      `badge ${task.priority}`;

    status.textContent =
      task.priority;

    row.append(
      body,
      status
    );

    container.appendChild(row);
  }
}


function renderPublications() {

  const container =
    document.getElementById(
      "publication-list"
    );

  container.replaceChildren();

  if (
    !state.publications.length
  ) {

    container.appendChild(
      emptyState(
        "Queue empty.",
        "Nothing scheduled yet."
      )
    );

    return;
  }

  for (
    const post of
    state.publications
  ) {

    const row =
      document.createElement("div");

    row.className =
      "list-row";

    const body =
      document.createElement("div");

    const title =
      document.createElement("strong");

    title.textContent =
      post.title;

    const account =
      document.createElement("small");

    account.textContent =
      `${post.platform} • ` +
      `${post.account_name}`;

    body.append(
      title,
      account
    );

    const stateBadge =
      document.createElement("span");

    stateBadge.className =
      "badge";

    stateBadge.textContent =
      post.publish_state;

    row.append(
      body,
      stateBadge
    );

    container.appendChild(row);
  }
}


function emptyState(
  titleText,
  subtitleText
) {

  const element =
    document.createElement("div");

  element.className =
    "empty-state";

  const title =
    document.createElement("strong");

  title.textContent =
    titleText;

  const subtitle =
    document.createElement("span");

  subtitle.textContent =
    subtitleText;

  element.append(
    title,
    subtitle
  );

  return element;
}


function openProjectDialog() {

  document
    .getElementById(
      "project-dialog"
    )
    .showModal();
}


function closeProjectDialog() {

  document
    .getElementById(
      "project-dialog"
    )
    .close();
}


async function createProject(event) {

  event.preventDefault();

  const project = {

    name:
      document
        .getElementById(
          "project-name"
        )
        .value,

    projectType:
      document
        .getElementById(
          "project-type"
        )
        .value,

    description:
      document
        .getElementById(
          "project-description"
        )
        .value,

    accentColour:
      document
        .getElementById(
          "project-colour"
        )
        .value
  };

  try {

    await ProjectHubAPI
      .createProject(project);

    closeProjectDialog();

    document
      .getElementById(
        "project-form"
      )
      .reset();

    await initialise();

  } catch (error) {

    console.error(error);

    alert(
      "Project could not be created."
    );
  }
}


async function logout() {

  try {
    await ProjectHubAPI.logout();
  } finally {

    window.location.href =
      "./login.html";
  }
}
