# VISUAL BUILD MASTER PRINCIPLES
### Universal Standards for Every Client-Facing or Business-Facing Visual Build

> **How to use this file:** Drop this into every Claude Code session where you are
> building anything visual — websites, CRMs, dashboards, client portals, landing pages.
> This is the source of truth for how we build things that look and feel enterprise-level.
> It is a living document. Update it when new patterns are discovered.

---

## THE CORE PHILOSOPHY

> *"Clean, constrained, intentional. Every pixel has a reason. Every animation has a purpose."*

AI slop happens when direction is vague. Enterprise output happens when every decision
is specified before a single line of code is written. Never say "make it look modern."
Always say exactly what you mean — reference real sites, give exact values, lock tokens first.

**Before writing a single component, answer these:**
1. What is the design token set? (colors, type, spacing, easing, radius)
2. What real site or aesthetic are we referencing?
3. What is the component structure? (what components exist, what do they receive)
4. What animates, how does it enter, how does it exit?
5. What is the build order? (tokens → layout → hero → sequences → sections → polish)

---

## PART 1 — THE STACK

### 1.1 The Only Stack Worth Using

**Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion + shadcn/ui**

This is the stack that produces the sites on Awwwards, Linear, Vercel, 21st.dev.
Everything else is either underpowered or overcomplicated.

| Tool | Why |
|---|---|
| **Next.js App Router** | File-based routing, server components, image optimization built in |
| **TypeScript** | Forces explicit props and data shapes — eliminates "it compiled but looks wrong" |
| **Tailwind** | Utility classes co-located with components — no hunting through 2000 lines of CSS |
| **Framer Motion** | The only animation library worth using for production visual work |
| **shadcn/ui** | Components you own and modify — not a black-box install |

### 1.2 When to Use Vanilla HTML/CSS/JS

Only when:
- The project is already built in vanilla and a full rebuild isn't scoped
- The client deliverable is a single static page with minimal interaction
- Timeline doesn't allow for a proper React setup

Even then — plan the React rebuild. Vanilla is v1. React is v2.

---

## PART 2 — DESIGN TOKENS (LOCK THESE FIRST)

**Never build a single component before the token set is defined.**
Every prompt, every component, every animation references these tokens.
Nothing hardcoded. Ever.

### 2.1 Token Structure

```ts
// /lib/tokens.ts

export const tokens = {

  colors: {
    bg:           '#161412',      // primary background
    surface:      'rgba(255,255,255,0.03)', // card/surface
    accent:       '#f2ece4',      // primary text / light accent
    accentDim:    '#a89e94',      // muted text
    accentGlow:   '#c4845a',      // copper highlight / brand color
    accentGlowDk: '#a86840',      // darker copper for hover
    border:       'rgba(255,255,255,0.07)', // subtle borders
  },

  typography: {
    display:  'clamp(3rem, 8vw, 7rem)',   // hero headlines
    heading:  'clamp(2rem, 5vw, 4rem)',   // section headings
    subhead:  'clamp(1.25rem, 2.5vw, 2rem)',
    body:     '1rem',
    label:    '0.75rem',
    mono:     'font-mono',
  },

  spacing: {
    section:   '120px',   // vertical padding between sections
    container: '1280px',  // max content width
    gap:       '24px',    // standard gap between elements
  },

  easing: {
    smooth:  [0.22, 1, 0.36, 1],       // standard smooth ease
    snappy:  [0.4, 0, 0.2, 1],         // quick in, smooth out
    spring:  { type: 'spring', stiffness: 400, damping: 30 },
    springMd:{ type: 'spring', stiffness: 280, damping: 24 },
  },

  radius: {
    sm:   '8px',
    md:   '16px',
    lg:   '24px',
    xl:   '32px',
    pill: '100px',
  },

}
```

### 2.2 Shared Animation Variants

```ts
// /lib/animations.ts
// Reusable Framer Motion variants — always reference these, never invent new ones per component

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
}

export const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
```

---

## PART 3 — COMPONENT ARCHITECTURE

### 3.1 Folder Structure (Every Visual Build)

```
/app
  layout.tsx              ← fonts, globals, metadata
  page.tsx                ← assembles section components
  /about/page.tsx
  /services/page.tsx
  /contact/page.tsx

/components
  /ui                     ← shadcn primitives (Button, Card, etc.)
  /sections               ← full page sections
    Hero.tsx
    Problem.tsx
    Audit.tsx
    Process.tsx
    Testimonial.tsx
    FAQ.tsx
    CTA.tsx
  /shared                 ← reusable across sections
    NavBar.tsx
    Footer.tsx
    AnimatedText.tsx
    ScrollReveal.tsx
    MagneticButton.tsx

/lib
  tokens.ts               ← all design tokens
  animations.ts           ← all reusable Framer variants
  utils.ts                ← cn(), clamp(), etc.
```

### 3.2 Component Rules

