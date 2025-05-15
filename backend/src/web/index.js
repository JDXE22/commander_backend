const inputBox = document.getElementById("consoleInput");
const responseArea = document.getElementById("responseArea");
const copyButton = document.getElementById("copyButton");

inputBox.addEventListener("keydown", textAreaListener);
copyButton.addEventListener("click", copyToClipboard);

async function textAreaListener(event) {
  if (event.key === "Enter") {
    const userCommand = event.target.value.trim();
    if (!userCommand) return;

    responseArea.textContent = "Thinking...";

    try {
      const res = await fetch(
        `/command/cmd/${encodeURIComponent(userCommand)}`
      );

      if (!res.ok) {
        responseArea.textContent = "Command not found";
        return;
      }
      const { text } = await res.json();

      responseArea.textContent = text;
    } catch (error) {
      responseArea.textContent = "Oops! Something went wrong";
      console.error(error);
    }
  }
}

async function copyToClipboard() {
  navigator.clipboard
    .writeText(responseArea.textContent)
    .then(() => {
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy Text";
      }, 2000);
    })
    .catch((err) => {
      copyButton.textContent = "Error!";
    });
}
