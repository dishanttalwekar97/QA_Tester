# QA Candidate Assessment: Bug Answer Key
**Confidential – Hiring Team / Interviewer Reference Only**

This document lists all **20 intentional hidden bugs** embedded within the ApexCare Appointment Booking web application (`index.html`).

---

## Summary Matrix

| Bug # | Category | Location | Summary | Severity |
| :---: | :--- | :--- | :--- | :---: |
| **01** | Functional | Booking Page &rarr; Date Picker | Past dates can be selected and booked | **High** |
| **02** | Functional | Booking Page &rarr; Slot Reservation | Same time slot can be double-booked on the same date | **Critical** |
| **03** | Functional | Booking Page &rarr; Phone Input | Phone accepts letters and fewer than 10 digits | **High** |
| **04** | Functional | Booking Page &rarr; Email Input | Email validation accepts incomplete format `"abc@"` | **High** |
| **05** | Functional | Booking Page &rarr; Notes Textarea | Notes accepts > 200 characters without error or limit | **Medium** |
| **06** | Functional | My Bookings &rarr; Admin Sync | Cancelling a booking does not update or remove it in Admin | **High** |
| **07** | Functional | My Bookings &rarr; Reschedule Flow | Rescheduling creates a duplicate booking, keeping the old slot | **High** |
| **08** | Functional | Booking Page &rarr; Attendees Input | Number of people allows 0 and negative values | **High** |
| **09** | Functional | Booking Page &rarr; Price Summary | Total price calculation is wrong when people > 2 | **High** |
| **10** | Functional | Admin Portal &rarr; Authentication | Admin login succeeds with an empty password | **Critical** |
| **11** | UI / UX | Booking Page (Mobile View) | Submit button overlaps the footer on mobile screens | **Medium** |
| **12** | UI / UX | Header (Mobile View) | Hamburger drawer menu does not close after clicking a link | **Medium** |
| **13** | UI / UX | Confirmation Popup | Modal cannot be closed with the "X" button | **Medium** |
| **14** | UI / UX | Services Section (Mobile View) | Service description text overflows card boundaries | **Low** |
| **15** | UI / UX | Global Theme & Styling | Inconsistent button colors on hover across pages | **Low** |
| **16** | UI / UX | Copywriting / Content | 3 intentional typos: "Appoinment", "Confrim", "Cancle" | **Low** |
| **17** | Other | Footer &rarr; Support & Legal | "Privacy Policy" links to a non-existent page (404) | **Medium** |
| **18** | Other | Browser Navigation | Clicking browser Back button after booking causes blank page | **Critical** |
| **19** | Other | Booking Page &rarr; State Management | Refreshing the page wipes dirty form with no warning | **Low** |
| **20** | Other | Booking Confirmation & Storage | Booking ID generation pool is tiny, causing ID collisions | **High** |

---

## Detailed Bug Breakdown

### 1. Past dates can be selected in the date picker
- **Bug Number:** 01
- **Location:** Booking Form (`#bookingDate`)
- **Steps to Reproduce:**
  1. Navigate to the **Book Now** page.
  2. Click on the **Date** field calendar picker.
  3. Select any date in the past (e.g., yesterday or 2020-01-01).
  4. Fill out the remaining fields and click "Confrim Booking".
- **Expected Result:** Historical dates should be disabled via `min` attribute, and form validation should reject any date before the current day with a descriptive error.
- **Actual Result:** Past dates are selectable without warning, and the appointment is booked with a historical date.
- **Severity:** High

---

### 2. The same time slot can be double-booked on the same date
- **Bug Number:** 02
- **Location:** Booking Submission Logic (`#appointmentForm`)
- **Steps to Reproduce:**
  1. Book an appointment for "Dental Checkup" on date `2026-10-25` at `11:00 AM`.
  2. Confirm the appointment.
  3. Return to the booking form.
  4. Book a second appointment with a different customer name for the same service ("Dental Checkup"), same date (`2026-10-25`), and same time slot (`11:00 AM`).
- **Expected Result:** The system should inspect existing bookings and reject the booking: *"This slot is already reserved. Please select another time."*
- **Actual Result:** The system permits multiple bookings for the exact same specialist, date, and hour without collision detection.
- **Severity:** Critical

---

### 3. Phone field accepts letters and fewer than 10 digits
- **Bug Number:** 03
- **Location:** Booking Form &rarr; Phone Input (`#clientPhone`)
- **Steps to Reproduce:**
  1. In the "Phone Number" field, enter `abcd` or `1234`.
  2. Fill out all other fields with valid data.
  3. Submit the form.
- **Expected Result:** Phone input should strictly require a 10-digit numeric pattern (e.g., `/^\d{10}$/`).
- **Actual Result:** Validation only verifies `phone.length > 3` without type checks; alphabetic characters and short strings are accepted.
- **Severity:** High

---