- Every section is its own file in `/components/sections/`
- Every section accepts typed props — no any, no implicit types
- No inline styles — Tailwind classes only (with `cn()` for conditionals)
- No hardcoded colors or spacing — always reference tokens
- Every component that animates uses variants from `/lib/animations.ts`
- shadcn components live in `/components/ui/` — never modify them in place,
  extend them via wrapper components

---

## PART 4 — ANIMATION PRINCIPLES

### 4.1 The Rules That Separate Clean from Slop

**Rule 1 — Everything enters. Nothing just appears.**
Every element that loads or scrolls into view has an entrance.
Opacity + Y transform minimum. Always.

**Rule 2 — Stagger children, never animate the parent.**
```tsx
// WRONG — animates the block as one unit
<motion.div animate={{ opacity: 1 }}>
  <h1>Title</h1>
  <p>Subtext</p>
</motion.div>

// RIGHT — each child enters individually, staggered
<motion.div variants={staggerContainer} initial="hidden" animate="show">
  <motion.h1 variants={fadeUp}>Title</motion.h1>
  <motion.p  variants={fadeUp}>Subtext</motion.p>
</motion.div>
```

**Rule 3 — Spring physics for interactive elements.**
Hover states, menu opens, button presses — springs feel alive, durations feel programmed.
```tsx
// WRONG
transition={{ duration: 0.2 }}

// RIGHT
transition={{ type: 'spring', stiffness: 400, damping: 30 }}
```

**Rule 4 — useScroll + useTransform for scroll-driven animation.**
Never listen to scroll events manually in React. Ever.
```tsx
const { scrollYProgress } = useScroll({ target: ref })
const y = useTransform(scrollYProgress, [0, 1], [0, -100])
const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
```

**Rule 5 — will-change surgically.**
Only on elements actively animating transform or opacity. Not globally.

**Rule 6 — Exit animations always.**
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

**Rule 7 — Specify animation in physics terms, not vibe terms.**
```
// WRONG in a prompt
"make it animate smoothly"

// RIGHT in a prompt
"Enter: opacity 0→1, y 24px→0, duration 0.6s, ease [0.22, 1, 0.36, 1]
 Stagger children by 0.08s
 Exit: opacity 1→0, duration 0.2s, ease [0.4, 0, 1, 1]"
```

### 4.2 Animation Hierarchy by Element Type

| Element Type | Animation Type | Notes |
|---|---|---|
| Section entrance | fadeUp + stagger | Trigger on scroll into view |
| Hero headline | stagger per word or char | Editorial feel |
| Cards | scaleIn or fadeUp | Stagger if multiple |
| Nav items | fadeIn stagger | On page load |
| Hover states | Spring physics | stiffness 400, damping 30 |
| Page transitions | fadeIn/Out | AnimatePresence on layout |
| Scroll sequences | useScroll + useTransform | Never manual scroll events |
| Modals/dropdowns | scale + opacity | Spring open, ease close |
| Buttons | subtle scale 0.97 on press | Always |

---

## PART 5 — TYPOGRAPHY

### 5.1 The Rule

**Typography makes or breaks enterprise aesthetics. Animations cannot fix bad type.**

Before the first component is built, lock:
- Display font: personality (Geist, Cal Sans, Neue Montreal, Bebas Neue)
- Body font: readable, neutral (Inter, DM Sans, Plus Jakarta Sans)
- Scale: 4-5 sizes maximum, used consistently
- Letter spacing: tight on large (-0.03em to -0.05em), normal on body
- Line height: 1.05 on display, 1.5-1.6 on body

### 5.2 Type Scale Template

```css
/* Display — hero headlines */
font-size: clamp(3rem, 8vw, 7rem);
font-weight: 900;
letter-spacing: -0.04em;
line-height: 1.05;

/* Heading — section titles */
font-size: clamp(2rem, 5vw, 4rem);
font-weight: 700;
letter-spacing: -0.03em;
line-height: 1.08;

/* Subheading */
font-size: clamp(1.25rem, 2.5vw, 2rem);
font-weight: 500;
letter-spacing: -0.01em;
line-height: 1.2;

/* Body */
font-size: 1rem;
font-weight: 400;
letter-spacing: 0;
line-height: 1.6;

/* Label / eyebrow */
font-size: 0.75rem;
font-weight: 600;
letter-spacing: 0.12em;
text-transform: uppercase;
```

---

## PART 6 — PROMPTING STANDARDS

### 6.1 The Constraint-First Prompting System

**Every Claude Code prompt follows this structure:**

```
REFERENCE:
  [Real site or aesthetic being matched — e.g. "Linear.app hero section"]

COMPONENT:
  [Exact component name, file path, props it accepts]

TOKENS:
  [Which tokens from /lib/tokens.ts this component uses]

ANIMATION:
  [Exact entrance, exit, hover — values not vibes]

SCOPE:
  [What to build AND what NOT to touch]

CONSTRAINTS:
  [Stack rules, no hardcoded values, TypeScript strict, etc.]

OUTPUT:
  [Exact files to create or modify]
```

### 6.2 Reference Real Sites

Never use vague direction. Always name the reference.

