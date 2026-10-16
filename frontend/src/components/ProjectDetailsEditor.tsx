"use client";

import { useState, type FormEvent } from "react";
import type { Project } from "@/lib/kanban";

type ProjectDetailsEditorProps = {
  project: Project;
  onSave: (project: Project) => void;
};

export const ProjectDetailsEditor = ({ project, onSave }: ProjectDetailsEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  const startEditing = () => {
    setName(project.name);
    setDescription(project.description);
    setEditing(true);
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
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
            {project.description}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={startEditing} type="button">
          Edit project details
        </button>
      </div>
    );
  }

  return (
    <form className="grid max-w-2xl gap-3" onSubmit={submit}>
      <label className="field-label">
        Project name
        <input
          autoFocus
          className="field font-display text-2xl"
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className="field-label">
        Project description
        <textarea
          className="field min-h-20 font-normal leading-6"
          maxLength={2000}
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </label>
      <div className="flex gap-3">
        <button className="btn btn-primary" type="submit">
          Save project details
        </button>
        <button className="btn btn-ghost" onClick={() => setEditing(false)} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
};
