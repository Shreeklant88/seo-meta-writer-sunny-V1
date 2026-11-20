const inputText = document.getElementById("inputText");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const outputContainer = document.getElementById("outputContainer");

generateBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();

  if (text.length < 50) {
    statusEl.textContent = "Please paste at least 50 characters of content.";
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

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Request failed.");
    }

    const data = await response.json();
    const descriptions = data.descriptions; // array of strings

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
});