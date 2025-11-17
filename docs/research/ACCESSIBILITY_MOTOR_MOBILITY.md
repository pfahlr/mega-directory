# WCAG Accessibility Research: Limited Motor & Mobility
## Directory Template Optimization Guide

**Document Version**: 1.0
**Date**: 2025-11-17
**Target**: Public-facing directory templates (location-agnostic & interactive map)
**Standards**: WCAG 2.2 (Level AA minimum, AAA aspirational)

---

## Executive Summary

This research document provides comprehensive WCAG 2.2 accessibility guidelines for people with motor impairments, mobility limitations, and physical disabilities. The goal is to enable navigation by single button click (single-switch access), ensure logical tab order, and make our directory easier to use than search engines for users with motor disabilities.

### Key Findings

1. **Keyboard accessibility is foundational** - All adaptive tech depends on it
2. **44x44px minimum click targets** (WCAG AAA) - 24x24px minimum (WCAG AA 2.2)
3. **Single-switch access is most demanding** - If it works, everything works
4. **Tab order must be logical** - Follows visual order (left-to-right, top-to-bottom)
5. **Focus indicators must be visible** - 3:1 contrast ratio minimum
6. **Voice control requires visible labels** - Label text must match accessible name

---

## Motor Disability Categories

### Limited Dexterity
**Description**: Difficulty with precise movements

**Challenges**:
- Small click targets hard to activate
- Drag-and-drop interactions difficult
- Precise mouse movements challenging
- Double-click operations problematic
- Fine motor control required for sliders

**Needs**:
- Large click targets (44x44px minimum)
- Adequate spacing between interactive elements (8-16px)
- Alternative to drag-and-drop
- Alternative to hover-only interactions
- Simple click interactions preferred
- Clear visual feedback for activations

### Tremors or Spasms
**Description**: Involuntary movements affecting control

**Challenges**:
- Accidental clicks common
- Hovering over targets difficult
- Holding modifier keys problematic
- Precise positioning impossible
- Time-sensitive interactions fail

**Needs**:
- Undo functionality for actions
- Confirmation for destructive actions
- Large click targets with spacing
- No hover-only content
- No time limits (or adjustable)
- Sticky keys support (OS-level)

### Limited Mobility
**Description**: Limited range of motion or paralysis

**Challenges**:
- Cannot use standard mouse
- May use mouth stick or head pointer
- May use single-switch device
- May use eye-tracking technology
- May use voice control

**Needs**:
- Full keyboard accessibility
- Single-switch access patterns
- Voice control compatibility
- No mouse-only interactions
- Logical tab order
- Skip navigation links

### Paralysis
**Variations**:
- Quadriplegia (all four limbs)
- Paraplegia (lower body)
- Hemiplegia (one side of body)

**Needs**:
- Keyboard-only navigation
- Voice control support (Dragon)
- Eye-tracking support
- Switch access support
- Sip-and-puff device support
- Simple, predictable interactions

### Repetitive Stress Injury (RSI)
**Description**: Pain from repetitive motions

**Challenges**:
- Extended mouse use painful
- Many clicks cause discomfort
- Scrolling can be painful
- Typing may be limited

**Needs**:
- Keyboard shortcuts
- Minimal clicks to complete tasks
- Efficient navigation
- Auto-complete and suggestions
- Pagination over infinite scroll

---

## WCAG Requirements (Motor Focus)

### Level A (Critical)

#### 2.1.1 Keyboard
**All functionality must be available via keyboard**

**Requirements**:
- Tab/Shift+Tab to navigate interactive elements
- Enter to activate buttons and links
- Space to activate buttons and checkboxes
- Arrow keys for menus, tabs, radio groups
- Escape to close dialogs/menus
- No mouse-only functionality

**Example**:
```html
<!-- Good - keyboard accessible -->
<button onclick="doAction()">Submit</button>

<!-- Bad - mouse-only -->
<div onmouseover="showMenu()">Hover for menu</div>
```

#### 2.1.2 No Keyboard Trap
**Users must be able to escape from all components**

**Requirements**:
- Can always Tab/Shift+Tab away from element
- If special key combo required, inform user
- No infinite focus loops
- Modal dialogs must be escapable (Escape key)

**Example**:
```javascript
// Good - can escape modal with Escape key
dialog.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDialog();
    returnFocusToTrigger();
  }
});
```

