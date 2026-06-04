const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

// Test Chatbot button
document.getElementById("testChatbotBtn").addEventListener("click", async () => {
    const message = document.getElementById("testMessage").value;
    const businessName = document.getElementById("businessName").value;

    if (!message) {
        alert("Enter a message to test.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/chat/${businessName}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        document.getElementById("testChatbotResponse").innerText = data.response;

    } catch (err) {
        console.error(err);
        alert("Chatbot test failed.");
    }
});
