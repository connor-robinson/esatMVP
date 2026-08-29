"""Tests for finer stem reblocking."""

from __future__ import annotations

import unittest

from past_paper_converter.stem_block_overrides import placement_skip_reason
from past_paper_converter.stem_blocks import split_stem_blocks, validate_placements


def _assert_diagram_after_block_1(
    test: unittest.TestCase,
    *,
    stem: str,
    question_id: int,
    cue: str,
    after_cue: str,
) -> None:
    blocks = split_stem_blocks(stem, question_id=question_id)
    test.assertGreaterEqual(len(blocks), 2, blocks)
    test.assertIn(cue, blocks[0])
    test.assertIn(after_cue, blocks[1])
    placements, error = validate_placements(
        [{"asset_id": "d1", "insert_after_block": 1}],
        asset_ids=["d1"],
        block_count=len(blocks),
    )
    test.assertIsNone(error)


class StemReblockTests(unittest.TestCase):
    def test_q23_splits_after_circuit_shown(self) -> None:
        stem = (
            "A heater is connected in series with a dc power supply, a variable resistor "
            "and an ammeter in the circuit shown.\n"
            "The variable resistor is adjusted until the reading on the ammeter is 0.50 A "
            "and the resistance of the heater is $8.0 \\Omega$.\n"
            "How much energy is converted to thermal energy in 5.0 minutes?"
        )
        blocks = split_stem_blocks(stem, question_id=2922)
        self.assertGreaterEqual(len(blocks), 2)
        self.assertIn("circuit shown.", blocks[0])
        self.assertIn("How much energy", blocks[-1])

    def test_q29_three_blocks_two_diagrams(self) -> None:
        stem = (
            "A ray of light is directed horizontally towards two long, plane mirrors X and Y "
            "which are both at $45^{\\circ}$ to the horizontal. After two reflections the ray "
            "is travelling horizontally again.\n"
            "Mirror X is now rotated clockwise through less than $45^{\\circ}$. After this "
            "rotation, mirror X makes an angle $\\theta$ with the horizontal, where "
            "$\\theta < 45^{\\circ}$. The direction of the incident ray is unchanged.\n"
            "In what direction and through what angle should mirror Y be rotated in order for "
            "the ray to be still horizontal and travelling to the right after reflecting "
            "from mirror Y?"
        )
        blocks = split_stem_blocks(stem, question_id=2928)
        self.assertEqual(len(blocks), 3)

    def test_q32_splits_after_arrangement(self) -> None:
        stem = (
            "A large, flat, metal plate is coated on one side with a layer of thermally "
            "insulating material of the same thickness $a$ as the metal plate. The "
            "uninsulated top surface of the metal plate is maintained at a constant "
            "temperature $T_1$. The bottom surface of the insulating material is maintained "
            "at a constant, lower temperature $T_2$. The system is in equilibrium. The "
            "diagram shows this arrangement. Which graph could show how the temperature "
            "varies with distance from the top surface of the metal plate to the bottom "
            "surface of the insulating material?"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2931,
            cue="shows this arrangement.",
            after_cue="Which graph",
        )

    def test_q37_splits_after_as_shown_in_diagram(self) -> None:
        stem = (
            "A copper ring, with a small gap XY, rests in a uniform horizontal magnetic field. "
            "The ring lies in the plane of the page and the direction of the magnetic field is "
            "horizontal from left to right, as shown in the diagram.\n"
            "A voltage is now applied across XY, such that X is connected to the positive "
            "terminal of the power supply and Y is connected to the negative terminal.\n"
            "Which statement describes the motion of the ring immediately after the voltage "
            "is applied?"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2936,
            cue="as shown in the diagram.",
            after_cue="A voltage is now applied",
        )

    def test_q38_splits_after_connected_in_series(self) -> None:
        stem = (
            "A battery and two resistors X and Y are connected in series.\n"
            "The power transferred by the battery is 6 W.\n"
            "The resistance of X is $10\\ \\Omega$.\n"
            "The voltage across Y is 4 V.\n\n"
            "What is the current in the circuit?"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2937,
            cue="connected in series.",
            after_cue="The power transferred",
        )

    def test_q55_splits_after_opening_paragraph(self) -> None:
        stem = (
            "When methanol is burned in the apparatus shown it gives out $720 \\text{ kJ mol}^{-1}$. "
            "However, only $80\\%$ of the energy released is transferred into the water.\n"
            "The starting temperature of the water is $12^{\\circ}\\text{C}$.\n"
            "What mass of methanol would need to be burned to give a $60^{\\circ}\\text{C}$ "
            "temperature rise in the water?"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2954,
            cue="transferred into the water.",
            after_cue="The starting temperature",
        )

    def test_q64_splits_before_which_of_the_statements(self) -> None:
        stem = (
            "A Petri dish was filled with agar that had been mixed with starch. The agar is not "
            "digested by enzymes used in the experiment. Four small wells were cut in the agar. "
            "Three were filled with different solutions. Well Y was filled with water to act as "
            "a control. The dish was kept at $30^{\\circ}\\text{C}$ for 30 minutes. The surface "
            "of the agar was then washed with iodine solution, turning parts of it blue-black in "
            "the presence of starch. The Petri dish was placed on a piece of graph paper, as "
            "shown in the diagram, to measure the clear areas around the wells. The area of each "
            "well should be considered negligible. Which of the statements is/are correct?\n"
            "1 The area of starch digested around well W is 4 times the area digested around well X."
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2963,
            cue="considered negligible.",
            after_cue="Which of the statements",
        )

    def test_q65_splits_after_potometer_intro(self) -> None:
        stem = (
            "The diagram shows a bubble potometer at the start of an experiment.\n"
            "The glass tube has an internal diameter of 1 mm.\n"
            "After five minutes, one end of the air bubble had moved to the 4 cm mark on the scale.\n"
            "Which row is correct?\n\n"
            "|  | name of process being investigated | volume of water taken up / $\\text{mm}^3$ |\n"
            "| --- | --- | --- |\n"
            "| A | translocation | $\\pi \\times (0.5)^2 \\times 10$ |"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2964,
            cue="at the start of an experiment.",
            after_cue="The glass tube has",
        )

    def test_q67_splits_after_ruler_division(self) -> None:
        stem = (
            "A student viewed a bacterial cell using a microscope. The cell was measured with a "
            "microscope ruler as shown in the diagram. Each division on this ruler measures "
            "$2.5\\ \\mu\\text{m}$. The student made a drawing of this cell. The drawing was "
            "$5.0\\ \\text{cm}$ in length and included the structures that the student expected "
            "to see. Which row of the table gives the magnification of the student's drawing "
            "and one of the structures that should be included?\n\n"
            "|  | magnification of the student's drawing | structure that should be included |\n"
            "| --- | --- | --- |\n"
            "| A | $2.5 \\times 10^{-4}$ | cell wall |"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2966,
            cue="Each division on this ruler measures",
            after_cue="The student made a drawing",
        )

    def test_q73_splits_after_carbon_cycle_intro(self) -> None:
        stem = (
            "The diagram represents part of the carbon cycle.\n"
            "Which of the arrows represent processes resulting in at least one organic product "
            "(contains carbon and hydrogen)?"
        )
        _assert_diagram_after_block_1(
            self,
            stem=stem,
            question_id=2972,
            cue="carbon cycle.",
            after_cue="Which of the arrows",
        )

    def test_q58_table_before_final_question(self) -> None:
        stem = (
            "The relative tendency for metals to form positive ions in solution can be "
            "measured using the following apparatus:\n"
            "Electrons can pass from metal 1 to metal 2 via the external circuit.\n"
            "Results from three experiments are given in the following table.\n"
            "Using the information in the table, what is the order of reactivity?\n\n"
            "| experiment | metal 1 | metal 2 | reading on voltmeter / V |\n"
            "| --- | --- | --- | --- |\n"
            "| 1 | P | Q | +0.62 |"
        )
        blocks = split_stem_blocks(stem, question_id=2957)
        self.assertTrue(blocks[-2].startswith("| experiment"))
        self.assertIn("Using the information", blocks[-1])

    def test_q76_strips_key_legend(self) -> None:
        stem = (
            "The family tree shows the inheritance of an autosomal recessive genetic condition.\n"
            "Key\n"
            "male without condition\n"
            "female without condition\n"
            "female with condition\n"
            "Which of the following statements is/are correct for this family?\n"
            "1 If one cheek cell is collected from each individual."
        )
        blocks = split_stem_blocks(stem, question_id=2975)
        joined = "\n".join(blocks)
        self.assertNotIn("Key", joined)
        self.assertNotIn("male without condition", joined)

    def test_q71_skips_stem_placement_pass(self) -> None:
        reason = placement_skip_reason(2970)
        self.assertIsNotNone(reason)
        self.assertIn("graphical_option_composite", reason or "")


if __name__ == "__main__":
    unittest.main()
