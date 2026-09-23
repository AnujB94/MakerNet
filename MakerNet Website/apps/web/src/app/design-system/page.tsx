import {
  ActionLink,
  Alert,
  Button,
  CheckboxField,
  DialogExample,
  EmptyState,
  MenuExample,
  SelectField,
  Skeleton,
  StatusLabel,
  Tabs,
  TextAreaField,
  TextField,
  TextLink,
} from "@/components/ui";

export const metadata = {
  title: "Design system · MakerNet",
  description:
    "MakerNet interface tokens, components, states, and page templates",
};

function TemplatePreview({
  name,
  description,
  children,
}: {
  name: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="template-preview">
      <h3>{name}</h3>
      <p>{description}</p>
      {children}
    </article>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="container">
      <div className="page-heading">
        <p className="eyebrow">MakerNet / System reference</p>
        <h1>Useful interfaces for useful work.</h1>
        <p>
          This workbench records the visual language and reusable interaction
          patterns for MakerNet. Every example uses neutral specimen content.
        </p>
      </div>

      <section className="workbench-section" aria-labelledby="tokens-title">
        <h2 id="tokens-title">01 / Tokens</h2>
        <p>
          Warm paper and charcoal carry the interface. Cobalt marks the primary
          action; status colors keep their own meaning.
        </p>
        <div className="token-grid">
          <div className="token-swatch paper">Paper · #f5f1e9</div>
          <div className="token-swatch ink">Ink · #202824</div>
          <div className="token-swatch cobalt">Cobalt · #174f9d</div>
          <div className="token-swatch success">Success</div>
          <div className="token-swatch warning">Warning</div>
          <div className="token-swatch error">Error</div>
        </div>
        <p className="specimen-note">
          Spacing: 8, 16, 24, 32, 48, 64px. Radius: 4, 8, 16px. Typography:
          Georgia for reading and Verdana for controls. Wide layout: 1152px;
          reading line: 72ch; compact layout: 720px. Motion: 120–200ms with
          reduced-motion support. Focus: 3px cobalt outline.
        </p>
      </section>

      <section
        className="workbench-section"
        id="components"
        aria-labelledby="components-title"
      >
        <h2 id="components-title">02 / Components and states</h2>
        <p>
          Controls use native semantics. Focus, disabled, loading, invalid, and
          selected states are available for keyboard and touch review.
        </p>
        <h3>Actions</h3>
        <div className="specimen-row">
          <Button variant="primary">Primary action</Button>
          <Button>Secondary action</Button>
          <Button variant="quiet">Quiet action</Button>
          <Button disabled>Disabled action</Button>
          <Button loading>Loading action</Button>
          <ActionLink href="#templates" variant="secondary">
            Linked action
          </ActionLink>
          <TextLink href="#tokens-title">Text link</TextLink>
        </div>
        <p className="specimen-note">
          Buttons: Enter or Space activates. Links: Enter opens. Loading
          disables repeat activation. Press, hover, and focus states are
          separate.
        </p>

        <h3>Form controls</h3>
        <div className="specimen-stack">
          <TextField
            label="Name"
            hint="Use a name people will recognize."
            placeholder="Write a name"
          />
          <TextField
            label="Required detail"
            error="Enter a detail before continuing."
            placeholder="Needs attention"
          />
          <TextField
            label="Unavailable field"
            value="Read only"
            disabled
            readOnly
          />
          <SelectField label="View" defaultValue="recent">
            <option value="recent">Most recent</option>
            <option value="alphabetical">Alphabetical</option>
          </SelectField>
          <TextAreaField
            label="Notes"
            hint="Keep instructions short and specific."
            placeholder="Write a note"
          />
          <CheckboxField label="Send me updates about this item" />
          <CheckboxField label="Unavailable option" disabled />
        </div>
        <p className="specimen-note">
          Labels remain visible. Errors are next to their control and referenced
          by aria-describedby. Tab moves through fields; Space toggles
          checkboxes; arrow keys change selects.
        </p>

        <h3>Feedback</h3>
        <div className="specimen-row">
          <StatusLabel tone="success">Complete</StatusLabel>
          <StatusLabel tone="warning">Needs review</StatusLabel>
          <StatusLabel tone="error">Unavailable</StatusLabel>
          <StatusLabel>Draft</StatusLabel>
        </div>
        <div className="specimen-stack">
          <Alert tone="info" title="Information">
            Read the details before continuing.
          </Alert>
          <Alert tone="success" title="Saved">
            The change is ready.
          </Alert>
          <Alert tone="warning" title="Check this">
            One item needs review.
          </Alert>
          <Alert tone="error" title="Could not save">
            Check the highlighted field and try again.
          </Alert>
        </div>
        <p className="specimen-note">
          Status uses text as well as color. Live alerts announce errors;
          passive notices use status semantics.
        </p>

        <h3>Loading and empty states</h3>
        <div
          className="specimen-stack"
          role="status"
          aria-label="Example loading content"
        >
          <Skeleton width="short" />
          <Skeleton />
          <Skeleton width="medium" />
          <span className="specimen-note">Loading content</span>
        </div>
        <EmptyState
          title="Nothing here yet"
          action={
            <ActionLink href="#components" variant="secondary">
              Review controls
            </ActionLink>
          }
        >
          Items will appear here when they are added. Review the available
          controls to get started.
        </EmptyState>

        <h3>Overlays and sections</h3>
        <div className="specimen-row">
          <DialogExample />
          <MenuExample />
        </div>
        <p className="specimen-note">
          The modal dialog traps focus, supports Escape, and returns focus when
          closed. The disclosure menu opens with Enter or Space and its links
          remain normal keyboard links.
        </p>
        <Tabs
          items={[
            {
              label: "Overview",
              content: <p>One active tab presents its panel.</p>,
            },
            {
              label: "Details",
              content: <p>Arrow keys, Home, and End move between tabs.</p>,
            },
            {
              label: "Activity",
              content: <p>Tab moves from the active tab into its panel.</p>,
            },
          ]}
        />
      </section>

      <section
        className="workbench-section"
        id="templates"
        aria-labelledby="templates-title"
      >
        <h2 id="templates-title">03 / Page templates</h2>
        <p>
          These layout specimens define content hierarchy. Product subsystems
          replace specimen words with authorized data and actions.
        </p>
        <div className="template-gallery">
          <TemplatePreview
            name="List"
            description="Heading, one action, summary rows, and useful metadata."
          >
            <div className="template-heading">
              <strong>Items</strong>
              <Button variant="primary">Add item</Button>
            </div>
            <div className="template-lines">
              <div className="template-line">
                <span>First item</span>
                <span>Updated today</span>
              </div>
              <div className="template-line">
                <span>Second item</span>
                <span>Updated yesterday</span>
              </div>
            </div>
          </TemplatePreview>
          <TemplatePreview
            name="Detail"
            description="Readable primary content with a compact context rail."
          >
            <div className="template-heading">
              <strong>Item heading</strong>
              <Button>Secondary action</Button>
            </div>
            <div className="template-columns">
              <p>
                Primary information stays at a comfortable reading width and
                keeps a clear heading order.
              </p>
              <p>
                Context and metadata sit beside it on larger screens and below
                it on phones.
              </p>
            </div>
          </TemplatePreview>
          <TemplatePreview
            name="Editor"
            description="A short form, inline help, and a clear save action."
          >
            <div className="specimen-stack">
              <TextField label="Title" placeholder="Short title" />
              <TextAreaField
                label="Description"
                placeholder="Explain the item"
              />
              <Button variant="primary">Save changes</Button>
            </div>
          </TemplatePreview>
          <TemplatePreview
            name="Settings"
            description="Related controls grouped by purpose, with the account action at the end."
          >
            <div className="specimen-stack">
              <CheckboxField label="Receive updates" />
              <SelectField label="Display preference" defaultValue="standard">
                <option value="standard">Standard</option>
                <option value="compact">Compact</option>
              </SelectField>
              <Button variant="primary">Save preferences</Button>
            </div>
          </TemplatePreview>
          <TemplatePreview
            name="Moderation"
            description="A decision view with evidence, state, and a documented outcome."
          >
            <div className="template-heading">
              <strong>Review item</strong>
              <StatusLabel tone="warning">Needs review</StatusLabel>
            </div>
            <div className="template-columns">
              <p>
                Evidence is read before a decision. The reason and policy are
                visible together.
              </p>
              <div>
                <p>Decision history</p>
                <Button variant="primary">Record decision</Button>
              </div>
            </div>
          </TemplatePreview>
        </div>
      </section>
    </div>
  );
}
