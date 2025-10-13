# Debugging StepStone Multi-Tab Workflow

## Problem: Console Logs Disappear

When debugging StepStone auto-apply, logs disappear because:
1. Job opens in new tab
2. Apply button is clicked
3. Tab navigates to application form URL
4. **Console clears** (page reload)
5. All previous logs are gone!

## ✅ Solution: Preserve Log

### Enable "Preserve log" in Chrome DevTools

**Steps:**

1. **Open the job tab** that gets created
2. **Press F12** to open DevTools
3. **Click the "Console" tab**
4. **Enable "Preserve log"**:
   - **Option A**: Click the ⚙️ (settings/gear) icon in console toolbar → Check "Preserve log"
   - **Option B**: Right-click in console → Check "Preserve log"
   - **Option C**: Click the 🚫 icon with slash (next to Clear console) to toggle preserve log

### Visual Guide

```
Console Tab
┌────────────────────────────────────────────────┐
│ 🔍 Filter  [⚙️]  [🗑️]  [🚫]  ← Click gear or 🚫 │
│                                                │
│ ✅ Preserve log  ← Make sure this is CHECKED  │
│                                                │
│ [Content Script] Initializing...              │
│ [StepstoneJobPage] Looking for button...      │
│ -- Page navigated to new URL --               │
│ [Content Script] Initializing... (again)      │
│ [StepstoneForm] Starting flow...              │
│ (All logs preserved!)                         │
└────────────────────────────────────────────────┘
```

## 📝 What You'll See With Preserve Log

```
[Content Script] Initializing on: https://www.stepstone.de/stellenangebote--...
[Content Script] Message listener set up
========================================
[Content Script] RECEIVED processJobInTab MESSAGE
[Content Script] Processing job in tab: <title>
[Content Script] Importing StepstoneJobPage...
[StepstoneJobPage] Processing job in tab: <title>
[StepstoneJobPage] Current URL: https://...
[StepstoneJobPage] Page readyState: complete
[StepstoneJobPage] Looking for apply button...
[StepstoneJobPage] Total buttons on page: 25
[StepstoneJobPage] Found harmonised apply button
[StepstoneJobPage] Button text: Jetzt bewerben
[StepstoneJobPage] Button disabled: false
[StepstoneJobPage] Clicking apply button...
[StepstoneJobPage] Waiting for form page to load...
[StepstoneJobPage] URL changed detected
-- Page navigated to: https://www.stepstone.de/job/.../application/... --
[Content Script] Initializing on: https://www.stepstone.de/job/.../application/...
[Content Script] Message listener set up
[StepstoneForm] Starting complete application flow
[StepstoneForm] Looking for "Bewerbung fortsetzen" button...
[StepstoneForm] Found submit button
[StepstoneForm] READY TO SUBMIT
========================================
[Content Script] Job processing completed
[Content Script] Result: { "result": "success" }
```

## 🎯 Alternative: Use Background Script Logging

If you can't see job tab logs, check the **Background script** (service worker) logs:

1. Go to **chrome://extensions/**
2. Find **EasyApply** extension
3. Click **"Inspect views: service worker"**
4. Check console there

You'll see all the tab communication:
```
Message sent to tab successfully, response: {...}
```

## 📊 Test Commands for Job Tab Console

Once "Preserve log" is enabled, run this in the **job tab console**:

```javascript
// Check current page state
console.log('=== JOB TAB DEBUG ===');
console.log('URL:', window.location.href);
console.log('Content script active:', typeof chrome !== 'undefined');

// Find the apply button
const harmonisedBtn = document.querySelector('button[data-testid="harmonised-apply-button"]');
console.log('Harmonised button:', harmonisedBtn);
console.log('Button text:', harmonisedBtn?.textContent.trim());
console.log('Button disabled:', harmonisedBtn?.disabled);

// All buttons
const allBtns = document.querySelectorAll('button');
console.log('Total buttons:', allBtns.length);
allBtns.forEach((btn, i) => {
    if (i < 15) {
        const text = btn.textContent.trim().substring(0, 40);
        if (text) console.log(`Button ${i}: "${text}" (disabled: ${btn.disabled})`);
    }
});
```

This will show us what's actually on the page!

## 🚀 Next Steps

1. **Enable "Preserve log"** in job tab console
2. **Reload extension**
3. **Start auto-apply**
4. **Share the complete logs from job tab** (with preserve log enabled)

This will show us the complete journey from job page → application page → form filling!

