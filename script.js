const inputText = document.getElementById("inputText");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const outputContainer = document.getElementById("outputContainer");

// The main function to generate descriptions
async function generateDescriptions() {
  const text = inputText.value.trim();

  if (text.length < 20) {
    statusEl.textContent = "Please paste at least 20 characters of content.";
    statusEl.className = "status error";
    return;
  }

  generateBtn.disabled = true;
  statusEl.textContent = "Generating…";
  statusEl.className = "status";
  resultsEl.classList.add("hidden");
  outputContainer.innerHTML = "";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    const descriptions = data.descriptions;

    resultsEl.classList.remove("hidden");
    descriptions.forEach((desc) => {
      const card = document.createElement("div");
      card.className = "description-card";
      card.textContent = desc;
      const count = document.createElement("span");
      count.className = "char-count";
      count.textContent = `${desc.length} characters`;
      card.appendChild(count);
      outputContainer.appendChild(card);
    });

    statusEl.textContent = `Generated ${descriptions.length} descriptions.`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "status error";
  } finally {
    generateBtn.disabled = false;
  }
}

// 1. Mouse click event
generateBtn.addEventListener("click", generateDescriptions);

// 2. Global Enter Key event (works when clicking anywhere on the page)
document.addEventListener("keydown", (e) => {
  // Check if the Enter key was pressed
  if (e.key === "Enter") {
    // If the user is pressing Enter inside the textarea, we check for Shift
    if (e.target.tagName === "TEXTAREA") {
      if (e.shiftKey) {
        // Allow Shift + Enter to create a new line
        return;
      }
      // Prevent the default new line and trigger generation
      e.preventDefault();
    }
    
    // Prevent triggering the button if it's already disabled (generating)
    if (!generateBtn.disabled) {
      // Prevent default scrolling behaviors
      e.preventDefault(); 
      generateDescriptions();
    }
  }
});
