# WCAG Accessibility Research: Low Vision & Screen Reader Users
## Directory Template Optimization Guide

**Document Version**: 1.0
**Date**: 2025-11-17
**Target**: Public-facing directory templates (location-agnostic & interactive map)
**Standards**: WCAG 2.2 (Level AA minimum, AAA aspirational)

---

## Executive Summary

This research document provides comprehensive WCAG 2.2 accessibility guidelines specifically for people with low vision, color blindness, and blindness. The goal is to exceed expectations and fill a niche for users with visual disabilities, making our directory pages easier to navigate than search engines.

### Key Findings

1. **WCAG 2.2 is the current standard** - Published October 23, 2023
2. **Level AA is the legal minimum** - But AAA should be targeted where feasible
3. **4.5:1 contrast ratio minimum** for normal text (AA), 7:1 ideal (AAA)
4. **Screen readers require semantic HTML** - Proper structure is critical
5. **Focus indicators must be visible** - 3:1 contrast ratio minimum
6. **Perfect accessibility on 2 templates** = Perfect on thousands of pages

---

## Visual Disabilities Overview

### Low Vision
**Description**: Reduced visual acuity but retains some useful vision

**Needs**:
- Text magnification / zoom support (up to 200%)
- High contrast modes
- Adjustable font sizes
- Proper color contrast ratios (4.5:1 minimum)
- Large click targets (44x44px minimum)
- Clear visual focus indicators
- No information conveyed by color alone
- Readable fonts without anti-aliasing issues
- Adequate spacing between interactive elements

**Statistics**: ~285 million people worldwide have visual impairments

### Color Blindness
**Types**:
- **Deuteranopia** (red-green) - Most common
- **Protanopia** (red-green)
- **Tritanopia** (blue-yellow)
- **Achromatopsia** (complete color blindness) - Rare

**Needs**:
- Information not conveyed by color alone
- Patterns or textures in addition to colors
- High contrast between foreground and background
- Clear text labels for colored elements
- Icon usage with text alternatives

**Statistics**: ~8% of men, ~0.5% of women have color blindness

### Blindness
**Description**: Complete or near-complete loss of vision

**Needs**:
- Full screen reader compatibility
- Comprehensive alt text for images
- Semantic HTML structure
- Proper heading hierarchy (h1-h6, no skipping)
- Keyboard-only navigation
- ARIA landmarks and labels
- Skip navigation links
- Descriptive link text (not "click here")
- Form label associations
- Live region announcements for dynamic content

**Statistics**: ~39 million people worldwide are blind

---

## WCAG 2.2 Requirements

### Level A (Critical - Must Have)

#### 1.1.1 Non-text Content
- **All images must have alt text**
- Decorative images: `alt=""`
- Informative images: Describe purpose and content
- Example: `<img src="cafe.jpg" alt="Exterior of Main Street Cafe with outdoor seating">`

#### 1.3.1 Info and Relationships
- **Use semantic HTML** (nav, main, article, aside, footer)
- Proper heading hierarchy
- Use lists for list content (ul, ol, li)
- Associate labels with form inputs
- Example:
  ```html
  <label for="search">Search businesses</label>
  <input type="text" id="search" name="search">
  ```

#### 1.4.1 Use of Color
- **Color must not be the only means** of conveying information
- Add icons, patterns, or text labels alongside color
- Example: Instead of red/green status, use "✓ Open" / "✗ Closed"

#### 2.1.1 Keyboard Navigation
- **All functionality must work via keyboard**
- Tab key navigates forward
- Shift+Tab navigates backward
- Enter activates buttons/links
- Space activates buttons/checkboxes
- Example: No hover-only dropdowns

#### 2.4.1 Bypass Blocks
- **Provide skip links** to bypass repetitive content
- Example:
  ```html
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ```

#### 2.4.2 Page Titled
- **Every page must have a descriptive title**
- Example: `<title>Coffee Shops in Springfield, IL | Your Directory</title>`

### Level AA (Required for Compliance)

#### 1.4.3 Contrast (Minimum)
- **4.5:1 for normal text** (under 18pt or 14pt bold)
- **3:1 for large text** (18pt+ or 14pt+ bold)
- **3:1 for UI components** (buttons, form borders, focus indicators)

**Testing**: Use WebAIM Contrast Checker or browser DevTools

**Examples**:
```css
/* Good - 4.82:1 ratio */
color: #333333;
background: #ffffff;

/* Good - 7.23:1 ratio */
color: #000000;
background: #ffffff;

/* Bad - 2.5:1 ratio */
color: #767676;
background: #ffffff;
```

