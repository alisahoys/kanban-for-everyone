"use client";

import { useEffect, useState, type FormEvent } from "react";

type Project = {
  name: string;
  description: string;
};

type ProjectDetailsEditorProps = {
  project: Project;
  onSave: (project: Project) => void;
};

export const ProjectDetailsEditor = ({ project, onSave }: ProjectDetailsEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
  }, [project]);

  const cancel = () => {
    setName(project.name);
    setDescription(project.description);
    setEditing(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextProject = { name: name.trim(), description: description.trim() };
    if (!nextProject.name) {
      return;
    }
    onSave(nextProject);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
          Project
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--ink)]">
          {project.name}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          {project.description}
        </p>
        <button
          className="mt-3 text-sm font-semibold text-[var(--berry)] underline"
          onClick={() => setEditing(true)}
          type="button"
        >
          Edit project details
        </button>
      </div>
    );
  }

  return (
    <form className="grid max-w-2xl gap-3" onSubmit={submit}>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">
        Project name
        <input
          autoFocus
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 font-display text-2xl"
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">
        Project description
        <textarea
          className="min-h-20 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal leading-6"
          maxLength={2000}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <div className="flex gap-3">
        <button
          className="rounded-full bg-[var(--mauve)] px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Save project details
        </button>
        <button
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          onClick={cancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
