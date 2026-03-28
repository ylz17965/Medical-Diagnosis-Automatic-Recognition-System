# Project Rules

## Tech Stack
- Vue 3 + Composition API + `<script setup lang="ts">`
- Vite
- TypeScript
- CSS Variables (design tokens)

## Auto-Invoke Skills

### ALWAYS invoke these skills IMMEDIATELY when relevant tasks are detected:

#### UI/UX Related Tasks
**MUST invoke `ui-ux-pro-max` skill when:**
- User mentions: UI, UX, design, style, animation, transition, color, typography, spacing, layout, responsive, accessibility, modal, button, form, card, table, navbar, sidebar
- User asks to: optimize UI, improve design, fix styling, add animation, make it look better, make it smoother
- Working with: CSS, transitions, animations, visual components

#### Vue Related Tasks
**MUST invoke `vue-best-practices` skill when:**
- Working with: `.vue` files, Vue Router, Pinia, composables
- User mentions: component, props, emits, reactive, ref, computed, watcher, lifecycle
- Creating or modifying: Vue components, composables, stores

#### Web Design Review
**MUST invoke `web-design-guidelines` skill when:**
- User asks to: review UI, check accessibility, audit design, check best practices
- User mentions: WCAG, accessibility, usability, user experience

#### Vue Router Tasks
**MUST invoke `vue-router-best-practices` skill when:**
- Working with: routes, navigation guards, route params, router-link
- User mentions: routing, navigation, redirect, route guard

#### VueUse Functions
**MUST invoke `vueuse-functions` skill when:**
- Needing utility functions for: clipboard, storage, mouse, keyboard, scroll, resize, etc.
- User mentions: VueUse, composable utilities

#### Testing Tasks
**MUST invoke `vue-testing-best-practices` skill when:**
- Writing tests for Vue components
- User mentions: test, spec, vitest, jest, testing library

#### Vite Configuration
**MUST invoke `vite` skill when:**
- Working with: vite.config.ts, build configuration, plugins
- User mentions: build, bundle, dev server, SSR

#### TypeScript Advanced Types
**MUST invoke `typescript-advanced-types` skill when:**
- Needing complex type definitions
- User mentions: generics, conditional types, mapped types, utility types

#### Security Review
**MUST invoke `security-review` skill when:**
- Adding authentication, handling user input, working with secrets
- User mentions: security, auth, token, password, encryption

#### Git Commit
**MUST invoke `git-commit` skill when:**
- User asks to commit changes
- User mentions: /commit, git commit, commit message

## Code Style
- Use Composition API with `<script setup lang="ts">`
- Use CSS variables from design tokens
- Follow Vue 3 best practices
- Ensure accessibility (aria attributes, keyboard navigation)
- Support `prefers-reduced-motion` for animations

## Build Commands
- `npm run build` - Production build
- `npm run dev` - Development server
- `npm run lint` - Linting (if configured)
- `npm run typecheck` - Type checking (if configured)