#### 1.4.4 Resize Text
- **Content must work at 200% zoom** without horizontal scrolling
- Use relative units (rem, em) not pixels
- Don't use fixed-height containers that clip text
- Example:
  ```css
  /* Good */
  font-size: 1rem;
  padding: 1em;

  /* Bad */
  font-size: 14px;
  height: 300px;
  ```

#### 1.4.5 Images of Text
- **Use real text, not images of text** (unless essential)
- Logos are exempt
- Example: Use CSS for styled headings, not PNG images

#### 2.4.5 Multiple Ways
- **Provide multiple navigation methods**
- Search functionality
- Sitemap
- Breadcrumbs
- Category navigation

#### 2.4.6 Headings and Labels
- **Headings and labels must be descriptive**
- Bad: "More", "Details", "Click here"
- Good: "View Coffee Shop Details", "Filter by Location"

#### 2.4.7 Focus Visible
- **Focus indicator must be visible**
- 3:1 contrast ratio with adjacent colors
- Never remove :focus without replacement
- Example:
  ```css
  a:focus,
  button:focus {
    outline: 2px solid #005fcc;
    outline-offset: 2px;
  }
  ```

### Level AAA (Aspirational)

#### 1.4.6 Contrast (Enhanced)
- **7:1 for normal text**
- **4.5:1 for large text**

#### 1.4.8 Visual Presentation
- User can customize:
  - Foreground and background colors
  - Line spacing (1.5x minimum)
  - Paragraph spacing (2x minimum)
  - Letter spacing (0.12x minimum)
  - Word spacing (0.16x minimum)

---

## Screen Reader Optimization

### Popular Screen Readers (2025)

1. **JAWS** (Windows) - Most popular paid (~$1,000)
2. **NVDA** (Windows) - Most popular free
3. **VoiceOver** (macOS, iOS) - Built-in Apple
4. **TalkBack** (Android) - Built-in Android
5. **Narrator** (Windows) - Built-in Windows

### Screen Reader Best Practices

#### Semantic HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Coffee Shops in Springfield, IL</title>
</head>
<body>
  <!-- Skip link (hidden until focused) -->
  <a href="#main" class="skip-link">Skip to main content</a>

  <!-- Header with navigation -->
  <header role="banner">
    <nav role="navigation" aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/categories">Categories</a></li>
        <li><a href="/locations">Locations</a></li>
      </ul>
    </nav>
  </header>

  <!-- Main content -->
  <main id="main" role="main">
    <nav aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/category/coffee-shops">Coffee Shops</a></li>
        <li aria-current="page">Springfield, IL</li>
      </ol>
    </nav>

    <h1>Coffee Shops in Springfield, IL</h1>

    <!-- Each listing as an article -->
    <article>
      <h2>
        <a href="/listing/main-street-cafe">Main Street Cafe</a>
      </h2>
      <p>123 Main St, Springfield, IL 62701</p>
      <p><a href="tel:+15551234567">Call (555) 123-4567</a></p>
      <p>Open Monday-Friday, 8am-6pm</p>
    </article>

    <!-- More listings -->
  </main>

  <!-- Sidebar (if applicable) -->
  <aside role="complementary" aria-label="Filter options">
    <h2>Filter Results</h2>
    <!-- Filters -->
  </aside>

  <!-- Footer -->
  <footer role="contentinfo">
    <p>&copy; 2025 Your Directory. All rights reserved.</p>
  </footer>
</body>
</html>
```

#### Heading Hierarchy

**Rules**:
- One h1 per page (page title)
- Don't skip levels (h1 → h2 → h3, not h1 → h3)
- Headings describe section content
- Screen readers can navigate by headings (H key in NVDA/JAWS)

**Example Structure**:
```html
<h1>Coffee Shops in Springfield, IL</h1>       <!-- Page title -->
  <h2>Featured Listings</h2>                   <!-- Section -->
    <h3>Main Street Cafe</h3>                  <!-- Individual listing -->
    <h3>Corner Coffee</h3>                     <!-- Individual listing -->
  <h2>All Listings (A-Z)</h2>                  <!-- Section -->
    <h3>Artisan Roasters</h3>                  <!-- Individual listing -->
    <h3>Bean Town Coffee</h3>                  <!-- Individual listing -->