#### 2.4.3 Focus Order
**Focus order must be logical and intuitive**

**Requirements**:
- Tab order follows visual order (left-to-right, top-to-bottom)
- Related elements are grouped logically
- No unexpected focus jumps
- Custom tab order only when visual order is insufficient

**Example**:
```html
<!-- Good - natural order -->
<form>
  <label for="name">Name</label>
  <input id="name" type="text">

  <label for="email">Email</label>
  <input id="email" type="email">

  <button type="submit">Submit</button>
</form>

<!-- Bad - using tabindex to force unnatural order -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
```

### Level AA (Required)

#### 2.4.7 Focus Visible
**Focus indicator must be clearly visible**

**Requirements**:
- 3:1 contrast ratio with adjacent colors
- Visible on all interactive elements
- Sufficient size/thickness (2px minimum)
- Never remove :focus without replacement

**Example**:
```css
/* Good - visible focus indicator */
a:focus,
button:focus,
input:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Alternative - custom indicator */
button:focus {
  outline: none; /* Only if replacing with better indicator */
  box-shadow: 0 0 0 3px rgba(0, 95, 204, 0.5);
  border-color: #005fcc;
}

/* Bad - removes focus indicator */
*:focus {
  outline: none;
}
```

#### 2.5.1 Pointer Gestures
**Alternatives to complex gestures must be provided**

**Requirements**:
- No multi-touch gestures without alternative
- No swipe gestures without alternative
- No drag-and-drop without alternative
- Simple taps/clicks preferred

**Example**:
```html
<!-- Good - buttons for actions -->
<button>Previous</button>
<button>Next</button>

<!-- Bad - swipe-only carousel -->
<div class="carousel" onswipe="navigate()">
  <!-- No button alternative -->
</div>
```

#### 2.5.2 Pointer Cancellation
**Users can abort or undo pointer activations**

**Requirements**:
- Activation occurs on up-event (mouseup/touchend), not down-event
- Can abort by moving pointer away before release
- Confirmation for destructive actions
- Undo functionality when appropriate

**Example**:
```javascript
// Good - activate on mouseup
button.addEventListener('mouseup', handleClick);
button.addEventListener('touchend', handleClick);

// Bad - activate on mousedown (accidental activation)
button.addEventListener('mousedown', handleClick);
```

#### 2.5.3 Label in Name
**Visible label text must match accessible name**

**Critical for voice control users!**

**Requirements**:
- Button text = aria-label (if used)
- Link text = aria-label (if used)
- Visual label should be included in accessible name

**Example**:
```html
<!-- Good - label matches -->
<button>Submit Form</button>
<button aria-label="Submit Form">Submit</button>

<!-- Bad - label doesn't match -->
<button aria-label="Send">Submit</button>
<!-- Voice control user says "Click Submit" - won't work -->
```

### Level AAA (Aspirational)

#### 2.5.5 Target Size
**Minimum target size: 44x44 CSS pixels**

**Exceptions**:
- Inline links in text
- User agent controlled (default controls)
- Essential presentation (e.g., maps)

**Best Practices**:
```css
/* Minimum sizes */
button,
a.button,
input[type="submit"] {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

/* Adequate spacing */
.button-group button {
  margin: 8px;
}

/* Touch-friendly on mobile */
@media (max-width: 768px) {
  button {
    min-height: 48px;
    min-width: 48px;
  }
}
```

#### 2.5.8 Target Size (Minimum)
**WCAG 2.2 Level AA: 24x24 CSS pixels**

**Implementation**:
```css
/* AA compliant */
button,
a {
  min-height: 24px;
  min-width: 24px;
}

/* AAA compliant (recommended) */
button,
a {
  min-height: 44px;
  min-width: 44px;
}
```

---

## Keyboard Navigation Best Practices

### Fundamental Requirements

#### Tab Navigation
```javascript
// Tab order rules:
// 1. Tab moves forward through interactive elements
// 2. Shift+Tab moves backward
// 3. Order follows visual layout (left→right, top→bottom)
// 4. Only interactive elements in tab order
// 5. No keyboard traps

// Example: Skip link (first focusable element)
<a href="#main-content" class="skip-link">Skip to main content</a>
```

