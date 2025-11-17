# WCAG Accessibility Research: Multiple Disability Categories
## Directory Template Optimization Guide

**Document Version**: 1.0
**Date**: 2025-11-17
**Target**: Public-facing directory templates (location-agnostic & interactive map)
**Standards**: WCAG 2.2 (Level AA minimum, AAA aspirational)

---

## Executive Summary

This research document provides comprehensive WCAG 2.2 accessibility guidelines for diverse disability categories including cognitive disabilities, auditory disabilities, speech disabilities, age-related impairments, multiple disabilities, temporary impairments, and situational limitations.

### Key Findings

1. **Cognitive accessibility benefits everyone** - Simple, clear design improves usability for all users
2. **Plain language is critical** - 8th grade reading level, short sentences, active voice
3. **Consistency reduces cognitive load** - Predictable patterns aid memory and navigation
4. **Time limits are harmful** - Users need control over timing and interactions
5. **Animations can be problematic** - Always respect `prefers-reduced-motion` CSS media query
6. **Multiple disabilities require tested combinations** - Features must not conflict
7. **Situational limitations show accessibility helps everyone** - Bright sunlight, noisy environments, etc.
8. **Perfect accessibility on 2 templates** = Perfect on thousands of pages

---

## Cognitive Disabilities Overview

### What Are Cognitive Disabilities?

**Description**: Cognitive disabilities affect memory, attention, problem-solving, reading, linguistic comprehension, math comprehension, and visual comprehension. They range from learning disabilities to intellectual disabilities to mental health conditions.

**Statistics**: ~16% of the world's population has some form of cognitive disability

### Types of Cognitive Disabilities

#### 1. Attention Deficit (ADHD, Attention Disorders)

**Challenges**:
- Difficulty focusing on lengthy content
- Distracted by animations and movement
- Hard to filter relevant information
- Difficulty completing multi-step processes

**Needs**:
- Clear, simple layouts
- Minimal distractions
- Ability to pause/disable animations
- Step-by-step instructions with progress indicators
- Reduced cognitive load

#### 2. Memory Impairments

**Challenges**:
- Forgetting information from previous pages
- Difficulty remembering instructions
- Can't recall complex navigation paths
- Session timeouts are problematic

**Needs**:
- Consistent navigation across all pages
- Visible breadcrumb trails
- Clear reminders of current task/location
- Auto-save functionality
- Helpful error messages
- Tolerant error handling

#### 3. Learning Disabilities (Dyslexia, Dyscalculia)

**Challenges**:
- Difficulty reading complex text
- Trouble with small or stylized fonts
- Confusion with complex layouts
- Math or number comprehension issues
- Processing speed limitations

**Needs**:
- Simple, clear language
- Readable fonts (sans-serif recommended)
- Good spacing and layout (1.5+ line height)
- Alternative formats when possible
- Visual supports (icons, images)
- Adequate time for interactions

#### 4. Intellectual Disabilities

**Challenges**:
- Complex language difficult to understand
- Abstract concepts challenging
- Multi-step processes confusing
- Technical jargon incomprehensible

**Needs**:
- Plain language (8th grade level)
- Simple, short sentences
- Clear, descriptive headings
- Visual supports (icons with labels)
- Consistent, predictable patterns
- Familiar web conventions

#### 5. Mental Health Conditions (Anxiety, Depression, PTSD, Autism)

**Challenges**:
- Overwhelming interfaces cause stress
- Sensory sensitivities (bright colors, animations)
- Difficulty with social interaction metaphors
- Unpredictable behavior causes anxiety
- Time pressure triggers anxiety

**Needs**:
- Predictable, consistent interface
- User control over experience
- No sudden changes or pop-ups
- No time limits
- Calm, quiet design
- Clear expectations set upfront

---

## Auditory Disabilities Overview

### Types of Auditory Disabilities

#### Hard of Hearing

**Description**: Some hearing loss but may benefit from amplification

**Needs**:
- Captions for all audio/video content
- Volume controls
- Visual alternatives to audio alerts
- No audio-only content
- Text alternatives for all audio information

#### Deafness

**Description**: Little or no hearing

**Needs**:
- Captions for all audio/video content
- Transcripts available for download
- Sign language interpretation (for important videos)
- Visual indicators for all audio cues
- No audio-only information
- Text/email alternatives to phone numbers

### Directory-Specific Considerations

