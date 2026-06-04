import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

try:
    models_list = client.models.list()
    print("AVAILABLE MODELS:")
    for model in models_list.data:
        print(f"- {model.id}")
except Exception as e:
    print(f"Error fetching models: {e}")