```

#### ARIA Landmarks

**Purpose**: Help screen reader users navigate page structure

```html
<!-- Navigation -->
<nav role="navigation" aria-label="Main navigation">
  <!-- Links -->
</nav>

<!-- Search -->
<form role="search" aria-label="Search businesses">
  <label for="q">Search</label>
  <input type="search" id="q" name="q">
  <button type="submit">Search</button>
</form>

<!-- Main content -->
<main role="main">
  <!-- Primary content -->
</main>

<!-- Sidebar -->
<aside role="complementary" aria-label="Related businesses">
  <!-- Supplementary content -->
</aside>

<!-- Footer -->
<footer role="contentinfo">
  <!-- Footer content -->
</footer>
```

#### Descriptive Link Text

**Bad Examples**:
- "Click here"
- "Read more"
- "Learn more"
- "Details"

**Good Examples**:
- "View Main Street Cafe details"
- "Read reviews for Corner Coffee"
- "Learn more about Artisan Roasters"
- "View all coffee shops in Springfield"

#### Alt Text Guidelines

**Principles**:
- Describe purpose and content
- Be concise but complete (under 125 characters ideal)
- Don't start with "image of" or "picture of"
- Use `alt=""` for decorative images
- Provide longer descriptions for complex images (using `aria-describedby`)

**Examples**:
```html
<!-- Business photo -->
<img src="cafe-exterior.jpg"
     alt="Main Street Cafe storefront with red awning and outdoor seating">

<!-- Logo -->
<img src="logo.png" alt="Main Street Cafe logo">

<!-- Decorative border -->
<img src="decorative-line.png" alt="" role="presentation">

<!-- Map marker -->
<img src="marker.png" alt="Location marker for 123 Main St">

<!-- Rating stars -->
<div role="img" aria-label="4.5 out of 5 stars based on 127 reviews">
  <img src="star-full.png" alt="">
  <img src="star-full.png" alt="">
  <img src="star-full.png" alt="">
  <img src="star-full.png" alt="">
  <img src="star-half.png" alt="">
</div>
```

#### Form Accessibility

```html
<!-- Proper label association -->
<label for="business-name">Business name</label>
<input type="text" id="business-name" name="businessName" required
       aria-required="true">

<!-- Error handling -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" required
       aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">
  Please enter a valid email address
</span>

<!-- Fieldset for related inputs -->
<fieldset>
  <legend>Business hours</legend>
  <label for="open-time">Opening time</label>
  <input type="time" id="open-time" name="openTime">

  <label for="close-time">Closing time</label>
  <input type="time" id="close-time" name="closeTime">
</fieldset>
```

#### Live Regions for Dynamic Content

```html
<!-- Status messages -->
<div role="status" aria-live="polite">
  <!-- Announce non-critical updates -->
  5 results found
</div>

<div role="alert" aria-live="assertive">
  <!-- Announce critical updates immediately -->
  Error: Unable to load results
</div>

<!-- Loading states -->
<div role="status" aria-live="polite" aria-busy="true">
  Loading results...
</div>
```

---

## Color Contrast Implementation

### Checking Contrast Ratios

**Tools**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools: Inspect element → Color picker shows contrast ratio
- Axe DevTools browser extension
- WAVE browser extension

### Common Color Combinations

**Good (AA Compliant - 4.5:1+)**:
```css
/* Black on white - 21:1 */
color: #000000;
background: #ffffff;

/* Dark gray on white - 12.6:1 */
color: #333333;
background: #ffffff;

/* Dark blue on white - 8.6:1 */
color: #005a9c;
background: #ffffff;

/* White on dark blue - 10.4:1 */
color: #ffffff;
background: #003366;
```

**Bad (Fails AA)**:
```css
/* Light gray on white - 2.3:1 */
color: #999999;
background: #ffffff;

/* Medium gray on white - 3.9:1 */
color: #777777;
background: #ffffff;