| Vague (produces slop) | Specific (produces quality) |
|---|---|
| "Make it look modern" | "Reference Linear.app's card aesthetic" |
| "Nice animations" | "Match Vercel's homepage scroll reveal timing" |
| "Clean typography" | "Match Stripe's type hierarchy and weight contrast" |
| "Dark theme" | "Match Raycast.com's dark surface treatment" |
| "Smooth transitions" | "Match Framer.com's page transition feel" |

### 6.3 One Component Per Prompt

Never build multiple components in one prompt unless they are trivially simple.
One component, fully specified, fully built, reviewed, then move to the next.

### 6.4 Screenshot Feedback Loop

Build → deploy → screenshot → paste screenshot into chat →
"Fix X — it should look like Y" → repeat.

Never try to fix from memory or description alone.
Always show what it actually rendered.

---

## PART 7 — BUILD ORDER (NEVER SKIP STEPS)

```
Step 1 — Tokens + globals
  /lib/tokens.ts, /lib/animations.ts, tailwind.config.ts,
  globals.css, font imports

Step 2 — Layout shell
  layout.tsx, NavBar.tsx, Footer.tsx

Step 3 — Hero
  The first thing anyone sees. Sets the entire tone.
  Get this right before touching anything else.

Step 4 — Scroll sequences
  Any sticky scroll, parallax, or scroll-driven animation sections.
  These are the most complex — build them while the codebase is clean.

Step 5 — Supporting sections
  Problem, audit, process, testimonial, FAQ sections.
  Each is its own prompt.

Step 6 — Pages
  /about, /services, /contact — content pages.

Step 7 — Polish pass
  Micro-interactions, hover states, page transitions,
  mobile responsiveness, performance audit.
```

---

## PART 8 — CRM / DASHBOARD SPECIFIC RULES

When the visual build is a CRM, admin portal, or dashboard:

- **Data tables**: shadcn Table + TanStack Table for sorting/filtering
- **Charts**: Recharts wrapped in motion.div for entrance animations
- **Stat cards**: Always show delta/trend, not just current value
- **Empty states**: Every table and list needs a designed empty state
- **Loading states**: Skeleton loaders, not spinners — match the shape of the content
- **Color for data**: Never use color as the only differentiator (accessibility)
- **Density**: Default to comfortable, offer compact mode for power users
- **Mobile**: Dashboards collapse to card stacks on mobile — plan for this from day one

---

## PART 9 — QUALITY CHECKLIST (RUN BEFORE EVERY DEPLOY)

```
VISUAL
[ ] All colors reference tokens — nothing hardcoded
[ ] Typography scale consistent across all sections
[ ] Spacing consistent — no random margin/padding values
[ ] Dark mode tested (if applicable)
[ ] Mobile responsive at 375px, 768px, 1280px, 1920px

ANIMATION
[ ] Every section entrance has an animation
[ ] No elements just appear without transition
[ ] Exit animations on all mounted/unmounted elements
[ ] Scroll-driven animations use useScroll + useTransform
[ ] No manual scroll event listeners in React components
[ ] Springs used for all interactive/hover states
[ ] will-change only on actively animating elements

PERFORMANCE
[ ] Images use next/image with proper sizing
[ ] Fonts loaded with next/font (no FOUT)
[ ] No layout shift on load
[ ] Animations don't run on reduced-motion preference
[ ] No unnecessary re-renders (check with React DevTools)

CODE QUALITY
[ ] No any types in TypeScript
[ ] No hardcoded strings that should be props
[ ] No inline styles — Tailwind only
[ ] All animation variants imported from /lib/animations.ts
[ ] Components under 200 lines — split if larger
```

---

## PART 10 — LESSONS LEARNED (UPDATE AS YOU BUILD)

> Add to this section after every significant build session.

### From the A1 Innovations Vanilla Build
- Scroll animations must be scroll-position-driven via a single function — never fire-and-forget
- Porting React components (framer-motion, 21st.dev) to vanilla always loses fidelity
- The right answer is to build in React from the start — vanilla is a v1 compromise
- Typography and spacing decisions made at the start are almost impossible to change later
- Always lock the hero first — it sets the visual bar for everything below it
- Menu animations are the first thing clients notice — get them right early
- CSS transform conflicts (rotate + scale + translate) require wrapper element separation

- Headed Playwright screenshots can hang ("waiting for fonts") when the browser window is backgrounded on macOS. Use headless Chrome `--screenshot`; for phone widths, screenshot a wrapper page of 390px iframes (headless windows can't go below ~500px). (La Fondita de Marta, Oct 2026)

### Universal Principles
- Vague prompts produce vague output — specificity is the entire game
- One component per prompt — never batch unrelated components
- Screenshot feedback loop is non-negotiable for visual work
- Tokens first, always — retrofitting a design system is painful
- Build order matters — skip steps and you pay for it in rework

---

*Last updated: August 2026*
*Companion file: CLAUDE_CODE_MASTER_PRINCIPLES.md*
*Use both files as context in every visual build session.*