**For directory websites**:
- If business videos exist, provide captions
- Always show phone AND email/contact form
- No audio-only announcements or alerts
- Visual feedback for all user actions
- Consider relay service information if providing phone support

---

## Speech Disabilities Overview

### Types of Speech Disabilities

**Categories**:
- Articulation disorders
- Fluency disorders (stuttering)
- Voice disorders
- Aphasia (language disorder after stroke/injury)

### Needs

- Don't require voice input for any functionality
- Provide alternatives to voice control
- Allow extended time for voice input (if used)
- Support for communication devices
- Text-based alternatives for all communication

### Directory-Specific Considerations

**For directory websites**:
- Don't require phone calls - provide text contact methods
- If voice search is offered, provide traditional text search
- Offer contact forms as alternative to phone
- Provide email/chat options for communication
- Never make voice the ONLY way to complete a task

---

## Age-Related Impairments

### Common Challenges for Older Adults

**Description**: Older adults often experience multiple mild impairments that compound to create significant challenges. May also have less familiarity with technology.

**Common Issues**:
- Declining vision (presbyopia, reduced contrast sensitivity)
- Reduced fine motor control
- Slower information processing
- Memory decline
- Hearing loss
- Less technology experience
- Cognitive slowing

### Needs

- Large, readable text (16px minimum)
- High contrast (4.5:1 minimum)
- Simple, clear layouts
- Large click targets (44x44px)
- Consistent, predictable navigation
- Clear, explicit instructions
- Forgiving error handling
- Help readily available
- Familiar patterns over novel designs
- Adequate time for all interactions
- No distractions or unnecessary complexity

---

## Multiple Disabilities

### Overview

Many people have combinations of disabilities. Accessibility solutions must not conflict with each other. All features must work together harmoniously.

### Common Combinations

#### Deaf-Blind

**Needs**:
- Braille display support (via screen readers)
- Text-based interface
- Keyboard navigation
- Semantic HTML for assistive technology
- No reliance on audio OR visual-only content

**Considerations**:
- Cannot use audio or visual-only information
- Rely heavily on touch and text output via braille display
- Screen reader must work perfectly

#### Deaf-Low Vision

**Needs**:
- Captions with adjustable size and color
- High contrast captions
- Screen reader compatible captions
- Large text with good contrast

**Considerations**:
- Captions must be accessible to screen readers
- Text resizing must work with captions
- High contrast mode must work with video captions

#### Cognitive-Motor Combinations

**Needs**:
- Simple keyboard navigation
- Clear focus indicators
- Simple, predictable interactions
- Large click targets
- Step-by-step guidance
- Undo functionality
- No time pressure

**Considerations**:
- Compound effect requires extra care
- Must be both cognitively simple AND motorically simple
- Test with both needs in mind

---

## Temporary Impairments

### Overview

Temporary impairments from injury, surgery, or medication create short-term accessibility needs. These users may not have specialized assistive technology but still need accessible design.

### Examples