### 4. Email validation accepts "abc@" as valid
- **Bug Number:** 04
- **Location:** Booking Form &rarr; Email Input (`#clientEmail`)
- **Steps to Reproduce:**
  1. In the "Email Address" field, enter `abc@`.
  2. Fill in the remaining required fields.
  3. Submit the form.
- **Expected Result:** Form validation should flag `abc@` as an invalid email address (missing domain and TLD).
- **Actual Result:** Regex `/^[^\s@]+@[^\s@]*$/` permits anything with an `@` symbol with no domain, allowing `abc@` through.
- **Severity:** High

---

### 5. Notes field allows more than 200 characters without any error
- **Bug Number:** 05
- **Location:** Booking Form &rarr; Notes Field (`#bookingNotes`)
- **Steps to Reproduce:**
  1. Type or paste 250 characters into the Notes textarea.
  2. Observe the counter displaying `250/200`.
  3. Click "Confrim Booking".
- **Expected Result:** Either the textarea enforces `maxlength="200"` or the submission is blocked with an error: *"Notes cannot exceed 200 characters"*.
- **Actual Result:** The form submits cleanly, saving the oversized note into `localStorage`.
- **Severity:** Medium

---

### 6. Cancelling a booking does not remove it from the Admin page
- **Bug Number:** 06
- **Location:** My Bookings &rarr; Admin Dashboard Sync (`cancelBooking` & `applyAdminFilters`)
- **Steps to Reproduce:**
  1. Book an appointment and verify it appears in **My Bookings**.
  2. Click the **Cancle** button to cancel the appointment.
  3. The status updates to a red "Cancelled" pill in My Bookings.
  4. Navigate to the **Admin** page and sign in (`admin` / `admin123`).
  5. Check the status column for that appointment.
- **Expected Result:** The appointment in the Admin portal should reflect "Cancelled" or be moved to an archive.
- **Actual Result:** The Admin dashboard hardcodes the display to a green "Confirmed" badge for all records, masking user cancellations.
- **Severity:** High

---

### 7. Rescheduling keeps the old slot as booked
- **Bug Number:** 07
- **Location:** My Bookings &rarr; Reschedule Flow (`handleRescheduleSubmit`)
- **Steps to Reproduce:**
  1. In **My Bookings**, click **Reschedule** on an active appointment.
  2. Choose a new date and time, then click "Update Appointment".
  3. Review the bookings table.
- **Expected Result:** The existing booking's date and time should update in place.
- **Actual Result:** A duplicate booking with `-R` suffix is added to the list, leaving the original booking and slot active.
- **Severity:** High

---

### 8. Number of people accepts 0 and negative values
- **Bug Number:** 08
- **Location:** Booking Form &rarr; Number of People (`#numPeople`)
- **Steps to Reproduce:**
  1. In the "Number of People" input, enter `0` or `-2`.
  2. Complete the rest of the form and submit.
- **Expected Result:** Input should reject non-positive numbers (must be between 1 and 5).
- **Actual Result:** Validation only verifies `people > 5`. Zero and negative numbers pass without error.
- **Severity:** High

---

### 9. Total price is calculated wrongly when people > 2
- **Bug Number:** 09
- **Location:** Booking Summary Card & Submission (`updateBookingSummary`)
- **Steps to Reproduce:**
  1. Select a service (e.g. "Consultation" at $50/person).
  2. Change attendees from 1 to 3.
  3. Observe the calculated **Total Price**.
- **Expected Result:** 3 attendees &times; $50 = **$150**.
- **Actual Result:** Total Price shows **$100** because code calculates `basePrice * (people - 1)` whenever `people > 2`.
- **Severity:** High

---

### 10. Admin login accepts an empty password
- **Bug Number:** 10
- **Location:** Admin Login Form (`handleAdminLogin`)
- **Steps to Reproduce:**
  1. Navigate to the **Admin** page.
  2. Enter username `admin`.
  3. Leave the password field completely empty.
  4. Click "Sign In".
- **Expected Result:** Authentication fails with an "Invalid credentials" or "Password required" message.
- **Actual Result:** The condition `(pass === 'admin123' || pass === '')` allows immediate access into the admin console.
- **Severity:** Critical

---

### 11. Submit button overlaps the footer on mobile screens
- **Bug Number:** 11
- **Location:** Booking Form actions on mobile (`@media (max-width: 640px)`)
- **Steps to Reproduce:**
  1. Switch browser to a mobile viewport (<640px wide).
  2. Scroll down to the bottom of the "Book Now" section.
- **Expected Result:** The button should sit inside the form card with normal spacing above the footer.
- **Actual Result:** `.booking-actions` has `margin-bottom: -46px`, pulling the submit button down so it physically overlaps the dark footer.
- **Severity:** Medium

---

### 12. Hamburger menu does not close after clicking a link
- **Bug Number:** 12
- **Location:** Navigation Bar (`#navMenu` on mobile)
- **Steps to Reproduce:**
  1. Switch to mobile view (<768px).
  2. Tap the hamburger icon to expand the navigation menu.
  3. Click any nav link (e.g., "Contact" or "Services").
