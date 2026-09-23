"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useRef,
  useState,
} from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type Tone = "success" | "warning" | "error" | "neutral";

export function Button({
  variant = "secondary",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={`button button-${variant}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}

export function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link className={`button-link button-${variant}`} href={href}>
      {children}
    </Link>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
    </Link>
  );
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {children}
      {error && <FormError id={`${id}-error`}>{error}</FormError>}
    </div>
  );
}

export function FormError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <span className="field-error" id={id}>
      {children}
    </span>
  );
}

type FieldProps = { label: string; hint?: string; error?: string };

export function TextField({
  label,
  hint,
  error,
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        className="field-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        className="field-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        className="field-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      />
    </FieldFrame>
  );
}

export function CheckboxField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function StatusLabel({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`status-label ${tone}`}>{children}</span>;
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone | "info";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`alert ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Skeleton({
  width = "full",
}: {
  width?: "full" | "medium" | "short";
}) {
  return <div className={`skeleton ${width}`} aria-hidden="true" />;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function DialogExample() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>Open dialog</Button>
      <dialog className="dialog" ref={ref} aria-labelledby="dialog-title">
        <h3 id="dialog-title">Confirm this action</h3>
        <p>
          A dialog keeps the decision in context and returns focus to its
          trigger when closed.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => ref.current?.close()}>Cancel</Button>
          <Button variant="primary" onClick={() => ref.current?.close()}>
            Continue
          </Button>
        </div>
      </dialog>
    </>
  );
}

export function MenuExample() {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="menu"
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current?.open) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>Open menu</summary>
      <div className="menu-items">
        <a href="#components">Components</a>
        <a href="#templates">Templates</a>
      </div>
    </details>
  );
}

export function Tabs({
  items,
}: {
  items: { label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(0);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function select(index: number) {
    setActive(index);
    refs.current[index]?.focus();
  }
  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist" aria-label="Example sections">
        {items.map((item, index) => (
          <button
            key={item.label}
            ref={(element) => {
              refs.current[index] = element;
            }}
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                select((index + 1) % items.length);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                select((index - 1 + items.length) % items.length);
              }
              if (event.key === "Home") {
                event.preventDefault();
                select(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                select(items.length - 1);
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.label}
          className="tabs-panel"
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={active !== index}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
