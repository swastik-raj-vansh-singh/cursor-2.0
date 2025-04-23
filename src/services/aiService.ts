// AI Service - handles communication with the AI backend

const API_BASE_URL = "http://localhost:3001/api";

// Generate AI response from a prompt
export async function generateAIResponse(
  prompt: string,
  codeToModify?: string,
  context?: string
) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        codeToModify,
        context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate AI response");
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error in AI service:", error);
    throw error;
  }
}

// Modify code based on instructions
export async function modifyCode(
  filePath: string,
  newCode: string,
  language?: string
) {
  try {
    // Extract the language from file extension if not provided
    if (!language && filePath) {
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (ext) {
        language = ext;
      }
    }

    const response = await fetch(`${API_BASE_URL}/file/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath,
        content: newCode,
        language: language || "javascript",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update file");
    }

    return true;
  } catch (error) {
    console.error("Error updating file:", error);
    throw error;
  }
}

// Check server health
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}
