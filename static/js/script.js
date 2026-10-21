// script.js
// Handles: (1) drag-and-drop upload UX on the home page, and
// (2) the processing-page stage animation, driven by the REAL
// backend pipeline call (/api/run/<video_id>) rather than being
// purely cosmetic -- the stages progress while the actual pipeline
// runs, and the final redirect only happens once the backend
// genuinely finishes.

function initUploadPage() {
  const box = document.getElementById("upload-box");
  const input = document.getElementById("video-input");
  const preview = document.getElementById("preview");
  const btn = document.getElementById("generate-btn");

  box.addEventListener("click", () => input.click());

  box.addEventListener("dragover", (e) => {
    e.preventDefault();
    box.classList.add("dragover");
  });
  box.addEventListener("dragleave", () => box.classList.remove("dragover"));
  box.addEventListener("drop", (e) => {
    e.preventDefault();
    box.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleFileSelected();
    }
  });

  input.addEventListener("change", handleFileSelected);

  function handleFileSelected() {
    if (!input.files.length) return;
    const file = input.files[0];
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    btn.disabled = false;
    const label = document.getElementById("file-name");
    if (label) label.textContent = file.name;
    const placeholder = document.getElementById("preview-placeholder");
    if (placeholder) placeholder.hidden = true;
    preview.hidden = false;
  }
}

function runProcessing(videoId) {
  const stageItems = Array.from(document.querySelectorAll("#stage-list li"));
  const fill = document.getElementById("progress-fill");
  const errorBox = document.getElementById("error-box");

  let currentStage = -1;
  const totalStages = stageItems.length;

  function setStage(i) {
    for (let j = 0; j < stageItems.length; j++) {
      stageItems[j].classList.remove("active");
      if (j < i) stageItems[j].classList.add("done");
    }
    if (i < stageItems.length) stageItems[i].classList.add("active");
    const pct = Math.min(100, Math.round(((i + 1) / totalStages) * 100));
    fill.style.width = pct + "%";
  }

  // Advance visually through the first (totalStages - 1) stages while the
  // real backend request is in flight. We intentionally stop one stage
  // short of "done" until the backend actually confirms completion, so
  // the UI never claims to be finished before the real pipeline is.
  let tick = 0;
  const interval = setInterval(() => {
    if (tick < totalStages - 1) {
      setStage(tick);
      tick++;
    }
  }, 450);

  fetch(`/api/run/${videoId}`, { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      clearInterval(interval);
      if (data.error) {
        errorBox.textContent = "Processing failed: " + data.error;
        errorBox.style.display = "block";
        return;
      }
      setStage(totalStages); // mark everything done
      setTimeout(() => {
        window.location.href = data.redirect;
      }, 400);
    })
    .catch((err) => {
      clearInterval(interval);
      errorBox.textContent = "Processing failed: " + err;
      errorBox.style.display = "block";
    });
}

function submitEvaluation(resultId) {
  const payload = {
    evaluator_name: document.getElementById("evaluator_name").value || "Anonymous",
    visual_attractiveness: document.getElementById("visual_attractiveness").value,
    representativeness: document.getElementById("representativeness").value,
    sharpness_rating: document.getElementById("sharpness_rating").value,
    content_relevance: document.getElementById("content_relevance").value,
    overall_quality: document.getElementById("overall_quality").value,
  };

  fetch(`/evaluate/${resultId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => {
      const status = document.getElementById("eval-status");
      if (data.success) {
        status.textContent = "Thanks! Your evaluation was recorded.";
        status.style.color = "var(--success)";
      } else {
        status.textContent = "Could not save evaluation: " + (data.error || "unknown error");
        status.style.color = "var(--danger)";
      }
    });
}
