"""Tests for finer stem reblocking."""

from __future__ import annotations

import unittest

from past_paper_converter.stem_blocks import split_stem_blocks, validate_placements


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
        placements, error = validate_placements(
            [{"asset_id": "d1", "insert_after_block": 1}],
            asset_ids=["d1"],
            block_count=len(blocks),
        )
        self.assertIsNone(error)

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
        placements, error = validate_placements(
            [
                {"asset_id": "d1", "insert_after_block": 1},
                {"asset_id": "d2", "insert_after_block": 2},
            ],
            asset_ids=["d1", "d2"],
            block_count=len(blocks),
        )
        self.assertIsNone(error)

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
        placements, error = validate_placements(
            [{"asset_id": "d1", "insert_after_block": 1}],
            asset_ids=["d1"],
            block_count=len(blocks),
        )
        self.assertIsNone(error)

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
        self.assertIn("family tree", blocks[0])
        self.assertIn("Which of the following", joined)


if __name__ == "__main__":
    unittest.main()
