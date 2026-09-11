export const PROJECTS_STORAGE_KEY = 'stalk_projects_v1';
export const ACTIVE_PROJECT_STORAGE_KEY = 'stalk_active_project_v1';
export const PROJECT_CHANGED_EVENT = 'stalk-project-changed';

export function preloadProjectStorage() {
  readProjects();
  getActiveProjectId();
}

const defaultProject = () => ({
  id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: `Case ${new Date().toLocaleString('en-US', { hour12: false })}`,
  description: '',
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export function readProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || '[]');
    const projects = Array.isArray(parsed) && parsed.length ? parsed : [defaultProject()];
    if (!parsed?.length) {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }
    return projects;
  } catch {
    return [defaultProject()];
  }
}

export function writeProjects(projects) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT));
}

export function getActiveProjectId() {
  const projects = readProjects();
  const stored = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  const active = projects.find((project) => project.id === stored) || projects[0];
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, active.id);
  if (!stored) writeProjects(projects);

  const legacySession = localStorage.getItem('stalk_board_session_v18');
  const activeSessionKey = projectStorageKey(active.id);
  if (legacySession && !localStorage.getItem(activeSessionKey)) {
    localStorage.setItem(activeSessionKey, legacySession);
    localStorage.removeItem('stalk_board_session_v18');
  }

  return active.id;
}

export function setActiveProjectId(id) {
  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(PROJECT_CHANGED_EVENT, { detail: { id } }));
}

export function createProject(name = 'Untitled case') {
  const project = defaultProject();
  project.name = name.trim() || project.name;
  const projects = readProjects();
  writeProjects([...projects, project]);
  setActiveProjectId(project.id);
  return project;
}

export function deleteProject(id) {
  const projects = readProjects();
  if (projects.length <= 1) return false;

  const nextProjects = projects.filter((project) => project.id !== id);
  if (nextProjects.length === projects.length) return false;

  const activeId = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  const nextActiveId = activeId === id ? nextProjects[0].id : activeId;

  localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, nextActiveId);
  localStorage.removeItem(projectStorageKey(id));
  writeProjects(nextProjects);

  return true;
}

export function renameProject(id, name) {
  const nextName = String(name || '').trim();
  if (!nextName) return false;
  const projects = readProjects();
  if (!projects.some((project) => project.id === id)) return false;
  writeProjects(
    projects.map((project) =>
      project.id === id ? { ...project, name: nextName, updatedAt: Date.now() } : project
    )
  );
  return true;
}

export function updateProject(id, patch) {
  const projects = readProjects().map((project) =>
    project.id === id
      ? { ...project, ...patch, updatedAt: Date.now() }
      : project
  );
  writeProjects(projects);
}

export function touchProject(id) {
  try {
    const projects = readProjects().map((project) =>
      project.id === id
        ? { ...project, updatedAt: Date.now() }
        : project
    );
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Project metadata save error:', error);
  }

}

export function renameUntitledProject(id, firstNodeTitle) {
  const title = String(firstNodeTitle || '').trim();
  if (!title) return;

  const projects = readProjects();
  const current = projects.find((project) => project.id === id);
  if (!current || !(current.name === 'Untitled case' || current.name.startsWith('Case '))) return;

  localStorage.setItem(
    PROJECTS_STORAGE_KEY,
    JSON.stringify(
      projects.map((project) =>
        project.id === id ? { ...project, name: title, updatedAt: Date.now() } : project
      )
    )
  );
}

export function projectStorageKey(id = getActiveProjectId()) {
  return `stalk_board_project_${id}`;
}
