import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { langSearch } from "../lib/langsearch";
import { firecrawlScrape } from "../lib/firecrawl";

const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export const orchestrate = action({
  args: {
    chronicleId: v.id("chronicles"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const langSearchKey = process.env.LANGSEARCH_API_KEY;
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    // 0. Log User Message
    await ctx.runMutation(api.messages.send, {
      chronicleId: args.chronicleId,
      role: "user",
      content: args.userMessage,
      type: "text",
    });

    // 0.1 Check and deduct User Credits
    const chronicle = await ctx.runQuery(api.chronicles.getById, { id: args.chronicleId });
    if (!chronicle) throw new Error("Chronicle not found");
    const userId = chronicle.userId;

    const user = await ctx.runQuery(api.users.getUserById, { id: userId });
    if (!user || user.credits < 1) {
      const errorContent = {
        type: "text",
        content: `⚠️ **Insufficient Credits**: You have run out of credits! (Remaining: ${user ? user.credits : 0}). Please top up your credits to continue asking the AI.`
      };
      await ctx.runMutation(api.messages.send, {
        chronicleId: args.chronicleId,
        role: "assistant",
        content: errorContent,
        type: "text",
      });
      return errorContent;
    }

    // 1. Fetch Global Chronicle Context (All Tasks)
    const allTasks = await ctx.runQuery(api.tasks.listByChronicle, { chronicleId: args.chronicleId });
    const tasksSummary = allTasks.map((t, idx) => {
      const depNames = t.dependencies.map(depId => {
        const found = allTasks.find(x => x._id === depId);
        return found ? `"${found.name}"` : "Unknown";
      }).join(', ');
      return `- [Index ${idx}] "${t.name}" (${t.department}, status: ${t.status}, starts: ${new Date(t.startDate).toLocaleDateString()}, ends: ${new Date(t.endDate).toLocaleDateString()}) ${depNames ? `blocks until: [${depNames}]` : ''}`;
    }).join('\n');

    let context = `Available Tasks in Chronicle:\n${tasksSummary || "(No tasks created yet)"}\n\n`;
    
    // 2. Fetch Conversation History (Memory)
    const history = await ctx.runQuery(api.messages.list, { chronicleId: args.chronicleId });
    const lastMessages = history.slice(-8).map(m => {
      const content = typeof m.content === 'object' ? JSON.stringify(m.content) : m.content;
      return `${m.role.toUpperCase()}: ${content}`;
    }).join('\n');
    
    context += `Recent Conversation History:\n${lastMessages}\n\n`;
    
    // Dynamic tracks from the active chronicle
    const depts = chronicle.departments || [
      "Engineering", "Design", "Marketing", "Product", "Legal", "Operations", "Sales", "Security"
    ];
    context += `ACTIVE TIMELINE DEPARTMENTS (You MUST only assign tasks to these department tracks): [${depts.map(d => `"${d}"`).join(", ")}]\n\n`;
    
    // Add current date for date relative calculations
    const todayStr = new Date().toDateString();
    context += `CURRENT DATE FOR DATE-MATH CALCULATIONS: ${todayStr} (Calculations relative to this date!)\n\n`;

    // 3. Web Search decision if user mentions real-world entities/searches
    let extraContext = "";
    try {
      const decisionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `User Request: "${args.userMessage}"
              Context: ${context}
              
              Decide if you need to search the web or scrape. Respond ONLY with a JSON object: 
              {
                "action": "search" | "scrape" | "none", 
                "query": "search query if search", 
                "url": "url if scrape"
              }`
            }]
          }]
        })
      });
      const decisionData = await decisionResponse.json();
      const decisionResult = JSON.parse(decisionData.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, ''));

      if (decisionResult.action === "search" && langSearchKey) {
        const results = await langSearch(decisionResult.query, langSearchKey);
        extraContext = `Web Search Results: ${JSON.stringify(results.webPages?.value?.slice(0, 2))}`;
      } else if (decisionResult.action === "scrape" && firecrawlKey && decisionResult.url) {
        const result = await firecrawlScrape(decisionResult.url, firecrawlKey);
        extraContext = `Scraped Content: ${result.markdown?.slice(0, 3000)}`;
      }
    } catch (e) {
      console.error("Agent Search Decision failed:", e);
    }

    // 4. Final Chronos Orchestration
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are the Chronos Orchestrator, the ultimate temporal planning assistant.
              User Request: "${args.userMessage}"
              Context: ${context}
              ${extraContext}
              
              Analyze the request and return a single JSON object.
              
              FORMATTING INSTRUCTIONS FOR markdown content:
              - Present text response ("content") with beautiful, rich markdown spacing and bullet lists.
              - When listing tasks, phases, or dependencies, ALWAYS use bold bullets and insert double newlines ("\n\n") for clean spacing.
              - Tone should be that of an expert PM / Chief of Staff—highly professional, structured, and strategic.
              - Do NOT use emojis or emoticons anywhere in the response.
              
              DECIDE ON TYPE:
              
              1. If the user wants to CREATE A NEW PLAN, DRAFT A ROADMAP, or BUILD A NEW SCHEDULE:
                 - Set "type" to "create_timeline".
                 - In "content", explain the launch roadmap, phases, critical milestones, and alignment details.
                 - In "code", provide a JavaScript function body that returns a new array of task objects representing the schedule.
                   - Note: DO NOT include the chronicleId in returned tasks; the system will append it automatically.
                   - Dates must be computed as timestamps (numbers in milliseconds) relative to today: ${todayStr}.
                   - The array returned by the JS function should consist of tasks like:
                     {
                       "name": "Design Mockups",
                       "status": "todo" | "in_progress",
                       "startDate": <msTimestamp>,
                       "endDate": <msTimestamp>,
                       "color": "violet" | "emerald" | "amber" | "blue" | "rose" | "pink",
                       "department": ${depts.map(d => `"${d}"`).join(" | ")},
                       "dependencies": [0], // Array of index indices in this returned array that this task depends on (e.g. task 1 depends on task 0). These will be resolved to real database IDs automatically!
                       "assigneeEmails": ["jane@gmail.com"], // Array of strings (collaborator emails). ALWAYS set this if the user assigns tasks to specific members in their query (e.g. "jane@gmail.com handles design", "alex@gmail.com does engineering").
                       "notes": "Description of the task"
                     }
                   - Example returned code:
                     \`\`\`
                     const today = new Date().setHours(9,0,0,0);
                     const day = 24 * 60 * 60 * 1000;
                     return [
                       { "name": "Code Freeze", "status": "todo", "startDate": today, "endDate": today + 5*day, "color": "violet", "department": "Engineering", "dependencies": [], "assigneeEmails": ["jane@gmail.com"], "notes": "Hold feature additions" },
                       { "name": "App Store Review", "status": "todo", "startDate": today + 5*day, "endDate": today + 10*day, "color": "blue", "department": "Product", "dependencies": [0], "assigneeEmails": ["alex@gmail.com"], "notes": "Locked until Code Freeze completes" }
                     ];
                     \`\`\`
                     
              2. If the user reports a DELAY, SCHEDULE SLIP, or DATE ADJUSTMENT (e.g. "frontend API is 4 days late", "shift database migration to start June 5th"):
                 - Set "type" to "reschedule".
                 - In "content", explain the downstream impact: list exactly which dependent tasks will shift, point out any newly created resource constraints, and detail the revised project launch milestone date.
                 - In "code", write a JavaScript function body that takes the current tasks array "data" (where each task has an "_id" string and a "dependencies" array of database ID strings) and returns the modified array with shifted dates.
                   - Shift dates recursively based on dependencies. If task B depends on task A, task B's startDate cannot be before task A's endDate.
                   - Example recursive reschedule code:
                     \`\`\`
                     const delayMs = 4 * 24 * 60 * 60 * 1000;
                     const shiftRecursive = (taskId, shift) => {
                       const t = data.find(x => x._id === taskId);
                       if (!t) return;
                       t.startDate += shift;
                       t.endDate += shift;
                       const children = data.filter(x => x.dependencies?.includes(taskId));
                       for (const child of children) {
                         if (child.startDate < t.endDate) {
                           const childShift = t.endDate - child.startDate;
                           shiftRecursive(child._id, childShift);
                         }
                       }
                     };
                     const target = data.find(t => t.name.toLowerCase().includes("database"));
                     if (target) {
                       shiftRecursive(target._id, delayMs);
                     }
                     return data;
                     \`\`\`
                     
              3. If the user is ASKING QUESTIONS, DOING ANALYSIS, or LISTING BLOCKED TASKS:
                 - Set "type" to "analyze".
                 - In "content", deliver a highly structured project report in markdown. Detail blocker loops, resource utilization, and timeline projections.
                 - No code parameter is required.
                 
              Return your response ONLY as a valid JSON object matching this structure:
              {
                "type": "create_timeline" | "reschedule" | "analyze",
                "content": "Professional markdown response content...",
                "code": "JavaScript function body as a string..."
              }`
            }]
          }]
        })
      });

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        console.error("Gemini API Error Response:", data);
        throw new Error(`Gemini API failed: ${data.error?.message || "Unknown error"}`);
      }
      
      const rawResult = data.candidates[0].content.parts[0].text;
      
      let cleanText = rawResult.trim();
      if (cleanText.startsWith("```")) {
        const lines = cleanText.split("\n");
        if (lines[0].startsWith("```")) lines.shift();
        if (lines[lines.length - 1].startsWith("```")) lines.pop();
        cleanText = lines.join("\n").trim();
      }

      let result;
      try {
        result = JSON.parse(cleanText);
      } catch (e) {
        console.error("FAILED TO PARSE AI RESPONSE JSON. Raw:", rawResult);
        throw new Error("AI response was not formatted as valid JSON: " + e.message);
      }

      // 5. Log the AI response
      await ctx.runMutation(api.messages.send, {
        chronicleId: args.chronicleId,
        role: "assistant",
        content: result,
        type: result.type,
      });

      // Deduct credit only after a successful response
      await ctx.runMutation(api.users.deductCredit, { userId, amount: 1 });

      return result;
    } catch (error) {
      console.error("Chronos orchestration error:", error);
      throw error;
    }
  },
});