- **Expected Result:** The menu drawer should automatically close upon navigation.
- **Actual Result:** The underlying section changes, but the mobile menu stays open, obstructing the screen.
- **Severity:** Medium

---

### 13. Confirmation popup cannot be closed with the X button
- **Bug Number:** 13
- **Location:** Booking Confirmation Modal (`#modalCloseXBtn`)
- **Steps to Reproduce:**
  1. Submit a valid booking to trigger the "Booking Confirmed!" popup.
  2. Click the `×` button in the top-right corner of the modal.
- **Expected Result:** The modal closes and reveals the page.
- **Actual Result:** The click handler does not hide the modal. The user cannot dismiss it with the `×` button.
- **Severity:** Medium

---

### 14. Text overflows the card on the Services section on small screens
- **Bug Number:** 14
- **Location:** Services Section (`.service-desc`)
- **Steps to Reproduce:**
  1. View the Services catalog on a narrow screen (width &le; 375px).
- **Expected Result:** Description paragraphs should wrap within the card boundaries.
- **Actual Result:** `.service-desc` has `white-space: nowrap;`, causing text to break out of the card borders horizontally.
- **Severity:** Low / Medium

---

### 15. Inconsistent button colors on hover across pages
- **Bug Number:** 15
- **Location:** Global Button Styles (`.btn-hero`, `.btn-submit-booking`, `.btn-contact-submit`, `.btn-admin-login`)
- **Steps to Reproduce:**
  1. Hover over the Hero button &rarr; turns **Royal Blue** (`#1d4ed8`).
  2. Hover over the Booking Form submit button &rarr; turns **Emerald Green** (`#059669`).
  3. Hover over the Contact Form submit button &rarr; turns **Purple** (`#7c3aed`).
  4. Hover over the Admin Login button &rarr; turns **Orange** (`#ea580c`).
- **Expected Result:** All primary brand action buttons should share a unified, consistent hover color (e.g. darker blue).
- **Actual Result:** Four different, clashing hover colors are used across different pages.
- **Severity:** Low

---

### 16. Spelling mistakes in 3 places
- **Bug Number:** 16
- **Location:**
  1. **Home Hero Headline & Hero Button:** `"Book an Appoinment"` (missing the letter 't').
  2. **Booking Form Submit Button:** `"Confrim Booking"` ('i' and 'r' transposed).
  3. **My Bookings Action Button:** `"Cancle"` (misspelled 'Cancel').
- **Steps to Reproduce:**
  1. Read the Hero banner text and primary CTA on the Home page.
  2. Read the submit button label on the Booking form.
  3. Read the cancellation button in the My Bookings table.
- **Expected Result:** Standard spelling: "Appointment", "Confirm", "Cancel".
- **Actual Result:** 3 intentional spelling errors appear in user-facing UI elements.
- **Severity:** Low

---

### 17. Broken link in the footer (404)
- **Bug Number:** 17
- **Location:** Footer &rarr; Support & Legal Column
- **Steps to Reproduce:**
  1. Scroll down to the Footer.
  2. Click the **Privacy Policy** link.
- **Expected Result:** Directs to a valid policy page or modal.
- **Actual Result:** Links to `privacy-policy-notfound.html`, yielding a broken / 404 page.
- **Severity:** Medium

---

### 18. Pressing the browser back button after booking shows a blank page
- **Bug Number:** 18
- **Location:** Browser History / `popstate` event listener
- **Steps to Reproduce:**
  1. Fill in and submit an appointment on the **Book Now** page.
  2. Once the confirmation modal is shown, press the browser's **Back** button.
- **Expected Result:** The browser should navigate smoothly to the previous URL/state.
- **Actual Result:** The page turns completely blank white because `window.popstate` wipes `document.body.innerHTML`.
- **Severity:** Critical

---

### 19. Refreshing the page clears the form with no warning
- **Bug Number:** 19
- **Location:** Booking Form (`#appointmentForm`)
- **Steps to Reproduce:**
  1. Fill out form fields (Name, Email, Notes, etc.).
  2. Without submitting, reload the page (F5 / browser refresh).
- **Expected Result:** A standard `beforeunload` warning dialog should prompt the user about unsaved input, or draft state should be restored.
- **Actual Result:** The page refreshes silently, discarding all inputted data.
- **Severity:** Low / Medium

---

### 20. Booking ID is sometimes duplicated
- **Bug Number:** 20
- **Location:** ID Generator in Booking Submission (`duplicateProneId`)
- **Steps to Reproduce:**
  1. Submit 5–10 bookings in succession.
  2. Inspect the generated Booking IDs in **My Bookings** or the **Admin Portal**.
- **Expected Result:** Every appointment must receive a unique reference ID.
- **Actual Result:** IDs are generated from a tiny random range of 10 values (`BK-100` to `BK-109`), resulting in rapid collisions and identical IDs across different clients.
- **Severity:** High
