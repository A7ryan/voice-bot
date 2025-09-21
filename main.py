# ------------- this is the brain of the project ------------------

# I have implemented it using various reference and website
# Later integrated it with streamlit
# However I got an error, so used AI to add javascript in 
# streamlit and make it more funcitional

import speech_recognition as sr
import pyttsx3
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')


# Initialize text-to-speech engine
engine = pyttsx3.init()

# Initialize recognizer
r = sr.Recognizer()

with sr.Microphone() as source:
    print("Say something!")
    r.adjust_for_ambient_noise(source)
    audio = r.listen(source)

try:
    ai_response = r.recognize_google(audio)
    print(f"You said: {ai_response}")


    ai_reply = model.generate_content(ai_response)
    final_response = ai_reply.text

    print(f"OpenAI: {final_response}")

    engine.say(final_response)
    engine.runAndWait()
    # engine.stop()

except sr.UnknownValueError:
    print("Could not understand audio")
except sr.RequestError as e:
    print(f"Could not request results from Google Speech Recognition service; {e}")
