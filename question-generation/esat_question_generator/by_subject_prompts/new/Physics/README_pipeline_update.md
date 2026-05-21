# ESAT Physics Generation Pipeline V5.2


# V5.2 Update — Diagrams Must Earn Their Place

V5.2 tightens visual generation after examples showed decorative diagrams being generated for questions that were already fully clear from text.

Main changes:

1. **Visual Router defaults harder to `none`.**
   Generic beaker/wire/sphere/block images should not be generated just for decoration.

2. **Concept images are not inline question diagrams.**
   If the diagram is part of the question, use deterministic `accurate_graph_json` or `accurate_schematic_json`.

3. **Concept images are optional support visuals only.**
   They should usually be solution/context assets, not `<figure class="qg-diagram">` in the question stem.

4. **Visible style-token bugs are banned.**
   Images containing `#FFFFFF`, colour codes, or prompt metadata must be deleted/regenerated.

5. **Accurate schematics are for real information.**
   Use them only when the diagram gives topology, labelled dimensions, or spatial relations the candidate must inspect.

Examples now routed to `none`:
- thermal mixing question with two beakers,
- heat-capacity block-in-liquid question where all ratios are in the text,
- wire resistance ratio question where length and diameter ratios are in the text,
- density/drag sphere comparison where all physical quantities are stated.