/* Yellow on white - 1.1:1 */
color: #ffff00;
background: #ffffff;
```

### Accessible Color Palettes

**Example Directory Color Scheme (AA Compliant)**:
```css
:root {
  /* Text colors */
  --text-primary: #1a1a1a;      /* 17:1 on white */
  --text-secondary: #4a4a4a;    /* 9:1 on white */
  --text-muted: #6a6a6a;        /* 5.7:1 on white */

  /* Background colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-accent: #e8f4f8;

  /* Brand colors */
  --brand-primary: #0066cc;     /* 7:1 on white */
  --brand-secondary: #004499;   /* 10.7:1 on white */

  /* Status colors */
  --success: #006600;           /* 7.7:1 on white */
  --warning: #b35900;           /* 5.4:1 on white */
  --error: #cc0000;             /* 5.9:1 on white */

  /* Interactive states */
  --link-color: #0066cc;
  --link-visited: #551a8b;      /* 8.4:1 on white */
  --link-hover: #003d7a;        /* 12:1 on white */
  --focus-indicator: #005fcc;
}
```

---

## Directory-Specific Recommendations

### Listing Cards

```html
<article class="listing-card">
  <h3>
    <a href="/listing/main-street-cafe">Main Street Cafe</a>
  </h3>

  <!-- Address with semantic markup -->
  <address>
    123 Main St<br>
    Springfield, IL 62701
  </address>

  <!-- Phone as clickable link -->
  <p>
    <a href="tel:+15551234567">
      <span aria-label="Phone">(555) 123-4567</span>
    </a>
  </p>

  <!-- Hours -->
  <p>
    <strong>Hours:</strong>
    Monday-Friday, 8am-6pm
  </p>

  <!-- Rating with accessible text -->
  <div role="img" aria-label="Rating: 4.5 out of 5 stars based on 127 reviews">
    ★★★★½
  </div>

  <!-- Categories as list -->
  <ul aria-label="Categories">
    <li><a href="/category/coffee">Coffee</a></li>
    <li><a href="/category/breakfast">Breakfast</a></li>
  </ul>

  <!-- Actions -->
  <div class="actions">
    <a href="/listing/main-street-cafe" class="button">
      View details
    </a>
  </div>
</article>
```

### Map Template Accessibility

**Challenge**: Interactive maps are inherently visual

**Solutions**:
1. **Provide text-based list alternative**
   ```html
   <div class="view-toggle">
     <button type="button" aria-pressed="false" id="map-view">
       Map View
     </button>
     <button type="button" aria-pressed="true" id="list-view">
       List View
     </button>
   </div>
   ```

2. **Skip link for map**
   ```html
   <a href="#listings-list" class="skip-link">
     Skip map, view list of businesses
   </a>
   ```

3. **Accessible map markers**
   ```javascript
   marker.setAttribute('role', 'button');
   marker.setAttribute('aria-label',
     `Main Street Cafe, 123 Main St, Springfield, IL. Click for details.`);
   marker.setAttribute('tabindex', '0');
   ```

4. **Keyboard controls for map**
   ```javascript
   // +/- keys for zoom
   // Arrow keys for pan
   // Enter/Space to activate marker
   ```

### Filters and Search

```html
<form role="search" aria-label="Filter businesses">
  <h2>Filter Options</h2>

  <!-- Category filter -->
  <fieldset>
    <legend>Category</legend>
    <label>
      <input type="checkbox" name="category" value="coffee">
      Coffee Shops
    </label>
    <label>
      <input type="checkbox" name="category" value="restaurants">
      Restaurants
    </label>
  </fieldset>

  <!-- Location filter -->
  <label for="location-filter">Location</label>
  <select id="location-filter" name="location">
    <option value="">All locations</option>
    <option value="springfield">Springfield, IL</option>
    <option value="chicago">Chicago, IL</option>
  </select>

  <!-- Apply button -->
  <button type="submit">Apply filters</button>

  <!-- Results announcement -->
  <div role="status" aria-live="polite" aria-atomic="true">
    <span id="results-count">50 businesses found</span>
  </div>
</form>
```

### Pagination

```html
<nav aria-label="Pagination" role="navigation">
  <ul class="pagination">
    <li>
      <a href="?page=1" aria-label="Go to previous page">
        « Previous
      </a>
    </li>
    <li>
      <a href="?page=1" aria-label="Go to page 1">1</a>
    </li>
    <li>
      <a href="?page=2" aria-current="page" aria-label="Current page, page 2">
        2
      </a>
    </li>
    <li>
      <a href="?page=3" aria-label="Go to page 3">3</a>
    </li>
    <li>
      <a href="?page=3" aria-label="Go to next page">
        Next »
      </a>
    </li>
  </ul>
  <p class="visually-hidden" aria-live="polite">
    Showing results 11-20 of 50
  </p>