#### Arrow Key Navigation
```javascript
// For composite widgets (menus, tabs, radio groups)
const menuItems = document.querySelectorAll('[role="menuitem"]');
let currentIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    currentIndex = (currentIndex + 1) % menuItems.length;
    menuItems[currentIndex].focus();
  } else if (e.key === 'ArrowUp') {
    currentIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[currentIndex].focus();
  } else if (e.key === 'Home') {
    currentIndex = 0;
    menuItems[0].focus();
  } else if (e.key === 'End') {
    currentIndex = menuItems.length - 1;
    menuItems[currentIndex].focus();
  }
});
```

#### Activation Keys
```javascript
// Standard activation keys:
// - Enter: Buttons, links
// - Space: Buttons, checkboxes
// - Escape: Close dialogs/menus

button.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
});
```

### Skip Links

```html
<!-- Skip link (hidden until focused) -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<a href="#search" class="skip-link">
  Skip to search
</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
</style>
```

### Focus Management

```javascript
// Opening modal - move focus to modal
function openModal() {
  const modal = document.getElementById('modal');
  const previouslyFocused = document.activeElement;

  modal.style.display = 'block';
  modal.querySelector('button').focus();

  // Store reference to return focus
  modal.dataset.previouslyFocused = previouslyFocused;
}

// Closing modal - return focus to trigger
function closeModal() {
  const modal = document.getElementById('modal');
  const previouslyFocused = modal.dataset.previouslyFocused;

  modal.style.display = 'none';

  if (previouslyFocused) {
    previouslyFocused.focus();
  }
}

// Deleting item - move focus to next item
function deleteItem(itemId) {
  const item = document.getElementById(itemId);
  const nextItem = item.nextElementSibling || item.previousElementSibling;

  item.remove();

  if (nextItem) {
    nextItem.querySelector('button').focus();
  }
}
```

---

## Single-Switch Access

### What is Single-Switch Access?

**Description**: Users with severe motor impairments interact with computers using one or two switches. The interface automatically scans through interactive elements, and the user activates their switch when the desired element is highlighted.

**Switch Device Types**:
- Button switches (hand, foot, head)
- Sip-and-puff switches (breath control)
- Eye-blink switches
- Sound-activated switches
- Squeeze switches
- Proximity switches

### How Switch Scanning Works

**Automatic Scanning**:
1. Interface highlights elements sequentially
2. User activates switch when desired element highlighted
3. Scanning speed is adjustable (slower for beginners)

**Two-Switch Mode**:
- Switch 1: Advance to next element
- Switch 2: Select current element

**One-Switch Mode**:
- Auto-advances through elements
- User activates switch to select

**Scan Patterns**:
- **Linear**: Scan each element in order
- **Row-column**: Scan rows first, then columns
- **Grouped**: Scan groups, then items within group

### Requirements for Switch Compatibility

**Critical**: If keyboard navigation works perfectly, switch access will work!

1. ✅ Standard keyboard navigation must work flawlessly
2. ✅ Logical, consistent tab order
3. ✅ All interactive elements keyboard-accessible
4. ✅ No keyboard traps
5. ✅ Clear focus indicators (3:1 contrast)
6. ✅ Simple, predictable interactions
7. ✅ Undo functionality where appropriate
8. ✅ No time limits (or adjustable)
9. ✅ Large click targets (44x44px)

**Implementation**: No special code needed! Just perfect keyboard accessibility.

---

## Voice Control Compatibility

### Voice Control Systems

**Popular Options**:
- **Dragon NaturallySpeaking** (Windows) - Professional standard
- **Voice Control** (iOS/macOS) - Built-in Apple
- **Voice Access** (Android) - Built-in Android
- **Windows Speech Recognition** - Built-in Windows
- **Browser voice commands** - Chrome, Edge

### How Voice Control Works

**Commands**:
- "Click [button name]" - Activate buttons
- "Click [link text]" - Follow links
- "Show numbers" - Display number labels on all clickable elements
- "Show grid" - Display grid for precise positioning
- "Scroll down/up" - Navigate page

**Example**: User says "Click Submit Form" → Voice control looks for visible text "Submit Form" → Clicks that button

### Requirements for Voice Compatibility

#### 2.5.3 Label in Name (Critical!)

**Rule**: Visible label text MUST match accessible name

