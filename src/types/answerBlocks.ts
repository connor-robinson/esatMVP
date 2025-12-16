export type HeadingBlock = { type: 'heading'; level: 1|2|3; text: string };
export type ParagraphBlock = { type: 'paragraph'; text: string };
export type MathBlock = { type: 'math'; latex: string };
export type GraphBlockType = { type: 'graph'; graph: { type: 'line'|'area'; title?: string; xKey?: string; yKey?: string; data: Array<Record<string, number>> } };
export type CalloutBlock = { type: 'callout'; tone?: 'info'|'note'|'warning'; text: string };
export type DividerBlock = { type: 'divider' };
export type ImageBlock = { 
  type: 'image'; 
  url: string; 
  alt?: string;
  width?: number; 
  height?: number;
  x?: number; // Grid position
  y?: number; // Grid position
};
export type EquationGraphBlock = {
  type: 'equation-graph';
  equation: string; // e.g., "y = x^2"
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
};

export type AnswerBlock = HeadingBlock | ParagraphBlock | MathBlock | GraphBlockType | CalloutBlock | DividerBlock | ImageBlock | EquationGraphBlock;


