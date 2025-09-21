import streamlit as st
import speech_recognition as sr
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

load_dotenv()


# ----------------------- Gemini AI (Default) ---------------------------
# uncomment below code to use Gemini AI Model

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    st.error("Google API key not found. Please set GOOGLE_API_KEY in your .env file.")
    st.stop()
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
def get_ai_response(user_text):
    ai_reply = model.generate_content(user_text)
    return ai_reply.text

# # uncomment above code to use Gemini AI model


# ----------------------- Anthropic Claude AI ---------------------------
# uncomment below code to use Claude AI Model (NOTE: you will get credit error, so use pro)

# import anthropic
# CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY')
# if not CLAUDE_API_KEY:
#     st.error("Claude API key not found. Please set CLAUDE_API_KEY in your .env file.")
#     st.stop()
# else:
#     client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# def get_ai_response(user_text):
#     message = client.messages.create(
#         model="claude-3-haiku-20240307",  # or claude-3-sonnet-20240229, claude-3-opus-20240229
#         max_tokens=1000,
#         messages=[{"role": "user", "content": user_text}]
#     )
#     return message.content[0].text

# # uncomment above code to use Claude AI model


# ----------------------- OpenAI API Key ---------------------------
# uncomment below code to use OpenAI Model (NOTE: you will get credit error, so use pro)

# import openai
# OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
# if not OPENAI_API_KEY:
#     st.error("OpenAI API key not found. Please set OPENAI_API_KEY in your .env file.")
#     st.stop()
# else:
#     openai.api_key = OPENAI_API_KEY
#
# def get_ai_response(user_text):
#     response = openai.chat.completions.create(
#         model="gpt-3.5-turbo",  # or gpt-4, gpt-4-turbo
#         messages=[{"role": "user", "content": user_text}],
#         max_tokens=1000
#     )
#     return response.choices[0].message.content

# # uncomment above code to use OpenAI model


if "messages" not in st.session_state:
    st.session_state.messages = []
if "pending_speech" not in st.session_state:
    st.session_state.pending_speech = ""
if "conversation_active" not in st.session_state:
    st.session_state.conversation_active = False


def create_speech_component(text, auto_play=False):
    clean_text = text.replace('\n', ' ').replace('\r', ' ').strip()
    escaped_text = json.dumps(clean_text)
    
    button_id = f"speak_btn_{abs(hash(text))}"
    
    if auto_play:
        js_code = f"""
        <div id="{button_id}_container" style="margin: 10px 0;">
            <button id="{button_id}" onclick="speakText()" 
                    style="background: #ff4b4b; color: white; border: none; padding: 10px 20px; 
                           border-radius: 5px; cursor: pointer; font-size: 16px;">
                🔊 Click to Hear AI Response
            </button>
        </div>
        <script>
            function speakText() {{
                console.log("Speaking:", {escaped_text});
                const text = {escaped_text};
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                utterance.onstart = () => {{
                    document.getElementById("{button_id}").innerHTML = "🔊 Speaking...";
                    document.getElementById("{button_id}").disabled = true;
                }};
                utterance.onend = () => {{
                    document.getElementById("{button_id}").innerHTML = "🔊 Speak Again";
                    document.getElementById("{button_id}").disabled = false;
                }};
                utterance.onerror = (e) => {{
                    console.error("Speech error:", e);
                    document.getElementById("{button_id}").innerHTML = "Speech Error";
                }};
                
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            }}
            
            setTimeout(() => {{
                try {{
                    document.getElementById("{button_id}").click();
                }} catch(e) {{
                    console.log("Auto-click failed (expected):", e);
                }}
            }}, 100);
        </script>
        """
    else:
        # Manual button version
        js_code = f"""
        <button onclick="speakThis()" 
                style="background: #0066cc; color: white; border: none; padding: 5px 10px; 
                       border-radius: 3px; cursor: pointer; margin: 5px 0;">
            🔊 Play
        </button>
        <script>
            function speakThis() {{
                const text = {escaped_text};
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            }}
        </script>
        """
    
    return js_code



def transcribe_and_respond():
    r = sr.Recognizer()
    r.energy_threshold = 300
    r.dynamic_energy_threshold = True
    
    try:
        with st.status("🎙️ Listening..", expanded=True) as status:
            st.write("Speak now..")
            
            with sr.Microphone() as source:
                r.adjust_for_ambient_noise(source, duration=1)
                audio = r.listen(source, timeout=10, phrase_time_limit=10)
            
            status.update(label="🔄 Processing speech..", state="running")
            st.write("Converting speech to text..")
        
        # Recognize speech
        user_text = r.recognize_google(audio)
        
        # Add user message
        st.session_state.messages.append({"role": "user", "content": user_text})
        
        # Get AI response
        with st.status("🤖 Getting AI response...", expanded=True) as status:
            final_response = get_ai_response(user_text)
            status.update(label="✅ Response ready!", state="complete")
        
        # Add AI response
        st.session_state.messages.append({"role": "assistant", "content": final_response})
        st.session_state.pending_speech = final_response
        
        st.rerun()
    
    except sr.UnknownValueError:
        st.error("Could not understand audio!!")
    except sr.WaitTimeoutError:
        st.warning("No speech detected, try again!")
    except sr.RequestError as e:
        st.error(f"Speech recognition error: {e}")
    except Exception as e:
        st.error(f"Something went wrong: {e}")

# Streamlit UI
st.set_page_config(page_title="AI Voice Assistant", page_icon="🗣️")
st.title("AI Voice Assistant")


# Main conversation interface
st.markdown("### Voice Conversation")

col1, col2 = st.columns([2, 1])
with col1:
    if st.button("🎙️ Start Voice Conversation", type="primary", use_container_width=True):
        transcribe_and_respond()

with col2:
    if st.button("Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.pending_speech = ""
        st.rerun()

# Handle pending speech (show prominent speech button)
if st.session_state.pending_speech:
    st.markdown("---")
    speech_html = create_speech_component(st.session_state.pending_speech, auto_play=True)
    st.components.v1.html(speech_html, height=80)
    st.session_state.pending_speech = ""  # Clear after showing

st.markdown("---")

# Display conversation history
if st.session_state.messages:
    st.markdown("### Conversation History")
    
    for i, message in enumerate(st.session_state.messages):
        with st.chat_message(message["role"]):
            st.write(message["content"])
            
            # Add individual speech button for assistant messages
            if message["role"] == "assistant":
                speech_html = create_speech_component(message["content"], auto_play=False)
                st.components.v1.html(speech_html, height=40)



st.markdown("""
<style>
    .stButton > button {
        height: 50px;
        font-size: 16px;
    }
    div[data-testid="stExpander"] details summary {
        font-size: 14px;
    }
</style>
""", unsafe_allow_html=True)