```html
<!-- Good - visible text matches accessible name -->
<button>Submit Form</button>
<button aria-label="Submit Form">Submit</button>

<!-- Bad - mismatch prevents voice control -->
<button aria-label="Send form">Submit</button>
<!-- User says "Click Submit" - won't work! -->

<!-- Good - aria-label includes visible text -->
<button aria-label="Submit form for review">Submit</button>
<!-- User can say "Click Submit" - works! -->
```

#### Clear, Unique Button and Link Text

```html
<!-- Good - descriptive, unique text -->
<a href="/listing/main-street-cafe">View Main Street Cafe</a>
<a href="/listing/corner-coffee">View Corner Coffee</a>
<button>Filter by Location</button>
<button>Apply Filters</button>

<!-- Bad - ambiguous text -->
<a href="/listing/1">Details</a>
<a href="/listing/2">Details</a>
<button>Submit</button>
<button>Submit</button>
<!-- User says "Click Details" - which one? -->
```

#### Use Buttons for Actions, Links for Navigation

```html
<!-- Good - semantic HTML -->
<button onclick="openModal()">Open Filter Menu</button>
<a href="/listings">View All Listings</a>

<!-- Bad - div as button -->
<div onclick="openModal()">Open Filter Menu</div>
<!-- Voice control may not recognize as clickable -->
```

---

## Click Target Sizing

### WCAG Guidelines

**Level AAA (Recommended)**:
- Minimum target size: **44x44 CSS pixels**
- Exceptions: Inline links, default controls, essential presentation

**Level AA (WCAG 2.2)**:
- Minimum target size: **24x24 CSS pixels**
- Same exceptions

**Best Practices**:
- Buttons: 44x44px minimum, 48x48px better
- Touch targets on mobile: 48x48px minimum
- Links in text: Adequate line height (1.5+)
- Icons: 24x24px minimum visible area
- Form controls: 44px height minimum

### Implementation Examples

```css
/* Base button styles */
button,
.button,
a.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
  /* Ensures content doesn't make button too small */
}

/* Icon buttons */
.icon-button {
  width: 44px;
  height: 44px;
  padding: 10px;
}

/* Links in paragraphs */
p {
  line-height: 1.6; /* Adequate spacing */
}

p a {
  /* Increase click area with padding */
  padding: 4px 2px;
  margin: -4px -2px;
}

/* Form inputs */
input[type="text"],
input[type="email"],
input[type="tel"],
select,
textarea {
  min-height: 44px;
  padding: 12px;
  font-size: 16px; /* Prevents zoom on iOS */
}

/* Checkbox/radio labels */
label {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px;
  cursor: pointer;
}

input[type="checkbox"],
input[type="radio"] {
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

/* Adequate spacing between targets */
.button-group button {
  margin: 8px;
}

/* Mobile optimization */
@media (max-width: 768px) {
  button,
  .button {
    min-height: 48px;
    min-width: 48px;
    padding: 14px 28px;
  }

  /* Ensure spacing on mobile */
  .button-group button {
    margin: 12px;
  }
}
```

### Making Entire Cards Clickable

```html
<!-- Good - entire card is clickable -->
<article class="listing-card">
  <a href="/listing/main-street-cafe" class="card-link">
    <h3>Main Street Cafe</h3>
    <p>123 Main St, Springfield, IL</p>
    <p>★★★★½ (127 reviews)</p>
  </a>
</article>

<style>
.listing-card {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

/* Entire card is clickable area */
.card-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.listing-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.card-link:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
</style>
```

---

## Directory-Specific Recommendations

### Listing Cards

```html
<article class="listing-card">
  <!-- One tab stop per card -->
  <a href="/listing/main-street-cafe" class="card-link"
     aria-label="Main Street Cafe, 123 Main St, Springfield IL. Rating 4.5 stars. View details.">
    <h3>Main Street Cafe</h3>
    <p class="address">123 Main St, Springfield, IL 62701</p>
    <p class="rating" aria-hidden="true">★★★★½ (127 reviews)</p>
    <p class="hours">Monday-Friday, 8am-6pm</p>
  </a>

  <!-- Secondary actions (separate tab stops) -->
  <div class="card-actions">
    <a href="tel:+15551234567"
       aria-label="Call Main Street Cafe">
      📞 Call
    </a>
    <button onclick="saveToFavorites()"
            aria-label="Save Main Street Cafe to favorites">
      ⭐ Save
    </button>
  </div>
</article>

<style>
.listing-card {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  padding: 8px;
  margin: -8px;
  border-radius: 4px;
}

.card-link:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}

.card-actions a,
.card-actions button {
  min-height: 44px;
  padding: 10px 16px;
}
</style>
```

