/**
 * The LiveAvatar Contexts API stores everything in a single `prompt` string.
 * We keep instructions and knowledge base separate in the UI, so we join them
 * with readable markers and split them back apart when loading a context.
 *
 * Contexts created outside this module have no markers; their whole prompt is
 * treated as instructions so nothing is silently dropped.
 */

export const INSTRUCTIONS_MARKER = "### INSTRUCCIONES ###";
export const KNOWLEDGE_MARKER = "### BASE DE CONOCIMIENTOS ###";

export interface KnowledgeParts {
  instructions: string;
  knowledge: string;
}

export const composePrompt = ({
  instructions,
  knowledge,
}: KnowledgeParts): string => {
  const sections: string[] = [];

  const trimmedInstructions = instructions.trim();
  const trimmedKnowledge = knowledge.trim();

  if (trimmedInstructions) {
    sections.push(`${INSTRUCTIONS_MARKER}\n${trimmedInstructions}`);
  }

  if (trimmedKnowledge) {
    sections.push(
      `${KNOWLEDGE_MARKER}\n` +
        "Responde apoyandote unicamente en la informacion de esta seccion. " +
        "Si la respuesta no esta aqui, dilo con naturalidad en lugar de inventarla.\n\n" +
        trimmedKnowledge,
    );
  }

  return sections.join("\n\n");
};

export const parsePrompt = (prompt: string): KnowledgeParts => {
  if (!prompt) {
    return { instructions: "", knowledge: "" };
  }

  const knowledgeAt = prompt.indexOf(KNOWLEDGE_MARKER);
  const instructionsAt = prompt.indexOf(INSTRUCTIONS_MARKER);

  // No markers: a context authored elsewhere. Keep the text intact.
  if (knowledgeAt === -1 && instructionsAt === -1) {
    return { instructions: prompt.trim(), knowledge: "" };
  }

  const instructions =
    instructionsAt === -1
      ? ""
      : prompt
          .slice(
            instructionsAt + INSTRUCTIONS_MARKER.length,
            knowledgeAt === -1 ? undefined : knowledgeAt,
          )
          .trim();

  let knowledge =
    knowledgeAt === -1
      ? ""
      : prompt.slice(knowledgeAt + KNOWLEDGE_MARKER.length).trim();

  // Drop the grounding sentence composePrompt adds so it does not accumulate
  // across save/load cycles.
  knowledge = knowledge
    .replace(/^Responde apoyandote unicamente[^\n]*\n?/, "")
    .trim();

  return { instructions, knowledge };
};
