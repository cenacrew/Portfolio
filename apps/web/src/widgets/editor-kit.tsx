"use client";

import type { ReactNode } from "react";

// Shared, controlled form primitives for widget Editors. Styled by admin.css
// (ed-* classes). Every field reports changes up; the admin validates with the
// widget's Zod schema before saving.

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="ed-field">
      <span className="ed-label">{label}</span>
      {children}
      {hint && <span className="ed-hint">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="ed-input"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="ed-input ed-textarea"
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="ed-input"
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select className="ed-input ed-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="ed-field ed-field--row">
      <div>
        <span className="ed-label">{label}</span>
        {hint && <span className="ed-hint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`ed-switch${value ? " is-on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="ed-switch__dot" />
      </button>
    </div>
  );
}

// A repeatable list of items with add / remove / render-row. Keeps array
// editors (watchlist, poll options, photos, social groups) compact.
export function ListEditor<T>({
  label,
  items,
  onChange,
  makeItem,
  renderItem,
  addLabel = "Ajouter",
  min = 0,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  makeItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel?: string;
  min?: number;
}) {
  const update = (i: number, patch: Partial<T>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="ed-list">
      <span className="ed-label">{label}</span>
      {items.map((item, i) => (
        <div className="ed-list__item" key={i}>
          <div className="ed-list__body">{renderItem(item, (patch) => update(i, patch))}</div>
          <button
            type="button"
            className="ed-list__remove"
            aria-label="Retirer"
            disabled={items.length <= min}
            onClick={() => remove(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="ed-add" onClick={() => onChange([...items, makeItem()])}>
        + {addLabel}
      </button>
    </div>
  );
}