### Filters and Search

```html
<form role="search" class="filters" aria-label="Filter businesses">
  <h2>Filter Options</h2>

  <!-- Keyboard accessible dropdown -->
  <label for="category-filter">Category</label>
  <select id="category-filter" name="category">
    <option value="">All categories</option>
    <option value="coffee">Coffee Shops</option>
    <option value="restaurants">Restaurants</option>
  </select>

  <!-- Keyboard accessible checkboxes -->
  <fieldset>
    <legend>Hours</legend>
    <label>
      <input type="checkbox" name="hours" value="open-now">
      Open now
    </label>
    <label>
      <input type="checkbox" name="hours" value="24-hours">
      Open 24 hours
    </label>
  </fieldset>

  <!-- Large, accessible buttons -->
  <div class="filter-actions">
    <button type="submit" class="button primary">
      Apply Filters
    </button>
    <button type="reset" class="button secondary">
      Clear Filters
    </button>
  </div>
</form>

<style>
.filters label {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px;
}

.filters select {
  min-height: 44px;
  padding: 10px;
  font-size: 16px;
}

.filter-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.filter-actions button {
  min-height: 44px;
  min-width: 120px;
  padding: 12px 24px;
}
</style>
```

### Map Template

```html
<div class="map-container">
  <!-- Skip link for keyboard users -->
  <a href="#listings-list" class="skip-link">
    Skip map, view list of businesses
  </a>

  <!-- View toggle (large targets) -->
  <div class="view-toggle" role="group" aria-label="View options">
    <button type="button"
            aria-pressed="true"
            onclick="showMap()">
      Map View
    </button>
    <button type="button"
            aria-pressed="false"
            onclick="showList()">
      List View
    </button>
  </div>

  <!-- Map with keyboard controls -->
  <div id="map" role="application" aria-label="Interactive map">
    <!-- Map loads here -->
  </div>

  <!-- Keyboard instructions -->
  <div class="map-instructions" id="map-help">
    <p><strong>Keyboard controls:</strong></p>
    <ul>
      <li>Arrow keys: Pan map</li>
      <li>+ / -: Zoom in/out</li>
      <li>Tab: Navigate markers</li>
      <li>Enter/Space: Select marker</li>
    </ul>
  </div>
</div>

<style>
.view-toggle button {
  min-height: 44px;
  min-width: 120px;
  padding: 12px 24px;
  margin: 4px;
}

.map-instructions {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-top: 16px;
}
</style>

<script>
// Make map keyboard accessible
function initMap() {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 39.7817, lng: -89.6501 },
    zoom: 12
  });

  // Keyboard controls for zoom
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('#map')) {
      if (e.key === '+' || e.key === '=') {
        map.setZoom(map.getZoom() + 1);
      } else if (e.key === '-') {
        map.setZoom(map.getZoom() - 1);
      }
    }
  });

  // Make markers keyboard accessible
  markers.forEach((marker, index) => {
    const markerElement = marker.getElement();
    markerElement.setAttribute('role', 'button');
    markerElement.setAttribute('tabindex', '0');
    markerElement.setAttribute('aria-label',
      `${marker.title}. ${marker.address}. Press Enter to view details.`
    );

    markerElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showMarkerDetails(marker);
      }
    });
  });
}
</script>
```

### Pagination

```html
<nav aria-label="Pagination" class="pagination">
  <ul>
    <li>
      <a href="?page=1"
         aria-label="Go to previous page"
         class="pagination-link">
        « Previous
      </a>
    </li>
    <li>
      <a href="?page=1" aria-label="Go to page 1" class="pagination-link">
        1
      </a>
    </li>
    <li>
      <a href="?page=2"
         aria-current="page"
         aria-label="Current page, page 2"
         class="pagination-link current">
        2
      </a>
    </li>
    <li>
      <a href="?page=3" aria-label="Go to page 3" class="pagination-link">
        3
      </a>
    </li>
    <li>
      <a href="?page=3"
         aria-label="Go to next page"
         class="pagination-link">
        Next »
      </a>
    </li>
  </ul>
</nav>

<style>
.pagination ul {
  display: flex;
  list-style: none;
  gap: 8px;
  padding: 0;
}

.pagination-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 10px 16px;
  text-decoration: none;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pagination-link:hover {
  background: #f5f5f5;
}

.pagination-link:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

.pagination-link.current {
  background: #005fcc;
  color: #fff;
  border-color: #005fcc;
}
</style>
```

