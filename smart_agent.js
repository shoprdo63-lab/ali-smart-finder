const { ChatOllama } = require("@langchain/ollama");
const { PromptTemplate } = require("@langchain/core/prompts");
const fs = require("fs");
const path = require("path");

const deepseekLLM = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "deepseek-r1:8b",
  temperature: 0.4, // איזון בין יצירתיות לדיוק טכני
});

const outputDir = path.join(__dirname, "extension_output");

// פונקציית חילוץ קבצים ללא הגבלת כמות
function extractAndSaveAll(rawContent) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  // חיפוש כל תבנית של FILE: ומחיקת תגיות Markdown
  const fileRegex = /FILE:\s*([\w\.\/-]+)\n```[\w]*\n([\s\S]*?)```/gi;
  let match;
  let filesCreated = 0;

  while ((match = fileRegex.exec(rawContent)) !== null) {
    const [_, fileName, content] = match;
    const filePath = path.join(outputDir, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content.trim());
    console.log(`🚀 [Unleashed] Created: ${fileName}`);
    filesCreated++;
  }
  return filesCreated;
}

async function runUnleashedFactory() {
  console.log("### Starting Unlimited Agentic Production ###");

  const agentTemplate = `Role: {role}\nProject Context: {context}\nTask: {task}\n
  CRITICAL INSTRUCTION: You are NOT limited to specific files. Create EVERY file necessary for a world-class, professional Chrome Extension.
  If you need 20 files, create 20 files.
  Format each file exactly like this:
  FILE: path/filename.ext
  \`\`\`
  full code
  \`\`\``;

  const prompt = PromptTemplate.fromTemplate(agentTemplate);
  const chain = prompt.pipe(deepseekLLM);

  try {
    // 1. הארכיטקט הראשי - קובע את הסטנדרט ללא הגבלה
    console.log("--- Phase 1: Unlimited Architecture Design ---");
    const masterPlan = await chain.invoke({
      role: "Master Software Architect",
      context: "Building a high-end AliPrice-like ecosystem.",
      task: "Design the complete folder structure. Do not hold back. Include assets, multiple scripts, CSS modules, and specialized workers.",
    });
    extractAndSaveAll(masterPlan.content);

    // 2. סבבי פיתוח (Iterative Development)
    const specializedAgents = [
      {
        name: "Full-Stack Engineer",
        task: "Generate the core logic for ALL files identified in the architecture.",
      },
      {
        name: "UI/UX Aesthetic Lead",
        task: "Enhance all UI components with professional Tailwind CSS and animations.",
      },
      {
        name: "API & Data Specialist",
        task: "Implement complex data scraping and historical price tracking modules.",
      },
      {
        name: "Security & Performance Auditor",
        task: "Refactor all files for maximum speed and Google Store safety.",
      },
    ];

    for (const agent of specializedAgents) {
      console.log(`--- ${agent.name} is building... ---`);
      const result = await chain.invoke({
        role: agent.name,
        context: `Current files in /extension_output. Architecture: ${masterPlan.content}`,
        task: agent.task,
      });
      extractAndSaveAll(result.content);
    }

    // 3. מנגנון ה"סורק" - בודק אם הסוכנים שכחו משהו שהם בעצמם הציעו
    console.log("--- Final Review & Asset Completion ---");
    const finalCheck = await chain.invoke({
      role: "Senior DevOps Engineer",
      context: "Reviewing the generated codebase.",
      task: "Scan the current project. If any referenced file is missing, create it now. Ensure the product is 100% complete.",
    });
    extractAndSaveAll(finalCheck.content);

    console.log(
      "\n### FULL SYSTEM READY: No limits applied. Check /extension_output ###",
    );
  } catch (err) {
    console.error("Critical Failure:", err);
  }
}

runUnleashedFactory();
