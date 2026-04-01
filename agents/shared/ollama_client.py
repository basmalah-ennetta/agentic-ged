import requests
import json

# The URL where Ollama is running locally
OLLAMA_BASE_URL = "http://localhost:11434"

# llama3.2 model
MODEL_NAME = "llama3.2"


def ask_ollama(prompt: str, system_prompt: str = None) -> str:
    """
    Sends a prompt to the local Ollama AI model and returns the response.

    Parameters:
        prompt (str):        The main question or instruction for the AI
        system_prompt (str): Optional background instructions that set the
                             AI's behavior (e.g., "You are an HR expert...")

    Returns:
        str: The AI's text response
    """

    # list of messages to send
    messages = []

    # If a system prompt was provided, add it first
    if system_prompt:
        messages.append({
            "role": "system",      # "system" sets the AI's persona/behavior
            "content": system_prompt
        })

    # Add the user message
    messages.append({
        "role": "user",            
        "content": prompt
    })

    # full request payload
    payload = {
        "model": MODEL_NAME,       # which model to use
        "messages": messages,      # the conversation
        "stream": False,           # False = wait for full response before returning
                                   # True = stream tokens as they're generated
        "options": {
            "temperature": 0.1,    # lower = more focused/deterministic responses
                                   # higher = more creative but less predictable
        }
    }

    try:
        # Send POST request to Ollama's chat endpoint
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=120
        )

        # error checking
        response.raise_for_status()

        # Parse the JSON response
        result = response.json()

        # Extract just the text content from the response
        # Ollama's response structure: result["message"]["content"]
        return result["message"]["content"].strip()

    except requests.exceptions.ConnectionError:
        # Ollama isn't running
        raise Exception(
            "Cannot connect to Ollama. "
            "Make sure Ollama is running by executing: ollama serve"
        )
    except requests.exceptions.Timeout:
        raise Exception(
            "Ollama took too long to respond. "
            "The model might be loading — try again in a moment."
        )
    except Exception as e:
        raise Exception(f"Ollama request failed: {str(e)}")


def check_ollama_health() -> bool:
    """
    Checks if Ollama is running and the model is available.
    """
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            # Check if our model is in the list of downloaded models
            models = response.json().get("models", [])
            model_names = [m["name"] for m in models]
            # Check if any downloaded model starts with our model name
            return any(MODEL_NAME in name for name in model_names)
        return False
    except:
        return False