**Common temporary impairments**:
- Broken arm (can't use mouse)
- Eye surgery (light sensitivity, blurred vision)
- Concussion (cognitive effects, light sensitivity)
- Medication causing drowsiness or confusion
- Ear infection affecting hearing
- Dental work affecting speech

### Needs

- All permanent accessibility features
- Built-in accessibility (may not have assistive tech)
- Keyboard-only navigation
- High contrast modes
- Text alternatives
- Simple, clear interfaces
- No time pressure

**Key insight**: Temporary disability users demonstrate why built-in accessibility matters!

---

## Situational Limitations

### Overview

Environmental or contextual factors can create accessibility needs for anyone. This proves that accessibility benefits ALL users, not just people with disabilities.

### Examples

#### Bright Sunlight
**Challenge**: Can't see screen clearly
**Needs**: High contrast, large text, simple visuals, dark mode option

#### Loud Environment (Airport, Street, Construction)
**Challenge**: Can't hear audio
**Needs**: Captions, visual indicators, text alternatives

#### Quiet Environment (Library, Meeting, Public Transit)
**Challenge**: Can't play audio without disturbing others
**Needs**: Captions, transcripts, silent mode

#### Mobile Device with Small Screen
**Challenge**: Limited screen space, touch-only input
**Needs**: Responsive design, large touch targets, simple navigation

#### Slow Internet Connection
**Challenge**: Content loads slowly or incompletely
**Needs**: Lightweight pages, progressive loading, critical content first

#### Holding a Baby or Carrying Groceries
**Challenge**: Only one hand available
**Needs**: Keyboard navigation, voice control, large targets

#### Unfamiliar Language or Low Literacy
**Challenge**: Not fluent in site's primary language
**Needs**: Simple language, visual cues, icons with labels, translation options

---

## WCAG 2.2 Requirements (Cognitive & Auditory Focus)

### Level A (Critical - Must Have)

#### 1.2.1 Audio-only and Video-only
**All audio/video must have alternatives**

```html
<!-- Video with captions -->
<video controls>
  <source src="business-tour.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
  Your browser does not support the video tag.
</video>

<!-- Audio with transcript -->
<audio controls>
  <source src="owner-interview.mp3" type="audio/mpeg">
</audio>
<p><a href="transcript.txt">Download transcript</a></p>
```

#### 2.2.1 Timing Adjustable
**Users can extend, adjust, or disable time limits**

```javascript
// Good - provide control over timing
let timeLimit = 300; // 5 minutes default

function extendTime() {
  timeLimit += 300; // Add 5 more minutes
  alert('Time extended by 5 minutes');
}

// Better - no time limit for directory browsing!
// Only use time limits when truly necessary (security, etc.)
```

#### 2.2.2 Pause, Stop, Hide
**Users can control moving, blinking, or auto-updating content**

```javascript
// Respect user's preference for reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // Enable animations
  startCarousel();
} else {
  // Disable animations
  showStaticView();
}

// Always provide pause button for carousels
<button onclick="pauseCarousel()">Pause carousel</button>
```

#### 2.3.1 Three Flashes or Below Threshold
**No flashing content that could cause seizures**

**Rule**: No more than 3 flashes per second

```css
/* Bad - rapid flashing */
@keyframes flash {
  0%, 50% { opacity: 1; }
  25%, 75% { opacity: 0; }
}
.alert {
  animation: flash 0.25s infinite; /* 4 flashes/second - DANGEROUS */
}

/* Good - slow, gentle pulse */
@keyframes gentle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.notification {
  animation: gentle-pulse 2s ease-in-out; /* Safe */
}
```

#### 3.2.1 On Focus
**No unexpected context changes on focus**

```javascript
// Bad - unexpected behavior
<select onfocus="window.location = this.value">
  <option value="/page1">Page 1</option>
  <option value="/page2">Page 2</option>
</select>

// Good - explicit action required
<select id="page-select">
  <option value="">Select a page</option>
  <option value="/page1">Page 1</option>
  <option value="/page2">Page 2</option>
</select>
<button onclick="navigateToSelected()">Go</button>
```

#### 3.3.1 Error Identification
**Errors are clearly identified in text**

```html
<!-- Good error identification -->
<label for="email">Email address</label>
<input type="email" id="email" name="email"
       aria-invalid="true"
       aria-describedby="email-error">
<span id="email-error" class="error" role="alert">
  Please enter a valid email address (example: name@domain.com)
</span>
```

#### 3.3.2 Labels or Instructions
**Form inputs have clear labels and instructions**

```html
<!-- Good - clear label and instruction -->
<label for="phone">Phone number</label>
<span id="phone-help">Format: (555) 123-4567</span>
<input type="tel" id="phone" name="phone"
       aria-describedby="phone-help">
```

### Level AA (Required for Compliance)

#### 1.4.12 Text Spacing
**Content works when users adjust text spacing**

**Must support**:
- Line height (line spacing) at least 1.5x font size
- Paragraph spacing at least 2x font size
- Letter spacing at least 0.12x font size
- Word spacing at least 0.16x font size

```css
/* Design must work with these user overrides */
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}

p {
  margin-bottom: 2em !important;
}

/* Ensure your layout doesn't break with increased spacing */
```

#### 1.4.13 Content on Hover or Focus
**Hover/focus content must be dismissible, hoverable, and persistent**

```html
<!-- Good tooltip implementation -->
<button aria-describedby="tooltip">
  More info
</button>
<div id="tooltip" role="tooltip" hidden>
  Additional information here
</div>

<script>
// Dismissible (Escape key)
// Hoverable (can move mouse to tooltip)
// Persistent (doesn't disappear until dismissed)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideTooltip();
  }
});
</script>
```

#### 2.4.5 Multiple Ways
**Multiple ways to find content**

For directory websites:
- Search functionality ✓
- Category navigation ✓
- Location navigation ✓
- A-Z listings ✓
- Breadcrumbs ✓

```html
<!-- Multiple navigation methods -->
<nav aria-label="Site navigation">
  <ul>
    <li><a href="/search">Search</a></li>
    <li><a href="/categories">Browse by Category</a></li>
    <li><a href="/locations">Browse by Location</a></li>
    <li><a href="/all">A-Z Directory</a></li>
  </ul>
</nav>
```

#### 2.4.6 Headings and Labels
**Headings and labels are descriptive**

```html
<!-- Bad - vague headings -->
<h2>Details</h2>
<button>Submit</button>
<a href="/more">More</a>

<!-- Good - descriptive headings -->
<h2>Business Contact Information</h2>
<button>Submit Business Review</button>
<a href="/business-hours">View Complete Business Hours</a>
```

#### 3.2.3 Consistent Navigation
**Navigation is in the same location on every page**

```html
<!-- Same header on every page -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/categories">Categories</a></li>
      <li><a href="/locations">Locations</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
```

#### 3.2.4 Consistent Identification
**Same functionality has same labels across site**

```html
<!-- Consistent across all pages -->
<button class="save-button">Save to Favorites</button>
<button class="share-button">Share This Business</button>

<!-- Not: "Save", "Add to Favorites", "Bookmark" on different pages -->
```

#### 3.3.3 Error Suggestion
**Provide suggestions for fixing errors**

```html
<label for="zip">ZIP code</label>
<input type="text" id="zip" name="zip"
       aria-invalid="true"
       aria-describedby="zip-error">
<span id="zip-error" class="error">
  ZIP code must be 5 digits. You entered 4 digits.
  Example: 62701
</span>
```

#### 3.3.4 Error Prevention (Legal, Financial, Data)
**Provide confirmation for important submissions**

```javascript
// For important actions, confirm first
function submitBusinessClaim() {
  if (confirm('Are you sure you want to claim this business? This action will notify the business owner.')) {
    // Proceed with submission
    submitForm();
  }
}
```

### Level AAA (Aspirational - Best Practice)

#### 2.2.3 No Timing
**No time limits (ideal)**

For directory websites: **No time limits should be necessary!**

#### 2.2.5 Re-authenticating
**No data loss when session expires**

```javascript
// Auto-save user input
function autoSave() {
  localStorage.setItem('review-draft', document.getElementById('review').value);
}

// Restore on page load
window.addEventListener('load', () => {
  const draft = localStorage.getItem('review-draft');
  if (draft) {
    document.getElementById('review').value = draft;
  }
});
```

#### 2.3.3 Animation from Interactions
**Users can disable all non-essential animations**

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 3.1.5 Reading Level
**Content written at lower secondary education level (8th grade)**

**Use tools**:
- Hemingway Editor: http://hemingwayapp.com/
- Readable.io
- Microsoft Word's readability statistics

**Target**: Flesch-Kincaid grade level 8 or below

#### 3.3.5 Help (Context-Sensitive)
**Context-sensitive help available**

```html
<label for="business-category">Business Category</label>
<button type="button"
        aria-label="Help choosing a category"
        onclick="showCategoryHelp()">
  ?
</button>
<select id="business-category">
  <option value="">Select category</option>
  <option value="restaurant">Restaurant</option>
  <option value="retail">Retail</option>
</select>

<div id="category-help" hidden>
  <p>Choose the category that best describes your business.
  You can select up to 3 categories.</p>
</div>
```

---

## Plain Language Guidelines

### Principles of Plain Language

**Goal**: 8th grade reading level or below

#### 1. Use Short Sentences
**Rule**: Average 20 words or less per sentence

```
❌ Bad (35 words):
"In order to facilitate the identification and selection of appropriate
business establishments within your designated geographic area, please
utilize the filtering functionality provided in the sidebar to refine
your search parameters."

✅ Good (14 words):
"Use the filters on the left to find businesses in your area."
```

#### 2. Use Short Paragraphs
**Rule**: 3-4 sentences maximum

```
❌ Bad (long paragraph):
"Welcome to our directory. We have thousands of businesses. You can
search by category, location, or keyword. We also have ratings and
reviews. Users love our site because it's comprehensive. We update
listings daily. You can save your favorites. Sign up for a free
account to get started."

✅ Good (chunked):
"Welcome to our directory. We list thousands of local businesses.

Search by category, location, or keyword. Read ratings and reviews
from real customers.

Sign up for a free account to save your favorite businesses."
```

#### 3. Use Active Voice
**Rule**: Subject performs the action

```
❌ Passive: "Your review will be posted by our team after it is approved."
✅ Active: "Our team will post your review after we approve it."

❌ Passive: "Results are displayed based on your search criteria."
✅ Active: "We display results based on your search."
```

#### 4. Use Common Words
**Rule**: Choose simple over complex

```
❌ Complex: utilize, facilitate, implement, commence
✅ Simple: use, help, start, begin

❌ "Utilize the search functionality to facilitate discovery."
✅ "Use search to find what you need."
```

#### 5. Avoid Jargon
**Rule**: Write for general audience

```
❌ Jargon: "Leverage our platform's robust API to integrate vertically."
✅ Plain: "Use our tools to add directory listings to your website."

❌ Jargon: "Optimize your listing's SEO parameters."
✅ Plain: "Make your business easier to find online."
```

#### 6. Define Technical Terms
**Rule**: If you must use technical terms, explain them

```
✅ Good:
"Enable two-factor authentication (2FA) for added security. 2FA sends
a code to your phone each time you log in."
```

### Plain Language Examples for Directory Sites

#### Search Results
```
❌ Complex: "Your query parameters have yielded 47 matching establishments."
✅ Simple: "We found 47 businesses."
```

#### Filters
```
❌ Complex: "Refine your search results by selecting applicable criteria."
✅ Simple: "Filter results:"
```

#### Errors
```
❌ Complex: "The submitted data failed validation checks."
✅ Simple: "Please fix the errors below."
```

#### Empty Results
```
❌ Complex: "No establishments matching your specified parameters were located."
✅ Simple: "No businesses found. Try a different search."
```

#### Call to Action
```
❌ Complex: "Submit your query via the designated form interface."
✅ Simple: "Send us a message using this form."
```

---

## Error Handling Best Practices

### Principles

1. **Prevent errors when possible** (constraints, validation)
2. **Identify errors clearly** (which field, what's wrong)
3. **Describe errors in plain language** (no technical jargon)
4. **Suggest how to fix** (examples, correct format)
5. **Preserve user input** (don't clear form on error)
6. **Allow easy correction** (focus on first error)

### Error Message Examples

#### Email Validation
```html
<!-- Bad -->
<span class="error">Invalid input</span>

<!-- Good -->
<span class="error" id="email-error">
  Please enter a valid email address.
  Example: name@example.com
</span>
```

#### Required Field
```html
<!-- Bad -->
<span class="error">This field is required</span>

<!-- Good -->
<span class="error">
  Business name is required. Please enter your business name.
</span>
```

#### Password Strength
```html
<!-- Bad -->
<span class="error">Password does not meet requirements</span>

<!-- Good -->
<span class="error">
  Password must be at least 8 characters and include:
  • One uppercase letter
  • One number
  • One special character (!@#$%^&*)
</span>
```

#### Date Format
```html
<!-- Bad -->
<span class="error">Invalid date</span>

<!-- Good -->
<span class="error">
  Please enter date in MM/DD/YYYY format.
  Example: 12/31/2025
</span>
```

#### Phone Number
```html
<!-- Bad -->
<span class="error">Phone number invalid</span>

<!-- Good -->
<span class="error">
  Please enter a 10-digit phone number.
  Example: (555) 123-4567
</span>
```

### Error Summary

```html
<!-- Provide error summary at top of form -->
<div role="alert" class="error-summary">
  <h2>Please fix the following errors:</h2>
  <ul>
    <li><a href="#email">Email: Please enter a valid email address</a></li>
    <li><a href="#phone">Phone: Please enter a 10-digit phone number</a></li>
  </ul>
</div>
```

### Success Messages

```html
<!-- Confirm successful actions -->
<div role="status" class="success-message">
  ✓ Your review has been submitted successfully.
</div>

<div role="status" class="success-message">
  ✓ Business saved to your favorites.
</div>
```

---

## Timing Considerations

### WCAG Requirements

**Level A (2.2.1)**: Timing is adjustable
**Level AAA (2.2.3)**: No timing

### Best Practices for Directories

**Rule**: Avoid time limits entirely for directory browsing!

**When time limits are necessary** (security, live events):

```javascript
// Warn user before timeout
const TIMEOUT_WARNING = 120; // 2 minutes before
const TIMEOUT_DURATION = 1800; // 30 minutes

let timeoutTimer;

function startTimeout() {
  timeoutTimer = setTimeout(() => {
    showTimeoutWarning();
  }, (TIMEOUT_DURATION - TIMEOUT_WARNING) * 1000);
}

function showTimeoutWarning() {
  const extend = confirm(
    'Your session will expire in 2 minutes due to inactivity. ' +
    'Would you like to continue your session?'
  );

  if (extend) {
    resetTimeout();
  }
}

// At least 20 seconds to respond to timeout warnings
const MIN_RESPONSE_TIME = 20000; // 20 seconds
```

### Auto-Save User Input

```javascript
// Save form data periodically
let saveTimer;

document.querySelectorAll('input, textarea, select').forEach(field => {
  field.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autoSave, 1000); // Save after 1 second of inactivity
  });
});

function autoSave() {
  const formData = new FormData(document.querySelector('form'));
  localStorage.setItem('form-backup', JSON.stringify(Object.fromEntries(formData)));
}

// Restore on page load
window.addEventListener('load', () => {
  const backup = localStorage.getItem('form-backup');
  if (backup) {
    const data = JSON.parse(backup);
    Object.keys(data).forEach(key => {
      const field = document.querySelector(`[name="${key}"]`);
      if (field) field.value = data[key];
    });
  }
});
```

---

## Animation Guidelines

### CSS Media Query: prefers-reduced-motion

**Always respect user preference!**

```css
/* Default: enable animations */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* User prefers reduced motion: disable animations */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### No Auto-Playing Videos

```html
<!-- Bad - auto-plays -->
<video autoplay loop>
  <source src="promo.mp4" type="video/mp4">
</video>

<!-- Good - user control -->
<video controls>
  <source src="promo.mp4" type="video/mp4">
</video>
```

### Pause Controls for Carousels

```html
<div class="carousel">
  <button onclick="pauseCarousel()" aria-label="Pause carousel">
    <span aria-hidden="true">⏸</span> Pause
  </button>

  <div class="carousel-slides">
    <!-- Slides here -->
  </div>
</div>

<script>
let isPlaying = true;

function pauseCarousel() {
  isPlaying = !isPlaying;
  const button = document.querySelector('.carousel button');

  if (isPlaying) {
    button.innerHTML = '<span aria-hidden="true">⏸</span> Pause';
    button.setAttribute('aria-label', 'Pause carousel');
    startCarousel();
  } else {
    button.innerHTML = '<span aria-hidden="true">▶</span> Play';
    button.setAttribute('aria-label', 'Play carousel');
    stopCarousel();
  }
}
</script>
```

### No Flashing Content

**Rule**: Never exceed 3 flashes per second

```css
/* Dangerous - do not use */
@keyframes flash {
  0%, 50% { background: red; }
  25%, 75% { background: yellow; }
}
.alert {
  animation: flash 0.25s infinite; /* 4 flashes/second - SEIZURE RISK */
}

/* Safe alternative - gentle pulse */
@keyframes safe-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
.notification {
  animation: safe-pulse 2s ease-in-out infinite;
}
```

### Parallax Effects

```css
/* Disable parallax for users who prefer reduced motion */
.hero-section {
  background-attachment: fixed;
  background-image: url('hero.jpg');
}

@media (prefers-reduced-motion: reduce) {
  .hero-section {
    background-attachment: scroll; /* Disable parallax */
  }
}
```

---

## Directory-Specific Recommendations

### Listing Cards

```html
<article class="listing-card">
  <!-- Simple, clear structure -->
  <h3>
    <a href="/listing/main-street-cafe">Main Street Cafe</a>
  </h3>

  <!-- Essential information only -->
  <p class="category">Coffee Shop</p>
  <p class="address">123 Main St, Springfield, IL 62701</p>
  <p class="phone">(555) 123-4567</p>

  <!-- Clear status with icon AND text -->
  <p class="status">
    <span class="status-icon" aria-hidden="true">✓</span>
    <span class="status-text">Open now</span>
  </p>

  <!-- Rating with text, not just stars -->
  <p class="rating">
    <span aria-hidden="true">★★★★☆</span>
    <span>4.0 out of 5 stars (127 reviews)</span>
  </p>
</article>

<style>
/* Simple, readable styling */
.listing-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fff;
}

.listing-card h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  line-height: 1.4;
}

.listing-card p {
  margin: 4px 0;
  line-height: 1.6;
}

/* Status with color AND icon */
.status-icon {
  color: #006600;
  font-weight: bold;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .listing-card {
    transition: none;
  }
}
</style>
```

### Search and Filters

```html
<form class="search-filters" role="search" aria-label="Search businesses">
  <h2>Find Businesses</h2>

  <!-- Simple search input -->
  <label for="search-query">What are you looking for?</label>
  <input type="search"
         id="search-query"
         name="q"
         placeholder="Search businesses"
         autocomplete="off">

  <!-- Clear filter options -->
  <fieldset>
    <legend>Category</legend>
    <label>
      <input type="checkbox" name="category" value="restaurants">
      Restaurants
    </label>
    <label>
      <input type="checkbox" name="category" value="shopping">
      Shopping
    </label>
    <label>
      <input type="checkbox" name="category" value="services">
      Services
    </label>
  </fieldset>

  <!-- Large, clear buttons -->
  <div class="filter-actions">
    <button type="submit" class="button-primary">
      Search
    </button>
    <button type="reset" class="button-secondary">
      Clear All
    </button>
  </div>

  <!-- Results count announcement -->
  <div role="status" aria-live="polite" aria-atomic="true">
    <p id="results-count">50 businesses found</p>
  </div>
</form>
```

### Navigation

```html
<!-- Consistent navigation on every page -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/categories">Categories</a></li>
      <li><a href="/locations">Locations</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<!-- Breadcrumbs for orientation -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/category/restaurants">Restaurants</a></li>
    <li aria-current="page">Springfield, IL</li>
  </ol>
</nav>

<!-- Clear page heading -->
<h1>Restaurants in Springfield, IL</h1>
```

---

## Implementation Checklist

### Cognitive Accessibility
- [ ] Use plain language (8th grade reading level)
- [ ] Keep sentences short (average 20 words or less)
- [ ] Keep paragraphs short (3-4 sentences)
- [ ] Use active voice
- [ ] Use common words over complex terms
- [ ] Define technical terms when necessary
- [ ] Provide clear, descriptive headings
- [ ] Use consistent navigation on all pages
- [ ] Use consistent terminology throughout
- [ ] Provide clear error messages with suggestions
- [ ] No time limits (or adjustable if necessary)
- [ ] Auto-save user input
- [ ] Provide progress indicators for multi-step processes
- [ ] Minimize distractions
- [ ] Respect prefers-reduced-motion
- [ ] Provide help text and tooltips
- [ ] Use icons WITH text labels (not alone)

### Auditory Accessibility
- [ ] Captions for all video content
- [ ] Transcripts for all audio content
- [ ] Sign language interpretation for important videos
- [ ] Visual alternatives to audio alerts
- [ ] No audio-only content
- [ ] Display both phone AND email/contact form
- [ ] Visual feedback for all actions

### Speech Accessibility
- [ ] Don't require voice input
- [ ] Provide text alternatives to voice search
- [ ] Offer contact forms as alternative to phone
- [ ] Provide email/chat options

### Age-Related Accessibility
- [ ] Large text (16px+ minimum)
- [ ] High contrast (4.5:1+ minimum)
- [ ] Simple layouts
- [ ] Large click targets (44x44px)
- [ ] Clear instructions
- [ ] Familiar patterns
- [ ] No distractions
- [ ] Adequate time for interactions

### Multiple Disabilities
- [ ] Test combinations of features
- [ ] Captions work with screen readers
- [ ] High contrast works with text resize
- [ ] Keyboard navigation works everywhere

### Animations
- [ ] Respect prefers-reduced-motion media query
- [ ] Provide pause controls for carousels
- [ ] No auto-playing videos
- [ ] No flashing content (max 3 flashes/second)
- [ ] Disable parallax for reduced motion users

### Error Handling
- [ ] Identify errors clearly
- [ ] Use plain language in error messages
- [ ] Suggest how to fix errors
- [ ] Preserve user input on error
- [ ] Provide error summary at top of form
- [ ] Show success messages

### Testing
- [ ] Test with plain language checker (Hemingway)
- [ ] Test with prefers-reduced-motion enabled
- [ ] Test form error handling
- [ ] Test with keyboard only
- [ ] Test with screen reader
- [ ] Test on mobile devices
- [ ] User testing with diverse users (if possible)

---

## Testing Approaches

### Plain Language Testing

**Tools**:
- Hemingway Editor: http://hemingwayapp.com/
- Readable.io
- Grammarly readability score
- Microsoft Word readability statistics

**Target**: Grade 8 or below

### Cognitive Load Testing

**Questions to ask**:
- Can I understand the page in 5 seconds?
- Is the primary action obvious?
- Are there any distractions?
- Is navigation consistent?
- Can I orient myself easily?
- Do I know where I am?

### Animation Testing

**Test with prefers-reduced-motion**:

**Chrome DevTools**:
1. Open DevTools (F12)
2. Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Type "reduced motion"
4. Select "Emulate CSS prefers-reduced-motion"

**Firefox**:
1. Type `about:config` in address bar
2. Search for `ui.prefersReducedMotion`
3. Set to `1` (reduced motion)

### Error Testing

**Test all error scenarios**:
- Submit empty form
- Submit with invalid data
- Submit with partial data
- Test each field individually
- Verify error messages are helpful
- Verify user input is preserved

---

## Common Mistakes to Avoid

1. ❌ **Using complex language** - Write for 8th grade level
2. ❌ **Long paragraphs** - Keep to 3-4 sentences
3. ❌ **Vague error messages** - "Error" or "Invalid input"
4. ❌ **Color-only indicators** - Use text AND color for status
5. ❌ **Auto-playing videos** - Require user control
6. ❌ **Ignoring prefers-reduced-motion** - Always respect it
7. ❌ **Time limits** - Avoid or make adjustable
8. ❌ **Flashing content** - Max 3 flashes/second
9. ❌ **Inconsistent navigation** - Same location on every page
10. ❌ **No captions on videos** - Always provide captions
11. ❌ **Phone-only contact** - Provide text alternatives
12. ❌ **Unexpected behavior** - No changes on focus/hover
13. ❌ **No error prevention** - Validate input, confirm actions
14. ❌ **Audio-only information** - Provide text alternative

---

## Success Criteria

### Compliance
- [ ] WCAG 2.2 Level AA compliance achieved
- [ ] All automated tests pass
- [ ] Manual testing successful
- [ ] Plain language grade 8 or below

### User Experience
- [ ] Users with cognitive disabilities can navigate easily
- [ ] Users with hearing loss have full access
- [ ] Older adults find interface intuitive
- [ ] Users in situational contexts can still use site
- [ ] No time pressure on any task
- [ ] Animations don't distract or cause issues
- [ ] Error messages are helpful
- [ ] Consistent, predictable experience

### Testing
- [ ] Hemingway Editor grade 8 or below
- [ ] Works with prefers-reduced-motion
- [ ] All videos have captions
- [ ] Forms handle errors well
- [ ] No flashing content
- [ ] User testing feedback positive

---

## Resources

### Official Documentation
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [W3C Cognitive Accessibility Guidance](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-clear-content/)
- [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/)
- [Plain Language Guidelines](https://www.plainlanguage.gov/)

### Testing Tools
- [Hemingway Editor](http://hemingwayapp.com/) - Plain language testing
- [WebAIM Cognitive Guide](https://webaim.org/articles/cognitive/)
- [axe DevTools](https://www.deque.com/axe/devtools/) - Automated testing
- Browser DevTools - Animation and motion testing

### Learning Resources
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
- [Deque University](https://dequeuniversity.com/)
- [WebAIM Training](https://webaim.org/training/)

---

## Conclusion

Implementing these accessibility best practices will make your directory usable by millions of people with cognitive disabilities, auditory disabilities, age-related impairments, and those experiencing temporary or situational limitations.

### Key Takeaways

1. **Plain language benefits everyone** - Not just people with disabilities
2. **Simplicity is powerful** - Clear, simple design works better for all users
3. **Consistency reduces cognitive load** - Predictable patterns aid navigation
4. **Respect user preferences** - Especially prefers-reduced-motion
5. **Provide alternatives** - Multiple ways to accomplish tasks
6. **Test with real users** - Automated testing can't catch everything

### Priority Focus Areas

1. **Plain language** - Simplify all content (biggest impact)
2. **Error handling** - Clear, helpful error messages
3. **Animations** - Respect prefers-reduced-motion
4. **Consistency** - Same navigation, terminology, patterns
5. **Captions** - Add to all video content
6. **No time limits** - Remove unnecessary timing constraints

Since these improvements apply to 2 templates used across thousands of pages, the impact will be enormous. Every improvement multiplies across your entire directory.

---

**Next Steps**:
1. Run Hemingway Editor on all content
2. Simplify language to grade 8 or below
3. Test with prefers-reduced-motion enabled
4. Add captions to any videos
5. Improve error messages
6. Test with diverse users
7. Iterate based on feedback
