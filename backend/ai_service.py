"""AI problem classification using Gemini 3 Flash via emergentintegrations."""
import json
import os
import re
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# slug -> (display name, likely professional)
CATEGORY_HINTS = {
    "plumbing": "Plumber",
    "electrical": "Electrician",
    "ac_cooling": "AC Technician",
    "appliance_repair": "Appliance Technician",
    "cleaning": "Cleaning Professional",
    "carpentry": "Carpenter",
    "painting": "Painter",
    "pest_control": "Pest Control Professional",
    "furniture_assembly": "Furniture Assembly Expert",
    "installation": "Installation Technician",
    "other": "General Service Professional",
}

DISCLAIMER = (
    "Based on the information provided, this appears to require the professional below. "
    "The final diagnosis will be confirmed by the professional on site."
)


def _system_prompt() -> str:
    cats = "\n".join(f"- {slug}: {pro}" for slug, pro in CATEGORY_HINTS.items())
    return (
        "You are FixIt's problem classifier. Given a customer's description of a household "
        "problem, identify the single most likely service category from this list "
        "(use the exact slug):\n"
        f"{cats}\n\n"
        "You must NEVER claim a guaranteed diagnosis. Respond ONLY with strict JSON, no markdown, "
        "in this exact shape:\n"
        '{"category":"<slug>","likely_professional":"<role>","confidence":<0-1 float>,'
        '"summary":"<one short sentence describing the problem>",'
        '"needs_more_info":<true|false>,"follow_up_question":"<a simple question or empty string>"}\n\n'
        "Set needs_more_info to true and provide a follow_up_question ONLY when the description is too "
        "vague to confidently pick a category. If you are reasonably confident, set needs_more_info false "
        "and follow_up_question to an empty string. If nothing fits, use category 'other'."
    )


def _fallback(text: str) -> dict:
    return {
        "category": "other",
        "category_name": "Other",
        "likely_professional": "General Service Professional",
        "confidence": 0.3,
        "summary": (text or "Household problem")[:120],
        "needs_more_info": True,
        "follow_up_question": "Could you describe the problem in a bit more detail?",
        "disclaimer": DISCLAIMER,
    }


async def classify_problem(text: str, media_count: int = 0) -> dict:
    if not EMERGENT_LLM_KEY:
        return _fallback(text)
    user_text = text or ""
    if media_count:
        user_text += f"\n\n(The customer also attached {media_count} photo/video for context.)"
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify-{uuid.uuid4()}",
            system_message=_system_prompt(),
        ).with_model("gemini", "gemini-3-flash-preview")
        resp = await chat.send_message(UserMessage(text=user_text))
        raw = resp if isinstance(resp, str) else str(resp)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return _fallback(text)
        data = json.loads(match.group(0))
        slug = data.get("category", "other")
        if slug not in CATEGORY_HINTS:
            slug = "other"
        name = slug.replace("_", " ").title().replace("Ac Cooling", "AC & Cooling")
        return {
            "category": slug,
            "category_name": name,
            "likely_professional": data.get("likely_professional") or CATEGORY_HINTS[slug],
            "confidence": float(data.get("confidence", 0.7)),
            "summary": data.get("summary") or (text or "")[:120],
            "needs_more_info": bool(data.get("needs_more_info", False)),
            "follow_up_question": data.get("follow_up_question") or "",
            "disclaimer": DISCLAIMER,
        }
    except Exception:
        return _fallback(text)
