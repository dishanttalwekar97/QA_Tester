/**
 * Candidate Docked Bug Reporting Drawer
 * STRICT BLACK-BOX EVALUATION:
 * - Candidate is never shown how many bugs exist in total.
 * - No progress bars, no checklists, no ground-truth hints.
 * - Candidate can only see their own logged submissions.
 */

let candidateToken = "";
let myLoggedReports = [];

document.addEventListener("DOMContentLoaded", () => {
  // Extract candidate token from body dataset or URL
  const root = document.getElementById("qa-assessment-root");
  if (root && root.dataset.token) {
    candidateToken = root.dataset.token;
    loadMyReports();
  }

  initReporterDrawer();
  captureEnvironment();
});

// Auto-capture technical environment metadata
function captureEnvironment() {
  const envEl = document.getElementById("env-meta-info");
  if (envEl) {
    const vp = `${window.innerWidth}x${window.innerHeight}`;
    const ua = navigator.userAgent;
    envEl.value = `Viewport: ${vp} | UserAgent: ${ua}`;
  }
}

function initReporterDrawer() {
  const fab = document.getElementById("bug-fab-btn");
  const drawer = document.getElementById("bug-drawer");
  const overlay = document.getElementById("bug-drawer-overlay");
  const closeBtn = document.getElementById("drawer-close-btn");
  const formTab = document.getElementById("tab-new-report");
  const listTab = document.getElementById("tab-my-reports");
  const formView = document.getElementById("view-new-report");
  const listView = document.getElementById("view-my-reports");
  const reportForm = document.getElementById("bug-report-form");
  const finalizeBtn = document.getElementById("finalize-assessment-btn");

  if (!fab || !drawer) return;

  // Toggle drawer open
  fab.addEventListener("click", () => {
    drawer.classList.add("active");
    overlay.classList.add("active");
  });

  // Close drawer
  const closeDrawer = () => {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
  };

  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  // Tab switching
  if (formTab && listTab && formView && listView) {
    formTab.addEventListener("click", () => {
      formTab.classList.add("active");
      listTab.classList.remove("active");
      formView.style.display = "block";
      listView.style.display = "none";
    });

    listTab.addEventListener("click", () => {
      listTab.classList.add("active");
      formTab.classList.remove("active");
      listView.style.display = "block";
      formView.style.display = "none";
      renderMyReportsList();
    });
  }

  // Handle Form Submission
  if (reportForm) {
    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const title = document.getElementById("report-title").value.trim();
      const category = document.getElementById("report-category").value;
      const severity = document.getElementById("report-severity").value;
      const steps = document.getElementById("report-steps").value.trim();
      const expected = document.getElementById("report-expected").value.trim();
      const actual = document.getElementById("report-actual").value.trim();
      const env = document.getElementById("env-meta-info").value;

      if (!title || !steps || !expected || !actual) {
        alert("Please complete all required fields (Title, Steps to Reproduce, Expected Result, Actual Result).");
        return;
      }

      const submitBtn = reportForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      fetch("/api/candidate/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: candidateToken,
          title,
          category,
          severity,
          steps_to_reproduce: steps,
          expected_result: expected,
          actual_result: actual,
          environment_info: env
        })
      })
      .then(res => res.json())
      .then(data => {
        if (submitBtn) submitBtn.disabled = false;
        if (data.success) {
          // Reset form
          reportForm.reset();
          captureEnvironment();
          
          // Switch to My Reports tab and reload
          loadMyReports();
          if (listTab) listTab.click();

          // Feedback toast (blind: confirms save, but reveals NO validity or score)
          if (window.ShopPulse && window.ShopPulse.showToast) {
            window.ShopPulse.showToast("Bug report submitted to your assessment log.", "success");
          } else {
            alert("Bug report submitted to your assessment log.");
          }
        } else {
          alert("Error saving report: " + (data.error || "Please try again."));
        }
      })
      .catch(err => {
        if (submitBtn) submitBtn.disabled = false;
        alert("Network error submitting report: " + err);
      });
    });
  }

  // Finalize Assessment
  if (finalizeBtn) {
    finalizeBtn.addEventListener("click", () => {
      const count = myLoggedReports.length;
      const confirmed = confirm(
        `Are you ready to finalize and submit your assessment?\n\n` +
        `You have logged ${count} issue(s).\n` +
        `Once submitted, your session will conclude and your reports will be sent for evaluation.`
      );

      if (confirmed) {
        finalizeBtn.disabled = true;
        fetch("/api/candidate/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: candidateToken })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            window.location.href = `/candidate/completed?token=${candidateToken}`;
          } else {
            alert("Error finalizing session: " + data.error);
            finalizeBtn.disabled = false;
          }
        })
        .catch(err => {
          alert("Error: " + err);
          finalizeBtn.disabled = false;
        });
      }
    });
  }
}

// Fetch candidate's personal submitted reports
function loadMyReports() {
  if (!candidateToken) return;

  fetch(`/api/candidate/my-reports?token=${candidateToken}`)
    .then(res => res.json())
    .then(data => {
      if (data.reports) {
        myLoggedReports = data.reports;
        const countBadge = document.getElementById("my-reports-count");
        if (countBadge) {
          countBadge.textContent = myLoggedReports.length;
        }
        renderMyReportsList();
      }
    })
    .catch(err => console.error("Error fetching reports:", err));
}

// Render candidate's own reports in the drawer
function renderMyReportsList() {
  const container = document.getElementById("my-reports-container");
  if (!container) return;

  if (myLoggedReports.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748b;">
        <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
        <p style="font-weight: 600;">No bug reports logged yet</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Explore the application, find defects, and click "Log New Issue" to record them.</p>
      </div>
    `;
    return;
  }

  let html = "";
  myLoggedReports.forEach((rep) => {
    let sevColor = "#64748b";
    if (rep.severity === "Blocker") sevColor = "#dc2626";
    else if (rep.severity === "Major") sevColor = "#ea580c";
    else if (rep.severity === "Medium") sevColor = "#d97706";
    else if (rep.severity === "Minor") sevColor = "#2563eb";

    html += `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">#${rep.report_number} ${escapeHtml(rep.title)}</span>
          <span style="font-size: 0.75rem; font-weight: 700; color: ${sevColor}; background: white; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">${rep.severity}</span>
        </div>
        <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 8px;">Category: <strong>${rep.category}</strong></div>
        <div style="font-size: 0.85rem; color: #334155; margin-bottom: 6px;">
          <strong>Steps:</strong>
          <pre style="white-space: pre-wrap; font-family: inherit; font-size: 0.8rem; background: white; padding: 6px; border-radius: 4px; margin-top: 4px; border: 1px solid #e2e8f0;">${escapeHtml(rep.steps_to_reproduce)}</pre>
        </div>
        <div style="font-size: 0.8rem; color: #475569;">
          <div><strong style="color: #166534;">Expected:</strong> ${escapeHtml(rep.expected_result)}</div>
          <div style="margin-top: 2px;"><strong style="color: #991b1b;">Actual:</strong> ${escapeHtml(rep.actual_result)}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function escapeHtml(text) {
  if (!text) return "";
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
