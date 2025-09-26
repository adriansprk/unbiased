import OpenAI from 'openai';
import config from '../config';
import { AnalysisResults } from '../types';
import logger from '../lib/logger';

/**
 * Maximum number of retry attempts for API calls
 */
const MAX_RETRIES = 3;

/**
 * Base delay (in ms) for exponential backoff
 */
// const BASE_DELAY = 1000;

/**
 * Maximum characters to send to OpenAI for analysis
 * This applies only to the text content, not the prompts themselves
 */
const MAX_CHARS = 100000; // Approximately 20,000 words

// Initialize OpenAI client with API key from config
const openai = new OpenAI({
  apiKey: config.ai.openaiApiKey,
  maxRetries: MAX_RETRIES,
});

/**
 * Safely extracts content from OpenAI response, providing fallback value if structure is invalid
 *
 * @param response - The response from OpenAI API
 * @param fallback - Fallback value to return if content cannot be extracted
 * @returns Content string or fallback value
 */
function safelyExtractContent(response: any, fallback: string): string {
  if (!response) {
    return fallback;
  }

  const choices = response.choices || [];
  if (choices.length === 0) {
    return fallback;
  }

  const message = choices[0]?.message;
  if (!message) {
    return fallback;
  }

  return message.content || fallback;
}

/**
 * Attempts to extract valid JSON from a potentially malformed response
 *
 * @param content - The raw response content from OpenAI
 * @returns Parsed JSON object or null if parsing fails
 */
function extractJsonFromContent(content: string): any {
  try {
    // First try direct JSON parsing
    return JSON.parse(content);
  } catch {
    // If direct parsing fails, try to clean the response
    logger.debug('Attempting to clean JSON response...');

    try {
      // Check if response contains a code block with JSON
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        logger.debug('Found JSON in code blocks, extracting...');
        const jsonContent = codeBlockMatch[1].trim();
        return JSON.parse(jsonContent);
      }

      // Try to extract JSON object using regex
      const objectMatch = content.match(/(\{[\s\S]*\})/);
      if (objectMatch && objectMatch[1]) {
        const jsonContent = objectMatch[1].trim();
        const parsed = JSON.parse(jsonContent);
        logger.debug('Extracted JSON object from content');
        return parsed;
      }

      // Try to extract JSON array using regex
      const arrayMatch = content.match(/(\[[\s\S]*\])/);
      if (arrayMatch && arrayMatch[1]) {
        const jsonContent = arrayMatch[1].trim();
        const parsed = JSON.parse(jsonContent);
        logger.debug('Extracted JSON array from content');
        return parsed;
      }
    } catch {
      // Ignore cleaning errors and fall through to the warning
    }

    logger.warn('Could not extract valid JSON from OpenAI response');
    return null;
  }
}

/**
 * Perform factual claims, bias, and slant analysis on article content using OpenAI
 *
 * @param title - The title of the article
 * @param text - The text content of the article
 * @param language - The language to generate the response in ('en' or 'de')
 * @returns Analysis results containing claims, report, and slant
 * @throws Error if API call fails after retries
 */
