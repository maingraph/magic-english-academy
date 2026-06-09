# Design Parity Requirement

## Principle

The new platform must keep the Magic English design language from the current static website.

This rewrite changes architecture and product depth, not brand identity. New screens should feel like natural extensions of the existing course site.

## Preserve

- Brand mark treatment: `MAGIC ENGLISH`, orange accent, dark text contrast.
- Warm white/gray/orange palette.
- Rounded white navigation surface.
- Montserrat-style typography direction.
- Banner-led course presentation.
- Checklist/course-card visual rhythm.
- Gift/community visual language.
- Friendly Russian-language tone.

## Improve Without Breaking Identity

- Make components reusable instead of copy-pasted.
- Fix accessibility, responsive behavior, and semantic HTML.
- Build new admin/student screens with denser operational layouts where needed.
- Add new states: progress, tasks, achievements, certificates, dictionary, assistant.
- Keep visual restraint: no unrelated futuristic dashboard style, no generic SaaS skin.

## Immediate Design Work

Before building final production screens:

1. Extract design tokens from the legacy CSS.
2. Create shared components: top menu, buttons, checklist item, level card, modal, progress bar, course shell.
3. Rebuild first pages in Next with matching look.
4. Only then expand into new screens such as admin, dashboard, dictionary, and achievements.
