import { PackedContextSection } from "./types";

export function renderSection(section: PackedContextSection): string {
  return `## ${section.label}\n${section.content.trim()}`;
}

export function renderSections(sections: PackedContextSection[]): string {
  return sections.map(renderSection).join("\n\n");
}
