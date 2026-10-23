import json, sys
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[3] if len(sys.argv)>3 else "small", device="cpu", compute_type="int8")
prompt = "Agar aap commercial ya industrial business chala rahe hain, toh bijli ka bill lakhon mein aana koi nayi baat nahi. Niksol Energy. EPC solutions. Tier-1 solar panels."
segs, info = m.transcribe(sys.argv[1], language="ur", word_timestamps=True, initial_prompt=prompt)
words=[]
for s in segs:
    for w in s.words:
        words.append({"w":w.word.strip(),"s":round(w.start,3),"e":round(w.end,3)})
json.dump(words, open(sys.argv[2],"w"), ensure_ascii=False, indent=0)
print(" ".join(f"{w['w']}@{w['s']}" for w in words))
