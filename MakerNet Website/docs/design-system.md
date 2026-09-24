# MakerNet design system

Subsystem 1 establishes an industrial editorial interface: warm paper, charcoal
text, a single cobalt action color, readable list rows, and direct controls. The
desktop and phone examples live at `/design-system`. The route is a component
workbench with specimen content; it does not represent product data.

## Tokens

Tokens are CSS custom properties in `apps/web/src/app/globals.css`. Color:
`--paper`, `--surface`, `--surface-muted`, `--ink`, `--muted`, `--line`,
`--accent`, `--accent-hover`, `--accent-wash`, and semantic success, warning,
and error pairs. Spacing uses 8px steps (`--s1` to `--s8`); corner radii are
4, 8, and 16px. `--raised` is reserved for overlays. Motion uses a 120ms
press and 200ms opacity response; reduced motion removes press transforms and
skeleton animation. Layout switches at 720px, with a maximum content width of
1152px and a 72-character reading width. Focus uses a 3px cobalt outline.

Georgia is the reading face and Verdana the control face. Both are local system
font stacks, so the interface makes no third-party font request. A future
brand-font change must keep the two-family limit and self-host any supplied
font files.

## Component contract

| Component                             | Applicable states                                 | Keyboard and semantics                                                                                                          |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Button                                | Default, hover, focus, pressed, disabled, loading | Native button; Enter and Space activate; loading disables repeat activation and exposes busy state.                             |
| ActionLink, TextLink                  | Default, hover, focus, pressed                    | Native link; Enter follows destination. Links are only used for navigation.                                                     |
| TextField, SelectField, TextAreaField | Default, hover, focus, disabled, invalid          | Visible label; hint and error IDs feed `aria-describedby`; invalid uses `aria-invalid`. Native field keyboard behavior applies. |
| CheckboxField                         | Unchecked, checked, focus, disabled               | Label is the hit target; Space toggles.                                                                                         |
| Dialog                                | Closed, open, focused actions                     | Native modal `dialog`; Escape closes; focus stays inside and returns to trigger.                                                |
| Menu disclosure                       | Closed, open, focus                               | Native `details` and `summary`; Enter or Space toggles; Escape closes and returns focus; Tab reaches ordinary links.            |
| Tabs                                  | Selected, unselected, focus                       | Tablist with one tab stop; arrow keys, Home, and End select and focus; Tab enters the selected panel.                           |
| StatusLabel                           | Neutral, success, warning, error                  | Text names the state, so color is supplemental.                                                                                 |
| Alert                                 | Information, success, warning, error              | Status semantics announce passive updates; errors use alert semantics.                                                          |
| Skeleton                              | Loading, reduced motion                           | Decorative bars are hidden from accessibility tree; the container names the loading state.                                      |
| EmptyState                            | Empty with next action                            | Heading and explanatory text give a path forward.                                                                               |
| FormError                             | Invalid                                           | Adjacent error text is linked to its control.                                                                                   |

The workbench also records list, detail, editor, settings, and moderation
layouts. Those specimens demonstrate content hierarchy, not product records or
working feature flows. Later subsystems must reuse these patterns or document
an exception before introducing a new one.

## Shell

The shared shell includes the MakerNet wordmark, policy-aware navigation, a
visitor or account menu, a skip link, responsive content width, and a footer.
The home route surfaces live skills, profiles, and guides only when the database
is ready; visitor links lead to sign-in and the design-system workbench.

## Product screen patterns added in Subsystems 2–5

The taxonomy browser reuses record lists and a labeled native select picker.
Profile edit/privacy uses the settings template, explicit audience labels, and
read-only preview; unavailable fields are omitted at the service layer. Guide
creation and revision editing use the editor template with separate content,
skill, risk, and contributor sections. Guide detail and revision history reuse
the detail/list templates. Management and moderation screens use the moderation
template with status, scope, consent, and action groups. Forms use native
controls with visible labels and inline error/status feedback. Scope-restricted
actions are absent from the rendered management page and independently checked
by the service. The account menu uses the existing disclosure pattern.

## Review

The component workbench is tested at desktop and phone widths. Browser tests
cover full-page rendering, overflow, WCAG 2.0/2.1 A and AA axe rules, keyboard
movement through tabs, modal opening and Escape, form error linkage, and 44px
interactive targets. Visual screenshots are inspected at both sizes.
