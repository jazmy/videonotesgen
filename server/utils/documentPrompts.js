const mainGoal = `- Reply in JSON format only 
- IMPORTANT: DO NOT including a top level object.
- Provide comprehensive, detailed, polished notes based on the content provided. 
- Avoid phrases like "The speaker..." or "The discussion...". Instead, directly summarize the content or topic itself.
- Explain like a scientist. Go into detail but always aim for clarity, ensuring non-experts can follow. Dive into the nitty-gritty of the topic, explaining technical jargon in layman’s terms and relating complex concepts in an accessible manner.
- Divide the content into multiple segments, each segment covering a specific topic or discussion point.
- Do not number the segments or topics. 
- For each segment, provide:
   1. A unique header that summarizes the main topic or point of discussion.
   2. Detailed content that encapsulates the key aspects and context of that segment.
   3. The exact timestamp (format: minutes : seconds) indicating when this topic or discussion starts in the content.
- Ensure that each segment is distinct and covers different aspects of the content without overlap.

    Example Format (do not include my example in the results, for reference only):
    [
        {
            "Header": "Overview",
            "Content": "Detailed explanation of Overview including key points",
            "Timestamp": "(00:00:00)"
        },
        {
            "Header": "Detailed Analysis",
            "Content": "Detailed explanation of Detailed Analysis including key points",
            "Timestamp": "(00:02:00)"
        },
        // More entries for subsequent topics or segments
    ]
`;

const summaryGoal = `- Reply in JSON format.
- Don't include a top level object.
- Create a list of key points from the provided content.
- Directly summarize the key point.
- Do not include the speaker's name or refer to the speaker in the summary.
- Include a header summarizing the key point, and detailed explanation as content.

Example Format:
[
  {
    "Header": "Thinking Like a Scientist",
    "Content": "- conducting experiments \\n - analyzing data \\n - revisit opinions based on evidence"
  },
  {
     next example
  }
]
`;

const glossaryGoal = `- Reply in JSON format only.
- IMPORTANT: DO NOT including a top level object.
- Create a glossary of all the essential technical terms and include an easy to understand definition of each one.
- Provide list in alphabetical order by term.
- Format this content into a JSON structure with the following fields for each question: "Term", "Definition"

Example Format:
[
 {
     "Term": "Sunk-cost Fallacy",
     "Definition": “A cognitive bias where people make decisions based on the resources (time, money, effort) they have already invested in a situation, rather than evaluating the current circumstances and potential future outcomes.”,
 },
 {
     next example
 }
]
`;

const faqGoal = `- Reply in JSON format only.
- IMPORTANT: DO NOT including a top level object.
- Create a list of questions asked and potential FAQs, based on the content in the content. 
- Format this content into a JSON structure with the following fields for each question: "Question", "Answer"

Example Format:
[
  {
      "Question": "How can you make your practice session more challenging with friends?",
      "Answer": "Start the practice session by saying, 'If you can't make me cry, I won't value you as a friend.'",
  },
  {
      next example
  }
]

`;

const tldrGoal = `- Reply in JSON format only.
- IMPORTANT: DO NOT including a top level object.
- Create a title for this content
- Create a concise one paragraph summary of the content in the content provided.

Example Format:
[
 {
     "Title": "An informative title for this content",
     "Content": "A concise one paragraph summary of the content in the content",
 }
]

`;

const resourceGoal = `- Reply in JSON format only.
- Extract only external resources mentioned in the context such as books, articles, videos, websites where the learner can find more information.
- Only include resources that are books, articles, websites, videos, or other educational content.
- Do not link to the original video.

Example Format:
[
{
    "ResourceName": "Book - The 7 Habits of Highly Effective People",
    "ResourceDetails": "One of the most inspiring and impactful books ever written, The Seven Habits of Highly Effective People has captivated people for nearly three decades. It has transformed the lives of presidents and CEOs, educators, and parents - millions of people of all ages and occupations. Now, this 30th anniversary edition of the timeless classic commemorates the wisdom of the seven habits with modern additions from Sean Covey. ",
}
]

`;

const blogGoal = `- Reply in JSON format only.
- IMPORTANT: DO NOT including a top level object.
- Create an engaging blog article about this topic. It should include that we are applying concepts to software development.
- Assume the reader has no prior knowledge of the system, provide any supplemental information needed to understand the topic.
- Make it easy enough for a high school student with limited computer science experience to understand.
- Make it general, so that the blog is about the technology presented and not about the presentation itself.

Example Format:
[
{
    "Title": "An engaging title for this Blog: Applying Concepts to Software Development",
    "Content": "The full detailed blog article with markdown headings",
    "Excerpt": "A concise, one sentence tagline for the blog article",
    "Tags": ["tag1", "tag2", "tag3"],
    "Application": "Detailed examples of how you might apply this learning in a real-world scenario",
    "CoverImagePrompt": "A Dalle3 prompt for the cover image"
}
]

`;




const devchecklistRefineGoal = `- Reply in JSON format only.
- IMPORTANT: DO NOT including a top level object.
- COnsolidate this actionable checklist into categories to streamline the information and make it more digestible.
- Each item should not require additional research or understanding. 
= The item should include the action to be taken and the expected outcome.
- Ensure every item is included in the final checklist.


Example Format:
[
    {
        "Category": "How to Learn Better",
        "Items": [
            {
                "Title": "Blink Less",
                "Content": "By training yourself to blink less and maintain a focused gaze, you can improve your ability to focus and maintain mental alertness.",
            },
            {
                "Title": "Stay Focused",
                "Content": "Focusing on what you're trying to learn is crucial and can often cause agitation due to the presence of epinephrine in the system. This agitation is an indication that learning is taking place.",
            }
        ]
    },
    {
        "Category": "Audience",
        "Items": [
            {
                "Title": "Identify Target Audience",
                "Content": "Document the background, needs, and learning preferences of your intended learners."
            },
            {
                "Title": "Personas",
                "Content": "Create detailed personas to represent the different user types that might use your software."
            },
            {
                "Title": "Focus Groups",
                "Content": "Organize focus groups to gather insights and feedback about your software from potential users."
            }
        ]
    }
]

`;

const slidesGoal = `- Reply in JSON format only.
- Create a detailed list of educational slides based on the content in the content for the video speaker to use during their presentation.
- Do not include the title slide or the closing slide.
- Do not number the slides

For each slide in this chunk, provide the following:
Title: Slide Title,
Content: Bullet points explaining the slide content
Visual: Description of visual elements as a detailed and safe DallE prompt. The visual should have no text included in the design, 
Explanation: Pretend you are the presenter in the video, what would you say to the audience during this slide. This should be a script the presenter can read outloud including all the information about the slide.
Timestamp: Location of the video where context is referenced

Example Format (do not include my example in the results, for reference only):
[
           
            {
   "Title": "Thinking Like a Scientist",
   "Content": "- conducting experiments \\n - analyzing data \\n - revisit opinions based on evidence",
   "Visual": "An image of a scientist conducting experiments",
   "Explaination": "Scientists approach problems with curiosity by asking questions and forming hypotheses, then they conduct experiments or observations, analyze data to draw conclusions, and remain open to revising their views based on evidence, ultimately communicating their findings to the scientific community, which ensures the ongoing refinement of scientific knowledge.",
   "Timestamp": "(3:13)"
},
{
  next example
}
]

`;

module.exports = {
  mainGoal,
  summaryGoal,
  glossaryGoal,
  faqGoal,
  tldrGoal,
  resourceGoal,
  blogGoal,
  slidesGoal,
  devchecklistRefineGoal,
};