---

## Testing Methodology

### Keyboard-Only Testing

**Process**:
1. Disconnect mouse (or don't touch it)
2. Use only keyboard to navigate entire site
3. Document all issues

**Checklist**:
- [ ] Can reach all interactive elements with Tab
- [ ] Tab order is logical
- [ ] Can activate all buttons/links (Enter/Space)
- [ ] Can use all form controls
- [ ] Can close all modals/dialogs (Escape)
- [ ] No keyboard traps
- [ ] Focus indicators are visible
- [ ] Can skip repetitive navigation
- [ ] Can use search functionality
- [ ] Can submit forms
- [ ] Can paginate through results

### Focus Indicator Testing

```javascript
// Test script to verify all interactive elements have focus indicators
document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
  el.addEventListener('focus', () => {
    const styles = window.getComputedStyle(el);
    const outline = styles.outline;
    const boxShadow = styles.boxShadow;
    const border = styles.border;

    if (outline === 'none' && boxShadow === 'none' && !border.includes('2px')) {
      console.warn('Missing focus indicator:', el);
    }
  });
});
```

### Click Target Testing

```javascript
// Test script to verify minimum target sizes
document.querySelectorAll('a, button').forEach(el => {
  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  if (width < 44 || height < 44) {
    console.warn(`Target too small (${width}x${height}):`, el);
  }
});
```

---

## Common Mistakes to Avoid

1. ❌ **Removing focus indicators** without replacement
2. ❌ **Mouse-only interactions** (hover menus, drag-drop only)
3. ❌ **Small click targets** (< 44x44px)
4. ❌ **Illogical tab order** (doesn't follow visual order)
5. ❌ **Keyboard traps** (can't escape with keyboard)
6. ❌ **Time limits** without ability to extend
7. ❌ **Label/name mismatch** (breaks voice control)
8. ❌ **Generic button text** ("Submit", "OK", "Yes")
9. ❌ **Insufficient spacing** between targets
10. ❌ **No skip links** on pages with repetitive navigation

---

## Success Criteria

- [ ] All functionality works with keyboard only
- [ ] Tab order is logical and intuitive
- [ ] Focus indicators are visible (3:1 contrast)
- [ ] All click targets are 44x44px minimum
- [ ] No keyboard traps exist
- [ ] Skip links are provided
- [ ] Voice control works (label matches name)
- [ ] Adequate spacing between targets (8px+)
- [ ] Forms are fully keyboard accessible
- [ ] Modals/dialogs are keyboard accessible

---

## Resources

### Official Documentation
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Accessibility](https://webaim.org/articles/keyboard/)

### Testing Tools
- **Keyboard testing**: Just use keyboard!
- **Focus indicator testing**: Browser DevTools
- **Click target testing**: Browser DevTools (inspect element sizes)

### Learning Resources
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project](https://www.a11yproject.com/)
- [Deque University](https://dequeuniversity.com/)

---

## Conclusion

Implementing these motor/mobility accessibility best practices will make your directory usable by millions of people with physical disabilities. Focus on:

1. **Perfect keyboard navigation** (foundation for everything)
2. **Large click targets** (44x44px minimum)
3. **Visible focus indicators** (3:1 contrast)
4. **Logical tab order** (follows visual order)
5. **Voice control compatibility** (visible labels match accessible names)

**Remember**: Keyboard accessibility is the foundation. If keyboard navigation works perfectly, single-switch access and voice control will work too!

Since these improvements apply to 2 templates used across thousands of pages, the impact will be enormous.

---

**Next Steps**:
1. Test entire site with keyboard only
2. Measure and fix all click target sizes
3. Verify focus indicators are visible
4. Test with voice control (if available)
5. Fix any keyboard traps
6. Document keyboard shortcuts for users
