const inputBox = document.getElementById("consoleInput");
const responseArea = document.getElementById("responseArea");

inputBox.addEventListener("keydown", textAreaListener );

async function textAreaListener (event) {
    if (event.key === "Enter") {
      const userCommand = event.target.value.trim();
      if (!userCommand) return;
  
      responseArea.textContent = "Thinking...";
  
      try {
        const res = await fetch(
          `http://localhost:3000/command/cmd/${encodeURIComponent(
            userCommand
          )}`
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