</nav>
```

---

## Testing Methodology

### Manual Testing with Screen Readers

1. **NVDA (Windows - Free)**
   - Download: https://www.nvaccess.org/
   - Test keyboard navigation (Tab, Shift+Tab)
   - Test heading navigation (H key)
   - Test landmark navigation (D key for landmarks)
   - Test form interaction

2. **VoiceOver (Mac - Built-in)**
   - Activate: Cmd+F5
   - Navigate: Ctrl+Option+Arrow keys
   - Interact with elements: Ctrl+Option+Space
   - Test with Safari (best support)

3. **Keyboard-only Testing**
   - Disconnect mouse
   - Navigate entire site using only keyboard
   - Verify all interactive elements are reachable
   - Check focus indicators are visible
   - Test form submission

### Automated Testing Tools

1. **axe DevTools** (Browser Extension)
   - Install for Chrome/Firefox/Edge
   - Run automated scan
   - Fix all "Critical" and "Serious" issues
   - Review "Moderate" and "Minor" issues

2. **WAVE** (Browser Extension)
   - Visual representation of accessibility issues
   - Color contrast analysis
   - ARIA validation
   - Structural analysis

3. **Lighthouse** (Chrome DevTools)
   - Built into Chrome
   - Run accessibility audit
   - Aim for 90+ score
   - Fix all flagged issues

### Manual Checks

- [ ] All images have appropriate alt text
- [ ] Heading hierarchy is logical (h1-h6, no skipping)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible (3:1 contrast)
- [ ] Color contrast meets 4.5:1 for text
- [ ] Forms have associated labels
- [ ] Links have descriptive text
- [ ] Page has descriptive title
- [ ] Skip navigation link is present
- [ ] ARIA landmarks are used appropriately
- [ ] Dynamic content announces changes
- [ ] No keyboard traps

---

## Implementation Priority

### Phase 1: Critical (Week 1)
- [ ] Fix all color contrast issues
- [ ] Add alt text to all images
- [ ] Implement proper heading hierarchy
- [ ] Add skip navigation links
- [ ] Associate all form labels

### Phase 2: High Priority (Week 2)
- [ ] Add ARIA landmarks
- [ ] Improve link descriptiveness
- [ ] Add focus indicators
- [ ] Test keyboard navigation
- [ ] Fix semantic HTML issues

### Phase 3: Enhancement (Week 3)
- [ ] Add live regions for dynamic content
- [ ] Optimize for screen readers
- [ ] Implement accessible map alternative
- [ ] Add breadcrumb navigation
- [ ] Test with actual screen readers

### Phase 4: Validation (Week 4)
- [ ] Run automated tests (axe, WAVE, Lighthouse)
- [ ] Manual screen reader testing
- [ ] Keyboard-only navigation testing
- [ ] User testing (if possible)
- [ ] Fix remaining issues

---

## Common Mistakes to Avoid

1. ❌ **Using color alone** to convey information
2. ❌ **Missing alt text** on images
3. ❌ **Poor color contrast** (< 4.5:1 for text)
4. ❌ **Removing focus indicators** (:focus { outline: none; })
5. ❌ **Skipping heading levels** (h1 → h3)
6. ❌ **Generic link text** ("click here", "read more")
7. ❌ **Unlabeled form inputs** (no associated label)
8. ❌ **Keyboard traps** (can't escape with keyboard)
9. ❌ **Images of text** instead of real text
10. ❌ **Not testing with screen readers**

---

## Success Criteria

- [ ] WCAG 2.2 Level AA compliance achieved
- [ ] All automated tests pass (axe, WAVE, Lighthouse)
- [ ] Manual screen reader testing successful
- [ ] Keyboard navigation works throughout
- [ ] Color contrast meets 4.5:1 minimum
- [ ] All images have appropriate alt text
- [ ] Forms are fully accessible
- [ ] Focus indicators are visible
- [ ] Semantic HTML structure implemented
- [ ] User testing feedback addressed (if available)

---

## Resources

### Official Documentation
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

### Testing Tools
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Learning Resources
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
- [Deque University](https://dequeuniversity.com/)

---

## Conclusion

Implementing these accessibility best practices will make your directory usable by millions of people with visual disabilities. Focus on:

1. **Color contrast** (4.5:1 minimum)
2. **Semantic HTML** (proper structure)
3. **Alt text** (all images)
4. **Keyboard navigation** (all functionality)
5. **Screen reader optimization** (ARIA, headings, labels)

Since these improvements apply to 2 templates used across thousands of pages, the impact will be enormous.

---

**Next Steps**:
1. Run automated accessibility scan
2. Fix critical contrast issues
3. Add missing alt text
4. Test with keyboard only
5. Test with NVDA or VoiceOver
6. Iterate based on findings
