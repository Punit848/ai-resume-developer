// Paste your Gemini API key below (keep the quotes)
const API_KEY = "YOUR_GEMINI_KEY_HERE";

const PROMPTS = {
  rewrite: (r,j) => `You are an elite resume writer. Rewrite this resume to be perfectly tailored for the job below. Use strong action verbs, quantify achievements where possible, and ensure ATS compatibility. Keep all facts true.\n\nJOB:\n${j}\n\nRESUME:\n${r}\n\nReturn only the polished resume.`,
  score: (r,j) => `You are an ATS expert. Score this resume 0-100 for the job below. Start your response with exactly "SCORE: XX" on the first line, then give clear bullet points for strengths and gaps.\n\nJOB:\n${j}\n\nRESUME:\n${r}`,
  keywords: (r,j) => `List important keywords from the job description MISSING from this resume. List each keyword on its own line starting with "- ".\n\nJOB:\n${j}\n\nRESUME:\n${r}`,
  cover: (r,j) => `Write a compelling 3-paragraph cover letter for this role based on the resume. Be specific, confident, and genuine.\n\nJOB:\n${j}\n\nRESUME:\n${r}`,
  linkedin: (r,j) => `Write a compelling LinkedIn About section for this person. Max 300 words. First-person, professional but human.\n\nTARGET ROLE:\n${j}\n\nRESUME:\n${r}`,
  coach: (ans) => `You are an expert interview coach. Analyze this interview answer and give specific, actionable feedback. Focus on: clarity, structure (STAR method), what was strong, what to improve, and give a better example answer.\n\nANSWER:\n${ans}`,
  interview_feedback: (q,a) => `You are a senior hiring manager. Evaluate this interview answer.\n\nQUESTION: ${q}\nANSWER: ${a}\n\nGive: 1) Score out of 10, 2) What was good, 3) What to improve, 4) A stronger version of the answer.`,
  generate_questions: (role) => `Generate 6 realistic interview questions for a ${role} position. Format each as:\nQ: [question]\nCAT: [category like Behavioral/Technical/HR]\n\nMake them specific to the role.`
};

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
}

async function runAI(mode) {
  const resume = document.getElementById("resume")?.value.trim();
  const job = document.getElementById("job")?.value.trim();
  const practiceAns = document.getElementById("practice-answer")?.value.trim();

  if (mode === "coach") {
    if (!practiceAns) { alert("Please type an answer to practice first."); return; }
    const loading = document.getElementById("tips-loading");
    loading.classList.add("show");
    try {
      const result = await callGemini(PROMPTS.coach(practiceAns));
      document.getElementById("tips-content").textContent = result;
      document.getElementById("tips-output").classList.add("show");
    } catch(e) {
      alert("Error: " + e.message);
    } finally {
      loading.classList.remove("show");
    }
    return;
  }

  if (!resume || !job) { alert("Please fill in both your resume and the job description."); return; }

  const loading = document.getElementById("resume-loading");
  loading.classList.add("show");
  document.getElementById("resume-output").classList.remove("show");

  try {
    const result = await callGemini(PROMPTS[mode](resume, job));
    const titles = {
      rewrite: "✨ Rewritten Resume",
      score: "📊 ATS Score Analysis",
      keywords: "🔍 Missing Keywords",
      cover: "📝 Cover Letter",
      linkedin: "💼 LinkedIn Summary"
    };

    document.getElementById("output-title-text").textContent = titles[mode];
    document.getElementById("ats-score-section").style.display = "none";
    document.getElementById("keyword-section").style.display = "none";

    if (mode === "score") {
      const scoreMatch = result.match(/SCORE:\s*(\d+)/i);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[1]);
        const ring = document.getElementById("score-ring");
        ring.textContent = score;
        ring.className = "score-ring " + (score >= 70 ? "good" : score >= 50 ? "mid" : "low");
        document.getElementById("score-bar").style.width = score + "%";
        document.getElementById("ats-score-section").style.display = "block";
        document.getElementById("output-content").textContent = result.replace(/SCORE:\s*\d+\n?/i, "").trim();
      } else {
        document.getElementById("output-content").textContent = result;
      }
    } else if (mode === "keywords") {
      const keywords = result.match(/^-\s+.+/gm)?.map(k => k.replace(/^-\s+/, "")) || [];
      if (keywords.length) {
        const grid = document.getElementById("keyword-chips");
        grid.innerHTML = keywords.map(k => `<span class="chip missing">${k}</span>`).join("");
        document.getElementById("keyword-section").style.display = "block";
      }
      document.getElementById("output-content").textContent = result;
    } else {
      document.getElementById("output-content").textContent = result;
    }

    document.getElementById("resume-output").classList.add("show");
    document.getElementById("resume-output").scrollIntoView({ behavior: "smooth", block: "nearest" });

  } catch(e) {
    alert("Error: " + e.message);
  } finally {
    loading.classList.remove("show");
  }
}