export async function performAnalysisWithOpenAI(
  title: string,
  text: string,
  language: string = 'en'
): Promise<AnalysisResults> {
  // Ensure we have the necessary API key
  if (!config.ai.openaiApiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  // Validate language parameter
  const validLanguage = ['en', 'de'].includes(language) ? language : 'en';

  // Determine the language instruction text
  const languageInstruction = validLanguage === 'de' ? 'German' : 'English';

  // Truncate text if it's too long to optimize token usage
  // Note: This truncation applies only to the article text, not to our prompt templates
  const truncatedText =
    text.length > MAX_CHARS
      ? text.substring(0, MAX_CHARS) + '...[truncated for token optimization]'
      : text;

  logger.debug(
    `Article text length: ${text.length} characters, truncated to ${truncatedText.length} characters for analysis with language: ${validLanguage}`
  );

  try {
    // Use a combined prompt that performs all analyses in a single API call
    const combinedPrompt = `
You are a Comprehensive News Article Analyzer AI assistant. Your primary function is to meticulously analyze news articles for political slant, factual claims, and potential bias, providing a structured JSON output suitable for a media literacy tool. Accuracy, neutrality, clear sourcing, and strict adherence to the output format are paramount.

**Input Article:**

*   **Title:** "${title}"
*   **Text:**
    """
    ${truncatedText}
    """

**Your Task (Approach Systematically):**

First, thoroughly read and understand the article.
Then, proceed through the following analytical steps to construct your JSON output:
1.  Determine its overall political slant or perspective.
2.  Identify the most significant objectively verifiable factual claims.
3.  Assess the article for potential indicators of bias across several dimensions.

You must generate a **single, unified JSON object** containing the complete analysis as described below.

**Output Requirements:**

Your entire output **must be a single, valid JSON object** and nothing else. This object MUST contain exactly three top-level keys: \`slant\`, \`claims\`, and \`report\`. The value for each key must be a JSON object structured precisely as follows:

---

**1. Slant Classification (for the \`slant\` key):**

*   **Your Role:** You are a Political Spectrum Classifier AI, designed to categorize news articles based on their overall perspective and framing relative to common ideological or topical viewpoints. Your task is to provide a concise, standardized classification for a media literacy tool. Recognize that slant classification can be complex and context-dependent. Base your judgment strictly on the evidence within the provided text.
*   **Task:** Based on a holistic analysis of the article's language, framing, source selection, topic focus, and conclusions, determine the most fitting "slant" or perspective category.
*   **Slant Categories:** (Consider these primary categories. Select the *single best fit*):
    *   \`Liberal/Progressive\`: Focuses on social justice, government intervention, environmentalism, critiques of traditional power structures.
    *   \`Conservative\`: Emphasizes tradition, individual liberty, free markets, limited government, national security.
    *   \`Centrist/Moderate\`: Seeks balance, avoids strong ideological language, may present compromises or multiple sides without strong favouritism.
    *   \`Libertarian\`: Prioritizes individual liberty, minimal government, free markets, skepticism of authority.
    *   \`Populist\`: Focuses on "the people" vs. "the elite," often nationalist, may be left or right leaning on specific issues.
    *   \`Establishment\`: Reflects mainstream institutional views (government, major corporations, established political parties).
    *   \`Nonpartisan/Neutral\`: Primarily fact-reporting, avoids advocacy, presents information straightforwardly.
    *   \`Business-oriented\`: Focuses on markets, finance, corporate perspectives, economic impacts.
    *   \`Academic/Scientific\`: Presents research findings, uses technical language, focuses on methodology and data.
    *   \`Advocacy/Issue-focused\`: Strongly promotes a specific cause or viewpoint on a particular issue.
    *   \`Other\`: If none of the above fit well.
*   **Required JSON Structure for \`slant\` value (an object):**
    \`\`\`json
    {
      "category": "(String) The chosen slant category (exact string from list above)",
      "confidence": "(String) Your confidence: 'High', 'Medium', or 'Low'",
      "rationale": "(String) Brief (2-3 sentences) justification citing specific article aspects."
    }
    \`\`\`
*   **Example \`slant\` value:**
    \`\`\`json
    {
      "category": "Academic/Scientific",
      "confidence": "High",
      "rationale": "The article focuses heavily on explaining the results of a specific scientific study published in 'Cell', quotes an immunologist extensively to explain the mechanism, and largely avoids political or broader societal implications, fitting the Academic/Scientific profile."
    }
    \`\`\`
*   **Instructions:**
    *   Choose only one \`category\`.
    *   Base your choice on the overall tone and content, not just isolated phrases.
    *   **For \`rationale\`, explain how the article's initial overall impression – considering its general tone, the primary topics it addresses, and its apparent framing approach – collectively points to the chosen slant category.**
    *   Your \`confidence\` level should be 'High' if multiple indicators (general tone, main topic focus, apparent framing) strongly and consistently align with the chosen \`category\`. 'Medium' if indicators are present but less pervasive, or if some minor counter-indicators exist. 'Low' if indicators are sparse, subtle, or significantly mixed, making the classification less certain.

---

**2. Factual Claims Extraction (for the \`claims\` key):**

*   **Your Role:** You are a meticulous Fact-Checking Analyst AI assistant. Your primary function is to dissect news articles and identify objectively verifiable factual claims for a media literacy tool aimed at helping users critically evaluate content. Accuracy, neutrality, and clear sourcing are paramount.
*   **Task:** Identify the **5 to 10 most significant factual claims** presented in the article text. A factual claim is a statement presented as objective reality that could, in principle, be proven true or false with evidence. Avoid opinions, predictions, subjective descriptions, or statements of belief.
*   **Required JSON Structure for \`claims\` value (an object containing an array):**
    \`\`\`json
    {
      "factual_claims": [ // Array of claim objects
        {
          "claim_topic": "(String) Very short (2-5 words) descriptive label/topic.",
          "claim_statement": "(String) Concise, neutral summary of the claim in your own words.",
          "quote_from_article": "(String) Exact verbatim quote (sentence/phrase) from article supporting the statement.",
          "significance_rationale": "(String) Brief (1-2 sentences) explanation of the claim's significance *to the article's central argument or narrative*."
        }
        // ... potentially 4 to 9 more claim objects
      ]
    }
    \`\`\`
*   **Example \`claims\` value:**
    \`\`\`json
    {
      "factual_claims": [
        {
          "claim_topic": "Macrophage Role",
          "claim_statement": "Specific immune cells are trained in regional lymph nodes after initial vaccination.",
          "quote_from_article": "Nach der ersten Impfung werden Makrophagen, das sind spezialisierte Immunzellen, in den regionalen Lymphknoten darauf abgerichtet, andere Immunzellen zur Herstellung von spezifischen Antikörpern zu stimulieren.",
          "significance_rationale": "This claim explains the core biological mechanism discussed in the article, which is central to its argument about vaccination effectiveness."
        }
        // ... more claims
      ]
    }
    \`\`\`
*   **Instructions:**
    *   Focus strictly on verifiable statements presented as fact in the text.
    *   Prioritize claims central to the article's main point or arguments.
    *   Ensure \`quote_from_article\` directly supports \`claim_statement\`.
    *   **For \`significance_rationale\`, explain why the claim is important to *this article's specific argument or narrative structure*.**

---

**3. Bias Analysis (for the \`report\` key):**

*   **Your Role:** You are an expert Media Bias Analyst AI assistant, trained in identifying nuances in journalistic presentation. Your goal is to provide users of a media literacy tool with a clear, evidence-based assessment of potential biases within an article, empowering them to understand *how* information is framed. Your analysis must be objective, detailed, and directly tied to the text. **For the purpose of this analysis, "objectivity" refers to a presentation style that: Clearly distinguishes between factual reporting and opinion/analysis; Presents verifiable information accurately and in appropriate context; Represents multiple significant perspectives on contentious issues fairly and without misrepresentation; Avoids language and framing techniques that unduly favor one perspective or seek to manipulate the reader's emotions or conclusions; Is transparent about sources.**
*   **Task:** Analyze the provided article text for potential indicators of bias across the specified dimensions. For each dimension, provide a concise text summary of your findings AND assign a single-word status label reflecting your assessment. Also provide an overall assessment and detailed findings with evidence.
*   **Bias Dimensions to Consider:**
    1.  \`Word Choice / Tone\`: Loaded language, emotive words, minimization/maximization, sarcasm, neutrality.
    2.  \`Framing / Emphasis\`: What is highlighted vs. downplayed? What angle is taken? What context is provided or omitted? Is the narrative structured to favor a particular conclusion?
    3.  \`Source Selection\`: Are sources named and credible? Is there a diversity of relevant expert/affected perspectives? Are sources presented neutrally, or are some favored/disparaged?
    4.  \`Fairness / Balance\`: Does the article represent different significant viewpoints or stakeholders fairly and accurately? Does it present counterarguments or alternative perspectives adequately, especially on contentious issues?
    5.  \`Headline / Title Bias\`: Does the title accurately reflect the article's content and nuances, or is it sensationalized, misleading, or clearly promoting an angle?
*   **Required JSON Structure for \`report\` value (an object containing \`bias_analysis\`):**
    \`\`\`json
{
  "bias_analysis": {
    "overall_assessment": "(String) A synthesized (3-4 sentences) summary. How do the various dimensions (word choice, framing, sources, etc.) interact to shape the article's overall presentation? What is the predominant impression left on the reader regarding objectivity and the main message conveyed, considering all analyzed aspects?",
    "overall_bias_level": "(String) Your single-word assessment: 'Low', 'Moderate', or 'High'",
    "dimension_summaries": {
      "Word Choice / Tone": {
        "summary": "(String) 1-2 sentence summary assessment for this dimension.",
        "status": "(String) Your single-word assessment: 'Balanced', 'Caution', 'Biased', or 'Unknown'."
      },
      "Framing / Emphasis": {
        "summary": "(String) 1-2 sentence summary...",
        "status": "(String) Your single-word assessment: 'Balanced', 'Caution', 'Biased', or 'Unknown'."
      },
      "Source Selection": {
        "summary": "(String) 1-2 sentence summary...",
        "status": "(String) Your single-word assessment: 'Balanced', 'Caution', 'Biased', or 'Unknown'."
      },
      "Fairness / Balance": {
        "summary": "(String) 1-2 sentence summary...",
        "status": "(String) Your single-word assessment: 'Balanced', 'Caution', 'Biased', or 'Unknown'."
      },
      "Headline / Title Bias": {
        "summary": "(String) 1-2 sentence summary...",
        "status": "(String) Your single-word assessment: 'Balanced', 'Caution', 'Biased', or 'Unknown'."
      }
      // Keys MUST remain exactly as shown in English. Status value MUST be one of the specified English words.
    },
    "detailed_findings": [ // Array of specific finding objects
      {
        "dimension": "(String) Bias dimension name (e.g., 'Word Choice / Tone').", // Must be one of the 5 dimensions listed above.
        "observation": "(String) Clear description of the specific observation *relevant to potential bias or imbalance*.",
        "quote_evidence": "(String) Exact quote demonstrating observation (or 'N/A - Omission' if bias is shown by what *isn't* present).",
        "explanation": "(String) Concise (2-4 sentences) explanation of why this observation indicates balance, potential bias, or clear bias, linking evidence to the concept."
      }
      // ... potentially 2 to 5 more finding objects, focusing on the most impactful examples.
    ]
  }
}
    \`\`\`
*   **Example \`report\` value (Illustrative - showing updated \`overall_assessment\`):**
    \`\`\`json
{
  "bias_analysis": {
    "overall_assessment": "The article's consistent framing towards a particular solution, coupled with a source selection that heavily favors proponents of that solution, creates a persuasive but ultimately one-sided narrative. While the direct language remains largely neutral, the omission of significant counter-arguments or alternative perspectives makes the piece function more as advocacy than a balanced report, leading to a predominant impression of bias towards the promoted solution.",
    "overall_bias_level": "Moderate",
    "dimension_summaries": {
      "Word Choice / Tone": {
        "summary": "Language is largely neutral, avoiding overtly loaded terms, though some adjectives subtly favor one side.",
        "status": "Balanced"
      },
      "Framing / Emphasis": {
        "summary": "The article heavily emphasizes the negative impacts on group A while downplaying potential benefits mentioned for group B.",
        "status": "Biased"
       },
      "Source Selection": {
        "summary": "Sources predominantly represent viewpoint X, with only brief, unattributed mentions of opposing views.",
        "status": "Biased"
      },
      "Fairness / Balance":{
        "summary": "Alternative perspectives are mentioned but not explored in depth or given comparable weight.",
        "status": "Caution"
      },
      "Headline / Title Bias": {
        "summary": "The headline accurately reflects the main topic but uses slightly emotive language consistent with the article's angle.",
        "status": "Caution"
      }
    },
    "detailed_findings": [
      {
        "dimension": "Source Selection",
        "observation": "Exclusive reliance on experts from Organization Y, known for advocating viewpoint X.",
        "quote_evidence": "'As Dr. Jane Doe from Organization Y explains, the only viable solution is policy Z.' No experts with alternative views were quoted.",
        "explanation": "Presenting only sources aligned with one viewpoint creates a biased impression by omitting credible alternative perspectives on the solution."
      },
      {
        "dimension": "Framing / Emphasis",
        "observation": "Article dedicates 5 paragraphs to problems caused by the policy but only one sentence to potential benefits.",
        "quote_evidence": "N/A - Omission",
        "explanation": "The disproportionate emphasis on negative aspects, while omitting detailed discussion of positives, frames the policy unfavorably and indicates bias."
      }
      // ... more findings
    ]
  }
}
    \`\`\`
*   **Instructions for Bias Analysis:**
    *   Be specific and evidence-based. Avoid generalizations.
    *   Provide direct \`quote_evidence\` for *every* detailed finding, unless the observation concerns an omission (use 'N/A - Omission').
    *   Provide clear \`explanation\` linking evidence to the bias/balance concept for each finding. Explain *how* the evidence supports the observation.
    *   Provide **3-6 \`detailed_findings\`** in total, focusing on the most impactful examples. **Crucially, ensure your selection of detailed findings provides specific evidence supporting the status assigned to *each* of the five dimensions in the \`dimension_summaries\`**. If a dimension is rated 'Caution' or 'Biased', there **MUST** be at least one \`detailed_finding\` object illustrating the primary reason(s) for that rating for that specific dimension. If a dimension is rated 'Balanced', a detailed finding is optional but helpful if there's a notable example of good practice.
    *   For each dimension in \`dimension_summaries\`, provide a concise text \`summary\` AND a single-word \`status\`.
    *   **The \`status\` MUST be one of the following exact English strings, based on these criteria:**
        *   \`'Balanced'\`: Assign this status if the dimension shows adherence to neutral, objective reporting standards as defined in "Your Role." Examples: Language is precise and neutral; framing presents multiple perspectives fairly; sources are diverse and attributed appropriately; headline accurately reflects content.
        *   \`'Caution'\`: Assign this status if the dimension shows *potential* or *minor* deviations from neutrality that a reader should be aware of, but aren't overtly manipulative. Examples: Occasional use of mildly emotive language; framing gives slightly more weight to one perspective; source diversity could be better but isn't entirely one-sided; headline is factually correct but hints at an angle.
        *   \`'Biased'\`: Assign this status if the dimension shows *significant* or *clear* deviations from neutrality, suggesting an intentional slant or manipulative techniques. Examples: Heavy use of loaded/emotive language; framing strongly favors one viewpoint while ignoring/misrepresenting others; sources are heavily skewed or presented unfairly; headline is misleading or sensationalized.
        *   \`'Unknown'\`: Assign this status ONLY if the specific dimension is *not applicable* or *cannot be meaningfully assessed* due to the nature or brevity of the article text (e.g., a very short, purely factual news bulletin might offer no basis to assess "Source Selection"). Do not use 'Unknown' simply because the assessment is complex or nuanced; in such cases, choose 'Balanced' or 'Caution' and explain the complexity in the summary.
    *   **The assigned \`status\` for each dimension MUST be directly and primarily supported by the observations and evidence you list in the \`detailed_findings\` section for that dimension. If \`detailed_findings\` show mixed evidence (some good, some problematic), weigh the impact and pervasiveness of the problematic elements to determine \`Caution\` vs. \`Biased\`. If findings are predominantly neutral or positive, choose \`Balanced\`.**
    *   Ensure your text \`summary\` for each dimension accurately reflects the findings and justifies the assigned \`status\`.
    *   Maintain a neutral, analytical tone throughout your analysis summaries and explanations.
    *   Your \`dimension_summaries\` object MUST include entries for *ALL FIVE* listed "Bias Dimensions to Consider", in the same order they are listed.
    *  **Self-Correction Check:** Before finalizing your JSON output, verify that for every dimension marked 'Caution' or 'Biased' in \`dimension_summaries\`, you have included at least one corresponding entry in the \`detailed_findings\` array.
---

**Crucial Overall Formatting Instructions:**

*   Your **entire response** must be ONLY the single, valid JSON object described above, starting with \`{\` and ending with \`}\`.
*   There must be **absolutely no text**, explanations, apologies, or introductory/concluding remarks before the opening \`{\` or after the closing \`}\`.
*   **Do not** wrap the final JSON output in Markdown code fences (like \`\`\`json ... \`\`\`).
*   Ensure all strings within the JSON are properly escaped where necessary according to JSON rules.
*   The final output object must contain the top-level keys \`slant\`, \`claims\`, and \`report\`.
*   Within the \`report.bias_analysis.dimension_summaries\` object, the keys (dimension names like "Word Choice / Tone") MUST remain in English. The \`status\` value MUST be one of the exact English strings: 'Balanced', 'Caution', 'Biased', 'Unknown'.
*   Within the \`slant\` object, the \`category\` value MUST remain one of the predefined English category names (e.g., 'Liberal/Progressive', 'Conservative', etc.).
*   **Language Instruction:** Generate all text content (summaries, rationales, explanations) in ${languageInstruction}. All JSON keys, slant category names, and dimension status labels ('Balanced', 'Caution', 'Biased', 'Unknown') MUST remain in English regardless of the response language.
    `;

    const combinedResponse = await openai.chat.completions.create({
      model: config.ai.modelName,
      messages: [{ role: 'user', content: combinedPrompt }],
      temperature: 0.3, // Lower temperature for more focused, deterministic responses
    });

    const combinedContent = safelyExtractContent(combinedResponse, 'Failed to generate analysis.');
    const cleanedJSON = extractJsonFromContent(combinedContent);

    try {
      // Parse the cleaned JSON into a complete analysis results object
      const parsedResults = cleanedJSON;

      return {
        claims: parsedResults.claims || {},
        report: parsedResults.report || {},
        slant: parsedResults.slant || {},
      };
    } catch {
      const errorMessage = `OpenAI API error: Failed to parse combined analysis response - ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    // Handle errors with useful information
    let errorMessage = 'Unknown error during OpenAI analysis';

    if (error instanceof Error) {
      errorMessage = `OpenAI API error: ${error.message}`;
    }

    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export default { performAnalysisWithOpenAI };
