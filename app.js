// ⚠️ For a real app, never expose API keys in frontend JS.
// Use a backend proxy (Node/Express or Cloudflare Worker) in production.
const API_KEY = "YOUR_ANTHROPIC_API_KEY"; // replace this

const PROMPTS = {
  rewrite: (resume, job) => `You are an expert resume writer. Rewrite the following resume to be optimized for this job description. Keep it professional and factual — don't invent experience.

JOB DESCRIPTION:
${job}

RESUME:
${resume}

Return only the rewritten resume, ready to copy.`,

  score: (resume, job) => `You are an ATS (Applicant Tracking System) expert. Score this resume against the job description from 0–100, then explain what's good and what's missing.

JOB DESCRIPTION:
${job}

RESUME:
${resume}

Format: Score: XX/100, then bullet points for strengths and gaps.`,

  keywords: (resume, job) => `List the important keywords and skills from this job description that are MISSING from the resume. Group them by category (technical skills, soft skills, certifications, etc.).

JOB DESCRIPTION:
${job}

RESUME:
${resume}`,

  cover: (resume, job) => `Write a compelling, personalized cover letter for this job based on the resume. Keep it to 3 paragraphs. Don't be generic.

JOB DESCRIPTION:
${job}

RESUME:
${resume}`
};

const TITLES = {
  rewrite: "Rewritten Resume",
  score: "ATS Score & Analysis",
  keywords: "Missing Keywords",
  cover: "Cover Letter"
};

async function runAI(mode) {
  const resume = document.getElementById("resume").value.trim();
  const job = document.getElementById("job").value.trim();

  if (!resume || !job) {
    alert("Please fill in both your resume and the job description.");
    return;
  }

  const loading = document.getElementById("loading");
  const output = document.getElementById("output");
  loading.classList.remove("hidden");
  output.classList.add("hidden");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          { role: "user", content: PROMPTS[mode](resume, job) }
        ]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "No response received.";

    document.getElementById("output-title").textContent = TITLES[mode];
    document.getElementById("output-content").innerText = text;
    output.classList.remove("hidden");
  } catch (err) {
    alert("Error calling Claude API: " + err.message);
  } finally {
    loading.classList.add("hidden");
  }
}

function copyOutput() {
  const text = document.getElementById("output-content").innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("copy-btn");
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 2000);
  });
}