function copyOutput() {
  navigator.clipboard.writeText(document.getElementById("output-content").textContent);
  showToast("Copied to clipboard!");
}

function copyTipsOutput() {
  navigator.clipboard.writeText(document.getElementById("tips-content").textContent);
  showToast("Copied!");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

const QUESTIONS = {
  general: [
    {q:"Tell me about yourself.", cat:"HR"},
    {q:"Why do you want to work here?", cat:"HR"},
    {q:"What are your greatest strengths?", cat:"HR"},
    {q:"What is your biggest weakness?", cat:"HR"},
    {q:"Where do you see yourself in 5 years?", cat:"HR"},
    {q:"Why are you leaving your current job?", cat:"HR"},
  ],
  behavioral: [
    {q:"Tell me about a time you handled a difficult coworker.", cat:"Behavioral"},
    {q:"Describe a situation where you failed and what you learned.", cat:"Behavioral"},
    {q:"Give an example of when you went above and beyond.", cat:"Behavioral"},
    {q:"Tell me about a time you had to meet a tight deadline.", cat:"Behavioral"},
    {q:"Describe a conflict with your manager and how you resolved it.", cat:"Behavioral"},
    {q:"Tell me about a time you had to learn something quickly.", cat:"Behavioral"},
  ],
  technical: [
    {q:"Explain a complex technical concept to a non-technical person.", cat:"Technical"},
    {q:"How do you stay updated with the latest technology trends?", cat:"Technical"},
    {q:"Describe your debugging process when something breaks in production.", cat:"Technical"},
    {q:"How do you approach code reviews?", cat:"Technical"},
    {q:"Tell me about a technical project you're most proud of.", cat:"Technical"},
    {q:"How do you handle technical debt?", cat:"Technical"},
  ],
  leadership: [
    {q:"Tell me about a time you led a team through a difficult situation.", cat:"Leadership"},
    {q:"How do you motivate team members who are underperforming?", cat:"Leadership"},
    {q:"Describe your leadership style.", cat:"Leadership"},
    {q:"How do you handle disagreements within your team?", cat:"Leadership"},
  ],
};

let currentQuestion = "";
let timerInterval = null;
let timerSeconds = 0;

function loadQuestions(type) {
  const customBox = document.getElementById("custom-role-box");
  if (type === "custom") {
    customBox.style.display = "block";
    const role = document.getElementById("custom-role").value.trim();
    if (!role) return;
    generateCustomQuestions(role);
    return;
  }
  customBox.style.display = "none";
  renderQuestions(QUESTIONS[type] || []);
}

async function generateCustomQuestions(role) {
  const loading = document.getElementById("interview-loading");
  loading.classList.add("show");
  try {
    const result = await callGemini(PROMPTS.generate_questions(role));
    const lines = result.split("\n");
    const questions = [];
    let currentQ = "", currentCat = "";
    for (const line of lines) {
      if (line.startsWith("Q:")) currentQ = line.replace("Q:", "").trim();
      if (line.startsWith("CAT:")) {
        currentCat = line.replace("CAT:", "").trim();
        if (currentQ) { questions.push({q: currentQ, cat: currentCat}); currentQ = ""; }
      }
    }
    renderQuestions(questions.length ? questions : [{q: result, cat: role}]);
  } catch(e) {
    alert("Error: " + e.message);
  } finally {
    loading.classList.remove("show");
  }
}

function renderQuestions(qs) {
  const grid = document.getElementById("questions-grid");
  grid.innerHTML = qs.map((item, i) => `
    <div class="question-card" onclick="openModal('${item.cat}', \`${item.q.replace(/`/g, "'")}\`)">
      <div class="q-number">Question ${i + 1}</div>
      <div class="q-text">${item.q}</div>
      <div class="q-category">${item.cat}</div>
    </div>`).join("");
}

function openModal(cat, question) {
  currentQuestion = question;
  document.getElementById("modal-category").textContent = cat.toUpperCase();
  document.getElementById("modal-question").textContent = question;
  document.getElementById("modal-answer").value = "";
  document.getElementById("modal-output").classList.remove("show");
  document.getElementById("modal").classList.add("show");
  resetTimer();
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
  clearInterval(timerInterval);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  document.getElementById("modal-timer").textContent = "0:00";
  document.getElementById("timer-btn").textContent = "▶ Start";
}

function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  document.getElementById("timer-btn").textContent = "⏸ Reset";
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    document.getElementById("modal-timer").textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 1000);
}

async function getInterviewFeedback() {
  const answer = document.getElementById("modal-answer").value.trim();
  if (!answer) { alert("Please type your answer first."); return; }
  const loading = document.getElementById("modal-loading");
  loading.classList.add("show");
  try {
    const result = await callGemini(PROMPTS.interview_feedback(currentQuestion, answer));
    document.getElementById("modal-content").textContent = result;
    document.getElementById("modal-output").classList.add("show");
  } catch(e) {
    alert("Error: " + e.message);
  } finally {
    loading.classList.remove("show");
  }
}
